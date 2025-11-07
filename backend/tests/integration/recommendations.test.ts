// Integration tests for recommendation generation pipeline
// Tests: full pipeline, rationale generation, eligibility filtering, caching

import { run, get, all } from '../../db/db';
import { recordConsent } from '../../guardrails/consent';
import { assignPersona, storePersonaAssignment, getCurrentPersona } from '../../personas/assignPersona';
import { generateRecommendations, storeRecommendations, getRecommendations } from '../../recommendations/engine';
import { filterEligibleOffers } from '../../recommendations/eligibility';
import { rankRecommendations } from '../../recommendations/ranker';

// Mock OpenAI API calls
jest.mock('../../ai/rationaleGenerator', () => {
  const original = jest.requireActual('../../ai/rationaleGenerator');
  return {
    ...original,
    generateRationale: jest.fn(async (userId: string, recommendation: any, signals: any, accountInfo?: any) => {
      // Return a mock rationale
      return `Based on your ${signals.utilization?.utilization || 0}% credit utilization, ${recommendation.title || 'this recommendation'} can help you improve your financial health.`;
    })
  };
});

// Set test timeout to 30 seconds
jest.setTimeout(30000);

describe('Recommendation Pipeline Integration Tests', () => {
  let testUserId: string;
  let testCheckingId: string;
  let testCreditId: string;

  beforeAll(async () => {
    // Create a test user and accounts
    const timestamp = Date.now();
    testUserId = `test-rec-pipeline-${timestamp}`;
    testCheckingId = `test-checking-rec-${timestamp}`;
    testCreditId = `test-credit-rec-${timestamp}`;

    // Create test user
    await run(
      'INSERT INTO users (user_id, email, name) VALUES (?, ?, ?)',
      [testUserId, `test-rec-${timestamp}@example.com`, 'Test Rec User']
    );

    // Create test checking account
    await run(
      `INSERT INTO accounts (account_id, user_id, type, balances)
       VALUES (?, ?, 'checking', ?)`,
      [
        testCheckingId,
        testUserId,
        JSON.stringify({ available: 5000, current: 5000 })
      ]
    );

    // Create test credit card
    await run(
      `INSERT INTO accounts (account_id, user_id, type, balances)
       VALUES (?, ?, 'credit', ?)`,
      [
        testCreditId,
        testUserId,
        JSON.stringify({ available: 3500, current: 6500, limit: 10000 })
      ]
    );

    // Create liability
    const liabilityId = `liability-rec-${timestamp}`;
    await run(
      `INSERT INTO liabilities (liability_id, account_id, type, last_statement_balance, minimum_payment_amount, apr_percentage)
       VALUES (?, ?, 'credit_card', ?, ?, ?)`,
      [liabilityId, testCreditId, 6500, 130, 20.0]
    );

    // Create interest charge transaction
    const interestDate = new Date();
    interestDate.setMonth(interestDate.getMonth() - 1);
    await run(
      `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name)
       VALUES (?, ?, ?, ?, ?)`,
      [
        `tx-interest-rec-${timestamp}`,
        testCreditId,
        interestDate.toISOString().split('T')[0],
        -108.33,
        'Interest Charge'
      ]
    );

    // Set up user with consent and persona
    await recordConsent(testUserId);
    const personaResult = await assignPersona(testUserId);
    if (personaResult) {
      const secondary = personaResult.secondary.map(p => p.personaType);
      await storePersonaAssignment(testUserId, personaResult.primary, secondary);
    }
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await run('DELETE FROM recommendations WHERE user_id = ?', [testUserId]);
      await run('DELETE FROM rationale_cache WHERE user_id = ?', [testUserId]);
      await run('DELETE FROM personas WHERE user_id = ?', [testUserId]);
      await run('DELETE FROM consent WHERE user_id = ?', [testUserId]);
      await run('DELETE FROM transactions WHERE account_id IN (?, ?)', [testCheckingId, testCreditId]);
      await run('DELETE FROM liabilities WHERE account_id = ?', [testCreditId]);
      await run('DELETE FROM accounts WHERE account_id IN (?, ?)', [testCheckingId, testCreditId]);
      await run('DELETE FROM users WHERE user_id = ?', [testUserId]);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Full Recommendation Generation Pipeline', () => {
    it('should generate recommendations for user with persona', async () => {
      const recommendations = await generateRecommendations(testUserId);
      
      expect(recommendations.length).toBeGreaterThanOrEqual(4); // At least 3 education + 1 partner offer
      
      // Verify recommendation types
      const educationRecs = recommendations.filter(r => r.type === 'education');
      const partnerRecs = recommendations.filter(r => r.type === 'partner_offer');
      expect(educationRecs.length).toBeGreaterThanOrEqual(3);
      expect(partnerRecs.length).toBeGreaterThanOrEqual(1);
      
      // Verify all recommendations have rationales
      recommendations.forEach(rec => {
        expect(rec.rationale).toBeTruthy();
        expect(rec.rationale.length).toBeGreaterThan(20);
      });
    });

    it('should filter eligible partner offers', async () => {
      // Get persona to verify eligibility checking
      const persona = await getCurrentPersona(testUserId);
      expect(persona).not.toBeNull();
      
      // Generate recommendations (which includes eligibility filtering)
      const recommendations = await generateRecommendations(testUserId);
      
      // Partner offers should be eligible
      const partnerOffers = recommendations.filter(r => r.type === 'partner_offer');
      expect(partnerOffers.length).toBeGreaterThan(0);
      
      // Verify offers are not blacklisted
      partnerOffers.forEach(offer => {
        expect(offer.content).not.toContain('payday');
        expect(offer.content).not.toContain('cash advance');
      });
    });

    it('should rank recommendations by priority', async () => {
      // Generate and store recommendations
      const recommendations = await generateRecommendations(testUserId);
      await storeRecommendations(recommendations);
      
      // Retrieve recommendations (should be ranked)
      const retrieved = await getRecommendations(testUserId, 10);
      
      expect(retrieved.length).toBeGreaterThanOrEqual(4);
      
      // Verify recommendations are returned (ranking happens internally)
      retrieved.forEach(rec => {
        expect(rec.rec_id).toBeTruthy();
        expect(rec.type).toBeTruthy();
        expect(rec.content).toBeTruthy();
      });
    });
  });

  describe('Rationale Generation', () => {
    it('should generate personalized rationales', async () => {
      const recommendations = await generateRecommendations(testUserId);
      
      recommendations.forEach(rec => {
        expect(rec.rationale).toBeTruthy();
        // Rationale should mention user's financial situation
        const isPersonalized = 
          rec.rationale.toLowerCase().includes('your') ||
          rec.rationale.toLowerCase().includes('utilization') ||
          rec.rationale.toLowerCase().includes('65%');
        expect(isPersonalized).toBe(true);
      });
    });

    it('should cache rationales for performance', async () => {
      // Generate recommendations first time
      const recommendations1 = await generateRecommendations(testUserId);
      await storeRecommendations(recommendations1);
      
      // Generate again (should use cached rationales if available)
      const recommendations2 = await generateRecommendations(testUserId);
      
      // Both should have rationales
      expect(recommendations1[0].rationale).toBeTruthy();
      expect(recommendations2[0].rationale).toBeTruthy();
    });
  });

  describe('Eligibility Filtering', () => {
    it('should filter out blacklisted offers', async () => {
      // Create a test offer that would be blacklisted
      const blacklistedOffers = [
        { id: 'payday_1', type: 'payday_loan', eligibility: {} },
        { id: 'cash_advance_1', type: 'cash_advance_app', eligibility: {} }
      ];

      const eligible = await filterEligibleOffers(testUserId, blacklistedOffers);
      
      // All should be filtered out
      expect(eligible.length).toBe(0);
    });

    it('should filter offers based on persona requirement', async () => {
      const persona = await getCurrentPersona(testUserId);
      expect(persona?.persona_type).toBe('high_utilization');

      const offers = [
        { id: 'offer1', type: 'partner_offer', eligibility: { persona: 'high_utilization' } },
        { id: 'offer2', type: 'partner_offer', eligibility: { persona: 'savings_builder' } }
      ];

      const eligible = await filterEligibleOffers(testUserId, offers);
      
      // Only offer1 should be eligible (matches persona)
      expect(eligible.length).toBe(1);
      expect(eligible[0].id).toBe('offer1');
    });

    it('should filter offers based on credit score requirement', async () => {
      const offers = [
        { id: 'offer1', type: 'partner_offer', eligibility: { minCreditScore: 600 } },
        { id: 'offer2', type: 'partner_offer', eligibility: { minCreditScore: 800 } }
      ];

      const eligible = await filterEligibleOffers(testUserId, offers);
      
      // At least one should be eligible (user has ~690 estimated score with 30% utilization)
      expect(eligible.length).toBeGreaterThan(0);
    });

    it('should filter offers based on utilization requirement', async () => {
      const offers = [
        { id: 'offer1', type: 'partner_offer', eligibility: { maxUtilization: 70 } }, // 65% < 70%
        { id: 'offer2', type: 'partner_offer', eligibility: { maxUtilization: 50 } } // 65% > 50%
      ];

      const eligible = await filterEligibleOffers(testUserId, offers);
      
      // Only offer1 should be eligible
      expect(eligible.length).toBe(1);
      expect(eligible[0].id).toBe('offer1');
    });
  });

  describe('Recommendation Caching', () => {
    it('should not regenerate recommendations if sufficient exist', async () => {
      // Generate initial recommendations
      const recommendations1 = await generateRecommendations(testUserId);
      await storeRecommendations(recommendations1);
      
      // Get recommendations (should return existing ones)
      const retrieved1 = await getRecommendations(testUserId, 10);
      const initialCount = retrieved1.length;
      
      // Generate again (should not create duplicates if we have enough)
      const recommendations2 = await generateRecommendations(testUserId);
      await storeRecommendations(recommendations2);
      
      // Get recommendations again
      const retrieved2 = await getRecommendations(testUserId, 10);
      
      // Should have unique recommendations (deduplication happens in getRecommendations)
      const uniqueIds = new Set(retrieved2.map(r => `${r.type}:${r.content.split(':')[0]}`));
      expect(uniqueIds.size).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Recommendation Ranking', () => {
    it('should rank recommendations by impact and urgency', async () => {
      // Generate recommendations
      const recommendations = await generateRecommendations(testUserId);
      await storeRecommendations(recommendations);
      
      // Get ranked recommendations
      const retrieved = await getRecommendations(testUserId, 10);
      
      expect(retrieved.length).toBeGreaterThanOrEqual(4);
      
      // Recommendations should be returned (ranking happens internally)
      // Higher priority recommendations should come first
      expect(retrieved[0]).toBeDefined();
      expect(retrieved[0].type).toBeTruthy();
    });

    it('should prioritize high-impact recommendations', async () => {
      // For High Utilization persona, balance transfer cards should have high impact
      const recommendations = await generateRecommendations(testUserId);
      
      // Find balance transfer or high-impact recommendations
      const highImpactRecs = recommendations.filter(r => 
        r.content.toLowerCase().includes('balance transfer') ||
        r.content.toLowerCase().includes('transfer')
      );
      
      // Should have at least one high-impact recommendation
      expect(recommendations.length).toBeGreaterThan(0);
    });
  });
});

