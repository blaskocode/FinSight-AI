// Eligibility Checking Module
// Checks if a user is eligible for partner offers based on various criteria

import { get, all } from '../db/db';
import { getCreditSignals } from '../features/creditMonitoring';
import { getCurrentPersona } from '../personas/assignPersona';
import { getSubscriptionAnalysis } from '../features/subscriptionDetection';

// Blacklist of predatory products (by offer ID or type)
const PREDATORY_BLACKLIST = [
  // Payday loans
  'payday_loan',
  'cash_advance_app',
  // High-fee products
  'check_cashing',
  'rent_to_own',
  // Predatory credit repair
  'credit_repair_high_fee',
];

// Blacklist of specific offer IDs (if we need to block specific offers)
const BLACKLISTED_OFFER_IDS: string[] = [];

export interface OfferEligibility {
  minCreditScore?: number;
  maxUtilization?: number;
  minIncome?: number;
  minSubscriptions?: number;
  excludeExisting?: string[]; // List of account types or providers to exclude
  persona?: string; // Required persona type
  excludeAccountTypes?: string[]; // Account types to exclude (e.g., 'high_yield_savings')
}

/**
 * Check if an offer is on the blacklist
 */
function isBlacklisted(offer: { id?: string; type?: string }): boolean {
  // Check offer ID blacklist
  if (offer.id && BLACKLISTED_OFFER_IDS.includes(offer.id)) {
    return true;
  }

  // Check type blacklist
  if (offer.type && PREDATORY_BLACKLIST.includes(offer.type)) {
    return true;
  }

  return false;
}

/**
 * Get user's estimated credit score (simplified - in production would use actual credit data)
 * Estimates based on utilization and payment history
 */
async function estimateCreditScore(userId: string): Promise<number> {
  // Get credit accounts
  const creditAccounts = await all<{ account_id: string }>(
    `SELECT account_id FROM accounts WHERE user_id = ? AND type = 'credit'`,
    [userId]
  );

  if (creditAccounts.length === 0) {
    return 650; // Default score if no credit accounts
  }

  let totalUtilization = 0;
  let hasOverdue = false;
  let accountCount = 0;

  for (const account of creditAccounts) {
    const signals = await getCreditSignals(account.account_id, 90);
    totalUtilization += signals.utilization.utilization;
    if (signals.isOverdue) {
      hasOverdue = true;
    }
    accountCount++;
  }

  const avgUtilization = totalUtilization / accountCount;

  // Simplified credit score estimation
  // Base score: 700
  // Deduct for high utilization
  // Deduct for overdue
  let score = 700;

  if (avgUtilization > 80) {
    score -= 50;
  } else if (avgUtilization > 50) {
    score -= 30;
  } else if (avgUtilization > 30) {
    score -= 10;
  }

  if (hasOverdue) {
    score -= 40;
  }

  // Clamp between 500 and 850
  return Math.max(500, Math.min(850, score));
}

/**
 * Get user's monthly income (estimated from transactions)
 */
async function getMonthlyIncome(userId: string): Promise<number> {
  // Get income transactions (positive amounts, likely payroll)
  const incomeTransactions = await all<{ amount: number }>(
    `SELECT amount FROM transactions 
     WHERE account_id IN (
       SELECT account_id FROM accounts WHERE user_id = ? AND type = 'depository'
     )
     AND amount > 0
     AND personal_finance_category_primary = 'INCOME'
     AND date >= date('now', '-90 days')
     ORDER BY date DESC
     LIMIT 20`,
    [userId]
  );

  if (incomeTransactions.length === 0) {
    // Fallback: estimate from persona signals if available
    const persona = await getCurrentPersona(userId);
    if (persona?.signals?.monthlyIncome) {
      return persona.signals.monthlyIncome;
    }
    if (persona?.signals?.averageIncome) {
      return persona.signals.averageIncome;
    }
    return 0;
  }

  // Calculate average monthly income
  const totalIncome = incomeTransactions.reduce((sum, txn) => sum + txn.amount, 0);
  const avgMonthlyIncome = (totalIncome / incomeTransactions.length) * 2; // Rough estimate

  return avgMonthlyIncome;
}

/**
 * Check if user has existing accounts of a specific type/provider
 */
async function hasExistingAccount(
  userId: string,
  excludeList: string[]
): Promise<boolean> {
  if (!excludeList || excludeList.length === 0) {
    return false;
  }

  // Get all user accounts
  const accounts = await all<{ type: string; subtype: string; balances: string }>(
    `SELECT type, subtype, balances FROM accounts WHERE user_id = ?`,
    [userId]
  );

  for (const account of accounts) {
    // Check account type matches
    const accountType = account.type.toLowerCase();
    const accountSubtype = account.subtype?.toLowerCase() || '';

    for (const exclude of excludeList) {
      const excludeLower = exclude.toLowerCase();

      // Check if account type matches (e.g., 'chase', 'high_yield_savings')
      if (
        accountType.includes(excludeLower) ||
        accountSubtype.includes(excludeLower)
      ) {
        return true;
      }

      // Check balances JSON for account name/provider
      try {
        const balances = JSON.parse(account.balances || '{}');
        const accountName = balances.name?.toLowerCase() || '';
        if (accountName.includes(excludeLower)) {
          return true;
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
  }

  return false;
}

/**
 * Check if user has specific account types to exclude
 */
async function hasExcludedAccountType(
  userId: string,
  excludeTypes: string[]
): Promise<boolean> {
  if (!excludeTypes || excludeTypes.length === 0) {
    return false;
  }

  const accounts = await all<{ type: string; subtype: string }>(
    `SELECT type, subtype FROM accounts WHERE user_id = ?`,
    [userId]
  );

  for (const account of accounts) {
    const accountType = account.type.toLowerCase();
    const accountSubtype = account.subtype?.toLowerCase() || '';

    for (const excludeType of excludeTypes) {
      const excludeLower = excludeType.toLowerCase();
      if (accountType.includes(excludeLower) || accountSubtype.includes(excludeLower)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get user's maximum credit utilization across all credit accounts
 */
async function getMaxUtilization(userId: string): Promise<number> {
  const creditAccounts = await all<{ account_id: string }>(
    `SELECT account_id FROM accounts WHERE user_id = ? AND type = 'credit'`,
    [userId]
  );

  if (creditAccounts.length === 0) {
    return 0;
  }

  let maxUtil = 0;

  for (const account of creditAccounts) {
    const signals = await getCreditSignals(account.account_id, 90);
    maxUtil = Math.max(maxUtil, signals.utilization.utilization);
  }

  return maxUtil;
}

/**
 * Check if user is eligible for a partner offer
 * @param userId - The user ID
 * @param offer - The partner offer object with eligibility criteria
 * @returns true if user is eligible, false otherwise
 */
export async function checkEligibility(
  userId: string,
  offer: {
    id?: string;
    type?: string;
    eligibility?: OfferEligibility;
  }
): Promise<boolean> {
  // Check blacklist first
  if (isBlacklisted(offer)) {
    return false;
  }

  // If no eligibility criteria, allow the offer
  if (!offer.eligibility) {
    return true;
  }

  const eligibility = offer.eligibility;

  // Check persona requirement
  if (eligibility.persona) {
    const persona = await getCurrentPersona(userId);
    if (!persona || persona.persona_type !== eligibility.persona) {
      return false;
    }
  }

  // Check credit score requirement
  if (eligibility.minCreditScore !== undefined) {
    const creditScore = await estimateCreditScore(userId);
    if (creditScore < eligibility.minCreditScore) {
      return false;
    }
  }

  // Check utilization requirement
  if (eligibility.maxUtilization !== undefined) {
    const maxUtil = await getMaxUtilization(userId);
    if (maxUtil > eligibility.maxUtilization) {
      return false;
    }
  }

  // Check income requirement
  if (eligibility.minIncome !== undefined) {
    const monthlyIncome = await getMonthlyIncome(userId);
    if (monthlyIncome < eligibility.minIncome) {
      return false;
    }
  }

  // Check subscription count requirement
  if (eligibility.minSubscriptions !== undefined) {
    const subscriptionAnalysis = await getSubscriptionAnalysis(userId, 90);
    const subscriptionCount = subscriptionAnalysis.recurringMerchants?.length || 0;
    if (subscriptionCount < eligibility.minSubscriptions) {
      return false;
    }
  }

  // Check existing accounts exclusion
  if (eligibility.excludeExisting && eligibility.excludeExisting.length > 0) {
    const hasExisting = await hasExistingAccount(userId, eligibility.excludeExisting);
    if (hasExisting) {
      return false;
    }
  }

  // Check account type exclusion (for offers like HYSA that shouldn't duplicate)
  if (eligibility.excludeAccountTypes && eligibility.excludeAccountTypes.length > 0) {
    const hasExcluded = await hasExcludedAccountType(userId, eligibility.excludeAccountTypes);
    if (hasExcluded) {
      return false;
    }
  }

  // Also check excludeExisting for account types (e.g., "high_yield_savings")
  if (eligibility.excludeExisting && eligibility.excludeExisting.length > 0) {
    // Check if any excludeExisting value matches account types
    const accountTypeExclusions = eligibility.excludeExisting.filter(
      (ex) => ex.includes('_') || ex === 'high_yield_savings' || ex === 'hysa'
    );
    if (accountTypeExclusions.length > 0) {
      const hasExcluded = await hasExcludedAccountType(userId, accountTypeExclusions);
      if (hasExcluded) {
        return false;
      }
    }
  }

  // All checks passed
  return true;
}

/**
 * Filter offers by eligibility
 * @param userId - The user ID
 * @param offers - Array of partner offers
 * @returns Array of eligible offers
 */
export async function filterEligibleOffers(
  userId: string,
  offers: Array<{
    id?: string;
    type?: string;
    eligibility?: OfferEligibility;
  }>
): Promise<Array<typeof offers[0]>> {
  const eligibleOffers: typeof offers = [];

  for (const offer of offers) {
    const isEligible = await checkEligibility(userId, offer);
    if (isEligible) {
      eligibleOffers.push(offer);
    }
  }

  return eligibleOffers;
}

