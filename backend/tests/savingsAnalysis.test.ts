// Unit tests for savings analysis feature

import {
  calculateNetSavingsInflow,
  calculateSavingsGrowthRate,
  calculateEmergencyFundCoverage,
  calculateMonthlyExpenses,
  calculateSavingsRate,
  getSavingsAnalysis
} from '../features/savingsAnalysis';
import { run, get, all } from '../db/db';

describe('Savings Analysis', () => {
  let testUserId: string;
  let testCheckingId: string;
  let testSavingsId: string;

  beforeAll(async () => {
    // Create a test user and accounts
    testUserId = `test-savings-${Date.now()}`;
    testCheckingId = `test-checking-${Date.now()}`;
    testSavingsId = `test-savings-acc-${Date.now()}`;

    // Create test user
    await run(
      'INSERT INTO users (user_id, email, name) VALUES (?, ?, ?)',
      [testUserId, 'test-savings@example.com', 'Test Savings User']
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
      await run('DELETE FROM transactions WHERE account_id IN (?, ?)', [testCheckingId, testSavingsId]);
      await run('DELETE FROM accounts WHERE account_id IN (?, ?)', [testCheckingId, testSavingsId]);
      await run('DELETE FROM users WHERE user_id = ?', [testUserId]);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('calculateNetSavingsInflow', () => {
    it('should calculate net savings inflow correctly', async () => {
      // Create savings deposits (positive amounts)
      const baseDate = new Date();
      baseDate.setMonth(baseDate.getMonth() - 2);

      for (let i = 0; i < 3; i++) {
        const date = new Date(baseDate);
        date.setMonth(date.getMonth() + i);
        date.setDate(1); // First of month

        await run(
          `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name)
           VALUES (?, ?, ?, ?, ?)`,
          [
            `tx-savings-${i}`,
            testSavingsId,
            date.toISOString().split('T')[0],
            500, // $500 deposit each month
            'Transfer'
          ]
        );
      }

      const inflow = await calculateNetSavingsInflow(testUserId, 90);
      
      // Should be approximately $1500 (3 months * $500)
      expect(inflow).toBeGreaterThan(1400);
      expect(inflow).toBeLessThan(1600);
    });

    it('should return 0 if no savings accounts', async () => {
      // Create user with no savings accounts
      const noSavingsUserId = `test-no-savings-${Date.now()}`;
      await run(
        'INSERT INTO users (user_id, email, name) VALUES (?, ?, ?)',
        [noSavingsUserId, 'no-savings@example.com', 'No Savings User']
      );

      const inflow = await calculateNetSavingsInflow(noSavingsUserId, 90);
      expect(inflow).toBe(0);

      // Cleanup
      await run('DELETE FROM users WHERE user_id = ?', [noSavingsUserId]);
    });
  });

  describe('calculateSavingsGrowthRate', () => {
    it('should calculate savings growth rate correctly', async () => {
      const growthRate = await calculateSavingsGrowthRate(testUserId, 90);
      
      // Growth rate should be positive if there's been inflow
      expect(growthRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateMonthlyExpenses', () => {
    it('should calculate monthly expenses excluding transfers', async () => {
      // Create expense transactions
      const date = new Date();
      date.setMonth(date.getMonth() - 1);

      await run(
        `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name)
         VALUES (?, ?, ?, ?, ?)`,
        [`tx-expense-1`, testCheckingId, date.toISOString().split('T')[0], -100, 'Grocery Store']
      );

      await run(
        `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name)
         VALUES (?, ?, ?, ?, ?)`,
        [`tx-expense-2`, testCheckingId, new Date().toISOString().split('T')[0], -50, 'Restaurant']
      );

      // Create a transfer (should be excluded)
      await run(
        `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name)
         VALUES (?, ?, ?, ?, ?)`,
        [`tx-transfer-1`, testCheckingId, date.toISOString().split('T')[0], -200, 'ACH Transfer']
      );

      const expenses = await calculateMonthlyExpenses(testUserId, 90);
      
      expect(expenses).toBeGreaterThan(0);
      // Should not include the transfer
      expect(expenses).toBeLessThan(200);
    });
  });

  describe('calculateEmergencyFundCoverage', () => {
    it('should calculate emergency fund coverage in months', async () => {
      // Set savings balance to $6000
      await run(
        `UPDATE accounts SET balances = ? WHERE account_id = ?`,
        [
          JSON.stringify({ available: 6000, current: 6000 }),
          testSavingsId
        ]
      );

      // Create expenses to establish monthly expense baseline
      const date = new Date();
      date.setMonth(date.getMonth() - 1);

      for (let i = 0; i < 3; i++) {
        const expenseDate = new Date(date);
        expenseDate.setMonth(expenseDate.getMonth() + i);
        
        await run(
          `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name)
           VALUES (?, ?, ?, ?, ?)`,
          [
            `tx-monthly-${i}`,
            testCheckingId,
            expenseDate.toISOString().split('T')[0],
            -2000, // $2000/month expenses
            'Monthly Expenses'
          ]
        );
      }

      const coverage = await calculateEmergencyFundCoverage(testUserId);
      
      // $6000 savings / expenses (calculated over 6 months)
      // Coverage should be positive and reasonable
      expect(coverage).toBeGreaterThan(0);
      expect(coverage).toBeLessThan(10); // Allow for some variance in calculation
    });

    it('should return 0 if no savings', async () => {
      // Set savings to 0
      await run(
        `UPDATE accounts SET balances = ? WHERE account_id = ?`,
        [
          JSON.stringify({ available: 0, current: 0 }),
          testSavingsId
        ]
      );

      const coverage = await calculateEmergencyFundCoverage(testUserId);
      expect(coverage).toBe(0);
    });
  });

  describe('calculateSavingsRate', () => {
    it('should calculate savings rate as percentage of income', async () => {
      // Create income transactions
      const baseDate = new Date();
      baseDate.setMonth(baseDate.getMonth() - 2);

      for (let i = 0; i < 3; i++) {
        const date = new Date(baseDate);
        date.setMonth(date.getMonth() + i);
        date.setDate(1);

        await run(
          `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name)
           VALUES (?, ?, ?, ?, ?)`,
          [
            `tx-income-${i}`,
            testCheckingId,
            date.toISOString().split('T')[0],
            5000, // $5000/month income
            'Payroll'
          ]
        );
      }

      const savingsRate = await calculateSavingsRate(testUserId, 90);
      
      // Should be positive if there's savings inflow
      expect(savingsRate).toBeGreaterThanOrEqual(0);
      expect(savingsRate).toBeLessThanOrEqual(100);
    });
  });

  describe('getSavingsAnalysis', () => {
    it('should return complete savings analysis', async () => {
      const analysis = await getSavingsAnalysis(testUserId, 90);

      expect(analysis).toBeDefined();
      expect(analysis.totalSavingsBalance).toBeGreaterThanOrEqual(0);
      expect(analysis.netSavingsInflow).toBeGreaterThanOrEqual(0);
      expect(analysis.savingsGrowthRate).toBeGreaterThanOrEqual(0);
      expect(analysis.emergencyFundCoverage).toBeGreaterThanOrEqual(0);
      expect(analysis.monthlyExpenses).toBeGreaterThanOrEqual(0);
      expect(analysis.savingsRate).toBeGreaterThanOrEqual(0);
      expect(analysis.savingsRate).toBeLessThanOrEqual(100);
      expect(analysis.monthlyIncome).toBeGreaterThanOrEqual(0);
    });
  });
});

