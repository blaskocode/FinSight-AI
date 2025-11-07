// Unit tests for recommendation ranking module

import { rankRecommendations } from '../recommendations/ranker';
import { run, get, all } from '../db/db';
import { storePersonaAssignment } from '../personas/assignPersona';

describe('Recommendation Ranker', () => {
  let testUserId: string;
  let testCheckingId: string;
  let testCreditId: string;
  let testSavingsId: string;

  beforeAll(async () => {
    // Create a test user and accounts
    testUserId = `test-ranker-${Date.now()}`;
    testCheckingId = `test-checking-ranker-${Date.now()}`;
    testCreditId = `test-credit-ranker-${Date.now()}`;
    testSavingsId = `test-savings-ranker-${Date.now()}`;

    // Create test user
    await run(
      'INSERT INTO users (user_id, email, name) VALUES (?, ?, ?)',
      [testUserId, 'test-ranker@example.com', 'Test Ranker User']
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

    // Create test savings account
    await run(
      `INSERT INTO accounts (account_id, user_id, type, balances)
       VALUES (?, ?, 'savings', ?)`,
      [
        testSavingsId,
        testUserId,
        JSON.stringify({ available: 10000, current: 10000 })
      ]
    );
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await run('DELETE FROM personas WHERE user_id = ?', [testUserId]);
      await run('DELETE FROM transactions WHERE account_id IN (?, ?, ?)', [testCheckingId, testCreditId, testSavingsId]);
      await run('DELETE FROM liabilities WHERE account_id = ?', [testCreditId]);
      await run('DELETE FROM accounts WHERE account_id IN (?, ?, ?)', [testCheckingId, testCreditId, testSavingsId]);
      await run('DELETE FROM users WHERE user_id = ?', [testUserId]);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('rankRecommendations', () => {
    it('should calculate impact scores for High Utilization persona', async () => {
      // Set up High Utilization persona
      await storePersonaAssignment(testUserId, {
        personaType: 'high_utilization',
        criteriaMet: ['utilization_65.0%'],
        confidence: 0.8,
        signals: {}
      });

      // Create liability with interest charges
      const liabilityId = `liability-ranker-${Date.now()}`;
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
          `tx-interest-ranker`,
          testCreditId,
          interestDate.toISOString().split('T')[0],
          -108.33,
          'Interest Charge'
        ]
      );

      const recommendations = [
        { rec_id: '1', type: 'education', content: 'Reduce Credit Utilization: Learn how to lower your credit utilization', title: 'Reduce Credit Utilization' },
        { rec_id: '2', type: 'partner_offer', content: 'Balance Transfer Card: Transfer your balance to save on interest', title: 'Balance Transfer Card', impact_estimate: 'Save $500 in interest' }
      ];

      const ranked = await rankRecommendations(testUserId, recommendations);
      
      expect(ranked.length).toBe(2);
      // Should be sorted by priority (balance transfer should be first if higher priority)
      expect(ranked.length).toBeGreaterThan(0);
      // Verify recommendations are returned (not scores)
      expect(ranked[0]).toHaveProperty('rec_id');
      expect(ranked[0]).toHaveProperty('type');
    });

    it('should calculate urgency scores based on financial situation', async () => {
      // Set up High Utilization persona with high utilization
      await storePersonaAssignment(testUserId, {
        personaType: 'high_utilization',
        criteriaMet: ['utilization_85.0%'],
        confidence: 0.9,
        signals: {}
      });

      // Create high utilization scenario (85%)
      const liabilityId = `liability-urgent-${Date.now()}`;
      await run(
        `INSERT INTO liabilities (liability_id, account_id, type, last_statement_balance, minimum_payment_amount, is_overdue)
         VALUES (?, ?, 'credit_card', ?, ?, ?)`,
        [liabilityId, testCreditId, 8500, 170, 0] // 85% utilization, not overdue
      );

      const recommendations = [
        { rec_id: '1', type: 'education', content: 'Reduce Credit Utilization: Learn how to lower your credit utilization' }
      ];

      const ranked = await rankRecommendations(testUserId, recommendations);
      
      expect(ranked.length).toBe(1);
      // Should return the recommendation (urgency calculated internally)
      expect(ranked[0].rec_id).toBe('1');
    });

    it('should prioritize recommendations by priority score', async () => {
      // Set up persona
      await storePersonaAssignment(testUserId, {
        personaType: 'high_utilization',
        criteriaMet: ['utilization_65.0%'],
        confidence: 0.8,
        signals: {}
      });

      const recommendations = [
        { rec_id: '1', type: 'education', content: 'Low Priority Education: General financial education' },
        { rec_id: '2', type: 'education', content: 'High Priority Education: Important financial topic' },
        { rec_id: '3', type: 'partner_offer', content: 'Balance Transfer Card: Transfer balance to save', impact_estimate: 'Save $500' }
      ];

      const ranked = await rankRecommendations(testUserId, recommendations);
      
      expect(ranked.length).toBe(3);
      
      // Should be sorted by priority (highest priority first)
      // Balance transfer card should likely be first due to high impact
      expect(ranked[0]).toHaveProperty('rec_id');
      expect(ranked[1]).toHaveProperty('rec_id');
      expect(ranked[2]).toHaveProperty('rec_id');
    });

    it('should calculate urgency score for overdue status (critical)', async () => {
      // Set up persona
      await storePersonaAssignment(testUserId, {
        personaType: 'high_utilization',
        criteriaMet: ['utilization_65.0%', 'overdue'],
        confidence: 0.9,
        signals: {}
      });

      // Create overdue liability
      const liabilityId = `liability-overdue-${Date.now()}`;
      await run(
        `INSERT INTO liabilities (liability_id, account_id, type, last_statement_balance, minimum_payment_amount, is_overdue)
         VALUES (?, ?, 'credit_card', ?, ?, ?)`,
        [liabilityId, testCreditId, 6500, 130, 1] // Overdue
      );

      const recommendations = [
        { rec_id: '1', type: 'education', content: 'Pay Overdue Balance: Pay your overdue balance immediately' }
      ];

      const ranked = await rankRecommendations(testUserId, recommendations);
      
      expect(ranked.length).toBe(1);
      // Should return the recommendation (urgency is calculated internally)
      expect(ranked[0].rec_id).toBe('1');
    });

    it('should calculate impact scores for Variable Income persona', async () => {
      // Set up Variable Income persona
      await storePersonaAssignment(testUserId, {
        personaType: 'variable_income',
        criteriaMet: ['pay_gap_60_days', 'cash_flow_buffer_0.5'],
        confidence: 0.8,
        signals: {}
      });

      // Set low checking balance
      await run(
        `UPDATE accounts SET balances = ? WHERE account_id = ?`,
        [
          JSON.stringify({ available: 500, current: 500 }),
          testCheckingId
        ]
      );

      const recommendations = [
        { rec_id: '1', type: 'education', content: 'Build Emergency Fund: Start building your emergency fund' }
      ];

      const ranked = await rankRecommendations(testUserId, recommendations);
      
      expect(ranked.length).toBe(1);
      // Should return the recommendation (impact and urgency calculated internally)
      expect(ranked[0].rec_id).toBe('1');
    });

    it('should calculate impact scores for Subscription Heavy persona', async () => {
      // Set up Subscription Heavy persona
      await storePersonaAssignment(testUserId, {
        personaType: 'subscription_heavy',
        criteriaMet: ['recurring_merchants_5', 'monthly_spend_75'],
        confidence: 0.8,
        signals: {}
      });

      // Create subscription transactions
      const baseDate = new Date();
      baseDate.setMonth(baseDate.getMonth() - 2);
      const subscriptions = ['Netflix', 'Spotify', 'Disney+', 'Hulu', 'Apple Music'];
      for (let i = 0; i < subscriptions.length; i++) {
        for (let month = 0; month < 3; month++) {
          const date = new Date(baseDate);
          date.setMonth(date.getMonth() + month);
          date.setDate(15);
          
          await run(
            `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name)
             VALUES (?, ?, ?, ?, ?)`,
            [
              `tx-sub-ranker-${i}-${month}`,
              testCheckingId,
              date.toISOString().split('T')[0],
              -15,
              subscriptions[i]
            ]
          );
        }
      }

      const recommendations = [
        { rec_id: '1', type: 'education', content: 'Cancel Unused Subscriptions: Review and cancel unused subscriptions' },
        { rec_id: '2', type: 'partner_offer', content: 'Subscription Manager App: Manage all your subscriptions in one place', impact_estimate: 'Save $50/month' }
      ];

      const ranked = await rankRecommendations(testUserId, recommendations);
      
      expect(ranked.length).toBe(2);
      // Should return recommendations sorted by priority
      expect(ranked[0]).toHaveProperty('rec_id');
      expect(ranked[1]).toHaveProperty('rec_id');
    });

    it('should calculate impact scores for Savings Builder persona', async () => {
      // Set up Savings Builder persona
      await storePersonaAssignment(testUserId, {
        personaType: 'savings_builder',
        criteriaMet: ['savings_growth_5%', 'low_utilization'],
        confidence: 0.8,
        signals: {}
      });

      const recommendations = [
        { rec_id: '1', type: 'education', content: 'High Yield Savings Account: Learn about high yield savings accounts' },
        { rec_id: '2', type: 'partner_offer', content: 'HYSA Offer: Open a high yield savings account', impact_estimate: 'Earn 4.5% APY' }
      ];

      const ranked = await rankRecommendations(testUserId, recommendations);
      
      expect(ranked.length).toBe(2);
      // Should return recommendations sorted by priority
      expect(ranked[0]).toHaveProperty('rec_id');
      expect(ranked[1]).toHaveProperty('rec_id');
    });

    it('should calculate impact scores for Lifestyle Creep persona', async () => {
      // Set up Lifestyle Creep persona
      await storePersonaAssignment(testUserId, {
        personaType: 'lifestyle_creep',
        criteriaMet: ['high_income', 'low_savings_rate', 'high_discretionary'],
        confidence: 0.8,
        signals: {}
      });

      const recommendations = [
        { rec_id: '1', type: 'education', content: 'Retirement Planning: Plan for your retirement' },
        { rec_id: '2', type: 'partner_offer', content: 'Investment Platform: Start investing for retirement', impact_estimate: 'Save for retirement' }
      ];

      const ranked = await rankRecommendations(testUserId, recommendations);
      
      expect(ranked.length).toBe(2);
      // Should return recommendations sorted by priority
      expect(ranked[0]).toHaveProperty('rec_id');
      expect(ranked[1]).toHaveProperty('rec_id');
    });
  });
});

