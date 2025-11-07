// Income Stability Feature
// Detects payroll patterns, payment frequency, and cash flow stability

import { all } from '../db/db';
import { calculateMonthlyExpenses } from './savingsAnalysis';

export interface IncomeTransaction {
  transaction_id: string;
  account_id: string;
  date: string;
  amount: number;
  merchant_name: string | null;
  payment_channel: string | null;
}

export interface IncomeStabilityAnalysis {
  payrollTransactions: IncomeTransaction[];
  paymentFrequency: 'weekly' | 'biweekly' | 'twice-monthly' | 'monthly' | 'irregular';
  medianPayGap: number; // Days between payments
  payGapVariability: number; // Standard deviation of pay gaps
  cashFlowBuffer: number; // Months of expenses covered
  averageIncome: number; // Average monthly income
  incomeStability: 'stable' | 'moderate' | 'unstable';
}

/**
 * Detect payroll ACH transactions
 * Pattern matching for:
 * - ACH deposit
 * - Common employer patterns (names with "LLC", "INC", "CORP")
 * - Regular amounts or consistent variability
 * @param userId - The user ID
 * @returns Array of income transactions
 */
export async function detectPayrollACH(userId: string): Promise<IncomeTransaction[]> {
  // Get checking accounts
  const checkingAccounts = await all<{ account_id: string }>(
    `SELECT account_id FROM accounts 
     WHERE user_id = ? AND type = 'checking'`,
    [userId]
  );

  if (checkingAccounts.length === 0) {
    return [];
  }

  const checkingAccountIds = checkingAccounts.map(acc => acc.account_id);
  const placeholders = checkingAccountIds.map(() => '?').join(',');

  // Get all positive transactions (inflows) from checking accounts
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 6); // 6 months of history
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

  const allTransactions = await all<IncomeTransaction>(
    `SELECT transaction_id, account_id, date, amount, merchant_name, payment_channel
     FROM transactions
     WHERE account_id IN (${placeholders})
       AND date >= ?
       AND amount > 0`,
    [...checkingAccountIds, cutoffDateStr]
  );

  // Filter for payroll transactions
  const payrollTransactions: IncomeTransaction[] = [];

  for (const tx of allTransactions) {
    const merchant = (tx.merchant_name || '').toLowerCase();
    const paymentChannel = (tx.payment_channel || '').toLowerCase();

    // Check for ACH deposits
    const isACH = paymentChannel.includes('ach') || 
                  paymentChannel.includes('deposit') ||
                  merchant.includes('payroll') ||
                  merchant.includes('salary') ||
                  merchant.includes('direct deposit');

    // Check for employer patterns
    const isEmployer = merchant.includes('llc') ||
                      merchant.includes('inc') ||
                      merchant.includes('corp') ||
                      merchant.includes('company') ||
                      merchant.includes('employer');

    // Check for common payroll keywords
    const isPayrollKeyword = merchant.includes('payroll') ||
                            merchant.includes('salary') ||
                            merchant.includes('wages') ||
                            merchant.includes('paycheck');

    // Exclude transfers (these usually have generic names)
    const isTransfer = merchant.includes('transfer') ||
                      merchant.includes('payment') ||
                      merchant.includes('wire');

    if ((isACH || isEmployer || isPayrollKeyword) && !isTransfer) {
      payrollTransactions.push(tx);
    }
  }

  // Sort by date
  payrollTransactions.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return payrollTransactions;
}

/**
 * Detect payment frequency from income transactions
 * @param incomeTransactions - Array of income transactions
 * @returns Payment frequency: weekly, biweekly, twice-monthly, monthly, or irregular
 */
export function detectPaymentFrequency(
  incomeTransactions: IncomeTransaction[]
): 'weekly' | 'biweekly' | 'twice-monthly' | 'monthly' | 'irregular' {
  if (incomeTransactions.length < 2) {
    return 'irregular';
  }

  // Calculate intervals between payments
  const intervals: number[] = [];
  for (let i = 1; i < incomeTransactions.length; i++) {
    const daysDiff = Math.round(
      (new Date(incomeTransactions[i].date).getTime() - 
       new Date(incomeTransactions[i - 1].date).getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    intervals.push(daysDiff);
  }

  if (intervals.length === 0) {
    return 'irregular';
  }

  // Calculate median interval
  const sortedIntervals = [...intervals].sort((a, b) => a - b);
  const medianInterval = sortedIntervals[Math.floor(sortedIntervals.length / 2)];

  // Check for weekly pattern (6-8 days)
  const weeklyCount = intervals.filter(int => int >= 6 && int <= 8).length;
  const weeklyRatio = weeklyCount / intervals.length;

  // Check for biweekly pattern (13-15 days)
  const biweeklyCount = intervals.filter(int => int >= 13 && int <= 15).length;
  const biweeklyRatio = biweeklyCount / intervals.length;

  // Check for twice-monthly pattern (14-16 days, but can vary)
  const twiceMonthlyCount = intervals.filter(int => int >= 14 && int <= 16).length;
  const twiceMonthlyRatio = twiceMonthlyCount / intervals.length;

  // Check for monthly pattern (28-31 days)
  const monthlyCount = intervals.filter(int => int >= 28 && int <= 31).length;
  const monthlyRatio = monthlyCount / intervals.length;

  // Determine frequency based on pattern strength
  if (weeklyRatio >= 0.6 || (medianInterval >= 6 && medianInterval <= 8)) {
    return 'weekly';
  } else if (biweeklyRatio >= 0.6 || (medianInterval >= 13 && medianInterval <= 15)) {
    return 'biweekly';
  } else if (twiceMonthlyRatio >= 0.5 || (medianInterval >= 14 && medianInterval <= 16)) {
    return 'twice-monthly';
  } else if (monthlyRatio >= 0.6 || (medianInterval >= 28 && medianInterval <= 31)) {
    return 'monthly';
  } else {
    return 'irregular';
  }
}

/**
 * Calculate pay gap variability (median days between payments)
 * @param incomeTransactions - Array of income transactions
 * @returns Object with median pay gap and variability (standard deviation)
 */
export function calculatePayGapVariability(
  incomeTransactions: IncomeTransaction[]
): { medianPayGap: number; payGapVariability: number } {
  if (incomeTransactions.length < 2) {
    return { medianPayGap: 0, payGapVariability: 0 };
  }

  // Calculate intervals between payments
  const intervals: number[] = [];
  for (let i = 1; i < incomeTransactions.length; i++) {
    const daysDiff = Math.round(
      (new Date(incomeTransactions[i].date).getTime() - 
       new Date(incomeTransactions[i - 1].date).getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    intervals.push(daysDiff);
  }

  if (intervals.length === 0) {
    return { medianPayGap: 0, payGapVariability: 0 };
  }

  // Calculate median
  const sortedIntervals = [...intervals].sort((a, b) => a - b);
  const medianPayGap = sortedIntervals[Math.floor(sortedIntervals.length / 2)];

  // Calculate standard deviation (variability)
  const mean = intervals.reduce((sum, int) => sum + int, 0) / intervals.length;
  const variance = intervals.reduce((sum, int) => {
    const diff = int - mean;
    return sum + (diff * diff);
  }, 0) / intervals.length;
  const payGapVariability = Math.sqrt(variance);

  return {
    medianPayGap: Math.round(medianPayGap * 100) / 100,
    payGapVariability: Math.round(payGapVariability * 100) / 100
  };
}

/**
 * Calculate cash flow buffer (months of expenses covered by checking balance)
 * @param userId - The user ID
 * @returns Months of expenses covered
 */
export async function calculateCashFlowBuffer(userId: string): Promise<number> {
  // Get checking account balance
  const checkingAccounts = await all<{
    account_id: string;
    balances: string;
  }>(
    `SELECT account_id, balances FROM accounts 
     WHERE user_id = ? AND type = 'checking'`,
    [userId]
  );

  if (checkingAccounts.length === 0) {
    return 0;
  }

  // Sum all checking account balances
  const totalBalance = checkingAccounts.reduce((sum, acc) => {
    const balances = JSON.parse(acc.balances);
    return sum + (balances.current || 0);
  }, 0);

  if (totalBalance === 0) {
    return 0;
  }

  // Calculate average monthly expenses (6-month trailing)
  const monthlyExpenses = await calculateMonthlyExpenses(userId, 180);

  if (monthlyExpenses === 0) {
    return 0; // No expenses, can't calculate buffer
  }

  const monthsCovered = totalBalance / monthlyExpenses;

  return Math.round(monthsCovered * 100) / 100; // Round to 2 decimal places
}

/**
 * Determine income stability based on payment patterns
 * @param medianPayGap - Median days between payments
 * @param payGapVariability - Standard deviation of pay gaps
 * @param cashFlowBuffer - Months of expenses covered
 * @returns Income stability rating
 */
function determineIncomeStability(
  medianPayGap: number,
  payGapVariability: number,
  cashFlowBuffer: number
): 'stable' | 'moderate' | 'unstable' {
  // Stable: regular payments (median 7-31 days), low variability, good buffer
  const isRegular = medianPayGap >= 7 && medianPayGap <= 31;
  const isLowVariability = payGapVariability <= 5;
  const hasGoodBuffer = cashFlowBuffer >= 1;

  if (isRegular && isLowVariability && hasGoodBuffer) {
    return 'stable';
  }

  // Unstable: irregular payments (>45 days median), high variability, poor buffer
  const isIrregular = medianPayGap > 45;
  const isHighVariability = payGapVariability > 10;
  const hasPoorBuffer = cashFlowBuffer < 1;

  if (isIrregular || (isHighVariability && hasPoorBuffer)) {
    return 'unstable';
  }

  // Moderate: everything else
  return 'moderate';
}

/**
 * Get complete income stability analysis
 * @param userId - The user ID
 * @returns Complete income stability analysis
 */
export async function getIncomeStabilityAnalysis(
  userId: string
): Promise<IncomeStabilityAnalysis> {
  const payrollTransactions = await detectPayrollACH(userId);
  const paymentFrequency = detectPaymentFrequency(payrollTransactions);
  const { medianPayGap, payGapVariability } = calculatePayGapVariability(payrollTransactions);
  const cashFlowBuffer = await calculateCashFlowBuffer(userId);
  const incomeStability = determineIncomeStability(
    medianPayGap,
    payGapVariability,
    cashFlowBuffer
  );

  // Calculate average monthly income
  let averageIncome = 0;
  if (payrollTransactions.length > 0) {
    const totalIncome = payrollTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    // Estimate months based on date range
    if (payrollTransactions.length > 1) {
      const firstDate = new Date(payrollTransactions[0].date);
      const lastDate = new Date(payrollTransactions[payrollTransactions.length - 1].date);
      const daysDiff = Math.max(1, Math.round(
        (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
      ));
      const months = daysDiff / 30.44;
      averageIncome = totalIncome / months;
    } else {
      // Single transaction, estimate based on frequency
      const estimatedMonthly = payrollTransactions[0].amount;
      if (paymentFrequency === 'weekly') {
        averageIncome = estimatedMonthly * 4.33;
      } else if (paymentFrequency === 'biweekly') {
        averageIncome = estimatedMonthly * 2.17;
      } else if (paymentFrequency === 'twice-monthly') {
        averageIncome = estimatedMonthly * 2;
      } else {
        averageIncome = estimatedMonthly;
      }
    }
  }

  return {
    payrollTransactions,
    paymentFrequency,
    medianPayGap,
    payGapVariability,
    cashFlowBuffer,
    averageIncome: Math.round(averageIncome * 100) / 100,
    incomeStability
  };
}

