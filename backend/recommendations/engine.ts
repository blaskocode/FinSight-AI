// Recommendation Engine
// Generates personalized recommendations based on persona and signals

import { getCurrentPersona } from '../personas/assignPersona';
import { get, all, run } from '../db/db';
import { filterEligibleOffers } from './eligibility';
import { rankRecommendations } from './ranker';
import { generateRationale as generateAIRationale } from '../ai/rationaleGenerator';
import * as fs from 'fs';
import * as path from 'path';

// Load content catalog (prefer content-library.json, fallback to content.json for backward compatibility)
let contentCatalog: any;
const contentLibraryPath = path.join(__dirname, 'content-library.json');
const contentPath = path.join(__dirname, 'content.json');

if (fs.existsSync(contentLibraryPath)) {
  contentCatalog = JSON.parse(fs.readFileSync(contentLibraryPath, 'utf-8'));
} else if (fs.existsSync(contentPath)) {
  contentCatalog = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
} else {
  throw new Error('Content catalog not found. Please create content-library.json or content.json');
}

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
 * Uses AI (GPT-4o-mini) if available, falls back to template-based rationale
 * @param userId - The user ID
 * @param recommendation - The recommendation content
 * @param signals - User's behavioral signals
 * @param accountInfo - Account information (for credit card recommendations)
 * @returns Personalized rationale string
 */
async function generateRationale(
  userId: string,
  recommendation: any,
  signals: any,
  accountInfo?: { last4?: string; accountType?: string }
): Promise<string> {
  // Use AI rationale generator (with fallback to template)
  return await generateAIRationale(userId, recommendation, signals, accountInfo);
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
      const rationale = await generateRationale(userId, eduItem, signals, accountInfo);
      
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

  // Generate partner offer recommendations (filter by eligibility)
  if (personaContent.partner_offers) {
    // Filter offers by eligibility
    const eligibleOffers = await filterEligibleOffers(userId, personaContent.partner_offers);
    
    for (const offer of eligibleOffers) {
      const rationale = await generateRationale(userId, offer, signals, accountInfo);
      
      recommendations.push({
        rec_id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        persona_id: personaId,
        type: 'partner_offer',
        content: `${(offer as any).title}: ${(offer as any).description}`,
        rationale,
        impact_estimate: (offer as any).impact,
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
 * Deduplicates recommendations by content title, then ranks by priority
 * @param userId - The user ID
 * @param limit - Maximum number of recommendations to return (default: 5)
 * @returns Array of unique, ranked recommendations
 */
export async function getRecommendations(userId: string, limit: number = 5): Promise<Recommendation[]> {
  const rows = await all<Recommendation>(
    `SELECT rec_id, user_id, persona_id, type, content, rationale, impact_estimate, created_at
     FROM recommendations
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, limit * 3] // Get more to account for deduplication and ranking
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
    }
  }

  // Rank recommendations by impact and urgency
  const ranked = await rankRecommendations(userId, unique, limit);

  return ranked;
}

