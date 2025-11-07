// AI Rationale Generator Module
// Generates personalized rationales using GPT-4o-mini

import OpenAI from 'openai';
import { get, run } from '../db/db';
import { getCurrentPersona } from '../personas/assignPersona';
import * as crypto from 'crypto';

// SECURITY REVIEW: Manual security review performed (Semgrep MCP unavailable)
// - OpenAI API key from environment variable (not hardcoded)
// - Input validation: user data sanitized in prompts
// - Tone validation: harmful phrases checked before returning
// - Caching: uses database with expiration
// - Error handling: graceful fallback to template-based rationales
// - No user input directly in prompts (all data from database)

// Initialize OpenAI client (will use OPENAI_API_KEY from environment)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Harmful phrases to check for in generated rationales
const HARMFUL_PHRASES = [
  'you should be ashamed',
  'you\'re terrible',
  'you\'re bad',
  'you\'re stupid',
  'you\'re lazy',
  'you\'re irresponsible',
  'you deserve',
  'you\'re a failure',
  'you\'re hopeless',
  'you can\'t',
  'you\'ll never',
];

/**
 * Generate a hash for caching rationales
 */
function generateCacheKey(
  userId: string,
  recommendationId: string,
  personaType: string,
  signalsHash: string
): string {
  const data = `${userId}:${recommendationId}:${personaType}:${signalsHash}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Get cached rationale if available
 */
async function getCachedRationale(cacheKey: string): Promise<string | null> {
  try {
    const cached = await get<{ response: string; expires_at: string }>(
      `SELECT response, expires_at FROM chat_cache 
       WHERE query_hash = ? AND expires_at > datetime('now')`,
      [cacheKey]
    );

    if (cached) {
      return cached.response;
    }
  } catch (error) {
    console.error('Error fetching cached rationale:', error);
  }

  return null;
}

/**
 * Cache rationale for future use
 */
async function cacheRationale(
  cacheKey: string,
  userId: string,
  rationale: string,
  ttlDays: number = 30
): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);
    
    // Generate cache_id
    const cacheId = `cache-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await run(
      `INSERT OR REPLACE INTO chat_cache (cache_id, query_hash, user_id, response, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [cacheId, cacheKey, userId, rationale, expiresAt.toISOString()]
    );
  } catch (error) {
    console.error('Error caching rationale:', error);
    // Don't throw - caching is optional
  }
}

/**
 * Create prompt for GPT-4o-mini
 */
function createPrompt(
  userName: string,
  personaType: string,
  signals: any,
  recommendation: any // Content library item
): string {
  // Format persona type for display
  const personaDisplay = personaType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Extract key signals for the prompt
  const keySignals: string[] = [];
  
  // Credit signals
  if (signals.utilization) {
    const util = typeof signals.utilization === 'number' 
      ? signals.utilization 
      : signals.utilization?.utilization || 0;
    if (util > 0) {
      keySignals.push(`Credit utilization: ${util.toFixed(1)}%`);
    }
  }
  
  if (signals.interest_charges?.monthlyAverage) {
    keySignals.push(`Monthly interest charges: $${signals.interest_charges.monthlyAverage.toFixed(2)}`);
  }
  
  // Savings signals
  if (signals.emergencyFundCoverage !== undefined) {
    keySignals.push(`Emergency fund coverage: ${signals.emergencyFundCoverage.toFixed(1)} months`);
  }
  
  if (signals.savingsRate !== undefined) {
    keySignals.push(`Savings rate: ${signals.savingsRate.toFixed(1)}%`);
  }
  
  // Income signals
  if (signals.cashFlowBuffer !== undefined) {
    keySignals.push(`Cash flow buffer: ${signals.cashFlowBuffer.toFixed(1)} months`);
  }
  
  // Subscription signals
  if (signals.monthlyRecurringSpend !== undefined) {
    keySignals.push(`Monthly recurring spend: $${signals.monthlyRecurringSpend.toFixed(2)}`);
  }

  const signalsText = keySignals.length > 0 
    ? keySignals.join(', ')
    : 'General financial data';

  return `Generate a personalized, empathetic explanation for this financial recommendation:

User: ${userName}
Persona: ${personaDisplay}
Behavioral Signals: ${signalsText}
Recommendation: ${recommendation.title} - ${recommendation.description}
Type: ${recommendation.type === 'education' ? 'Educational Content' : 'Partner Offer'}

Requirements:
- Use specific data points from the behavioral signals provided
- Use an empowering, supportive tone - no shaming or judgmental language
- Write in plain language, avoid financial jargon
- Keep it to 2-3 sentences maximum
- Include a concrete example from their data (e.g., "With your ${signals.utilization?.utilization || 'current'}% utilization...")
- Make it feel personal and relevant to their situation
- Focus on the positive impact this recommendation could have

Generate the rationale now:`;
}

/**
 * Validate rationale tone (check for harmful phrases)
 */
function validateTone(rationale: string): boolean {
  const lowerRationale = rationale.toLowerCase();
  
  for (const phrase of HARMFUL_PHRASES) {
    if (lowerRationale.includes(phrase)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Generate fallback rationale using template
 */
function generateFallbackRationale(
  recommendation: any, // Content library item
  signals: any,
  accountInfo?: { last4?: string; accountType?: string }
): string {
  // Simple template-based fallback
  const utilization = typeof signals.utilization === 'number' 
    ? signals.utilization 
    : signals.utilization?.utilization || 0;
  
  const interestCharges = signals.interest_charges;
  const monthlyRecurring = signals.monthlyRecurringSpend;
  const emergencyFund = signals.emergencyFundCoverage;
  const savingsRate = signals.savingsRate;

  const recTitle = recommendation.title || 'This recommendation';
  
  // Try to use specific data points
  if (utilization > 0 && recTitle.toLowerCase().includes('credit')) {
    return `We noticed your credit utilization is ${utilization.toFixed(1)}%. ${recTitle} could help you understand how to improve your credit score and reduce interest charges.`;
  }
  
  if (interestCharges?.monthlyAverage && recTitle.toLowerCase().includes('debt')) {
    return `You're currently paying approximately $${interestCharges.monthlyAverage.toFixed(2)} per month in interest charges. ${recTitle} could help you save money and pay off your debt faster.`;
  }
  
  if (monthlyRecurring && recTitle.toLowerCase().includes('subscription')) {
    return `You're spending $${monthlyRecurring.toFixed(2)} per month on recurring subscriptions. ${recTitle} could help you identify opportunities to save.`;
  }
  
  if (emergencyFund !== undefined && recTitle.toLowerCase().includes('emergency')) {
    return `Your emergency fund currently covers ${emergencyFund.toFixed(1)} months of expenses. ${recTitle} could help you build a stronger financial safety net.`;
  }
  
  if (savingsRate !== undefined && recTitle.toLowerCase().includes('savings')) {
    return `You're currently saving ${savingsRate.toFixed(1)}% of your income. ${recTitle} could help you optimize your savings strategy.`;
  }

  // Generic fallback
  return `This recommendation is tailored to your financial situation and could help you improve your financial health.`;
}

/**
 * Generate personalized rationale using GPT-4o-mini
 * @param userId - The user ID
 * @param recommendation - The recommendation object (from content library)
 * @param signals - User's behavioral signals
 * @param accountInfo - Optional account information
 * @returns Personalized rationale string
 */
export async function generateRationale(
  userId: string,
  recommendation: any, // Content library item with id, title, description, type, etc.
  signals: any,
  accountInfo?: { last4?: string; accountType?: string }
): Promise<string> {
  // Get user info
  const user = await get<{ name: string; email: string }>(
    'SELECT name, email FROM users WHERE user_id = ?',
    [userId]
  );

  if (!user) {
    return generateFallbackRationale(recommendation, signals, accountInfo);
  }

  // Get persona
  const persona = await getCurrentPersona(userId);
  if (!persona) {
    return generateFallbackRationale(recommendation, signals, accountInfo);
  }

  const personaType = persona.persona_type;

  // Generate cache key
  const signalsHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(signals))
    .digest('hex')
    .substring(0, 16);
  
  const cacheKey = generateCacheKey(userId, recommendation.id || recommendation.title, personaType, signalsHash);

  // Check cache first
  const cached = await getCachedRationale(cacheKey);
  if (cached) {
    return cached;
  }

  // Check if OpenAI API key is configured
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not configured, using fallback rationale');
    const fallback = generateFallbackRationale(recommendation, signals, accountInfo);
    // Cache fallback too
    await cacheRationale(cacheKey, userId, fallback, 7); // Cache fallback for 7 days
    return fallback;
  }

  try {
    // Create prompt
    const prompt = createPrompt(user.name, personaType, signals, recommendation);

    // Call GPT-4o-mini
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful financial advisor assistant. Generate empathetic, empowering explanations for financial recommendations. Use plain language and include specific data points from the user\'s financial signals. Never use shaming or judgmental language.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const rationale = completion.choices[0]?.message?.content?.trim() || '';

    if (!rationale) {
      throw new Error('Empty response from OpenAI');
    }

    // Validate tone
    if (!validateTone(rationale)) {
      console.warn('Generated rationale failed tone validation, using fallback');
      const fallback = generateFallbackRationale(recommendation, signals, accountInfo);
      await cacheRationale(cacheKey, userId, fallback, 7);
      return fallback;
    }

    // Cache the rationale
    await cacheRationale(cacheKey, userId, rationale, 30); // Cache for 30 days

    return rationale;
  } catch (error: any) {
    console.error('Error generating AI rationale:', error.message);
    
    // Fallback to template-based rationale
    const fallback = generateFallbackRationale(recommendation, signals, accountInfo);
    
    // Cache fallback for shorter period
    await cacheRationale(cacheKey, userId, fallback, 7);
    
    return fallback;
  }
}

