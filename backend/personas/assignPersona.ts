// Persona Assignment Module
// Assigns financial personas to users based on behavioral signals

import { getCreditSignals, UtilizationResult, InterestChargesResult } from '../features/creditMonitoring';
import { getSubscriptionAnalysis } from '../features/subscriptionDetection';
import { getSavingsAnalysis } from '../features/savingsAnalysis';
import { getIncomeStabilityAnalysis } from '../features/incomeStability';
import { get, all, run } from '../db/db';

export interface PersonaAssignment {
  personaType: string;
  criteriaMet: string[];
  confidence: number; // 0-1 scale
  signals: any; // Flexible signals object for different persona types
}

/**
 * Assign High Utilization persona to a user
 * Criteria: utilization ≥50% OR interest > 0 OR min payment only OR overdue
 * @param userId - The user ID
 * @returns Persona assignment result or null if criteria not met
 */
export async function assignHighUtilizationPersona(
  userId: string
): Promise<PersonaAssignment | null> {
  // Get user's credit card accounts
  const creditAccounts = await all<{
    account_id: string;
  }>(
    `SELECT account_id FROM accounts 
     WHERE user_id = ? AND type = 'credit'`,
    [userId]
  );

  if (creditAccounts.length === 0) {
    return null; // No credit cards, cannot assign High Utilization persona
  }

  const criteriaMet: string[] = [];
  let maxUtilization = 0;
  let hasInterestCharges = false;
  let hasMinimumPaymentOnly = false;
  let hasOverdue = false;

  // Check each credit card
  for (const account of creditAccounts) {
    const signals = await getCreditSignals(account.account_id, 90);

    // Check utilization
    if (signals.utilization.utilization >= 50) {
      criteriaMet.push(`utilization_${signals.utilization.utilization.toFixed(1)}%`);
      maxUtilization = Math.max(maxUtilization, signals.utilization.utilization);
    }

    // Check interest charges
    if (signals.interestCharges.totalCharges > 0) {
      criteriaMet.push('interest_charges');
      hasInterestCharges = true;
    }

    // Check minimum payment only
    if (signals.minimumPaymentOnly) {
      criteriaMet.push('minimum_payment_only');
      hasMinimumPaymentOnly = true;
    }

    // Check overdue status
    if (signals.isOverdue) {
      criteriaMet.push('overdue');
      hasOverdue = true;
    }
  }

  // High Utilization criteria: ANY of the conditions must be true
  if (criteriaMet.length === 0) {
    return null; // Criteria not met
  }

  // Calculate confidence based on number of criteria met
  // More criteria = higher confidence
  const confidence = Math.min(1.0, 0.5 + (criteriaMet.length * 0.15));

  // Get the most significant signals (from the account with highest utilization)
  let primarySignals = {
    utilization: undefined as UtilizationResult | undefined,
    minimumPaymentOnly: false,
    interestCharges: undefined as InterestChargesResult | undefined,
    isOverdue: false
  };

  // Find account with highest utilization
  let highestUtilAccount = creditAccounts[0];
  let highestUtil = 0;

  for (const account of creditAccounts) {
    const signals = await getCreditSignals(account.account_id, 90);
    if (signals.utilization.utilization > highestUtil) {
      highestUtil = signals.utilization.utilization;
      highestUtilAccount = account;
    }
  }

  // Get primary signals from account with highest utilization
  const primaryAccountSignals = await getCreditSignals(highestUtilAccount.account_id, 90);
  primarySignals = {
    utilization: primaryAccountSignals.utilization,
    minimumPaymentOnly: primaryAccountSignals.minimumPaymentOnly,
    interestCharges: primaryAccountSignals.interestCharges,
    isOverdue: primaryAccountSignals.isOverdue
  };

  return {
    personaType: 'high_utilization',
    criteriaMet,
    confidence,
    signals: primarySignals
  };
}

/**
 * Store persona assignment in database
 * @param userId - The user ID
 * @param assignment - The persona assignment result
 * @param secondaryPersonas - Array of secondary persona types
 * @returns The persona ID
 */
export async function storePersonaAssignment(
  userId: string,
  assignment: PersonaAssignment,
  secondaryPersonas: string[] = []
): Promise<string> {
  const personaId = `persona-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  await run(
    `INSERT INTO personas (persona_id, user_id, persona_type, window_days, signals, secondary_personas)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      personaId,
      userId,
      assignment.personaType,
      90, // 90-day window
      JSON.stringify({
        criteriaMet: assignment.criteriaMet,
        confidence: assignment.confidence,
        ...assignment.signals
      }),
      JSON.stringify(secondaryPersonas)
    ]
  );

  return personaId;
}

/**
 * Get current persona assignment for a user
 * @param userId - The user ID
 * @returns The most recent persona assignment or null
 */
export async function getCurrentPersona(userId: string): Promise<{
  persona_id: string;
  persona_type: string;
  assigned_at: string;
  signals: any;
  secondary_personas: string[];
} | null> {
  const persona = await get<{
    persona_id: string;
    persona_type: string;
    assigned_at: string;
    signals: string;
    secondary_personas: string | null;
  }>(
    `SELECT persona_id, persona_type, assigned_at, signals, secondary_personas
     FROM personas 
     WHERE user_id = ? 
     ORDER BY assigned_at DESC 
     LIMIT 1`,
    [userId]
  );

  if (!persona) {
    return null;
  }

  return {
    persona_id: persona.persona_id,
    persona_type: persona.persona_type,
    assigned_at: persona.assigned_at,
    signals: JSON.parse(persona.signals),
    secondary_personas: persona.secondary_personas ? JSON.parse(persona.secondary_personas) : []
  };
}

/**
 * Assign Variable Income persona to a user
 * Criteria: Median pay gap > 45 days AND cash-flow buffer < 1 month
 * @param userId - The user ID
 * @returns Persona assignment result or null if criteria not met
 */
export async function assignVariableIncomePersona(
  userId: string
): Promise<PersonaAssignment | null> {
  const incomeAnalysis = await getIncomeStabilityAnalysis(userId);

  // Criteria: median pay gap > 45 days AND cash flow buffer < 1 month
  if (incomeAnalysis.medianPayGap > 45 && incomeAnalysis.cashFlowBuffer < 1) {
    const criteriaMet: string[] = [];
    criteriaMet.push(`median_pay_gap_${incomeAnalysis.medianPayGap.toFixed(1)}_days`);
    criteriaMet.push(`cash_flow_buffer_${incomeAnalysis.cashFlowBuffer.toFixed(2)}_months`);

    // Confidence based on how extreme the conditions are
    const payGapSeverity = Math.min(1, (incomeAnalysis.medianPayGap - 45) / 30); // 0-1 scale
    const bufferSeverity = Math.min(1, (1 - incomeAnalysis.cashFlowBuffer) / 1); // 0-1 scale
    const confidence = 0.6 + (payGapSeverity + bufferSeverity) * 0.2; // 0.6-1.0

    return {
      personaType: 'variable_income',
      criteriaMet,
      confidence: Math.min(1.0, confidence),
      signals: {
        medianPayGap: incomeAnalysis.medianPayGap,
        payGapVariability: incomeAnalysis.payGapVariability,
        cashFlowBuffer: incomeAnalysis.cashFlowBuffer,
        paymentFrequency: incomeAnalysis.paymentFrequency,
        incomeStability: incomeAnalysis.incomeStability
      }
    };
  }

  return null;
}

/**
 * Assign Subscription Heavy persona to a user
 * Criteria: Recurring merchants ≥3 AND (monthly recurring spend ≥$50 OR subscription share ≥10%)
 * @param userId - The user ID
 * @returns Persona assignment result or null if criteria not met
 */
export async function assignSubscriptionHeavyPersona(
  userId: string
): Promise<PersonaAssignment | null> {
  const subscriptionAnalysis = await getSubscriptionAnalysis(userId, 90);

  // Criteria: recurring merchants ≥3 AND (monthly recurring spend ≥$50 OR subscription share ≥10%)
  const hasEnoughMerchants = subscriptionAnalysis.recurringMerchants.length >= 3;
  const hasHighSpend = subscriptionAnalysis.monthlyRecurringSpend >= 50;
  const hasHighShare = subscriptionAnalysis.subscriptionShare >= 10;

  if (hasEnoughMerchants && (hasHighSpend || hasHighShare)) {
    const criteriaMet: string[] = [];
    criteriaMet.push(`recurring_merchants_${subscriptionAnalysis.recurringMerchants.length}`);
    
    if (hasHighSpend) {
      criteriaMet.push(`monthly_recurring_spend_$${subscriptionAnalysis.monthlyRecurringSpend.toFixed(2)}`);
    }
    if (hasHighShare) {
      criteriaMet.push(`subscription_share_${subscriptionAnalysis.subscriptionShare.toFixed(2)}%`);
    }

    // Confidence based on number of merchants and spend/share
    let confidence = 0.6;
    confidence += Math.min(0.2, (subscriptionAnalysis.recurringMerchants.length - 3) * 0.05);
    if (hasHighSpend) confidence += 0.1;
    if (hasHighShare) confidence += 0.1;

    return {
      personaType: 'subscription_heavy',
      criteriaMet,
      confidence: Math.min(1.0, confidence),
      signals: {
        recurringMerchants: subscriptionAnalysis.recurringMerchants.length,
        monthlyRecurringSpend: subscriptionAnalysis.monthlyRecurringSpend,
        subscriptionShare: subscriptionAnalysis.subscriptionShare,
        totalSpend: subscriptionAnalysis.totalSpend
      }
    };
  }

  return null;
}

/**
 * Assign Savings Builder persona to a user
 * Criteria: Savings growth ≥2% OR net inflow ≥$200/month AND all card utilizations < 30%
 * @param userId - The user ID
 * @returns Persona assignment result or null if criteria not met
 */
export async function assignSavingsBuilderPersona(
  userId: string
): Promise<PersonaAssignment | null> {
  const savingsAnalysis = await getSavingsAnalysis(userId, 90);

  // Check all credit card utilizations
  const creditAccounts = await all<{ account_id: string }>(
    `SELECT account_id FROM accounts 
     WHERE user_id = ? AND type = 'credit'`,
    [userId]
  );

  let allUtilizationsLow = true;
  let maxUtilization = 0;

  for (const account of creditAccounts) {
    const signals = await getCreditSignals(account.account_id, 90);
    const utilization = signals.utilization.utilization;
    maxUtilization = Math.max(maxUtilization, utilization);
    if (utilization >= 30) {
      allUtilizationsLow = false;
      break;
    }
  }

  // If no credit cards, consider utilizations low
  if (creditAccounts.length === 0) {
    allUtilizationsLow = true;
  }

  // Criteria: (savings growth ≥2% OR net inflow ≥$200/month) AND all card utilizations < 30%
  const monthlyInflow = savingsAnalysis.netSavingsInflow / 3; // 90 days = 3 months
  const hasGrowth = savingsAnalysis.savingsGrowthRate >= 2;
  const hasHighInflow = monthlyInflow >= 200;
  const meetsSavingsCriteria = hasGrowth || hasHighInflow;

  if (meetsSavingsCriteria && allUtilizationsLow) {
    const criteriaMet: string[] = [];
    
    if (hasGrowth) {
      criteriaMet.push(`savings_growth_${savingsAnalysis.savingsGrowthRate.toFixed(2)}%`);
    }
    if (hasHighInflow) {
      criteriaMet.push(`monthly_inflow_$${monthlyInflow.toFixed(2)}`);
    }
    if (creditAccounts.length > 0) {
      criteriaMet.push(`all_utilizations_low_max_${maxUtilization.toFixed(1)}%`);
    } else {
      criteriaMet.push('no_credit_cards');
    }

    // Confidence based on growth/inflow and utilization
    let confidence = 0.7;
    if (hasGrowth && savingsAnalysis.savingsGrowthRate > 5) confidence += 0.1;
    if (hasHighInflow && monthlyInflow > 300) confidence += 0.1;

    return {
      personaType: 'savings_builder',
      criteriaMet,
      confidence: Math.min(1.0, confidence),
      signals: {
        savingsGrowthRate: savingsAnalysis.savingsGrowthRate,
        monthlyInflow: monthlyInflow,
        netSavingsInflow: savingsAnalysis.netSavingsInflow,
        totalSavingsBalance: savingsAnalysis.totalSavingsBalance,
        emergencyFundCoverage: savingsAnalysis.emergencyFundCoverage,
        maxUtilization: maxUtilization
      }
    };
  }

  return null;
}

/**
 * Assign Lifestyle Creep persona to a user
 * Criteria: High income (top 25% of dataset) + low savings rate (<5% of income) + high discretionary spending (>30% on dining/entertainment/travel)
 * @param userId - The user ID
 * @returns Persona assignment result or null if criteria not met
 */
export async function assignLifestyleCreepPersona(
  userId: string
): Promise<PersonaAssignment | null> {
  // Get income and savings analysis
  const incomeAnalysis = await getIncomeStabilityAnalysis(userId);
  const savingsAnalysis = await getSavingsAnalysis(userId, 90);

  // Calculate savings rate
  const monthlyIncome = incomeAnalysis.averageIncome;
  const monthlySavings = savingsAnalysis.netSavingsInflow / 3; // 90 days = 3 months
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

  // Get all users' income to determine top 25%
  const allUsers = await all<{ user_id: string }>('SELECT user_id FROM users');
  const allIncomes: number[] = [];

  for (const user of allUsers) {
    const userIncomeAnalysis = await getIncomeStabilityAnalysis(user.user_id);
    if (userIncomeAnalysis.averageIncome > 0) {
      allIncomes.push(userIncomeAnalysis.averageIncome);
    }
  }

  // Calculate income percentile threshold (top 25% = 75th percentile)
  allIncomes.sort((a, b) => b - a); // Descending
  const percentile75Index = Math.floor(allIncomes.length * 0.25);
  const incomeThreshold = allIncomes.length > 0 ? allIncomes[percentile75Index] : 0;

  // Check if user is in top 25% of income
  const isHighIncome = monthlyIncome >= incomeThreshold;

  // Calculate discretionary spending (dining/entertainment/travel)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

  const discretionaryCategories = ['DINING', 'ENTERTAINMENT', 'TRAVEL', 'RECREATION'];
  const discretionaryTransactions = await all<{ amount: number }>(
    `SELECT ABS(t.amount) as amount
     FROM transactions t
     INNER JOIN accounts a ON t.account_id = a.account_id
     WHERE a.user_id = ?
       AND t.date >= ?
       AND t.amount < 0
       AND (
         t.personal_finance_category_primary IN ('DINING', 'ENTERTAINMENT', 'TRAVEL', 'RECREATION')
         OR t.personal_finance_category_detailed IN ('DINING', 'ENTERTAINMENT', 'TRAVEL', 'RECREATION')
       )`,
    [userId, cutoffDateStr]
  );

  const totalDiscretionary = discretionaryTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const monthlyDiscretionary = totalDiscretionary / 3; // 90 days = 3 months
  const discretionaryShare = monthlyIncome > 0 ? (monthlyDiscretionary / monthlyIncome) * 100 : 0;

  // Criteria: high income + low savings rate (<5%) + high discretionary spending (>30%)
  const hasLowSavingsRate = savingsRate < 5;
  const hasHighDiscretionary = discretionaryShare > 30;

  if (isHighIncome && hasLowSavingsRate && hasHighDiscretionary) {
    const criteriaMet: string[] = [];
    criteriaMet.push(`high_income_$${monthlyIncome.toFixed(2)}`);
    criteriaMet.push(`low_savings_rate_${savingsRate.toFixed(2)}%`);
    criteriaMet.push(`high_discretionary_${discretionaryShare.toFixed(2)}%`);

    // Confidence based on how extreme the conditions are
    let confidence = 0.7;
    if (monthlyIncome > incomeThreshold * 1.5) confidence += 0.1; // Very high income
    if (savingsRate < 2) confidence += 0.1; // Very low savings
    if (discretionaryShare > 40) confidence += 0.1; // Very high discretionary

    return {
      personaType: 'lifestyle_creep',
      criteriaMet,
      confidence: Math.min(1.0, confidence),
      signals: {
        monthlyIncome: monthlyIncome,
        savingsRate: savingsRate,
        discretionaryShare: discretionaryShare,
        monthlyDiscretionary: monthlyDiscretionary,
        incomeThreshold: incomeThreshold
      }
    };
  }

  return null;
}

/**
 * Calculate comprehensive financial metrics for a user (all feature detections)
 * This ensures AI chat can answer questions about any metric
 * @param userId - The user ID
 * @returns Object with all calculated metrics
 */
async function calculateComprehensiveMetrics(userId: string): Promise<any> {
  const metrics: any = {};

  // Credit metrics (utilization, interest charges)
  const creditAccounts = await all<{ account_id: string }>(
    `SELECT account_id FROM accounts WHERE user_id = ? AND type = 'credit'`,
    [userId]
  );
  if (creditAccounts.length > 0) {
    const creditSignals = await getCreditSignals(creditAccounts[0].account_id, 90);
    metrics.utilization = creditSignals.utilization;
    metrics.interest_charges = creditSignals.interestCharges;
  }

  // Savings metrics
  const savingsAnalysis = await getSavingsAnalysis(userId, 180);
  if (savingsAnalysis) {
    metrics.savingsRate = savingsAnalysis.savingsRate;
    metrics.emergencyFundCoverage = savingsAnalysis.emergencyFundCoverage;
  }

  // Income metrics
  const incomeAnalysis = await getIncomeStabilityAnalysis(userId);
  if (incomeAnalysis) {
    metrics.monthlyIncome = incomeAnalysis.averageIncome;
    metrics.cashFlowBuffer = incomeAnalysis.cashFlowBuffer;
    metrics.paymentFrequency = incomeAnalysis.paymentFrequency;
    metrics.payGapVariability = incomeAnalysis.payGapVariability;
  }

  // Subscription metrics
  const subscriptionAnalysis = await getSubscriptionAnalysis(userId, 90);
  if (subscriptionAnalysis) {
    metrics.monthlyRecurringSpend = subscriptionAnalysis.monthlyRecurringSpend;
    metrics.subscriptionShare = subscriptionAnalysis.subscriptionShare;
    metrics.subscriptionCount = subscriptionAnalysis.recurringMerchants.length;
  }

  return metrics;
}

/**
 * Assign persona to user with prioritization
 * Priority order: High Util > Variable Income > Lifestyle Creep > Sub Heavy > Savings Builder
 * However, if High Utilization only matches on interest charges (not utilization >= 50%), 
 * and another persona has higher confidence, use the higher confidence persona.
 * @param userId - The user ID
 * @returns Primary persona assignment and secondary personas, or null if none match
 */
export async function assignPersona(userId: string): Promise<{
  primary: PersonaAssignment;
  secondary: PersonaAssignment[];
} | null> {
  console.log('🟢 assignPersona() STARTED for user:', userId);
  console.log('🟢 This is the NEW CODE with comprehensive metrics!');
  
  // Try all personas in priority order
  const assignments: PersonaAssignment[] = [];

  // 1. High Utilization (highest priority)
  const highUtil = await assignHighUtilizationPersona(userId);
  if (highUtil) assignments.push(highUtil);

  // 2. Variable Income
  const variableIncome = await assignVariableIncomePersona(userId);
  if (variableIncome) assignments.push(variableIncome);

  // 3. Lifestyle Creep
  const lifestyleCreep = await assignLifestyleCreepPersona(userId);
  if (lifestyleCreep) assignments.push(lifestyleCreep);

  // 4. Subscription Heavy
  const subscriptionHeavy = await assignSubscriptionHeavyPersona(userId);
  if (subscriptionHeavy) assignments.push(subscriptionHeavy);

  // 5. Savings Builder (lowest priority)
  const savingsBuilder = await assignSavingsBuilderPersona(userId);
  if (savingsBuilder) assignments.push(savingsBuilder);

  if (assignments.length === 0) {
    return null; // No personas match
  }

  // Special case: If High Utilization only matches on weak criteria (interest charges/min payment only)
  // and another persona has significantly higher confidence, prefer the higher confidence persona
  if (assignments.length > 1 && assignments[0].personaType === 'high_utilization') {
    const highUtilAssignment = assignments[0];
    const hasHighUtilization = highUtilAssignment.criteriaMet.some(c => c.startsWith('utilization_') && parseFloat(c.replace('utilization_', '').replace('%', '')) >= 50);
    const onlyWeakCriteria = !hasHighUtilization && (
      highUtilAssignment.criteriaMet.includes('interest_charges') ||
      highUtilAssignment.criteriaMet.includes('minimum_payment_only')
    );
    
    // Find the highest confidence alternative persona
    const alternatives = assignments.slice(1);
    const bestAlternative = alternatives.reduce((best, current) => 
      current.confidence > best.confidence ? current : best, alternatives[0]
    );
    
    // If High Utilization only has weak criteria and alternative has much higher confidence, use alternative
    if (onlyWeakCriteria && bestAlternative && bestAlternative.confidence > highUtilAssignment.confidence + 0.2) {
      // Use the higher confidence persona as primary, but keep High Utilization as secondary
      const primary = bestAlternative;
      const secondary = [highUtilAssignment, ...alternatives.filter(a => a !== bestAlternative)];
      return { primary, secondary };
    }
  }

  // Primary is the first one (highest priority)
  const primary = assignments[0];
  const secondary = assignments.slice(1);

  // Calculate comprehensive metrics and merge them into primary persona signals
  // This ensures the AI chat has access to all metrics, not just persona-specific ones
  console.log('🔍 Calculating comprehensive metrics for user:', userId);
  const comprehensiveMetrics = await calculateComprehensiveMetrics(userId);
  console.log('📊 Comprehensive metrics calculated:', Object.keys(comprehensiveMetrics));
  console.log('📊 Full metrics:', JSON.stringify(comprehensiveMetrics, null, 2));
  
  primary.signals = {
    ...primary.signals,
    ...comprehensiveMetrics,
    criteriaMet: primary.criteriaMet,
    confidence: primary.confidence
  };
  
  console.log('✅ Final persona signals:', Object.keys(primary.signals));

  return { primary, secondary };
}

