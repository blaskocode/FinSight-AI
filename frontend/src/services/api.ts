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
 * Submit user consent
 */
export async function submitConsent(userId: string, consented: boolean): Promise<ConsentResponse> {
  const response = await api.post<ConsentResponse>('/consent', {
    user_id: userId,
    consented,
  });
  return response.data;
}

/**
 * Fetch user profile and persona
 */
export async function fetchProfile(userId: string): Promise<ProfileResponse> {
  const response = await api.get<ProfileResponse>(`/profile/${userId}`);
  return response.data;
}

/**
 * Fetch user recommendations
 */
export async function fetchRecommendations(userId: string): Promise<RecommendationsResponse> {
  const response = await api.get<RecommendationsResponse>(`/recommendations/${userId}`);
  return response.data;
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

