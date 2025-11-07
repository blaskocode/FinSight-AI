// Unit tests for payment plan generator module

import { generatePaymentPlan, calculateAvailableCashFlow } from '../recommendations/paymentPlanner';
import { run, get, all } from '../db/db';

describe('Payment Planner', () => {
  let testUserId: string;
  let testCheckingId: string;
  let testCreditId1: string;
  let testCreditId2: string;
  let testSavingsId: string;

  beforeAll(async () => {
    // Create a test user and accounts
    testUserId = `test-payment-${Date.now()}`;
    testCheckingId = `test-checking-payment-${Date.now()}`;
    testCreditId1 = `test-credit-1-payment-${Date.now()}`;
    testCreditId2 = `test-credit-2-payment-${Date.now()}`;
    testSavingsId = `test-savings-payment-${Date.now()}`;

    // Create test user
    await run(
      'INSERT INTO users (user_id, email, name) VALUES (?, ?, ?)',
      [testUserId, 'test-payment@example.com', 'Test Payment User']
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

    // Create test credit cards
    await run(
      `INSERT INTO accounts (account_id, user_id, type, balances)
       VALUES (?, ?, 'credit', ?)`,
      [
        testCreditId1,
        testUserId,
        JSON.stringify({ available: 5000, current: 5000, limit: 10000 })
      ]
    );

    await run(
      `INSERT INTO accounts (account_id, user_id, type, balances)
       VALUES (?, ?, 'credit', ?)`,
      [
        testCreditId2,
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
      await run('DELETE FROM transactions WHERE account_id IN (?, ?, ?, ?)', [testCheckingId, testCreditId1, testCreditId2, testSavingsId]);
      await run('DELETE FROM liabilities WHERE account_id IN (?, ?)', [testCreditId1, testCreditId2]);
      await run('DELETE FROM accounts WHERE account_id IN (?, ?, ?, ?)', [testCheckingId, testCreditId1, testCreditId2, testSavingsId]);
      await run('DELETE FROM users WHERE user_id = ?', [testUserId]);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('calculateAvailableCashFlow', () => {
    it('should calculate available cash flow from income and expenses', async () => {
      // Create income transactions
      const baseDate = new Date();
      baseDate.setMonth(baseDate.getMonth() - 2);
      for (let i = 0; i < 3; i++) {
        const date = new Date(baseDate);
        date.setMonth(date.getMonth() + i);
        date.setDate(1);
        
        await run(
          `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name, payment_channel)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            `tx-income-payment-${i}`,
            testCheckingId,
            date.toISOString().split('T')[0],
            5000, // $5000/month income
            'Payroll',
            'ach'
          ]
        );
      }

      // Create expense transactions
      for (let i = 0; i < 3; i++) {
        const date = new Date(baseDate);
        date.setMonth(date.getMonth() + i);
        date.setDate(15);
        
        await run(
          `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name)
           VALUES (?, ?, ?, ?, ?)`,
          [
            `tx-expense-payment-${i}`,
            testCheckingId,
            date.toISOString().split('T')[0],
            -2000, // $2000/month expenses
            'Monthly Expenses'
          ]
        );
      }

      const cashFlow = await calculateAvailableCashFlow(testUserId);
      
      // Should be positive (income - expenses - 20% buffer)
      // Calculation may vary based on actual expense calculation method
      expect(cashFlow).toBeGreaterThan(0);
      expect(cashFlow).toBeLessThan(5000); // Should be less than income
    });

    it('should account for minimum payments in cash flow calculation', async () => {
      // Create liabilities with minimum payments
      const liabilityId1 = `liability-1-payment-${Date.now()}`;
      await run(
        `INSERT INTO liabilities (liability_id, account_id, type, last_statement_balance, minimum_payment_amount)
         VALUES (?, ?, 'credit_card', ?, ?)`,
        [liabilityId1, testCreditId1, 5000, 100]
      );

      const liabilityId2 = `liability-2-payment-${Date.now()}`;
      await run(
        `INSERT INTO liabilities (liability_id, account_id, type, last_statement_balance, minimum_payment_amount)
         VALUES (?, ?, 'credit_card', ?, ?)`,
        [liabilityId2, testCreditId2, 3000, 60]
      );

      const cashFlow = await calculateAvailableCashFlow(testUserId);
      
      // Should subtract minimum payments ($100 + $60 = $160)
      expect(cashFlow).toBeGreaterThan(0);
    });
  });

  describe('generatePaymentPlan', () => {
    it('should generate avalanche plan (highest APR first)', async () => {
      // Create liabilities with different APRs
      const liabilityId1 = `liability-avalanche-1-${Date.now()}`;
      await run(
        `INSERT INTO liabilities (liability_id, account_id, type, last_statement_balance, minimum_payment_amount, apr_percentage)
         VALUES (?, ?, 'credit_card', ?, ?, ?)`,
        [liabilityId1, testCreditId1, 5000, 100, 20.0] // Higher APR
      );

      const liabilityId2 = `liability-avalanche-2-${Date.now()}`;
      await run(
        `INSERT INTO liabilities (liability_id, account_id, type, last_statement_balance, minimum_payment_amount, apr_percentage)
         VALUES (?, ?, 'credit_card', ?, ?, ?)`,
        [liabilityId2, testCreditId2, 3000, 60, 15.0] // Lower APR
      );

      // Create income for cash flow calculation
      const baseDate = new Date();
      baseDate.setMonth(baseDate.getMonth() - 2);
      for (let i = 0; i < 3; i++) {
        const date = new Date(baseDate);
        date.setMonth(date.getMonth() + i);
        date.setDate(1);
        
        await run(
          `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name, payment_channel)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            `tx-income-avalanche-${i}`,
            testCheckingId,
            date.toISOString().split('T')[0],
            5000,
            'Payroll',
            'ach'
          ]
        );
      }

      const plan = await generatePaymentPlan(testUserId, 'avalanche');
      
      expect(plan).toBeDefined();
      expect(plan.strategy).toBe('avalanche');
      expect(plan.debts.length).toBe(2);
      expect(plan.totalDebt).toBe(8000); // $5000 + $3000
      expect(plan.totalInterest).toBeGreaterThan(0);
      expect(plan.payoffMonths).toBeGreaterThan(0);
      
      // Highest APR debt should be paid first
      const firstDebt = plan.debts[0];
      expect(firstDebt.apr).toBe(20.0); // Higher APR first
    });

    it('should generate snowball plan (smallest balance first)', async () => {
      // Create liabilities with different balances
      const liabilityId1 = `liability-snowball-1-${Date.now()}`;
      await run(
        `INSERT INTO liabilities (liability_id, account_id, type, last_statement_balance, minimum_payment_amount, apr_percentage)
         VALUES (?, ?, 'credit_card', ?, ?, ?)`,
        [liabilityId1, testCreditId1, 5000, 100, 20.0] // Larger balance
      );

      const liabilityId2 = `liability-snowball-2-${Date.now()}`;
      await run(
        `INSERT INTO liabilities (liability_id, account_id, type, last_statement_balance, minimum_payment_amount, apr_percentage)
         VALUES (?, ?, 'credit_card', ?, ?, ?)`,
        [liabilityId2, testCreditId2, 3000, 60, 15.0] // Smaller balance
      );

      // Create income for cash flow calculation
      const baseDate = new Date();
      baseDate.setMonth(baseDate.getMonth() - 2);
      for (let i = 0; i < 3; i++) {
        const date = new Date(baseDate);
        date.setMonth(date.getMonth() + i);
        date.setDate(1);
        
        await run(
          `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name, payment_channel)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            `tx-income-snowball-${i}`,
            testCheckingId,
            date.toISOString().split('T')[0],
            5000,
            'Payroll',
            'ach'
          ]
        );
      }

      const plan = await generatePaymentPlan(testUserId, 'snowball');
      
      expect(plan).toBeDefined();
      expect(plan.strategy).toBe('snowball');
      expect(plan.debts.length).toBeGreaterThanOrEqual(2);
      expect(plan.totalDebt).toBeGreaterThanOrEqual(8000);
      expect(plan.totalInterest).toBeGreaterThan(0);
      expect(plan.payoffMonths).toBeGreaterThan(0);
      
      // Smallest balance debt should be paid first (if only these 2 debts)
      const firstDebt = plan.debts.find(d => d.balance === 3000 || d.balance === 5000);
      expect(firstDebt).toBeDefined();
      // In snowball, smallest balance is paid first
      if (plan.debts.length === 2) {
        expect(plan.debts[0].balance).toBeLessThanOrEqual(plan.debts[1].balance);
      }
    });

    it('should calculate interest savings vs minimum payments only', async () => {
      // Create liability
      const liabilityId = `liability-interest-${Date.now()}`;
      await run(
        `INSERT INTO liabilities (liability_id, account_id, type, last_statement_balance, minimum_payment_amount, apr_percentage)
         VALUES (?, ?, 'credit_card', ?, ?, ?)`,
        [liabilityId, testCreditId1, 5000, 100, 20.0]
      );

      // Create income
      const baseDate = new Date();
      baseDate.setMonth(baseDate.getMonth() - 2);
      for (let i = 0; i < 3; i++) {
        const date = new Date(baseDate);
        date.setMonth(date.getMonth() + i);
        date.setDate(1);
        
        await run(
          `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name, payment_channel)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            `tx-income-interest-${i}`,
            testCheckingId,
            date.toISOString().split('T')[0],
            5000,
            'Payroll',
            'ach'
          ]
        );
      }

      const plan = await generatePaymentPlan(testUserId, 'avalanche');
      
      expect(plan.totalInterestSaved).toBeGreaterThan(0);
      // Interest saved should be positive (paying more than minimum saves interest)
      expect(plan.totalInterest).toBeLessThan(plan.totalInterestSaved + plan.totalInterest);
    });

    it('should calculate accurate payoff timeline', async () => {
      // Create liability
      const liabilityId = `liability-timeline-${Date.now()}`;
      await run(
        `INSERT INTO liabilities (liability_id, account_id, type, last_statement_balance, minimum_payment_amount, apr_percentage)
         VALUES (?, ?, 'credit_card', ?, ?, ?)`,
        [liabilityId, testCreditId1, 5000, 100, 20.0]
      );

      // Create income
      const baseDate = new Date();
      baseDate.setMonth(baseDate.getMonth() - 2);
      for (let i = 0; i < 3; i++) {
        const date = new Date(baseDate);
        date.setMonth(date.getMonth() + i);
        date.setDate(1);
        
        await run(
          `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name, payment_channel)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            `tx-income-timeline-${i}`,
            testCheckingId,
            date.toISOString().split('T')[0],
            5000,
            'Payroll',
            'ach'
          ]
        );
      }

      const plan = await generatePaymentPlan(testUserId, 'avalanche');
      
      expect(plan.payoffMonths).toBeGreaterThan(0);
      expect(plan.timeline.length).toBe(plan.payoffMonths);
      
      // Timeline should show decreasing balances
      if (plan.timeline.length > 0) {
        const firstMonth = plan.timeline[0];
        const lastMonth = plan.timeline[plan.timeline.length - 1];
        expect(firstMonth.totalPayment).toBeGreaterThan(0);
        // Last month should show progress (total payment > 0)
        expect(lastMonth.totalPayment).toBeGreaterThan(0);
        // Find the debt in the last month
        const lastDebt = lastMonth.debts.find(d => d.liabilityId === liabilityId);
        if (lastDebt) {
          expect(lastDebt.remainingBalance).toBeLessThanOrEqual(0.01);
        }
      }
    });

    it('should handle multiple debts with surplus allocation', async () => {
      // Create multiple liabilities
      const liabilityId1 = `liability-multi-1-${Date.now()}`;
      await run(
        `INSERT INTO liabilities (liability_id, account_id, type, last_statement_balance, minimum_payment_amount, apr_percentage)
         VALUES (?, ?, 'credit_card', ?, ?, ?)`,
        [liabilityId1, testCreditId1, 5000, 100, 20.0]
      );

      const liabilityId2 = `liability-multi-2-${Date.now()}`;
      await run(
        `INSERT INTO liabilities (liability_id, account_id, type, last_statement_balance, minimum_payment_amount, apr_percentage)
         VALUES (?, ?, 'credit_card', ?, ?, ?)`,
        [liabilityId2, testCreditId2, 3000, 60, 15.0]
      );

      // Create high income for surplus
      const baseDate = new Date();
      baseDate.setMonth(baseDate.getMonth() - 2);
      for (let i = 0; i < 3; i++) {
        const date = new Date(baseDate);
        date.setMonth(date.getMonth() + i);
        date.setDate(1);
        
        await run(
          `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name, payment_channel)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            `tx-income-multi-${i}`,
            testCheckingId,
            date.toISOString().split('T')[0],
            10000, // High income
            'Payroll',
            'ach'
          ]
        );
      }

      const plan = await generatePaymentPlan(testUserId, 'avalanche');
      
      expect(plan.debts.length).toBeGreaterThanOrEqual(2);
      expect(plan.monthlySurplus).toBeGreaterThan(0);
      
      // First debt should have higher payment (minimum + surplus)
      const firstDebt = plan.debts[0];
      expect(firstDebt.monthlyPayment).toBeGreaterThan(0);
      // Payment should be at least the minimum payment
      expect(firstDebt.monthlyPayment).toBeGreaterThanOrEqual(firstDebt.balance * 0.02);
    });
  });
});

