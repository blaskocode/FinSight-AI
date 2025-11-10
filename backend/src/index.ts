// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
import path from 'path';

// Load .env file from backend directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import express, { Request, Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { assignPersona, storePersonaAssignment, getCurrentPersona } from '../personas/assignPersona';
import { generateRecommendations, storeRecommendations, getRecommendations } from '../recommendations/engine';
import { generatePaymentPlan, generatePaymentPlansComparison } from '../recommendations/paymentPlanner';
import { processChatMessage } from '../ai/chatService';
import { recordConsent, revokeConsent, getConsentRecord } from '../guardrails/consent';
import { requireConsent } from '../middleware/requireConsent';
import { verifyAdminPassword, getUsersWithConsent, searchUsers, getUserDetail } from '../admin/adminService';
import { logAdminAction, getAuditLog } from '../admin/auditService';
import { getUserTransactions } from '../services/transactionService';
import { getPersonaHistory, groupPersonaHistoryByMonth } from '../services/personaHistoryService';
import { getSpendingAnalysis } from '../services/spendingAnalysisService';
import { get, run } from '../db/db';
import { findUserByUsername } from '../utils/username';

const app = express();
const PORT = process.env.PORT || 3002;

// Security Middleware
// Helmet adds various HTTP headers for security
app.use(helmet({
  contentSecurityPolicy: false, // Disable for now to avoid breaking the app
  crossOriginEmbedderPolicy: false
}));

// CORS Configuration - production ready
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? (process.env.FRONTEND_URL || true) // Allow same-origin or configured origin
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
};
app.use(cors(corsOptions));

// Rate Limiting - prevent API abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body Parser
app.use(express.json());

// Performance: Add caching headers for GET requests
app.use((req: Request, res: Response, next: express.NextFunction) => {
  // Cache static data for 5 minutes, dynamic data for 30 seconds
  if (req.method === 'GET') {
    // Health check and static endpoints - cache longer
    if (req.path === '/api/health' || req.path === '/api') {
      res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    } else {
      // Dynamic endpoints - shorter cache
      res.set('Cache-Control', 'private, max-age=30'); // 30 seconds
    }
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'FinSight AI Backend is running' });
});

// Root endpoint
app.get('/api', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to FinSight AI API' });
});

// Consent endpoint - Record or revoke user consent
app.post('/api/consent', async (req: Request, res: Response) => {
  try {
    const { user_id, consented } = req.body;

    if (!user_id || typeof consented !== 'boolean') {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'user_id and consented (boolean) are required' 
      });
    }

    // Verify user exists
    const user = await get('SELECT * FROM users WHERE user_id = ?', [user_id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (consented) {
      // Record consent
      const consentId = await recordConsent(user_id);
      const consentRecord = await getConsentRecord(user_id);
      
      res.json({
        success: true,
        message: 'Consent recorded successfully',
        consent_id: consentId,
        consent: consentRecord
      });
    } else {
      // Revoke consent
      const revoked = await revokeConsent(user_id);
      
      if (revoked) {
        res.json({
          success: true,
          message: 'Consent revoked successfully'
        });
      } else {
        // Consent is already revoked (or never existed) - this is fine, treat as success
        // The goal is to ensure consent is revoked, which is already the case
        res.json({
          success: true,
          message: 'Consent is already revoked'
        });
      }
    }

  } catch (error: any) {
    console.error('Error processing consent:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Login endpoint - Authenticate user with username and password
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Username and password are required'
      });
    }

    // For demo: all passwords are "test"
    const DEMO_PASSWORD = 'test';

    if (password !== DEMO_PASSWORD) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Invalid username or password'
      });
    }

    // Find user by username
    const user = await findUserByUsername(username);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Invalid username or password'
      });
    }

    // Return success with user info
    res.json({
      success: true,
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      message: 'Login successful'
    });

  } catch (error: any) {
    console.error('Error processing login:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Profile endpoint - Get user's behavioral profile and persona
// Protected by consent middleware
app.get('/api/profile/:user_id', requireConsent, async (req: Request, res: Response) => {
  try {
    const userId = req.params.user_id;
    console.log('🎯 PROFILE ENDPOINT CALLED for user:', userId);

    // Verify user exists
    const user = await get('SELECT * FROM users WHERE user_id = ?', [userId]);
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }
    console.log('✅ User found:', user);

    // Check for existing persona assignment
    let currentPersona = await getCurrentPersona(userId);
    console.log('🔍 Existing persona:', currentPersona ? 'EXISTS' : 'NONE');

    // TEMPORARY: Force recalculation to test new comprehensive metrics code
    const FORCE_RECALC = false; // Changed to false to preserve historical personas
    
    // If no persona assigned or we want to recalculate, assign persona
    if (!currentPersona || FORCE_RECALC) {
      if (FORCE_RECALC && currentPersona) {
        console.log('🔄 FORCE RECALCULATING PERSONA (testing mode)');
        // Only delete the most recent persona, not all historical ones
        // This preserves the persona history timeline
        const mostRecentPersona = await get<{ persona_id: string }>(
          'SELECT persona_id FROM personas WHERE user_id = ? ORDER BY assigned_at DESC LIMIT 1',
          [userId]
        );
        if (mostRecentPersona) {
          await run('DELETE FROM personas WHERE persona_id = ?', [mostRecentPersona.persona_id]);
        }
      }
      console.log('🚀 ASSIGNING NEW PERSONA for user:', userId);
      const result = await assignPersona(userId);
      
      if (result) {
        // Store the assignment with secondary personas
        const secondaryPersonaTypes = result.secondary.map(p => p.personaType);
        const personaId = await storePersonaAssignment(userId, result.primary, secondaryPersonaTypes);
        
        // Get the stored persona
        currentPersona = await getCurrentPersona(userId);
      } else {
        // No persona matches
        return res.json({
          user_id: userId,
          name: user.name,
          email: user.email,
          persona: null,
          signals: {},
          message: 'No persona assigned - criteria not met'
        });
      }
    }

    // Ensure we have a persona (TypeScript null check)
    if (!currentPersona) {
      return res.status(500).json({ error: 'Failed to assign persona' });
    }

    // Return profile with persona and signals
    res.json({
      user_id: userId,
      name: user.name,
      email: user.email,
      persona: {
        type: currentPersona.persona_type,
        assigned_at: currentPersona.assigned_at,
        confidence: currentPersona.signals.confidence,
        criteria_met: currentPersona.signals.criteriaMet,
        secondary_personas: currentPersona.secondary_personas || []
      },
      signals: currentPersona.signals
    });

  } catch (error: any) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Recommendations endpoint - Get personalized recommendations for a user
// Protected by consent middleware
app.get('/api/recommendations/:user_id', requireConsent, async (req: Request, res: Response) => {
  try {
    const userId = req.params.user_id;

    // Verify user exists
    const user = await get('SELECT * FROM users WHERE user_id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if recommendations already exist (get unique ones, ranked by priority)
    // Fetch more than needed to ensure good ranking pool
    let recommendations = await getRecommendations(userId, 10);

    // If we have fewer than 4 recommendations (expected: 3 education + 1 partner offer), generate new ones
    // But only if we don't already have recommendations of each type
    const educationCount = recommendations.filter(r => r.type === 'education').length;
    const partnerOfferCount = recommendations.filter(r => r.type === 'partner_offer').length;
    
    if (educationCount < 3 || partnerOfferCount < 1) {
      // Check if user has a persona assigned (required for recommendations)
      const persona = await get('SELECT persona_id FROM personas WHERE user_id = ? ORDER BY assigned_at DESC LIMIT 1', [userId]);
      
      if (!persona) {
        // User doesn't have a persona yet - return empty recommendations with helpful message
        return res.json({
          user_id: userId,
          recommendations: [],
          count: 0,
          message: 'Please load your profile first to assign a persona and generate recommendations'
        });
      }
      
      // Generate new recommendations
      const newRecommendations = await generateRecommendations(userId);
      
      // Store new recommendations in database
      await storeRecommendations(newRecommendations);
      
      // Get all recommendations again (will be deduplicated and ranked)
      recommendations = await getRecommendations(userId, 10);
    }
    
    // Limit to top 5 ranked recommendations for response
    recommendations = recommendations.slice(0, 5);

    // Format recommendations for response
    const formattedRecommendations = recommendations.map(rec => ({
      id: rec.rec_id,
      type: rec.type,
      title: rec.content.split(':')[0], // Extract title from content
      description: rec.content.split(':').slice(1).join(':').trim(),
      rationale: rec.rationale,
      impact_estimate: rec.impact_estimate,
      created_at: rec.created_at
    }));

    res.json({
      user_id: userId,
      recommendations: formattedRecommendations,
      count: formattedRecommendations.length
    });

  } catch (error: any) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Payment Plan Endpoints
app.get('/api/payment-plan/:user_id', requireConsent, async (req: Request, res: Response) => {
  const { user_id: userId } = req.params;
  const { strategy } = req.query;

  try {
    const plan = await generatePaymentPlan(
      userId,
      strategy === 'snowball' ? 'snowball' : 'avalanche'
    );

    res.json(plan);
  } catch (error: any) {
    console.error('Error generating payment plan:', error);
    res.status(500).json({ error: error.message || 'Failed to generate payment plan' });
  }
});

app.get('/api/payment-plan/:user_id/compare', requireConsent, async (req: Request, res: Response) => {
  const { user_id: userId } = req.params;

  try {
    const comparison = await generatePaymentPlansComparison(userId);
    res.json(comparison);
  } catch (error: any) {
    console.error('Error generating payment plan comparison:', error);
    res.status(500).json({ error: error.message || 'Failed to generate payment plan comparison' });
  }
});

// Chat Endpoint
app.post('/api/chat/:user_id', requireConsent, async (req: Request, res: Response) => {
  const { user_id: userId } = req.params;
  const { message, conversation_id } = req.body;

  console.log('=== CHAT REQUEST RECEIVED ===');
  console.log('User ID:', userId);
  console.log('Message:', message);
  console.log('Conversation ID:', conversation_id || 'none');

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const result = await processChatMessage(userId, message, conversation_id);
    console.log('=== CHAT RESPONSE SENT ===');
    res.json(result);
  } catch (error: any) {
    console.error('Error in chat endpoint:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      userId,
      conversation_id,
    });
    res.status(500).json({ 
      error: error.message || 'Failed to process chat message',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// Transaction History Endpoint
app.get('/api/transactions/:user_id', requireConsent, async (req: Request, res: Response) => {
  const { user_id: userId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string | undefined;

  try {
    const result = await getUserTransactions(userId, page, limit, search);
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch transactions' });
  }
});

// Persona History Endpoint - Get persona evolution timeline
app.get('/api/persona-history/:user_id', requireConsent, async (req: Request, res: Response) => {
  const { user_id: userId } = req.params;
  const months = parseInt(req.query.months as string) || 12;

  try {
    const history = await getPersonaHistory(userId, months);
    const grouped = groupPersonaHistoryByMonth(history);

    res.json({
      user_id: userId,
      history,
      timeline: grouped,
      months
    });
  } catch (error: any) {
    console.error('Error fetching persona history:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch persona history' });
  }
});

// Overarching Message Endpoint - Get personalized actionable recommendations
app.get('/api/overarching-message/:user_id', requireConsent, async (req: Request, res: Response) => {
  try {
    const userId = req.params.user_id;
    const { generateOverarchingMessage } = await import('../services/overarchingMessageService');
    const message = await generateOverarchingMessage(userId);
    
    // CRITICAL: ALWAYS ensure at least one actionable item is returned
    // This is NON-NEGOTIABLE - every user must have at least one recommended action
    if (!message.actionableItems || message.actionableItems.length === 0) {
      console.error('OverarchingMessage API: CRITICAL - Service returned empty actionableItems!', {
        userId,
        hasMessage: !!message.message,
        messageLength: message.message?.length
      });
      
      // Force add a fallback actionable item
      message.actionableItems = [{
        title: 'Explore Your Financial Dashboard',
        description: 'Review your financial profile, recommendations, and insights to understand your financial health better.',
        priority: 'medium'
      }];
    }
    
    // Ensure message exists
    if (!message.message || message.message.trim() === '') {
      console.error('OverarchingMessage API: CRITICAL - Service returned empty message!', { userId });
      message.message = 'Welcome to FinSight AI! We\'re analyzing your financial data to provide personalized recommendations.';
    }
    
    console.log('OverarchingMessage API: Returning response', {
      userId,
      messageLength: message.message.length,
      actionableItemsCount: message.actionableItems.length,
      actionableItemsTitles: message.actionableItems.map(item => item.title)
    });
    
    res.json(message);
  } catch (error: any) {
    console.error('Error generating overarching message:', error);
    // CRITICAL: Even on error, return a valid response with at least one actionable item
    res.status(500).json({
      message: 'Welcome to FinSight AI! We\'re analyzing your financial data to provide personalized recommendations.',
      actionableItems: [{
        title: 'Explore Your Financial Dashboard',
        description: 'Review your financial profile, recommendations, and insights to understand your financial health better.',
        priority: 'medium'
      }]
    });
  }
});

// Spending Analysis Endpoint
app.get('/api/spending-analysis/:user_id', requireConsent, async (req: Request, res: Response) => {
  const { user_id: userId } = req.params;
  const months = parseInt(req.query.months as string) || 6;

  try {
    const analysis = await getSpendingAnalysis(userId, months);
    res.json({
      user_id: userId,
      ...analysis,
      months
    });
  } catch (error: any) {
    console.error('Error fetching spending analysis:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch spending analysis' });
  }
});

// Backfill Historical Personas Endpoint (Admin only - one-time operation)
// Returns immediately and runs in background to avoid hanging
app.post('/api/admin/backfill-historical-personas', async (req: Request, res: Response) => {
  try {
    const { months, user_id } = req.body;
    const monthsBack = months || 12;
    
    // Return immediately - backfill runs in background
    res.json({ 
      success: true, 
      message: `Historical persona backfill started for ${user_id ? 'user' : 'all users'} (${monthsBack} months). Check server logs for progress.` 
    });
    
    // Run backfill in background (don't await)
    (async () => {
      try {
        if (user_id) {
          // Backfill single user
          const { backfillUserPersonas } = await import('../scripts/backfillHistoricalPersonas');
          await backfillUserPersonas(user_id, monthsBack);
          console.log(`✅ Backfill complete for user: ${user_id}`);
        } else {
          // Backfill all users
          const { backfillAllHistoricalPersonas } = await import('../scripts/backfillHistoricalPersonas');
          await backfillAllHistoricalPersonas(monthsBack);
          console.log(`✅ Backfill complete for all users`);
        }
      } catch (error: any) {
        console.error('Error in background backfill:', error);
      }
    })();
  } catch (error: any) {
    console.error('Error starting backfill:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Sample Users Endpoint - Get one user per persona for login screen
app.get('/api/sample-users', async (req: Request, res: Response) => {
  try {
    const { all } = await import('../db/db');
    
    // Get one user per persona type
    // For each persona, get the first user (alphabetically by name) with that persona
    const allUsers = await all<{
      user_id: string;
      name: string;
      email: string;
      persona_type: string;
    }>(`
      SELECT 
        u.user_id,
        u.name,
        u.email,
        p.persona_type
      FROM users u
      INNER JOIN personas p ON u.user_id = p.user_id
      WHERE p.assigned_at = (
        SELECT MAX(assigned_at) 
        FROM personas 
        WHERE user_id = u.user_id
      )
      ORDER BY p.persona_type, u.name
    `);

    // Group by persona and take first user for each
    // CRITICAL: Prioritize Diana Huang for savings_builder persona if she exists
    // CRITICAL: Must return exactly 5 users, one for each persona type
    const personaMap = new Map<string, typeof allUsers[0]>();
    
    // First pass: Find Diana Huang and prioritize her for her persona
    let dianaHuang: typeof allUsers[0] | null = null;
    for (const user of allUsers) {
      if (user.name.toLowerCase() === 'diana huang') {
        dianaHuang = user;
        break;
      }
    }
    
    // If Diana Huang exists, add her first for her persona
    if (dianaHuang) {
      personaMap.set(dianaHuang.persona_type, dianaHuang);
    }
    
    // Then add other users for personas that don't have a user yet
    for (const user of allUsers) {
      if (!personaMap.has(user.persona_type)) {
        personaMap.set(user.persona_type, user);
      }
    }
    
    // CRITICAL: Only return users that actually exist in the database
    // Define all 5 persona types in order
    const allPersonaTypes: Array<'high_utilization' | 'variable_income' | 'subscription_heavy' | 'savings_builder' | 'lifestyle_creep'> = [
      'high_utilization',
      'variable_income',
      'subscription_heavy',
      'savings_builder',
      'lifestyle_creep'
    ];
    
    // Build final array - only include users that exist in the database
    const finalUsers: Array<{
      username: string;
      name: string;
      persona: string;
      description: string;
    }> = [];
    
    // Import username utility to check if fallback users exist
    const { findUserByUsername } = await import('../utils/username');
    
    for (const personaType of allPersonaTypes) {
      const user = personaMap.get(personaType);
      if (user) {
        // Use real user from database
        const username = user.name.toLowerCase().replace(/\s+/g, '.');
        finalUsers.push({
          username,
          name: user.name,
          persona: user.persona_type,
          description: getPersonaDescription(user.persona_type)
        });
      } else {
        // Fallback: Try to use a default user for this persona type
        // BUT only if that user actually exists in the database
        const fallbackUsers: Record<string, { name: string; username: string }> = {
          'high_utilization': { name: 'Marcus Chen', username: 'marcus.chen' },
          'variable_income': { name: 'Jordan Kim', username: 'jordan.kim' },
          'subscription_heavy': { name: 'Taylor Park', username: 'taylor.park' },
          'savings_builder': { name: 'Diana Huang', username: 'diana.huang' },
          'lifestyle_creep': { name: 'Samantha Carson', username: 'samantha.carson' }
        };
        
        const fallback = fallbackUsers[personaType];
        // Verify the fallback user exists before adding them
        const fallbackUserExists = await findUserByUsername(fallback.username);
        if (fallbackUserExists) {
          finalUsers.push({
            username: fallback.username,
            name: fallback.name,
            persona: personaType,
            description: getPersonaDescription(personaType)
          });
        }
        // If fallback user doesn't exist, skip this persona (don't add to finalUsers)
        // This prevents showing users that can't log in
      }
    }

    res.json({ users: finalUsers });
  } catch (error: any) {
    console.error('Error fetching sample users:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

function getPersonaDescription(personaType: string): string {
  const descriptions: Record<string, string> = {
    'high_utilization': 'High credit utilization focus',
    'variable_income': 'Variable income budgeting',
    'subscription_heavy': 'Multiple subscriptions',
    'savings_builder': 'Building healthy savings habits',
    'lifestyle_creep': 'High income, low savings rate'
  };
  return descriptions[personaType] || 'Financial insights';
}

// Admin Login Endpoint
app.post('/api/admin/login', async (req: Request, res: Response) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const isValid = verifyAdminPassword(password);
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  res.json({ success: true, message: 'Login successful' });
});

// Admin Users Endpoint
app.get('/api/admin/users', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;

    let result;
    if (search) {
      result = await searchUsers(search, page, limit);
    } else {
      result = await getUsersWithConsent(page, limit);
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});

// Admin User Detail Endpoint
app.get('/api/admin/user/:user_id', async (req: Request, res: Response) => {
  try {
    const userId = req.params.user_id;
    const adminId = 'admin'; // Hardcoded for demo

    // Log the admin action
    await logAdminAction(adminId, userId, 'viewed_profile');

    const userDetail = await getUserDetail(userId);

    if (!userDetail) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(userDetail);
  } catch (error: any) {
    console.error('Error fetching user detail:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch user detail' });
  }
});

// Admin Audit Log Endpoint
app.get('/api/admin/audit', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const adminId = req.query.adminId as string;
    const userId = req.query.userId as string;
    const action = req.query.action as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const filters = {
      adminId,
      userId,
      action,
      startDate,
      endDate,
    };

    const result = await getAuditLog(filters, page, limit);
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch audit log' });
  }
});

// Root path - serve simple HTML page
app.get('/', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>FinSight AI API</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            line-height: 1.6;
          }
          h1 { color: #2563eb; }
          code { background: #f3f4f6; padding: 2px 6px; border-radius: 3px; }
          .endpoint { background: #f9fafb; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 3px solid #2563eb; }
        </style>
      </head>
      <body>
        <h1>🚀 FinSight AI Backend API</h1>
        <p>This is the backend API server. The frontend application should be running on <code>http://localhost:3000</code>.</p>
        
        <h2>Available Endpoints:</h2>
        <div class="endpoint">
          <strong>GET</strong> <code>/api/health</code> - Health check endpoint
        </div>
        <div class="endpoint">
          <strong>GET</strong> <code>/api</code> - API welcome message
        </div>
        
        <h2>Quick Start:</h2>
        <p>To run the full application:</p>
        <pre style="background: #1f2937; color: #f9fafb; padding: 15px; border-radius: 5px; overflow-x: auto;">
npm run dev
</pre>
        <p>This will start both the frontend (port 3000) and backend (port 3002) servers.</p>
      </body>
    </html>
  `);
});

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendDistPath = path.join(__dirname, '../../frontend/dist');
  
  // Serve static files
  app.use(express.static(frontendDistPath));
  
  // Handle React Router - send all non-API requests to index.html
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
  
  console.log(`📦 Serving frontend from ${frontendDistPath}`);
}

app.listen(PORT, () => {
  console.log(`🚀 FinSight AI Backend running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Database: ${process.env.DATABASE_PATH || 'backend/finsight.db'}`);
});

