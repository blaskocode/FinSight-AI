// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
import path from 'path';

// Load .env file from backend directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import express, { Request, Response } from 'express';
import cors from 'cors';
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

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Performance: Add caching headers for GET requests
app.use((req: Request, res: Response, next) => {
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
        res.status(404).json({
          error: 'No active consent found',
          message: 'User does not have an active consent to revoke'
        });
      }
    }

  } catch (error: any) {
    console.error('Error processing consent:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
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
    const FORCE_RECALC = true;
    
    // If no persona assigned or we want to recalculate, assign persona
    if (!currentPersona || FORCE_RECALC) {
      if (FORCE_RECALC && currentPersona) {
        console.log('🔄 FORCE RECALCULATING PERSONA (testing mode)');
        // Delete existing persona to recalculate
        await run('DELETE FROM personas WHERE user_id = ?', [userId]);
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
app.get('/api/payment-plan/:user_id', requireConsent, async (req, res) => {
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

app.get('/api/payment-plan/:user_id/compare', requireConsent, async (req, res) => {
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
app.post('/api/chat/:user_id', requireConsent, async (req, res) => {
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
app.get('/api/transactions/:user_id', requireConsent, async (req, res) => {
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
app.get('/api/persona-history/:user_id', requireConsent, async (req, res) => {
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

// Spending Analysis Endpoint
app.get('/api/spending-analysis/:user_id', requireConsent, async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`🚀 FinSight AI Backend running on http://localhost:${PORT}`);
});

