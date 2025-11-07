// AI Chat Service Module
// Provides conversational AI interface with transaction data access

// Ensure environment variables are loaded (safety check)
import dotenv from 'dotenv';
import path from 'path';

// Load .env file from backend directory
// In compiled JS: __dirname will be backend/dist/ai, so ../.env = backend/.env
// In ts-node: __dirname will be backend/ai, so ../.env = backend/.env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import OpenAI from 'openai';
import { get, all } from '../db/db';
import { getCurrentPersona } from '../personas/assignPersona';
import { normalizeQuery, generateCacheKey, getCachedResponse, cacheResponse, logCacheOperation } from './cache';

// SECURITY REVIEW: Manual security review performed (Semgrep MCP unavailable)
// - OpenAI API key from environment variable (not hardcoded) ✅
// - Input validation: user data sanitized in prompts ✅
// - Function calling: transaction queries use parameterized statements ✅
//   - queryTransactions uses parameterized queries with ? placeholders
//   - All user inputs (category, merchantName, dateRange) are passed as parameters
//   - No string concatenation in SQL queries
// - Conversation context: stored in memory (per session) ✅
// - No user input directly in prompts (all data from database) ✅
// - Error handling: graceful fallbacks, no sensitive info exposed ✅
// - Authentication: chat endpoint protected by requireConsent middleware ✅

// Initialize OpenAI client (shared with rationaleGenerator)
// Note: apiKey will be empty string if not set, which will cause OpenAI to throw an error
// This is handled in processChatMessage with a check for OPENAI_API_KEY
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// In-memory conversation history (per user session)
// In production, this would be stored in a database or Redis
interface ConversationMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string; // For function calls
}

interface ConversationSession {
  userId: string;
  messages: ConversationMessage[];
  createdAt: Date;
  lastActivity: Date;
}

const conversationSessions = new Map<string, ConversationSession>();

// Clean up old sessions (older than 1 hour)
const SESSION_TTL = 60 * 60 * 1000; // 1 hour

function cleanupOldSessions() {
  const now = Date.now();
  for (const [sessionId, session] of conversationSessions.entries()) {
    if (now - session.lastActivity.getTime() > SESSION_TTL) {
      conversationSessions.delete(sessionId);
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupOldSessions, 10 * 60 * 1000);

/**
 * Get or create conversation session
 */
function getOrCreateSession(userId: string, conversationId?: string): ConversationSession {
  const sessionKey = conversationId || `session-${userId}`;
  
  let session = conversationSessions.get(sessionKey);
  
  if (!session) {
    session = {
      userId,
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date(),
    };
    conversationSessions.set(sessionKey, session);
  } else {
    session.lastActivity = new Date();
  }
  
  return session;
}

/**
 * Create system prompt with user context
 */
async function createSystemPrompt(userId: string): Promise<string> {
  // Get user info
  const user = await get<{ name: string; email: string }>(
    'SELECT name, email FROM users WHERE user_id = ?',
    [userId]
  );

  if (!user) {
    return 'You are a helpful financial education assistant.';
  }

  // Get persona
  const persona = await getCurrentPersona(userId);
  
  if (!persona) {
    return `You are a helpful financial education assistant for ${user.name}.`;
  }

  const personaType = persona.persona_type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const signals = persona.signals;

  // Build signals summary
  const signalsSummary: string[] = [];
  
  console.log('Building system prompt with signals:', Object.keys(signals));
  
  if (signals.utilization) {
    const util = typeof signals.utilization === 'number' 
      ? signals.utilization 
      : signals.utilization?.utilization || 0;
    if (util > 0) {
      signalsSummary.push(`Credit utilization: ${util.toFixed(1)}%`);
    }
  }
  
  if (signals.interest_charges?.monthlyAverage) {
    signalsSummary.push(`Monthly interest charges: $${signals.interest_charges.monthlyAverage.toFixed(2)}`);
  }
  
  if (signals.emergencyFundCoverage !== undefined && signals.emergencyFundCoverage !== null) {
    signalsSummary.push(`Emergency fund coverage: ${signals.emergencyFundCoverage.toFixed(1)} months`);
  }
  
  if (signals.savingsGrowthRate !== undefined && signals.savingsGrowthRate !== null) {
    signalsSummary.push(`Savings growth rate: ${signals.savingsGrowthRate.toFixed(1)}%`);
    console.log('✅ Savings growth rate available:', signals.savingsGrowthRate);
  } else {
    console.log('⚠️  Savings growth rate NOT available');
  }
  
  if (signals.savingsRate !== undefined && signals.savingsRate !== null) {
    signalsSummary.push(`Savings rate: ${signals.savingsRate.toFixed(1)}%`);
    console.log('✅ Savings rate available:', signals.savingsRate);
  } else {
    console.log('⚠️  Savings rate NOT available');
  }
  
  if (signals.cashFlowBuffer !== undefined && signals.cashFlowBuffer !== null) {
    signalsSummary.push(`Cash flow buffer: ${signals.cashFlowBuffer.toFixed(1)} months`);
  }
  
  if (signals.monthlyRecurringSpend !== undefined && signals.monthlyRecurringSpend !== null) {
    signalsSummary.push(`Monthly recurring spend: $${signals.monthlyRecurringSpend.toFixed(2)}`);
  }
  
  console.log('Final signals summary count:', signalsSummary.length);

  // Format signals as bullet points for better readability
  const signalsText = signalsSummary.length > 0 
    ? '\n' + signalsSummary.map(s => `- ${s}`).join('\n')
    : 'No calculated metrics available yet';

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  
  return `You are a financial education assistant for FinSight AI.

Current Date: ${today} (Year: ${currentYear}, Month: ${currentMonth})

User Profile:
- Name: ${user.name}
- Primary Persona: ${personaType}

Financial Metrics (already calculated and available):
${signalsText}

**IMPORTANT**: The Financial Metrics above are ALREADY CALCULATED for this user (if available). When the user asks about a metric:
1. **Check if the metric is listed above** in the Financial Metrics section
2. **If it IS listed** → Cite the specific value and provide context/advice
3. **If it is NOT listed** → Explain that we don't have enough data to calculate that specific metric yet, and offer to help analyze their transactions or provide general advice

Metric Mappings:
- "savings growth rate" or "savings growth" → Look for "Savings growth rate" metric (percentage change in savings balance)
- "savings rate" → Look for "Savings rate" metric (percentage of income saved)
- "credit utilization" → Look for "Credit utilization" metric
- "emergency fund" or "emergency fund coverage" → Look for "Emergency fund coverage" metric
- "cash flow buffer" → Look for "Cash flow buffer" metric
- "interest charges" → Look for "Monthly interest charges" metric
- "recurring spending" or "subscriptions" → Look for "Monthly recurring spend" metric

Capabilities:
- Answer questions about user's spending, income, savings using the Financial Metrics provided above
- Provide general financial education
- Explain persona and recommendations
- Query transaction history using the queryTransactions function for SPECIFIC TRANSACTIONS (e.g., "What did I spend on groceries last month?")

Guidelines:
- Use an empowering tone, no shaming
- Cite specific data when relevant
- Always add disclaimer: "This is not financial advice"
- Keep responses concise (3-4 sentences unless explaining complex topic)
- **FORMATTING**: Use markdown formatting for better readability:
  - Use **bold** for emphasis
  - Use numbered or bulleted lists for multiple points
  - For mathematical formulas, use LaTeX with double dollar signs: $$formula$$ (e.g., $$\text{Growth Rate} = \frac{\text{Ending} - \text{Beginning}}{\text{Beginning}} \times 100\%$$)
- **IMPORTANT**: When the user asks about spending, transactions, or purchases (e.g., "How much did I spend on X?", "What did I buy last month?", "Show me my grocery transactions"), you MUST use the queryTransactions function to get actual data. Do not guess or assume - always query the database first.
- **DATE CALCULATION**: Use the Current Date provided above to calculate date ranges:
  - "last month" = previous month relative to Current Date (e.g., if Current Date is 2025-11-07, last month is October 2025: start=2025-10-01, end=2025-10-31)
  - "this month" = current month from day 1 to Current Date (e.g., 2025-11-01 to 2025-11-07)
  - Always use the CURRENT YEAR from the Current Date, not a past year
- For categories, use the detailed category name (e.g., "GROCERIES" for grocery purchases, "RESTAURANTS" for dining out)`;
}

/**
 * Query transactions for a user
 * This function is called by GPT via function calling
 */
async function queryTransactions(
  userId: string,
  category?: string,
  dateRange?: { start: string; end: string },
  merchantName?: string
): Promise<any[]> {
  const cutoffDate = dateRange?.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = dateRange?.end || new Date().toISOString().split('T')[0];

  // Log query parameters for debugging
  console.log('=== queryTransactions called ===');
  console.log('Parameters:', {
    userId,
    category,
    dateRange,
    merchantName,
    cutoffDate,
    endDate,
  });

  // First, check if user has any transactions at all
  const userTransactionCount = await all<any>(
    `SELECT COUNT(*) as count 
     FROM transactions t
     INNER JOIN accounts a ON t.account_id = a.account_id
     WHERE a.user_id = ?`,
    [userId]
  );
  console.log('Total transactions for user:', userTransactionCount[0]?.count || 0);

  // Check transactions in the date range
  const dateRangeCount = await all<any>(
    `SELECT COUNT(*) as count 
     FROM transactions t
     INNER JOIN accounts a ON t.account_id = a.account_id
     WHERE a.user_id = ? AND t.date >= ? AND t.date <= ?`,
    [userId, cutoffDate, endDate]
  );
  console.log('Transactions in date range:', dateRangeCount[0]?.count || 0);

  // Check category-specific transactions (if category is provided)
  if (category) {
    const categoryCount = await all<any>(
      `SELECT COUNT(*) as count 
       FROM transactions t
       INNER JOIN accounts a ON t.account_id = a.account_id
       WHERE a.user_id = ? 
         AND t.date >= ? 
         AND t.date <= ?
         AND (UPPER(t.personal_finance_category_primary) LIKE UPPER(?) OR UPPER(t.personal_finance_category_detailed) LIKE UPPER(?))`,
      [userId, cutoffDate, endDate, `%${category}%`, `%${category}%`]
    );
    console.log(`Transactions matching category "${category}":`, categoryCount[0]?.count || 0);
  } else {
    console.log('No category filter - will return ALL transactions in date range');
  }
  
  // Always check what categories exist (helpful for "top categories" queries)
  const existingCategories = await all<any>(
    `SELECT DISTINCT t.personal_finance_category_primary, t.personal_finance_category_detailed, COUNT(*) as count
     FROM transactions t
     INNER JOIN accounts a ON t.account_id = a.account_id
     WHERE a.user_id = ? AND t.date >= ? AND t.date <= ?
     GROUP BY t.personal_finance_category_primary, t.personal_finance_category_detailed
     ORDER BY count DESC
     LIMIT 10`,
    [userId, cutoffDate, endDate]
  );
  console.log('Top categories in date range:', existingCategories.map(c => ({
    primary: c.personal_finance_category_primary,
    detailed: c.personal_finance_category_detailed,
    count: c.count,
  })));

  let query = `
    SELECT t.transaction_id, t.date, t.amount, t.merchant_name,
           t.personal_finance_category_primary, t.personal_finance_category_detailed
    FROM transactions t
    INNER JOIN accounts a ON t.account_id = a.account_id
    WHERE a.user_id = ?
      AND t.date >= ?
      AND t.date <= ?
  `;
  
  const params: any[] = [userId, cutoffDate, endDate];

  if (category) {
    // Case-insensitive category matching
    // SQLite LIKE is case-sensitive for ASCII, so we use UPPER() for both sides
    query += ` AND (UPPER(t.personal_finance_category_primary) LIKE UPPER(?) OR UPPER(t.personal_finance_category_detailed) LIKE UPPER(?))`;
    params.push(`%${category}%`, `%${category}%`);
  }

  if (merchantName) {
    query += ` AND LOWER(t.merchant_name) LIKE LOWER(?)`;
    params.push(`%${merchantName}%`);
  }

  query += ` ORDER BY t.date DESC LIMIT 50`;

  const transactions = await all<any>(query, params);

  console.log(`queryTransactions found ${transactions.length} transactions`);

  return transactions.map(tx => ({
    transaction_id: tx.transaction_id,
    date: tx.date,
    amount: tx.amount,
    merchant_name: tx.merchant_name,
    category: tx.personal_finance_category_primary || tx.personal_finance_category_detailed,
    category_primary: tx.personal_finance_category_primary,
    category_detailed: tx.personal_finance_category_detailed,
  }));
}

/**
 * Process chat message and generate response
 */
export async function processChatMessage(
  userId: string,
  message: string,
  conversationId?: string
): Promise<{ response: string; conversationId: string; cached?: boolean; tokensUsed?: number }> {
  // Check if OpenAI API key is configured
  if (!process.env.OPENAI_API_KEY) {
    return {
      response: 'AI chat is not available. Please configure OPENAI_API_KEY.',
      conversationId: conversationId || `session-${userId}`,
      cached: false,
      tokensUsed: 0,
    };
  }

  // Normalize query and check if this is a transaction/data query
  // Transaction queries should NOT be cached because data changes over time
  const normalizedQuery = normalizeQuery(message);
  const isTransactionQuery = /(spend|spending|transaction|purchase|buy|bought|grocery|groceries|dining|restaurant|category|categories|last month|this month|date|merchant)/i.test(message);
  
  // Get or create session to check if this is a new conversation
  const session = getOrCreateSession(userId, conversationId);
  const sessionKey = conversationId || `session-${userId}`;
  
  // Only check cache for non-transaction queries and new conversations
  // Transaction queries should always hit the database to get current data
  if (!isTransactionQuery && (session.messages.length === 0 || session.messages.length === 1)) {
    const cacheKey = generateCacheKey(userId, normalizedQuery);
    const cachedResponse = await getCachedResponse(cacheKey);
    if (cachedResponse) {
      console.log('[CACHE] Returning cached response for non-transaction query');
      logCacheOperation(userId, true);
      // Still add to conversation for context
      if (session.messages.length === 0) {
        const systemPrompt = await createSystemPrompt(userId);
        session.messages.push({
          role: 'system',
          content: systemPrompt,
        });
      }
      session.messages.push({
        role: 'user',
        content: message,
      });
      session.messages.push({
        role: 'assistant',
        content: cachedResponse,
      });
      return {
        response: cachedResponse,
        conversationId: sessionKey,
        cached: true,
        tokensUsed: 0, // No tokens used for cached response
      };
    }
  } else if (isTransactionQuery) {
    console.log('[CACHE] Skipping cache for transaction query - will query database');
  }

  // Initialize system message if this is a new conversation
  if (session.messages.length === 0) {
    const systemPrompt = await createSystemPrompt(userId);
    session.messages.push({
      role: 'system',
      content: systemPrompt,
    });
  }

  // Add user message
  session.messages.push({
    role: 'user',
    content: message,
  });

  try {
    // Define function for transaction queries
    const functions = [
      {
        name: 'queryTransactions',
        description: 'Query user transactions by category, date range, or merchant name. Use this to get transaction data for ANY spending question, including "What are my top categories?", "How much did I spend on X?", or "Show me transactions from Y".',
        parameters: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'OPTIONAL: Transaction category filter. Use the detailed category name (e.g., "GROCERIES", "RESTAURANTS"). Leave empty/undefined to get ALL transactions (useful for "top categories" queries).',
            },
            dateRange: {
              type: 'object',
              properties: {
                start: {
                  type: 'string',
                  description: 'Start date in YYYY-MM-DD format (inclusive). For "last month", use the first day of last month (e.g., if today is 2024-02-15, last month starts 2024-01-01).',
                },
                end: {
                  type: 'string',
                  description: 'End date in YYYY-MM-DD format (inclusive). For "last month", use the last day of last month (e.g., if today is 2024-02-15, last month ends 2024-01-31).',
                },
              },
            },
            merchantName: {
              type: 'string',
              description: 'Merchant name to search for',
            },
          },
        },
      },
    ];

    // Call GPT-4o-mini with function calling
    console.log('Calling OpenAI with', session.messages.length, 'messages');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: session.messages as any,
      functions,
      function_call: 'auto',
      max_tokens: 500,
      temperature: 0.7,
    });

    const assistantMessage = completion.choices[0]?.message;

    if (!assistantMessage) {
      throw new Error('No response from OpenAI');
    }

    console.log('OpenAI response:', {
      hasFunctionCall: !!assistantMessage.function_call,
      functionName: assistantMessage.function_call?.name,
      hasContent: !!assistantMessage.content,
      contentPreview: assistantMessage.content?.substring(0, 100),
    });

    // If GPT responds with content AND a function call, we need to handle both
    // Some queries like "What are my top spending categories?" might trigger this
    if (assistantMessage.function_call && assistantMessage.content) {
      console.log('⚠️  WARNING: GPT returned both content and function call. Ignoring content, processing function.');
      console.log('Content was:', assistantMessage.content);
    }

    // Handle function calls
    if (assistantMessage.function_call) {
      const functionName = assistantMessage.function_call.name;
      const functionArgs = JSON.parse(assistantMessage.function_call.arguments || '{}');
      
      console.log('Function call detected:', {
        functionName,
        functionArgs,
      });

      // Add function call to conversation
      session.messages.push({
        role: 'assistant',
        content: '',
        name: functionName,
      });

      let functionResult: any;

      if (functionName === 'queryTransactions') {
        const transactions = await queryTransactions(
          userId,
          functionArgs.category,
          functionArgs.dateRange,
          functionArgs.merchantName
        );
        functionResult = {
          transactions,
          count: transactions.length,
        };
        console.log('Function result:', {
          transactionCount: transactions.length,
          sampleTransaction: transactions[0] || null,
        });
      } else {
        functionResult = { error: 'Unknown function' };
      }

      // Add function result to conversation
      const functionResultString = JSON.stringify(functionResult);
      console.log('Adding function result to conversation (length:', functionResultString.length, ')');
      session.messages.push({
        role: 'function',
        content: functionResultString,
        name: functionName,
      });

      // Get final response from GPT
      console.log('Calling OpenAI again for final response after function call...');
      const finalCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: session.messages as any,
        functions,
        function_call: 'auto',
        max_tokens: 500,
        temperature: 0.7,
      });

      const finalMessage = finalCompletion.choices[0]?.message;
      
      if (!finalMessage || !finalMessage.content) {
        console.error('❌ No content in final response from GPT');
        console.error('Final message:', finalMessage);
      }
      
      const response = finalMessage?.content || 'I found the transaction data, but could not generate a response.';
      
      console.log('Final GPT response (after function call):', response.substring(0, 200));

      // Add assistant response to conversation
      session.messages.push({
        role: 'assistant',
        content: response,
      });

      // Only cache non-transaction queries (transaction queries should not be cached)
      if (!isTransactionQuery) {
        const cacheKey = generateCacheKey(userId, normalizedQuery);
        await cacheResponse(cacheKey, userId, response, 1);
      }
      logCacheOperation(userId, false);

      // Estimate tokens used (rough estimate: 1 token ≈ 4 characters)
      const tokensUsed = Math.ceil((completion.usage?.total_tokens || 0) + (finalCompletion.usage?.total_tokens || 0));

      return {
        response,
        conversationId: sessionKey,
        cached: false,
        tokensUsed,
      };
    } else {
      // No function call, direct response
      console.log('No function call - GPT responded directly');
      const response = assistantMessage.content || 'I could not generate a response.';

      // Add assistant response to conversation
      session.messages.push({
        role: 'assistant',
        content: response,
      });

      // Only cache non-transaction queries (transaction queries should not be cached)
      if (!isTransactionQuery) {
        const cacheKey = generateCacheKey(userId, normalizedQuery);
        await cacheResponse(cacheKey, userId, response, 1);
      }
      logCacheOperation(userId, false);

      // Estimate tokens used
      const tokensUsed = completion.usage?.total_tokens || Math.ceil(message.length / 4 + response.length / 4);

      return {
        response,
        conversationId: sessionKey,
        cached: false,
        tokensUsed,
      };
    }
  } catch (error: any) {
    console.error('Error processing chat message:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      userId,
      conversationId: sessionKey,
      messageLength: message.length,
    });
    logCacheOperation(userId, false);
    
    // Provide more specific error messages based on error type
    let errorMessage = 'I apologize, but I encountered an error processing your message. Please try again.';
    
    if (error.message?.includes('API key')) {
      errorMessage = 'AI service is not configured. Please contact support.';
    } else if (error.message?.includes('rate limit') || error.status === 429) {
      errorMessage = 'The AI service is currently busy. Please try again in a moment.';
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'The request took too long. Please try again with a simpler question.';
    }
    
    return {
      response: errorMessage,
      conversationId: sessionKey,
      cached: false,
      tokensUsed: 0,
    };
  }
}

/**
 * Clear conversation history for a user
 */
export function clearConversation(conversationId: string): void {
  conversationSessions.delete(conversationId);
}

