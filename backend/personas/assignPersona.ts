// Persona Assignment Module
// Assigns financial personas to users based on behavioral signals

import { getCreditSignals, UtilizationResult, InterestChargesResult } from '../features/creditMonitoring';
import { get, all, run } from '../db/db';

export interface PersonaAssignment {
  personaType: string;
  criteriaMet: string[];
  confidence: number; // 0-1 scale
  signals: {
    utilization?: UtilizationResult;
    minimumPaymentOnly?: boolean;
    interestCharges?: InterestChargesResult;
    isOverdue?: boolean;
  };
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
 * @returns The persona ID
 */
export async function storePersonaAssignment(
  userId: string,
  assignment: PersonaAssignment
): Promise<string> {
  const personaId = `persona-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  await run(
    `INSERT INTO personas (persona_id, user_id, persona_type, window_days, signals)
     VALUES (?, ?, ?, ?, ?)`,
    [
      personaId,
      userId,
      assignment.personaType,
      90, // 90-day window
      JSON.stringify({
        criteriaMet: assignment.criteriaMet,
        confidence: assignment.confidence,
        utilization: assignment.signals.utilization,
        minimumPaymentOnly: assignment.signals.minimumPaymentOnly,
        interestCharges: assignment.signals.interestCharges,
        isOverdue: assignment.signals.isOverdue
      })
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
} | null> {
  const persona = await get<{
    persona_id: string;
    persona_type: string;
    assigned_at: string;
    signals: string;
  }>(
    `SELECT persona_id, persona_type, assigned_at, signals 
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
    signals: JSON.parse(persona.signals)
  };
}

