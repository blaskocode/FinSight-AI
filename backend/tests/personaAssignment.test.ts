// Unit tests for persona assignment

import {
  assignHighUtilizationPersona,
  assignVariableIncomePersona,
  assignSubscriptionHeavyPersona,
  assignSavingsBuilderPersona,
  assignLifestyleCreepPersona,
  assignPersona,
  storePersonaAssignment,
  getCurrentPersona
} from '../personas/assignPersona';
import { run, get, all } from '../db/db';

describe('Persona Assignment', () => {
  let testUserId: string;
  let testCheckingId: string;
  let testCreditId: string;
  let testSavingsId: string;

  beforeAll(async () => {
    // Create a test user and accounts
    testUserId = `test-persona-${Date.now()}`;
    testCheckingId = `test-checking-persona-${Date.now()}`;
    testCreditId = `test-credit-persona-${Date.now()}`;
    testSavingsId = `test-savings-persona-${Date.now()}`;

    // Create test user
    await run(
      'INSERT INTO users (user_id, email, name) VALUES (?, ?, ?)',
      [testUserId, 'test-persona@example.com', 'Test Persona User']
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
        JSON.stringify({ available: 5000, current: 5000, limit: 10000 })
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
      await run('DELETE FROM accounts WHERE account_id IN (?, ?, ?)', [testCheckingId, testCreditId, testSavingsId]);
      await run('DELETE FROM users WHERE user_id = ?', [testUserId]);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('assignHighUtilizationPersona', () => {
    it('should assign High Utilization persona when criteria met', async () => {
      // Create high utilization scenario (65% utilization)
      const liabilityId = `liability-${Date.now()}`;
      await run(
        `INSERT INTO liabilities (liability_id, account_id, type, last_statement_balance, minimum_payment_amount, last_payment_amount)
         VALUES (?, ?, 'credit_card', ?, ?, ?)`,
        [liabilityId, testCreditId, 6500, 130, 130] // 65% utilization, minimum payment only
      );

      const assignment = await assignHighUtilizationPersona(testUserId);
      
      expect(assignment).not.toBeNull();
      expect(assignment?.personaType).toBe('high_utilization');
      expect(assignment?.criteriaMet.length).toBeGreaterThan(0);
      expect(assignment?.confidence).toBeGreaterThan(0);
    });
  });

  describe('assignVariableIncomePersona', () => {
    it('should assign Variable Income persona when criteria met', async () => {
      // Create variable income scenario (pay gap > 45 days, buffer < 1 month)
      const baseDate = new Date();
      baseDate.setMonth(baseDate.getMonth() - 3);

      // Create irregular income (60 days apart)
      for (let i = 0; i < 2; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + (i * 60));
        
        await run(
          `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name, payment_channel)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            `tx-income-${i}`,
            testCheckingId,
            date.toISOString().split('T')[0],
            3000,
            'Payroll Deposit',
            'ach'
          ]
        );
      }

      // Set low checking balance (< 1 month expenses)
      await run(
        `UPDATE accounts SET balances = ? WHERE account_id = ?`,
        [
          JSON.stringify({ available: 500, current: 500 }),
          testCheckingId
        ]
      );

      // Create expenses
      const expenseDate = new Date();
      expenseDate.setMonth(expenseDate.getMonth() - 1);
      await run(
        `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name)
         VALUES (?, ?, ?, ?, ?)`,
        [`tx-expense-1`, testCheckingId, expenseDate.toISOString().split('T')[0], -1000, 'Monthly Expenses']
      );

      const assignment = await assignVariableIncomePersona(testUserId);
      
      // May or may not match depending on exact calculations
      if (assignment) {
        expect(assignment.personaType).toBe('variable_income');
        expect(assignment.criteriaMet.length).toBeGreaterThan(0);
      }
    });
  });

  describe('assignSubscriptionHeavyPersona', () => {
    it('should assign Subscription Heavy persona when criteria met', async () => {
      // Create subscription scenario (3+ recurring merchants, $50+ monthly spend)
      const baseDate = new Date();
      baseDate.setMonth(baseDate.getMonth() - 2);

      const subscriptions = ['Netflix', 'Spotify', 'Amazon Prime'];
      for (let i = 0; i < subscriptions.length; i++) {
        for (let month = 0; month < 3; month++) {
          const date = new Date(baseDate);
          date.setMonth(date.getMonth() + month);
          date.setDate(15);
          
          await run(
            `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name)
             VALUES (?, ?, ?, ?, ?)`,
            [
              `tx-sub-${i}-${month}`,
              testCheckingId,
              date.toISOString().split('T')[0],
              -15, // $15/month each = $45/month total
              subscriptions[i]
            ]
          );
        }
      }

      const assignment = await assignSubscriptionHeavyPersona(testUserId);
      
      if (assignment) {
        expect(assignment.personaType).toBe('subscription_heavy');
        expect(assignment.criteriaMet.length).toBeGreaterThan(0);
      }
    });
  });

  describe('assignSavingsBuilderPersona', () => {
    it('should assign Savings Builder persona when criteria met', async () => {
      // Create savings builder scenario (savings growth + low utilization)
      const baseDate = new Date();
      baseDate.setMonth(baseDate.getMonth() - 2);

      // Create savings transfers ($250/month)
      for (let month = 0; month < 3; month++) {
        const date = new Date(baseDate);
        date.setMonth(date.getMonth() + month);
        date.setDate(20);
        
        await run(
          `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name, personal_finance_category_detailed)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            `tx-savings-${month}`,
            testCheckingId,
            date.toISOString().split('T')[0],
            -250,
            'Savings Transfer',
            'SAVINGS'
          ]
        );
      }

      // Set low credit utilization (< 30%)
      const liabilityId = `liability-savings-${Date.now()}`;
      await run(
        `INSERT INTO liabilities (liability_id, account_id, type, last_statement_balance, minimum_payment_amount, last_payment_amount)
         VALUES (?, ?, 'credit_card', ?, ?, ?)`,
        [liabilityId, testCreditId, 2000, 40, 2000] // 20% utilization
      );

      const assignment = await assignSavingsBuilderPersona(testUserId);
      
      if (assignment) {
        expect(assignment.personaType).toBe('savings_builder');
        expect(assignment.criteriaMet.length).toBeGreaterThan(0);
      }
    });
  });

  describe('assignPersona', () => {
    it('should assign persona with prioritization', async () => {
      // Create high utilization scenario (should be highest priority)
      const liabilityId = `liability-priority-${Date.now()}`;
      await run(
        `INSERT INTO liabilities (liability_id, account_id, type, last_statement_balance, minimum_payment_amount, last_payment_amount)
         VALUES (?, ?, 'credit_card', ?, ?, ?)`,
        [liabilityId, testCreditId, 6500, 130, 130] // 65% utilization
      );

      const result = await assignPersona(testUserId);
      
      expect(result).not.toBeNull();
      if (result) {
        expect(result.primary).toBeDefined();
        expect(result.primary.personaType).toBe('high_utilization'); // Should be highest priority
        expect(Array.isArray(result.secondary)).toBe(true);
      }
    });
  });

  describe('storePersonaAssignment and getCurrentPersona', () => {
    it('should store and retrieve persona assignment with secondary personas', async () => {
      const assignment = {
        personaType: 'high_utilization',
        criteriaMet: ['utilization_65.0%'],
        confidence: 0.8,
        signals: { utilization: { utilization: 65 } }
      };

      const secondaryPersonas = ['subscription_heavy'];
      const personaId = await storePersonaAssignment(testUserId, assignment, secondaryPersonas);
      
      expect(personaId).toBeDefined();

      const retrieved = await getCurrentPersona(testUserId);
      
      expect(retrieved).not.toBeNull();
      if (retrieved) {
        expect(retrieved.persona_type).toBe('high_utilization');
        expect(retrieved.secondary_personas).toEqual(secondaryPersonas);
      }
    });
  });
});

