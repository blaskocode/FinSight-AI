// Spending Analysis Service
// Analyzes spending patterns, categories, and detects outliers

import { all } from '../db/db';

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

export interface SpendingAnalysis {
  totalSpending: number;
  totalIncome: number;
  netCashFlow: number;
  categoryBreakdown: CategorySpending[];
  monthlyTrend: MonthlySpending[];
  topMerchants: TopMerchant[];
  unusualSpending: UnusualSpending[];
  averageMonthlySpending: number;
  averageMonthlyIncome: number;
}

/**
 * Get spending analysis for a user
 * @param userId - The user ID
 * @param months - Number of months to analyze (default: 6)
 * @returns Complete spending analysis
 */
export async function getSpendingAnalysis(
  userId: string,
  months: number = 6
): Promise<SpendingAnalysis> {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

  // Get all transactions for the user
  const transactions = await all<{
    transaction_id: string;
    date: string;
    amount: number;
    merchant_name: string | null;
    personal_finance_category_primary: string | null;
    personal_finance_category_detailed: string | null;
  }>(
    `SELECT t.transaction_id, t.date, t.amount, t.merchant_name,
            t.personal_finance_category_primary, t.personal_finance_category_detailed
     FROM transactions t
     INNER JOIN accounts a ON t.account_id = a.account_id
     WHERE a.user_id = ? AND t.date >= ?
     ORDER BY t.date DESC`,
    [userId, cutoffDateStr]
  );

  // Separate income (positive) and expenses (negative)
  const expenses = transactions.filter(tx => tx.amount < 0);
  const income = transactions.filter(tx => tx.amount > 0);

  const totalSpending = Math.abs(expenses.reduce((sum, tx) => sum + tx.amount, 0));
  const totalIncome = income.reduce((sum, tx) => sum + tx.amount, 0);
  const netCashFlow = totalIncome - totalSpending;

  // Category breakdown
  const categoryMap = new Map<string, { amount: number; count: number }>();
  
  expenses.forEach(tx => {
    const category = tx.personal_finance_category_detailed || 
                    tx.personal_finance_category_primary || 
                    'Uncategorized';
    const amount = Math.abs(tx.amount);
    
    const existing = categoryMap.get(category) || { amount: 0, count: 0 };
    categoryMap.set(category, {
      amount: existing.amount + amount,
      count: existing.count + 1
    });
  });

  const categoryBreakdown: CategorySpending[] = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: totalSpending > 0 ? (data.amount / totalSpending) * 100 : 0,
      transactionCount: data.count
    }))
    .sort((a, b) => b.amount - a.amount);

  // Monthly trend
  const monthlyMap = new Map<string, { expenses: number; income: number }>();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  expenses.forEach(tx => {
    const date = new Date(tx.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthlyMap.get(monthKey) || { expenses: 0, income: 0 };
    monthlyMap.set(monthKey, {
      expenses: existing.expenses + Math.abs(tx.amount),
      income: existing.income
    });
  });

  income.forEach(tx => {
    const date = new Date(tx.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthlyMap.get(monthKey) || { expenses: 0, income: 0 };
    monthlyMap.set(monthKey, {
      expenses: existing.expenses,
      income: existing.income + tx.amount
    });
  });

  const monthlyTrend: MonthlySpending[] = Array.from(monthlyMap.entries())
    .map(([monthKey, data]) => {
      const [yearStr, monthStr] = monthKey.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      return {
        month: monthNames[month - 1],
        year,
        monthIndex: month - 1,
        total: data.expenses + data.income,
        income: data.income,
        expenses: data.expenses
      };
    })
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthIndex - b.monthIndex;
    });

  // Top merchants
  const merchantMap = new Map<string, { total: number; count: number }>();
  
  expenses.forEach(tx => {
    const merchant = tx.merchant_name || 'Unknown';
    const amount = Math.abs(tx.amount);
    
    const existing = merchantMap.get(merchant) || { total: 0, count: 0 };
    merchantMap.set(merchant, {
      total: existing.total + amount,
      count: existing.count + 1
    });
  });

  const topMerchants: TopMerchant[] = Array.from(merchantMap.entries())
    .map(([merchant_name, data]) => ({
      merchant_name,
      total: data.total,
      transactionCount: data.count,
      averageAmount: data.total / data.count
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10); // Top 10

  // Detect unusual spending (outliers)
  const amounts = expenses.map(tx => Math.abs(tx.amount));
  const mean = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
  const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - mean, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);
  const threshold = mean + (2 * stdDev); // 2 standard deviations

  const unusualSpending: UnusualSpending[] = expenses
    .filter(tx => Math.abs(tx.amount) > threshold)
    .map(tx => ({
      transaction_id: tx.transaction_id,
      date: tx.date,
      merchant_name: tx.merchant_name,
      amount: Math.abs(tx.amount),
      category: tx.personal_finance_category_detailed || tx.personal_finance_category_primary || null,
      reason: `Spending of $${Math.abs(tx.amount).toFixed(2)} is significantly higher than your average of $${mean.toFixed(2)}`
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10); // Top 10 unusual transactions

  const averageMonthlySpending = totalSpending / months;
  const averageMonthlyIncome = totalIncome / months;

  return {
    totalSpending,
    totalIncome,
    netCashFlow,
    categoryBreakdown,
    monthlyTrend,
    topMerchants,
    unusualSpending,
    averageMonthlySpending,
    averageMonthlyIncome
  };
}

