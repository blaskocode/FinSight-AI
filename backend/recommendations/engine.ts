// Recommendation Engine
// Generates personalized recommendations based on persona and signals

import { getCurrentPersona } from '../personas/assignPersona';
import { get, all, run } from '../db/db';
import * as fs from 'fs';
import * as path from 'path';

// Load content catalog
const contentCatalogPath = path.join(__dirname, 'content.json');
const contentCatalog = JSON.parse(fs.readFileSync(contentCatalogPath, 'utf-8'));

export interface Recommendation {
  rec_id: string;
  user_id: string;
  persona_id: string | null;
  type: 'education' | 'partner_offer';
  content: string; // Title/description
  rationale: string; // Personalized rationale
  impact_estimate?: string;
  created_at: string;
}

/**
 * Generate personalized rationale for a recommendation
 * @param recommendation - The recommendation content
 * @param signals - User's behavioral signals
 * @param accountInfo - Account information (for credit card recommendations)
 * @returns Personalized rationale string
 */
function generateRationale(
  recommendation: any,
  signals: any,
  accountInfo?: { last4?: string; accountType?: string }
): string {
  const utilization = signals.utilization;
  const interestCharges = signals.interestCharges;
  const minPaymentOnly = signals.minimum_payment_only;

  // Generate rationale based on recommendation type
  if (recommendation.id === 'edu-001') {
    // Credit Utilization article
    if (utilization && utilization.utilization) {
      return `We noticed your ${accountInfo?.accountType || 'credit card'} ending in ${accountInfo?.last4 || '****'} is at ${utilization.utilization.toFixed(1)}% utilization ($${utilization.balance.toLocaleString()} of $${utilization.limit.toLocaleString()} limit). Understanding how utilization affects your credit score could help you improve it and reduce interest charges.`;
    }
    return 'Understanding credit utilization is key to improving your credit score and reducing interest charges.';
  }

  if (recommendation.id === 'edu-002') {
    // Debt payoff strategies
    if (interestCharges && interestCharges.totalCharges > 0) {
      return `You're currently paying approximately $${interestCharges.monthlyAverage.toFixed(2)} per month in interest charges. Learning about debt payoff strategies could help you save money and pay off your debt faster.`;
    }
    return 'Understanding different debt payoff strategies can help you choose the approach that works best for your situation.';
  }

  if (recommendation.id === 'edu-003') {
    // Autopay setup
    if (minPaymentOnly) {
      return `Since you're currently making minimum payments only, setting up autopay could help ensure you never miss a payment and avoid late fees that could further impact your credit score.`;
    }
    return 'Setting up autopay ensures you never miss a payment and helps you avoid costly late fees.';
  }

  if (recommendation.id === 'offer-001') {
    // Balance transfer card
    if (utilization && utilization.utilization >= 50) {
      const potentialSavings = interestCharges?.monthlyAverage ? 
        (interestCharges.monthlyAverage * 18).toFixed(0) : '500+';
      return `With your current ${utilization.utilization.toFixed(1)}% utilization and interest charges of $${interestCharges?.monthlyAverage.toFixed(2) || '0'} per month, a balance transfer card with 0% APR could save you approximately $${potentialSavings} in interest over 18 months.`;
    }
    return 'A balance transfer card with 0% introductory APR could help you save on interest charges while you pay down your debt.';
  }

  // Default rationale
  return `This recommendation is tailored to your financial situation and could help you improve your financial health.`;
}

/**
 * Get account information for rationale generation
 * @param userId - The user ID
 * @returns Account information (last 4 digits, type)
 */
async function getAccountInfo(userId: string): Promise<{ last4?: string; accountType?: string }> {
  const account = await get<{
    account_id: string;
    type: string;
  }>(
    `SELECT account_id, type FROM accounts 
     WHERE user_id = ? AND type = 'credit' 
     LIMIT 1`,
    [userId]
  );

  if (!account) {
    return {};
  }

  // Extract last 4 digits from account ID (simplified - in real system would use masked account number)
  const last4 = account.account_id.slice(-4);
  
  return {
    last4,
    accountType: account.type === 'credit' ? 'credit card' : account.type
  };
}

/**
 * Generate recommendations for a user
 * @param userId - The user ID
 * @returns Array of recommendations
 */
export async function generateRecommendations(userId: string): Promise<Recommendation[]> {
  // Get user's current persona
  const persona = await getCurrentPersona(userId);
  
  if (!persona) {
    throw new Error('User has no assigned persona');
  }

  const personaType = persona.persona_type;
  const personaId = persona.persona_id;
  const signals = persona.signals;

  // Get persona-specific content from catalog
  const personaContent = (contentCatalog as any)[personaType];
  
  if (!personaContent) {
    throw new Error(`No content catalog found for persona: ${personaType}`);
  }

  // Get account info for rationale generation
  const accountInfo = await getAccountInfo(userId);

  const recommendations: Recommendation[] = [];

  // Generate education recommendations
  if (personaContent.education) {
    for (const eduItem of personaContent.education) {
      const rationale = generateRationale(eduItem, signals, accountInfo);
      
      recommendations.push({
        rec_id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        persona_id: personaId,
        type: 'education',
        content: `${eduItem.title}: ${eduItem.description}`,
        rationale,
        created_at: new Date().toISOString()
      });
    }
  }

  // Generate partner offer recommendations
  if (personaContent.partner_offers) {
    for (const offer of personaContent.partner_offers) {
      const rationale = generateRationale(offer, signals, accountInfo);
      
      recommendations.push({
        rec_id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        persona_id: personaId,
        type: 'partner_offer',
        content: `${offer.title}: ${offer.description}`,
        rationale,
        impact_estimate: offer.impact,
        created_at: new Date().toISOString()
      });
    }
  }

  return recommendations;
}

/**
 * Store recommendations in database
 * @param recommendations - Array of recommendations to store
 */
export async function storeRecommendations(recommendations: Recommendation[]): Promise<void> {
  for (const rec of recommendations) {
    await run(
      `INSERT INTO recommendations (rec_id, user_id, persona_id, type, content, rationale, impact_estimate, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rec.rec_id,
        rec.user_id,
        rec.persona_id,
        rec.type,
        rec.content,
        rec.rationale,
        rec.impact_estimate || null,
        rec.created_at
      ]
    );
  }
}

/**
 * Get recommendations for a user
 * Deduplicates recommendations by content title to prevent duplicates
 * @param userId - The user ID
 * @param limit - Maximum number of recommendations to return (default: 10)
 * @returns Array of unique recommendations
 */
export async function getRecommendations(userId: string, limit: number = 10): Promise<Recommendation[]> {
  const rows = await all<Recommendation>(
    `SELECT rec_id, user_id, persona_id, type, content, rationale, impact_estimate, created_at
     FROM recommendations
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, limit * 2] // Get more to account for deduplication
  );

  // Deduplicate by content title (extract title from content string)
  const seen = new Set<string>();
  const unique: Recommendation[] = [];

  for (const rec of rows) {
    // Extract title from content (format: "Title: Description")
    const title = rec.content.split(':')[0].trim();
    
    // Create a unique key based on type and title
    const key = `${rec.type}:${title}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(rec);
      
      // Stop when we have enough unique recommendations
      if (unique.length >= limit) {
        break;
      }
    }
  }

  return unique;
}

