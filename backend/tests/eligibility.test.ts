// Unit tests for eligibility checking module

import { checkEligibility, filterEligibleOffers } from '../recommendations/eligibility';
import { run, get, all } from '../db/db';
import { storePersonaAssignment } from '../personas/assignPersona';

describe('Eligibility Checking', () => {
  let testUserId: string;
  let testCheckingId: string;
  let testCreditId: string;
  let testSavingsId: string;

  beforeAll(async () => {
    // Create a test user and accounts
    testUserId = `test-eligibility-${Date.now()}`;
    testCheckingId = `test-checking-eligibility-${Date.now()}`;
    testCreditId = `test-credit-eligibility-${Date.now()}`;
    testSavingsId = `test-savings-eligibility-${Date.now()}`;

    // Create test user
    await run(
      'INSERT INTO users (user_id, email, name) VALUES (?, ?, ?)',
      [testUserId, 'test-eligibility@example.com', 'Test Eligibility User']
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
        JSON.stringify({ available: 7000, current: 3000, limit: 10000 })
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

  describe('checkEligibility', () => {
    it('should filter blacklisted offers', async () => {
      const blacklistedOffer = {
        id: 'payday_loan_1',
        type: 'payday_loan',
        eligibility: {}
      };

      const isEligible = await checkEligibility(testUserId, blacklistedOffer);
      expect(isEligible).toBe(false);
    });

    it('should allow offers with no eligibility criteria', async () => {
      const offer = {
        id: 'general_offer',
        type: 'education',
        eligibility: undefined
      };

      const isEligible = await checkEligibility(testUserId, offer);
      expect(isEligible).toBe(true);
    });

    it('should check persona requirement', async () => {
      // Set up High Utilization persona
      await storePersonaAssignment(testUserId, {
        personaType: 'high_utilization',
        criteriaMet: ['utilization_30.0%'],
        confidence: 0.7,
        signals: {}
      });

      // Create liability for 30% utilization
      const liabilityId = `liability-eligibility-${Date.now()}`;
      await run(
        `INSERT INTO liabilities (liability_id, account_id, type, last_statement_balance, minimum_payment_amount)
         VALUES (?, ?, 'credit_card', ?, ?)`,
        [liabilityId, testCreditId, 3000, 60]
      );

      const personaOffer = {
        id: 'persona_offer',
        type: 'partner_offer',
        eligibility: {
          persona: 'high_utilization'
        }
      };

      const isEligible = await checkEligibility(testUserId, personaOffer);
      expect(isEligible).toBe(true);

      // Test with wrong persona
      const wrongPersonaOffer = {
        id: 'wrong_persona_offer',
        type: 'partner_offer',
        eligibility: {
          persona: 'savings_builder'
        }
      };

      const isEligibleWrong = await checkEligibility(testUserId, wrongPersonaOffer);
      expect(isEligibleWrong).toBe(false);
    });

    it('should check credit score requirement', async () => {
      // Create liability with low utilization (should result in higher credit score)
      const liabilityId = `liability-credit-${Date.now()}`;
      await run(
        `INSERT INTO liabilities (liability_id, account_id, type, last_statement_balance, minimum_payment_amount, is_overdue)
         VALUES (?, ?, 'credit_card', ?, ?, ?)`,
        [liabilityId, testCreditId, 3000, 60, 0] // 30% utilization, not overdue
      );

      const highScoreOffer = {
        id: 'high_score_offer',
        type: 'partner_offer',
        eligibility: {
          minCreditScore: 650
        }
      };

      const isEligible = await checkEligibility(testUserId, highScoreOffer);
      // Should be eligible with 30% utilization (estimated score ~690)
      expect(isEligible).toBe(true);

      const veryHighScoreOffer = {
        id: 'very_high_score_offer',
        type: 'partner_offer',
        eligibility: {
          minCreditScore: 800
        }
      };

      const isEligibleVeryHigh = await checkEligibility(testUserId, veryHighScoreOffer);
      expect(isEligibleVeryHigh).toBe(false);
    });

    it('should check utilization requirement', async () => {
      // Create liability with 30% utilization
      const liabilityId = `liability-util-${Date.now()}`;
      await run(
        `INSERT INTO liabilities (liability_id, account_id, type, last_statement_balance, minimum_payment_amount)
         VALUES (?, ?, 'credit_card', ?, ?)`,
        [liabilityId, testCreditId, 3000, 60]
      );

      const lowUtilOffer = {
        id: 'low_util_offer',
        type: 'partner_offer',
        eligibility: {
          maxUtilization: 50
        }
      };

      const isEligible = await checkEligibility(testUserId, lowUtilOffer);
      expect(isEligible).toBe(true); // 30% < 50%

      const veryLowUtilOffer = {
        id: 'very_low_util_offer',
        type: 'partner_offer',
        eligibility: {
          maxUtilization: 20
        }
      };

      const isEligibleVeryLow = await checkEligibility(testUserId, veryLowUtilOffer);
      expect(isEligibleVeryLow).toBe(false); // 30% > 20%
    });

    it('should check income requirement', async () => {
      // Clean up any existing personas for this user first
      await run('DELETE FROM personas WHERE user_id = ?', [testUserId]);

      // Note: getMonthlyIncome looks for 'depository' type accounts, but schema only allows 'checking', 'savings', etc.
      // So it will fall back to persona signals. Let's use storePersonaAssignment to properly set up the persona.
      await storePersonaAssignment(testUserId, {
        personaType: 'high_utilization',
        criteriaMet: ['utilization_30.0%'],
        confidence: 0.7,
        signals: { monthlyIncome: 5000 }
      });

      const incomeOffer = {
        id: 'income_offer',
        type: 'partner_offer',
        eligibility: {
          minIncome: 4000
        }
      };

      const isEligible = await checkEligibility(testUserId, incomeOffer);
      // Should be eligible with $5000 monthly income from persona signals
      expect(isEligible).toBe(true); // $5000 > $4000

      const highIncomeOffer = {
        id: 'high_income_offer',
        type: 'partner_offer',
        eligibility: {
          minIncome: 10000
        }
      };

      const isEligibleHigh = await checkEligibility(testUserId, highIncomeOffer);
      expect(isEligibleHigh).toBe(false); // $5000 < $10000
    });

    it('should check subscription count requirement', async () => {
      // Create subscription transactions
      const baseDate = new Date();
      baseDate.setMonth(baseDate.getMonth() - 2);
      const subscriptions = ['Netflix', 'Spotify', 'Disney+'];
      for (let i = 0; i < subscriptions.length; i++) {
        for (let month = 0; month < 3; month++) {
          const date = new Date(baseDate);
          date.setMonth(date.getMonth() + month);
          date.setDate(15);
          
          await run(
            `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name)
             VALUES (?, ?, ?, ?, ?)`,
            [
              `tx-sub-eligibility-${i}-${month}`,
              testCheckingId,
              date.toISOString().split('T')[0],
              -15,
              subscriptions[i]
            ]
          );
        }
      }

      const subscriptionOffer = {
        id: 'subscription_offer',
        type: 'partner_offer',
        eligibility: {
          minSubscriptions: 2
        }
      };

      const isEligible = await checkEligibility(testUserId, subscriptionOffer);
      expect(isEligible).toBe(true); // 3 subscriptions >= 2

      const manySubscriptionsOffer = {
        id: 'many_subscriptions_offer',
        type: 'partner_offer',
        eligibility: {
          minSubscriptions: 5
        }
      };

      const isEligibleMany = await checkEligibility(testUserId, manySubscriptionsOffer);
      expect(isEligibleMany).toBe(false); // 3 subscriptions < 5
    });

    it('should detect duplicate accounts by provider/type', async () => {
      // Create existing HYSA account
      const existingHysaId = `existing-hysa-${Date.now()}`;
      await run(
        `INSERT INTO accounts (account_id, user_id, type, subtype, balances)
         VALUES (?, ?, 'savings', 'high_yield_savings', ?)`,
        [
          existingHysaId,
          testUserId,
          JSON.stringify({ available: 5000, current: 5000 })
        ]
      );

      const hysaOffer = {
        id: 'hysa_offer',
        type: 'partner_offer',
        eligibility: {
          excludeAccountTypes: ['high_yield_savings']
        }
      };

      const isEligible = await checkEligibility(testUserId, hysaOffer);
      expect(isEligible).toBe(false); // Already has HYSA

      // Cleanup
      await run('DELETE FROM accounts WHERE account_id = ?', [existingHysaId]);
    });

    it('should detect duplicate accounts by provider name', async () => {
      // Create existing account with specific provider
      const existingAccountId = `existing-provider-${Date.now()}`;
      await run(
        `INSERT INTO accounts (account_id, user_id, type, subtype, balances)
         VALUES (?, ?, 'checking', 'Chase Bank', ?)`,
        [
          existingAccountId,
          testUserId,
          JSON.stringify({ available: 3000, current: 3000 })
        ]
      );

      const providerOffer = {
        id: 'provider_offer',
        type: 'partner_offer',
        eligibility: {
          excludeExisting: ['Chase']
        }
      };

      const isEligible = await checkEligibility(testUserId, providerOffer);
      expect(isEligible).toBe(false); // Already has Chase account

      // Cleanup
      await run('DELETE FROM accounts WHERE account_id = ?', [existingAccountId]);
    });
  });

  describe('filterEligibleOffers', () => {
    it('should filter out ineligible offers', async () => {
      // Set up persona
      await storePersonaAssignment(testUserId, {
        personaType: 'high_utilization',
        criteriaMet: ['utilization_30.0%'],
        confidence: 0.7,
        signals: {}
      });

      const liabilityId = `liability-filter-${Date.now()}`;
      await run(
        `INSERT INTO liabilities (liability_id, account_id, type, last_statement_balance, minimum_payment_amount)
         VALUES (?, ?, 'credit_card', ?, ?)`,
        [liabilityId, testCreditId, 3000, 60]
      );

      const offers = [
        { id: 'eligible_1', type: 'partner_offer', eligibility: { persona: 'high_utilization' } },
        { id: 'eligible_2', type: 'partner_offer', eligibility: { maxUtilization: 50 } },
        { id: 'ineligible_1', type: 'partner_offer', eligibility: { persona: 'savings_builder' } },
        { id: 'ineligible_2', type: 'partner_offer', eligibility: { maxUtilization: 20 } },
        { id: 'blacklisted', type: 'payday_loan', eligibility: {} }
      ];

      const eligible = await filterEligibleOffers(testUserId, offers);
      
      expect(eligible.length).toBeLessThan(offers.length);
      expect(eligible.find(o => o.id === 'eligible_1')).toBeDefined();
      expect(eligible.find(o => o.id === 'eligible_2')).toBeDefined();
      expect(eligible.find(o => o.id === 'ineligible_1')).toBeUndefined();
      expect(eligible.find(o => o.id === 'ineligible_2')).toBeUndefined();
      expect(eligible.find(o => o.id === 'blacklisted')).toBeUndefined();
    });
  });
});

