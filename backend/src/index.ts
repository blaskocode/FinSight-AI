import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { assignHighUtilizationPersona, storePersonaAssignment, getCurrentPersona } from '../personas/assignPersona';
import { generateRecommendations, storeRecommendations, getRecommendations } from '../recommendations/engine';
import { recordConsent, revokeConsent, getConsentRecord } from '../guardrails/consent';
import { requireConsent } from '../middleware/requireConsent';
import { get } from '../db/db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

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

    // Verify user exists
    const user = await get('SELECT * FROM users WHERE user_id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check for existing persona assignment
    let currentPersona = await getCurrentPersona(userId);

    // If no persona assigned or we want to recalculate, assign persona
    if (!currentPersona) {
      const assignment = await assignHighUtilizationPersona(userId);
      
      if (assignment) {
        // Store the assignment
        const personaId = await storePersonaAssignment(userId, assignment);
        
        // Get the stored persona
        currentPersona = await getCurrentPersona(userId);
      } else {
        // No persona matches (shouldn't happen for MVP with only High Utilization)
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
        criteria_met: currentPersona.signals.criteriaMet
      },
      signals: {
        utilization: currentPersona.signals.utilization,
        minimum_payment_only: currentPersona.signals.minimumPaymentOnly,
        interest_charges: currentPersona.signals.interestCharges,
        is_overdue: currentPersona.signals.isOverdue
      }
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

    // Check if recommendations already exist (get unique ones)
    let recommendations = await getRecommendations(userId, 10);

    // If we have fewer than 4 recommendations (expected: 3 education + 1 partner offer), generate new ones
    // But only if we don't already have recommendations of each type
    const educationCount = recommendations.filter(r => r.type === 'education').length;
    const partnerOfferCount = recommendations.filter(r => r.type === 'partner_offer').length;
    
    if (educationCount < 3 || partnerOfferCount < 1) {
      // Generate new recommendations
      const newRecommendations = await generateRecommendations(userId);
      
      // Store new recommendations in database
      await storeRecommendations(newRecommendations);
      
      // Get all recommendations again (will be deduplicated)
      recommendations = await getRecommendations(userId, 10);
    }

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

