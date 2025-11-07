// Savings Analysis Feature
// Analyzes savings growth, net inflow, emergency fund coverage, and savings rate

import { all, get } from '../db/db';

export interface SavingsAccount {
  account_id: string;
  type: string;
  balances: {
    available: number;
    current: number;
    limit?: number;
  };
}

export interface SavingsAnalysis {
  totalSavingsBalance: number;
  netSavingsInflow: number; // Dollar amount over window
  savingsGrowthRate: number; // Percentage
  emergencyFundCoverage: number; // Months
  monthlyExpenses: number;
  savingsRate: number; // Percentage of income
  monthlyIncome: number;
}

interface Transaction {
  transaction_id: string;
  account_id: string;
  date: string;
  amount: number;
  merchant_name: string | null;
  personal_finance_category_detailed?: string | null;
}

/**
 * Get all savings accounts for a user
 * Includes: savings, money_market, HSA
 * @param userId - The user ID
 * @returns Array of savings accounts
 */
async function getSavingsAccounts(userId: string): Promise<SavingsAccount[]> {
  const accounts = await all<{
    account_id: string;
    type: string;
    balances: string;
  }>(
    `SELECT account_id, type, balances
     FROM accounts
     WHERE user_id = ? 
       AND type IN ('savings', 'money_market', 'HSA')`,
    [userId]
  );

  return accounts.map(acc => ({
    account_id: acc.account_id,
    type: acc.type,
    balances: JSON.parse(acc.balances)
  }));
}

/**
 * Get all account IDs for a user (to exclude transfers between own accounts)
 * @param userId - The user ID
 * @returns Array of account IDs
 */
async function getUserAccountIds(userId: string): Promise<string[]> {
  const accounts = await all<{ account_id: string }>(
    'SELECT account_id FROM accounts WHERE user_id = ?',
    [userId]
  );

  return accounts.map(acc => acc.account_id);
}

/**
 * Calculate monthly expenses (excluding transfers between own accounts)
 * @param userId - The user ID
 * @param windowDays - Analysis window in days (default: 90)
 * @returns Average monthly expenses
 */
export async function calculateMonthlyExpenses(
  userId: string,
  windowDays: number = 90
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - windowDays);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

  // Get user's account IDs to exclude transfers
  const userAccountIds = await getUserAccountIds(userId);

  // Get all transactions (negative amounts are expenses)
  const transactions = await all<Transaction>(
    `SELECT t.transaction_id, t.account_id, t.date, t.amount, t.merchant_name
     FROM transactions t
     INNER JOIN accounts a ON t.account_id = a.account_id
     WHERE a.user_id = ?
       AND t.date >= ?
       AND t.amount < 0`,
    [userId, cutoffDateStr]
  );

  // Filter out transfers between own accounts
  // A transfer would be: negative amount in one account, positive amount in another account
  // For simplicity, we'll exclude transactions with common transfer merchant names
  const transferKeywords = ['transfer', 'payment', 'ach', 'wire'];
  const expenseTransactions = transactions.filter(tx => {
    const merchant = (tx.merchant_name || '').toLowerCase();
    
    // Exclude obvious transfers
    if (transferKeywords.some(keyword => merchant.includes(keyword))) {
      return false;
    }
    
    return true;
  });

  // Calculate total expenses
  const totalExpenses = expenseTransactions.reduce(
    (sum, tx) => sum + Math.abs(tx.amount),
    0
  );

  // Calculate average monthly expenses
  const months = windowDays / 30.44; // Average days per month
  const monthlyExpenses = totalExpenses / months;

  return Math.round(monthlyExpenses * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate net savings inflow (money going into savings accounts)
 * Includes: positive transactions to savings accounts AND savings transfers from checking
 * @param userId - The user ID
 * @param windowDays - Analysis window in days (default: 90)
 * @returns Net savings inflow amount
 */
export async function calculateNetSavingsInflow(
  userId: string,
  windowDays: number = 90
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - windowDays);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

  // Get savings accounts
  const savingsAccounts = await getSavingsAccounts(userId);
  const savingsAccountIds = savingsAccounts.map(acc => acc.account_id);

  let totalInflow = 0;

  // Get all positive transactions (inflows) to savings accounts
  if (savingsAccountIds.length > 0) {
    const placeholders = savingsAccountIds.map(() => '?').join(',');
    const savingsTransactions = await all<Transaction>(
      `SELECT transaction_id, account_id, date, amount, merchant_name
       FROM transactions
       WHERE account_id IN (${placeholders})
         AND date >= ?
         AND amount > 0`,
      [...savingsAccountIds, cutoffDateStr]
    );

    totalInflow += savingsTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  }

  // Also detect savings transfers from checking accounts
  // These appear as negative transactions with "Savings Transfer" or similar merchant names
  const checkingAccounts = await all<{ account_id: string }>(
    `SELECT account_id FROM accounts 
     WHERE user_id = ? AND type = 'checking'`,
    [userId]
  );

  if (checkingAccounts.length > 0) {
    const checkingAccountIds = checkingAccounts.map(acc => acc.account_id);
    const placeholders = checkingAccountIds.map(() => '?').join(',');
    
    const savingsTransfers = await all<Transaction>(
      `SELECT transaction_id, account_id, date, amount, merchant_name, personal_finance_category_detailed
       FROM transactions
       WHERE account_id IN (${placeholders})
         AND date >= ?
         AND amount < 0
         AND (
           (merchant_name IS NOT NULL AND (merchant_name LIKE '%savings%' OR merchant_name LIKE '%Savings%' OR merchant_name LIKE '%SAVINGS%' OR merchant_name LIKE '%transfer%' OR merchant_name LIKE '%Transfer%' OR merchant_name LIKE '%TRANSFER%'))
           OR personal_finance_category_detailed = 'SAVINGS'
         )`,
      [...checkingAccountIds, cutoffDateStr]
    );

    // Convert negative amounts to positive (these are savings contributions)
    const transferAmount = savingsTransfers.reduce(
      (sum, tx) => sum + Math.abs(tx.amount),
      0
    );
    
    totalInflow += transferAmount;
  }

  return Math.round(totalInflow * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate savings growth rate over time window
 * @param userId - The user ID
 * @param windowDays - Analysis window in days (default: 90)
 * @returns Savings growth rate percentage
 */
export async function calculateSavingsGrowthRate(
  userId: string,
  windowDays: number = 90
): Promise<number> {
  const savingsAccounts = await getSavingsAccounts(userId);

  if (savingsAccounts.length === 0) {
    return 0; // No savings accounts
  }

  // Get current total balance
  const currentBalance = savingsAccounts.reduce(
    (sum, acc) => sum + (acc.balances.current || 0),
    0
  );

  // Get balance at start of window
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - windowDays);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

  // Calculate starting balance by subtracting net inflow
  const netInflow = await calculateNetSavingsInflow(userId, windowDays);
  const startingBalance = currentBalance - netInflow;

  if (startingBalance <= 0) {
    // If starting balance was 0 or negative, growth is 100%+ or undefined
    return currentBalance > 0 ? 100 : 0;
  }

  // Calculate growth rate
  const growth = ((currentBalance - startingBalance) / startingBalance) * 100;

  return Math.round(growth * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate emergency fund coverage (months of expenses covered)
 * @param userId - The user ID
 * @returns Months of emergency fund coverage
 */
export async function calculateEmergencyFundCoverage(
  userId: string
): Promise<number> {
  // Get total savings balance
  const savingsAccounts = await getSavingsAccounts(userId);
  const totalSavings = savingsAccounts.reduce(
    (sum, acc) => sum + (acc.balances.current || 0),
    0
  );

  if (totalSavings === 0) {
    return 0;
  }

  // Calculate average monthly expenses (6-month trailing)
  const monthlyExpenses = await calculateMonthlyExpenses(userId, 180); // 6 months

  if (monthlyExpenses === 0) {
    return 0; // No expenses, can't calculate coverage
  }

  const monthsCovered = totalSavings / monthlyExpenses;

  return Math.round(monthsCovered * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate savings rate (savings / income)
 * @param userId - The user ID
 * @param windowDays - Analysis window in days (default: 90)
 * @returns Savings rate percentage
 */
export async function calculateSavingsRate(
  userId: string,
  windowDays: number = 90
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - windowDays);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

  // Get user's checking account IDs
  const checkingAccounts = await all<{ account_id: string }>(
    `SELECT account_id FROM accounts 
     WHERE user_id = ? AND type = 'checking'`,
    [userId]
  );

  if (checkingAccounts.length === 0) {
    return 0; // No checking account
  }

  const checkingAccountIds = checkingAccounts.map(acc => acc.account_id);
  const placeholders = checkingAccountIds.map(() => '?').join(',');

  // Get income transactions (positive amounts in checking accounts)
  // Income typically has merchant names like "Payroll", "Salary", or employer names
  const incomeTransactions = await all<Transaction>(
    `SELECT transaction_id, account_id, date, amount, merchant_name
     FROM transactions
     WHERE account_id IN (${placeholders})
       AND date >= ?
       AND amount > 0`,
    [...checkingAccountIds, cutoffDateStr]
  );

  // Filter for likely income transactions (exclude transfers)
  const transferKeywords = ['transfer', 'payment', 'ach', 'wire'];
  const income = incomeTransactions
    .filter(tx => {
      const merchant = (tx.merchant_name || '').toLowerCase();
      // Include transactions that don't look like transfers
      return !transferKeywords.some(keyword => merchant.includes(keyword));
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Calculate monthly income
  const months = windowDays / 30.44;
  const monthlyIncome = income / months;

  if (monthlyIncome === 0) {
    return 0; // No income
  }

  // Calculate monthly savings (net inflow to savings)
  const monthlySavings = await calculateNetSavingsInflow(userId, windowDays);
  const monthlySavingsAmount = monthlySavings / months;

  // Calculate savings rate
  const savingsRate = (monthlySavingsAmount / monthlyIncome) * 100;

  return Math.round(savingsRate * 100) / 100; // Round to 2 decimal places
}

/**
 * Get complete savings analysis
 * @param userId - The user ID
 * @param windowDays - Analysis window in days (default: 90)
 * @returns Complete savings analysis
 */
export async function getSavingsAnalysis(
  userId: string,
  windowDays: number = 90
): Promise<SavingsAnalysis> {
  const savingsAccounts = await getSavingsAccounts(userId);
  const totalSavingsBalance = savingsAccounts.reduce(
    (sum, acc) => sum + (acc.balances.current || 0),
    0
  );

  const netSavingsInflow = await calculateNetSavingsInflow(userId, windowDays);
  const savingsGrowthRate = await calculateSavingsGrowthRate(userId, windowDays);
  const emergencyFundCoverage = await calculateEmergencyFundCoverage(userId);
  const monthlyExpenses = await calculateMonthlyExpenses(userId, windowDays);

  // Calculate monthly income for savings rate
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - windowDays);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

  const checkingAccounts = await all<{ account_id: string }>(
    `SELECT account_id FROM accounts 
     WHERE user_id = ? AND type = 'checking'`,
    [userId]
  );

  let monthlyIncome = 0;
  if (checkingAccounts.length > 0) {
    const checkingAccountIds = checkingAccounts.map(acc => acc.account_id);
    const placeholders = checkingAccountIds.map(() => '?').join(',');

    const incomeTransactions = await all<Transaction>(
      `SELECT transaction_id, account_id, date, amount, merchant_name
       FROM transactions
       WHERE account_id IN (${placeholders})
         AND date >= ?
         AND amount > 0`,
      [...checkingAccountIds, cutoffDateStr]
    );

    const transferKeywords = ['transfer', 'payment', 'ach', 'wire'];
    const income = incomeTransactions
      .filter(tx => {
        const merchant = (tx.merchant_name || '').toLowerCase();
        return !transferKeywords.some(keyword => merchant.includes(keyword));
      })
      .reduce((sum, tx) => sum + tx.amount, 0);

    const months = windowDays / 30.44;
    monthlyIncome = income / months;
  }

  const savingsRate = monthlyIncome > 0
    ? ((netSavingsInflow / (windowDays / 30.44)) / monthlyIncome) * 100
    : 0;

  return {
    totalSavingsBalance,
    netSavingsInflow,
    savingsGrowthRate,
    emergencyFundCoverage,
    monthlyExpenses,
    savingsRate: Math.round(savingsRate * 100) / 100,
    monthlyIncome: Math.round(monthlyIncome * 100) / 100
  };
}

