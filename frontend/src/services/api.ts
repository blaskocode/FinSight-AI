// API Service
// Handles all backend API calls

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Get user-friendly error message from API error
 */
export function getErrorMessage(error: any): string {
  // Network errors
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return 'Request timed out. Please check your connection and try again.';
    }
    return 'Unable to connect to the server. Please check your connection and try again.';
  }

  const status = error.response.status;
  const data = error.response.data;

  // Specific error messages based on status code
  switch (status) {
    case 400:
      return data?.message || data?.error || 'Invalid request. Please check your input and try again.';
    case 403:
      if (data?.message?.toLowerCase().includes('consent')) {
        return 'Please consent to data sharing first.';
      }
      return data?.message || data?.error || 'You do not have permission to access this resource.';
    case 404:
      if (data?.message?.toLowerCase().includes('user')) {
        return 'User not found.';
      }
      return data?.message || data?.error || 'Resource not found.';
    case 500:
      return 'Something went wrong on our end. We\'re looking into it. Please try again later.';
    case 503:
      return 'Service temporarily unavailable. Please try again in a moment.';
    default:
      return data?.message || data?.error || error.message || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Retry an API call with exponential backoff
 */
export async function retryApiCall<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on 4xx errors (client errors)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff: delay = initialDelay * 2^attempt
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

export interface ConsentResponse {
  success: boolean;
  message: string;
  consent_id?: string;
  consent?: {
    consent_id: string;
    user_id: string;
    status: string;
    consented_at: string | null;
    revoked_at: string | null;
  };
}

export interface ProfileResponse {
  user_id: string;
  persona: {
    type: string;
    assigned_at: string;
    confidence: number;
    criteria_met: string[];
    secondary_personas?: string[];
  };
  signals: {
    // Credit signals
    utilization?: {
      utilization: number;
      balance?: number;
      limit?: number;
      threshold?: string;
      isHighUtilization?: boolean;
    } | number;
    minimum_payment_only?: boolean;
    interest_charges?: {
      totalCharges: number;
      monthlyAverage?: number;
      chargeCount?: number;
    };
    is_overdue?: boolean;
    // Income stability signals
    medianPayGap?: number;
    payGapVariability?: number;
    cashFlowBuffer?: number;
    paymentFrequency?: string;
    incomeStability?: string;
    averageIncome?: number;
    monthlyIncome?: number;
    // Subscription signals
    recurringMerchants?: number;
    monthlyRecurringSpend?: number;
    subscriptionShare?: number;
    totalSpend?: number;
    // Savings signals
    savingsGrowthRate?: number;
    monthlyInflow?: number;
    netSavingsInflow?: number;
    totalSavingsBalance?: number;
    emergencyFundCoverage?: number;
    savingsRate?: number;
    maxUtilization?: number;
    // Lifestyle creep signals
    discretionaryShare?: number;
    monthlyDiscretionary?: number;
    incomeThreshold?: number;
  };
}

export interface Recommendation {
  id: string;
  type: 'education' | 'partner_offer';
  title: string;
  description: string;
  rationale: string;
  impact_estimate?: string;
  created_at: string;
}

export interface RecommendationsResponse {
  user_id: string;
  recommendations: Recommendation[];
  count: number;
}

/**
 * Submit user consent with retry logic
 */
export async function submitConsent(userId: string, consented: boolean): Promise<ConsentResponse> {
  return retryApiCall(async () => {
    const response = await api.post<ConsentResponse>('/consent', {
      user_id: userId,
      consented,
    });
    return response.data;
  });
}

/**
 * Fetch user profile and persona with retry logic
 */
export async function fetchProfile(userId: string): Promise<ProfileResponse> {
  return retryApiCall(async () => {
    const response = await api.get<ProfileResponse>(`/profile/${userId}`);
    return response.data;
  });
}

/**
 * Fetch user recommendations with retry logic
 */
export async function fetchRecommendations(userId: string): Promise<RecommendationsResponse> {
  return retryApiCall(async () => {
    const response = await api.get<RecommendationsResponse>(`/recommendations/${userId}`);
    return response.data;
  });
}

// Payment Plan Types
export interface DebtPayment {
  liabilityId: string;
  accountId: string;
  accountName?: string;
  type: string;
  balance: number;
  apr: number;
  monthlyPayment: number;
  payoffMonth: number;
  totalInterest: number;
  totalPaid: number;
}

export interface MonthPayment {
  month: number;
  date: string;
  totalPayment: number;
  debts: {
    liabilityId: string;
    payment: number;
    remainingBalance: number;
  }[];
}

export interface PaymentPlan {
  strategy: 'avalanche' | 'snowball';
  debts: DebtPayment[];
  totalDebt: number;
  totalInterest: number;
  totalInterestSaved: number;
  payoffMonths: number;
  monthlySurplus: number;
  timeline: MonthPayment[];
}

export interface PaymentPlanComparison {
  avalanche: PaymentPlan;
  snowball: PaymentPlan;
}

/**
 * Fetch payment plan for a user
 */
export async function fetchPaymentPlan(userId: string, strategy: 'avalanche' | 'snowball' = 'avalanche'): Promise<PaymentPlan> {
  const response = await api.get<PaymentPlan>(`/payment-plan/${userId}?strategy=${strategy}`);
  return response.data;
}

/**
 * Fetch payment plan comparison (both strategies)
 */
export async function fetchPaymentPlanComparison(userId: string): Promise<PaymentPlanComparison> {
  const response = await api.get<PaymentPlanComparison>(`/payment-plan/${userId}/compare`);
  return response.data;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  cached?: boolean;
  tokensUsed?: number;
}

export interface ChatResponse {
  response: string;
  conversationId: string;
  cached?: boolean;
  tokensUsed?: number;
}

export async function fetchChatMessage(
  userId: string,
  message: string,
  conversationId?: string
): Promise<ChatResponse> {
  const response = await api.post<ChatResponse>(`/chat/${userId}`, {
    message,
    conversation_id: conversationId,
  });
  return response.data;
}

export interface AdminUser {
  user_id: string;
  name: string;
  email: string;
  persona_type: string | null;
  consent_status: 'active' | 'revoked' | 'none';
  last_active: string | null;
  created_at: string;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
}

export async function adminLogin(password: string): Promise<{ success: boolean; message: string }> {
  const response = await api.post<{ success: boolean; message: string }>('/admin/login', {
    password,
  });
  return response.data;
}

export async function fetchAdminUsers(
  page: number = 1,
  limit: number = 20,
  search?: string
): Promise<AdminUsersResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search) {
    params.append('search', search);
  }
  const response = await api.get<AdminUsersResponse>(`/admin/users?${params.toString()}`);
  return response.data;
}

export interface UserDetail {
  user_id: string;
  name: string;
  email: string;
  created_at: string;
  persona: {
    type: string;
    assigned_at: string;
    confidence: number;
    criteria_met: string[];
    secondary_personas: string[];
  } | null;
  signals: any;
  recommendations: Array<{
    id: string;
    type: string;
    title: string;
    rationale: string;
  }>;
  transactions: Array<{
    transaction_id: string;
    date: string;
    amount: number;
    merchant_name: string | null;
    category: string | null;
  }>;
  persona_history: Array<{
    persona_id: string;
    persona_type: string;
    assigned_at: string;
  }>;
  has_consent: boolean;
}

export interface AuditLogEntry {
  log_id: string;
  admin_id: string;
  user_id: string;
  action: string;
  timestamp: string;
}

export interface Transaction {
  transaction_id: string;
  date: string;
  amount: number;
  merchant_name: string | null;
  category: string | null;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogResponse {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

export async function fetchUserDetail(userId: string): Promise<UserDetail> {
  const response = await api.get<UserDetail>(`/admin/user/${userId}`);
  return response.data;
}

export async function fetchAuditLog(
  page: number = 1,
  limit: number = 50,
  filters?: {
    adminId?: string;
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<AuditLogResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (filters?.adminId) params.append('adminId', filters.adminId);
  if (filters?.userId) params.append('userId', filters.userId);
  if (filters?.action) params.append('action', filters.action);
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  
  const response = await api.get<AuditLogResponse>(`/admin/audit?${params.toString()}`);
  return response.data;
}

/**
 * Fetch user transactions with pagination and search
 */
export async function fetchTransactions(
  userId: string,
  page: number = 1,
  limit: number = 20,
  search?: string
): Promise<TransactionsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (search && search.trim()) {
    params.append('search', search.trim());
  }

  const response = await api.get<TransactionsResponse>(`/transactions/${userId}?${params.toString()}`);
  return response.data;
}

export interface PersonaHistoryEntry {
  persona_id: string;
  persona_type: string;
  assigned_at: string;
  signals?: any;
  secondary_personas?: string[];
}

export interface PersonaTimelineEntry {
  month: string;
  year: number;
  monthIndex: number;
  persona_type: string;
  startDate: string;
  endDate: string | null;
}

export interface PersonaHistoryResponse {
  user_id: string;
  history: PersonaHistoryEntry[];
  timeline: PersonaTimelineEntry[];
  months: number;
}

/**
 * Fetch persona history for timeline visualization
 */
export async function fetchPersonaHistory(
  userId: string,
  months: number = 12
): Promise<PersonaHistoryResponse> {
  const params = new URLSearchParams({
    months: months.toString(),
  });

  const response = await api.get<PersonaHistoryResponse>(`/persona-history/${userId}?${params.toString()}`);
  return response.data;
}

export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface MonthlySpending {
  month: string;
  year: number;
  monthIndex: number;
  total: number;
  income: number;
  expenses: number;
}

export interface TopMerchant {
  merchant_name: string;
  total: number;
  transactionCount: number;
  averageAmount: number;
}

export interface UnusualSpending {
  transaction_id: string;
  date: string;
  merchant_name: string | null;
  amount: number;
  category: string | null;
  reason: string;
}

export interface SpendingAnalysisResponse {
  user_id: string;
  totalSpending: number;
  totalIncome: number;
  netCashFlow: number;
  categoryBreakdown: CategorySpending[];
  monthlyTrend: MonthlySpending[];
  topMerchants: TopMerchant[];
  unusualSpending: UnusualSpending[];
  averageMonthlySpending: number;
  averageMonthlyIncome: number;
  months: number;
}

/**
 * Fetch spending analysis for visualizations
 */
export async function fetchSpendingAnalysis(
  userId: string,
  months: number = 6
): Promise<SpendingAnalysisResponse> {
  const params = new URLSearchParams({
    months: months.toString(),
  });

  const response = await api.get<SpendingAnalysisResponse>(`/spending-analysis/${userId}?${params.toString()}`);
  return response.data;
}

