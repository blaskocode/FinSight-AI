// Credit Monitoring Feature Detection
// Detects credit utilization, minimum payments, interest charges, and overdue status

import { get, all } from '../db/db';

// Utilization thresholds
export const UTILIZATION_THRESHOLDS = {
  LOW: 0.30,      // 30% - Good utilization
  MEDIUM: 0.50,   // 50% - Moderate utilization
  HIGH: 0.80,     // 80% - High utilization
  CRITICAL: 0.90  // 90% - Critical utilization
};

export interface UtilizationResult {
  utilization: number;        // Percentage (0-100)
  balance: number;            // Current balance
  limit: number;              // Credit limit
  threshold: 'low' | 'medium' | 'high' | 'critical' | 'none';
  isHighUtilization: boolean; // >= 50%
}

export interface InterestChargesResult {
  totalCharges: number;       // Total interest charges in dollars
  monthlyAverage: number;      // Average monthly charges
  chargeCount: number;         // Number of interest charge transactions
}

/**
 * Calculate credit card utilization percentage
 * @param accountId - The credit card account ID
 * @returns Utilization result with percentage and threshold flags
 */
export async function calculateUtilization(accountId: string): Promise<UtilizationResult> {
  // Get account with balances
  const account = await get<{
    balances: string;
    type: string;
  }>(
    'SELECT balances, type FROM accounts WHERE account_id = ?',
    [accountId]
  );

  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }

  if (account.type !== 'credit') {
    throw new Error(`Account ${accountId} is not a credit card account`);
  }

  const balances = JSON.parse(account.balances);
  const balance = balances.current || 0;
  const limit = balances.limit || 0;

  // Handle edge cases
  if (limit === 0 || limit === null) {
    return {
      utilization: 0,
      balance,
      limit: 0,
      threshold: 'none',
      isHighUtilization: false
    };
  }

  const utilization = (balance / limit) * 100;

  // Determine threshold
  // According to PRD: flags for ≥30%, ≥50%, ≥80%
  // < 30%: low, >= 30% and < 50%: medium, >= 50%: high, >= 80%: high, >= 90%: critical
  let threshold: 'low' | 'medium' | 'high' | 'critical' | 'none';
  if (utilization >= UTILIZATION_THRESHOLDS.CRITICAL * 100) {
    threshold = 'critical';
  } else if (utilization >= UTILIZATION_THRESHOLDS.HIGH * 100) {
    threshold = 'high';
  } else if (utilization >= UTILIZATION_THRESHOLDS.MEDIUM * 100) {
    // >=50% is high utilization per PRD
    threshold = 'high';
  } else if (utilization >= UTILIZATION_THRESHOLDS.LOW * 100) {
    // >=30% but <50%: medium
    threshold = 'medium';
  } else {
    // <30%: low
    threshold = 'low';
  }

  return {
    utilization: Math.round(utilization * 100) / 100, // Round to 2 decimal places
    balance,
    limit,
    threshold,
    isHighUtilization: utilization >= UTILIZATION_THRESHOLDS.MEDIUM * 100
  };
}

/**
 * Detect if user is making only minimum payments
 * @param accountId - The credit card account ID
 * @param windowDays - Number of days to look back (default: 90)
 * @returns True if only minimum payments detected
 */
export async function detectMinimumPaymentOnly(
  accountId: string,
  windowDays: number = 90
): Promise<boolean> {
  // Get liability information
  const liability = await get<{
    minimum_payment_amount: number;
    last_payment_amount: number;
  }>(
    'SELECT minimum_payment_amount, last_payment_amount FROM liabilities WHERE account_id = ?',
    [accountId]
  );

  if (!liability) {
    return false; // No liability record, can't determine
  }

  const minPayment = liability.minimum_payment_amount || 0;
  const lastPayment = liability.last_payment_amount || 0;

  // If last payment is within 5% of minimum payment, consider it minimum payment only
  const tolerance = minPayment * 0.05; // 5% tolerance
  const isMinimumPayment = Math.abs(lastPayment - minPayment) <= tolerance;

  // Also check recent payment transactions
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - windowDays);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

  const payments = await all<{
    amount: number;
    date: string;
  }>(
    `SELECT ABS(amount) as amount, date 
     FROM transactions 
     WHERE account_id = ? 
       AND personal_finance_category_detailed = 'CREDIT_CARD_PAYMENT'
       AND amount < 0
       AND date >= ?
     ORDER BY date DESC
     LIMIT 3`,
    [accountId, cutoffDateStr]
  );

  // If we have payment transactions, check if they're all close to minimum
  if (payments.length > 0) {
    const allMinimumPayments = payments.every(payment => {
      const paymentAmount = Math.abs(payment.amount);
      return Math.abs(paymentAmount - minPayment) <= tolerance;
    });

    return allMinimumPayments && isMinimumPayment;
  }

  // Fall back to liability record
  return isMinimumPayment;
}

/**
 * Calculate interest charges for a credit card
 * @param accountId - The credit card account ID
 * @param windowDays - Number of days to look back (default: 90)
 * @returns Interest charges result
 */
export async function calculateInterestCharges(
  accountId: string,
  windowDays: number = 90
): Promise<InterestChargesResult> {
  // Get liability APR
  const liability = await get<{
    apr_percentage: number;
  }>(
    'SELECT apr_percentage FROM liabilities WHERE account_id = ?',
    [accountId]
  );

  if (!liability || !liability.apr_percentage) {
    return {
      totalCharges: 0,
      monthlyAverage: 0,
      chargeCount: 0
    };
  }

  // Calculate date range
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - windowDays);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

  // Get account balance history (simplified - using current balance and APR)
  // In a real system, we'd track monthly balances and calculate interest per month
  const account = await get<{
    balances: string;
  }>(
    'SELECT balances FROM accounts WHERE account_id = ?',
    [accountId]
  );

  if (!account) {
    return {
      totalCharges: 0,
      monthlyAverage: 0,
      chargeCount: 0
    };
  }

  const balances = JSON.parse(account.balances);
  const currentBalance = balances.current || 0;
  const apr = liability.apr_percentage;

  // Estimate interest charges: (balance * APR / 100) / 12 * number of months
  const monthsInWindow = windowDays / 30;
  const monthlyInterest = (currentBalance * apr / 100) / 12;
  const estimatedTotalCharges = monthlyInterest * monthsInWindow;

  // Look for actual interest charge transactions
  const interestTransactions = await all<{
    amount: number;
  }>(
    `SELECT ABS(amount) as amount 
     FROM transactions 
     WHERE account_id = ? 
       AND (merchant_name LIKE '%interest%' 
            OR merchant_name LIKE '%Interest%'
            OR personal_finance_category_detailed LIKE '%INTEREST%')
       AND amount < 0
       AND date >= ?`,
    [accountId, cutoffDateStr]
  );

  // Use actual transactions if available, otherwise use estimate
  let totalCharges = 0;
  if (interestTransactions.length > 0) {
    totalCharges = interestTransactions.reduce((sum, txn) => sum + Math.abs(txn.amount), 0);
  } else {
    // Use estimated charges based on APR and balance
    totalCharges = estimatedTotalCharges;
  }

  const monthlyAverage = monthsInWindow > 0 ? totalCharges / monthsInWindow : 0;

  return {
    totalCharges: Math.round(totalCharges * 100) / 100,
    monthlyAverage: Math.round(monthlyAverage * 100) / 100,
    chargeCount: interestTransactions.length
  };
}

/**
 * Check if credit card is overdue
 * @param accountId - The credit card account ID
 * @returns True if overdue
 */
export async function checkOverdueStatus(accountId: string): Promise<boolean> {
  const liability = await get<{
    is_overdue: number;
    next_payment_due_date: string;
  }>(
    'SELECT is_overdue, next_payment_due_date FROM liabilities WHERE account_id = ?',
    [accountId]
  );

  if (!liability) {
    return false;
  }

  // Check explicit overdue flag
  if (liability.is_overdue === 1) {
    return true;
  }

  // Also check if payment due date has passed
  if (liability.next_payment_due_date) {
    const dueDate = new Date(liability.next_payment_due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dueDate < today) {
      return true;
    }
  }

  return false;
}

/**
 * Get all credit monitoring signals for an account
 * @param accountId - The credit card account ID
 * @param windowDays - Number of days to look back (default: 90)
 * @returns Combined credit monitoring results
 */
export async function getCreditSignals(
  accountId: string,
  windowDays: number = 90
): Promise<{
  utilization: UtilizationResult;
  minimumPaymentOnly: boolean;
  interestCharges: InterestChargesResult;
  isOverdue: boolean;
}> {
  const [utilization, minimumPaymentOnly, interestCharges, isOverdue] = await Promise.all([
    calculateUtilization(accountId),
    detectMinimumPaymentOnly(accountId, windowDays),
    calculateInterestCharges(accountId, windowDays),
    checkOverdueStatus(accountId)
  ]);

  return {
    utilization,
    minimumPaymentOnly,
    interestCharges,
    isOverdue
  };
}

