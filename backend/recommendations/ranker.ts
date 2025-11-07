// Recommendation Ranking & Prioritization Module
// Calculates impact and urgency scores to prioritize recommendations

import { getCurrentPersona } from '../personas/assignPersona';
import { getCreditSignals } from '../features/creditMonitoring';
import { getSavingsAnalysis } from '../features/savingsAnalysis';
import { getSubscriptionAnalysis } from '../features/subscriptionDetection';
import { getIncomeStabilityAnalysis } from '../features/incomeStability';
import { get, all } from '../db/db';

export interface RankedRecommendation {
  recommendation: any;
  impactScore: number;
  urgencyScore: number;
  priorityScore: number;
}

/**
 * Calculate impact score for High Utilization persona
 * Prioritize by potential interest savings
 */
async function calculateHighUtilizationImpact(
  userId: string,
  recommendation: any,
  signals: any
): Promise<number> {
  // For balance transfer cards, calculate potential interest savings
  if (recommendation.type === 'balance_transfer_card') {
    const monthlyInterest = signals.interest_charges?.monthlyAverage || 
                           (signals.interest_charges?.totalCharges || 0) / 3;
    const utilization = typeof signals.utilization === 'number' 
      ? signals.utilization 
      : signals.utilization?.utilization || 0;
    
    if (monthlyInterest > 0 && utilization > 0) {
      // Estimate months to pay off (simplified: assume 5% of balance per month)
      const balance = signals.utilization?.balance || 0;
      const monthlyPayment = balance * 0.05; // 5% of balance
      const monthsToPayOff = balance > 0 ? Math.ceil(balance / monthlyPayment) : 18;
      const cappedMonths = Math.min(monthsToPayOff, 18); // Cap at 18 months (typical promo period)
      
      // Impact = monthly interest * months saved
      return monthlyInterest * cappedMonths;
    }
    
    // Base impact for balance transfer cards
    return 200;
  }
  
  // For education items about credit utilization, base impact on utilization level
  if (recommendation.type === 'education') {
    const utilization = typeof signals.utilization === 'number' 
      ? signals.utilization 
      : signals.utilization?.utilization || 0;
    
    if (utilization >= 80) return 100;
    if (utilization >= 50) return 75;
    if (utilization >= 30) return 50;
    return 25;
  }
  
  return 50; // Default impact
}

/**
 * Calculate impact score for Variable Income persona
 * Prioritize emergency fund building
 */
async function calculateVariableIncomeImpact(
  userId: string,
  recommendation: any,
  signals: any
): Promise<number> {
  // For emergency fund education, calculate months until 3-month fund
  if (recommendation.type === 'education' && 
      (recommendation.title?.toLowerCase().includes('emergency') || 
       recommendation.title?.toLowerCase().includes('fund'))) {
    const cashFlowBuffer = signals.cashFlowBuffer || 0;
    const monthlyIncome = signals.monthlyIncome || signals.averageIncome || 0;
    
    if (monthlyIncome > 0) {
      const targetFund = monthlyIncome * 3; // 3-month emergency fund
      const currentSavings = signals.totalSavingsBalance || 0;
      const gap = targetFund - currentSavings;
      
      if (gap > 0) {
        // Estimate months to reach target (assuming 10% savings rate)
        const monthlySavings = monthlyIncome * 0.1;
        const monthsToTarget = monthlySavings > 0 ? gap / monthlySavings : 12;
        
        // Higher impact if further from target
        return Math.min(monthsToTarget * 10, 100);
      }
    }
    
    // Base impact based on cash flow buffer
    if (cashFlowBuffer < 1) return 100;
    if (cashFlowBuffer < 2) return 75;
    if (cashFlowBuffer < 3) return 50;
    return 25;
  }
  
  // For budgeting apps, base impact on income variability
  if (recommendation.type === 'budgeting_app') {
    const payGapVariability = signals.payGapVariability || 0;
    if (payGapVariability > 10) return 100;
    if (payGapVariability > 5) return 75;
    return 50;
  }
  
  return 50; // Default impact
}

/**
 * Calculate impact score for Subscription Heavy persona
 * Prioritize by subscription cost
 */
async function calculateSubscriptionHeavyImpact(
  userId: string,
  recommendation: any,
  signals: any
): Promise<number> {
  // For subscription management tools, base impact on monthly recurring spend
  if (recommendation.type === 'subscription_manager') {
    const monthlyRecurring = signals.monthlyRecurringSpend || 0;
    if (monthlyRecurring > 200) return 100;
    if (monthlyRecurring > 100) return 75;
    if (monthlyRecurring > 50) return 50;
    return 25;
  }
  
  // For education about subscriptions, base impact on subscription share
  if (recommendation.type === 'education') {
    const subscriptionShare = signals.subscriptionShare || 0;
    if (subscriptionShare > 20) return 100;
    if (subscriptionShare > 10) return 75;
    if (subscriptionShare > 5) return 50;
    return 25;
  }
  
  return 50; // Default impact
}

/**
 * Calculate impact score for Savings Builder persona
 * Prioritize by APY difference
 */
async function calculateSavingsBuilderImpact(
  userId: string,
  recommendation: any,
  signals: any
): Promise<number> {
  // For HYSA offers, calculate additional interest earned
  if (recommendation.type === 'high_yield_savings') {
    const totalSavings = signals.totalSavingsBalance || 0;
    const currentRate = 0.01; // Assume 1% current rate (traditional savings)
    const hysaRate = 0.044; // 4.4% APY (from offer)
    const rateDifference = hysaRate - currentRate;
    
    if (totalSavings > 0) {
      // Annual additional interest
      const annualAdditional = totalSavings * rateDifference;
      // Impact score based on annual additional interest (scaled)
      return Math.min(annualAdditional / 10, 100);
    }
    
    // Base impact for HYSA
    return 75;
  }
  
  // For savings education, base impact on savings rate
  if (recommendation.type === 'education') {
    const savingsRate = signals.savingsRate || 0;
    if (savingsRate < 10) return 100; // Low savings rate = high impact
    if (savingsRate < 15) return 75;
    if (savingsRate < 20) return 50;
    return 25;
  }
  
  return 50; // Default impact
}

/**
 * Calculate impact score for Lifestyle Creep persona
 * Prioritize retirement gap
 */
async function calculateLifestyleCreepImpact(
  userId: string,
  recommendation: any,
  signals: any
): Promise<number> {
  // For investment platforms, base impact on savings shortfall
  if (recommendation.type === 'investment_platform') {
    const monthlyIncome = signals.monthlyIncome || 0;
    const savingsRate = signals.savingsRate || 0;
    const recommendedRate = 20; // 20% recommended savings rate
    
    if (monthlyIncome > 0) {
      const currentSavings = monthlyIncome * (savingsRate / 100);
      const recommendedSavings = monthlyIncome * (recommendedRate / 100);
      const shortfall = recommendedSavings - currentSavings;
      
      if (shortfall > 0) {
        // Impact based on shortfall (scaled)
        return Math.min((shortfall / monthlyIncome) * 500, 100);
      }
    }
    
    // Base impact for investment platforms
    return 75;
  }
  
  // For retirement education, base impact on savings rate gap
  if (recommendation.type === 'education' && 
      recommendation.title?.toLowerCase().includes('retirement')) {
    const savingsRate = signals.savingsRate || 0;
    const recommendedRate = 20;
    const gap = recommendedRate - savingsRate;
    
    if (gap > 10) return 100;
    if (gap > 5) return 75;
    if (gap > 0) return 50;
    return 25;
  }
  
  return 50; // Default impact
}

/**
 * Calculate impact score for a recommendation based on persona
 */
async function calculateImpactScore(
  userId: string,
  personaType: string,
  recommendation: any,
  signals: any
): Promise<number> {
  switch (personaType) {
    case 'high_utilization':
      return await calculateHighUtilizationImpact(userId, recommendation, signals);
    case 'variable_income':
      return await calculateVariableIncomeImpact(userId, recommendation, signals);
    case 'subscription_heavy':
      return await calculateSubscriptionHeavyImpact(userId, recommendation, signals);
    case 'savings_builder':
      return await calculateSavingsBuilderImpact(userId, recommendation, signals);
    case 'lifestyle_creep':
      return await calculateLifestyleCreepImpact(userId, recommendation, signals);
    default:
      return 50; // Default impact
  }
}

/**
 * Calculate urgency score based on user's financial situation
 */
async function calculateUrgencyScore(
  userId: string,
  personaType: string,
  signals: any
): Promise<number> {
  let urgency = 0;
  
  // Critical urgency: Overdue status
  if (signals.is_overdue) {
    urgency = 100;
    return urgency;
  }
  
  // High urgency: High utilization (≥80%)
  const utilization = typeof signals.utilization === 'number' 
    ? signals.utilization 
    : signals.utilization?.utilization || 0;
  
  if (utilization >= 80) {
    urgency = 90;
  } else if (utilization >= 50) {
    urgency = 70;
  } else if (utilization >= 30) {
    urgency = 50;
  }
  
  // High urgency: Low emergency fund (<1 month)
  const emergencyFundCoverage = signals.emergencyFundCoverage || 0;
  if (emergencyFundCoverage < 1) {
    urgency = Math.max(urgency, 85);
  } else if (emergencyFundCoverage < 2) {
    urgency = Math.max(urgency, 60);
  } else if (emergencyFundCoverage < 3) {
    urgency = Math.max(urgency, 40);
  }
  
  // High urgency: Very low cash flow buffer
  const cashFlowBuffer = signals.cashFlowBuffer || 0;
  if (cashFlowBuffer < 0.5) {
    urgency = Math.max(urgency, 80);
  } else if (cashFlowBuffer < 1) {
    urgency = Math.max(urgency, 60);
  }
  
  // Medium urgency: High subscription share (>20% of spending)
  const subscriptionShare = signals.subscriptionShare || 0;
  if (subscriptionShare > 20) {
    urgency = Math.max(urgency, 50);
  }
  
  // If no specific urgency indicators, use medium urgency
  if (urgency === 0) {
    urgency = 30;
  }
  
  return Math.min(urgency, 100); // Cap at 100
}

/**
 * Rank recommendations by impact and urgency
 * @param userId - The user ID
 * @param recommendations - Array of recommendations to rank
 * @param limit - Maximum number of recommendations to return (default: 5)
 * @returns Array of ranked recommendations sorted by priority
 */
export async function rankRecommendations(
  userId: string,
  recommendations: any[],
  limit: number = 5
): Promise<any[]> {
  // Get user's persona and signals
  const persona = await getCurrentPersona(userId);
  if (!persona) {
    // If no persona, return recommendations as-is (no ranking)
    return recommendations.slice(0, limit);
  }
  
  const personaType = persona.persona_type;
  const signals = persona.signals;
  
  // Calculate urgency score once (same for all recommendations)
  const urgencyScore = await calculateUrgencyScore(userId, personaType, signals);
  
  // Calculate impact and priority scores for each recommendation
  const ranked: RankedRecommendation[] = [];
  
  for (const rec of recommendations) {
    // Extract recommendation metadata from content
    const contentParts = rec.content.split(':');
    const title = contentParts[0]?.trim() || '';
    const description = contentParts.slice(1).join(':').trim() || '';
    
    // Create recommendation object for impact calculation
    const recommendationObj = {
      type: rec.type,
      title,
      description,
      id: rec.rec_id,
      ...(rec.type === 'partner_offer' && rec.impact_estimate ? { impact: rec.impact_estimate } : {})
    };
    
    const impactScore = await calculateImpactScore(userId, personaType, recommendationObj, signals);
    
    // Priority score = weighted combination of impact and urgency
    // Impact: 60% weight, Urgency: 40% weight
    const priorityScore = (impactScore * 0.6) + (urgencyScore * 0.4);
    
    ranked.push({
      recommendation: rec,
      impactScore,
      urgencyScore,
      priorityScore
    });
  }
  
  // Sort by priority score (descending)
  ranked.sort((a, b) => b.priorityScore - a.priorityScore);
  
  // Return top recommendations (limit)
  return ranked.slice(0, limit).map(r => r.recommendation);
}

