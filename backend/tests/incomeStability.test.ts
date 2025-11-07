// Unit tests for income stability feature

import {
  detectPayrollACH,
  detectPaymentFrequency,
  calculatePayGapVariability,
  calculateCashFlowBuffer,
  getIncomeStabilityAnalysis
} from '../features/incomeStability';
import { run, get, all } from '../db/db';

describe('Income Stability', () => {
  let testUserId: string;
  let testCheckingId: string;

  beforeAll(async () => {
    // Create a test user and account
    testUserId = `test-income-${Date.now()}`;
    testCheckingId = `test-checking-income-${Date.now()}`;

    // Create test user
    await run(
      'INSERT INTO users (user_id, email, name) VALUES (?, ?, ?)',
      [testUserId, 'test-income@example.com', 'Test Income User']
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
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await run('DELETE FROM transactions WHERE account_id = ?', [testCheckingId]);
      await run('DELETE FROM accounts WHERE account_id = ?', [testCheckingId]);
      await run('DELETE FROM users WHERE user_id = ?', [testUserId]);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('detectPayrollACH', () => {
    it('should detect payroll transactions with ACH payment channel', async () => {
      // Create payroll transactions
      const baseDate = new Date();
      baseDate.setMonth(baseDate.getMonth() - 2);

      for (let i = 0; i < 3; i++) {
        const date = new Date(baseDate);
        date.setMonth(date.getMonth() + i);
        date.setDate(1); // First of month

        await run(
          `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name, payment_channel)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            `tx-payroll-${i}`,
            testCheckingId,
            date.toISOString().split('T')[0],
            5000,
            'ACME Corp',
            'ach'
          ]
        );
      }

      const payroll = await detectPayrollACH(testUserId);
      
      expect(payroll.length).toBeGreaterThanOrEqual(3);
      expect(payroll.every(tx => tx.amount > 0)).toBe(true);
    });

    it('should detect payroll transactions with employer patterns', async () => {
      // Create transaction with LLC in name
      const date = new Date();
      date.setMonth(date.getMonth() - 1);

      await run(
        `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name, payment_channel)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `tx-employer-1`,
          testCheckingId,
          date.toISOString().split('T')[0],
          4000,
          'Tech Company LLC',
          'online'
        ]
      );

      const payroll = await detectPayrollACH(testUserId);
      const found = payroll.find(tx => tx.merchant_name?.includes('Tech Company'));
      
      expect(found).toBeDefined();
    });

    it('should not detect transfers as payroll', async () => {
      // Create transfer transaction
      const date = new Date();
      date.setMonth(date.getMonth() - 1);

      await run(
        `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name, payment_channel)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `tx-transfer-1`,
          testCheckingId,
          date.toISOString().split('T')[0],
          1000,
          'Bank Transfer',
          'ach'
        ]
      );

      const payroll = await detectPayrollACH(testUserId);
      const found = payroll.find(tx => tx.merchant_name?.includes('Transfer'));
      
      expect(found).toBeUndefined();
    });
  });

  describe('detectPaymentFrequency', () => {
    it('should detect weekly frequency', () => {
      const transactions = [
        { transaction_id: '1', account_id: 'acc1', date: '2025-01-01', amount: 1000, merchant_name: 'Payroll', payment_channel: 'ach' },
        { transaction_id: '2', account_id: 'acc1', date: '2025-01-08', amount: 1000, merchant_name: 'Payroll', payment_channel: 'ach' },
        { transaction_id: '3', account_id: 'acc1', date: '2025-01-15', amount: 1000, merchant_name: 'Payroll', payment_channel: 'ach' },
        { transaction_id: '4', account_id: 'acc1', date: '2025-01-22', amount: 1000, merchant_name: 'Payroll', payment_channel: 'ach' }
      ];

      const frequency = detectPaymentFrequency(transactions);
      expect(frequency).toBe('weekly');
    });

    it('should detect biweekly frequency', () => {
      const transactions = [
        { transaction_id: '1', account_id: 'acc1', date: '2025-01-01', amount: 2000, merchant_name: 'Payroll', payment_channel: 'ach' },
        { transaction_id: '2', account_id: 'acc1', date: '2025-01-15', amount: 2000, merchant_name: 'Payroll', payment_channel: 'ach' },
        { transaction_id: '3', account_id: 'acc1', date: '2025-01-29', amount: 2000, merchant_name: 'Payroll', payment_channel: 'ach' }
      ];

      const frequency = detectPaymentFrequency(transactions);
      expect(frequency).toBe('biweekly');
    });

    it('should detect monthly frequency', () => {
      const transactions = [
        { transaction_id: '1', account_id: 'acc1', date: '2025-01-01', amount: 5000, merchant_name: 'Payroll', payment_channel: 'ach' },
        { transaction_id: '2', account_id: 'acc1', date: '2025-02-01', amount: 5000, merchant_name: 'Payroll', payment_channel: 'ach' },
        { transaction_id: '3', account_id: 'acc1', date: '2025-03-01', amount: 5000, merchant_name: 'Payroll', payment_channel: 'ach' }
      ];

      const frequency = detectPaymentFrequency(transactions);
      expect(frequency).toBe('monthly');
    });

    it('should detect irregular frequency', () => {
      const transactions = [
        { transaction_id: '1', account_id: 'acc1', date: '2025-01-01', amount: 1000, merchant_name: 'Payroll', payment_channel: 'ach' },
        { transaction_id: '2', account_id: 'acc1', date: '2025-01-20', amount: 2000, merchant_name: 'Payroll', payment_channel: 'ach' },
        { transaction_id: '3', account_id: 'acc1', date: '2025-02-15', amount: 1500, merchant_name: 'Payroll', payment_channel: 'ach' }
      ];

      const frequency = detectPaymentFrequency(transactions);
      expect(frequency).toBe('irregular');
    });
  });

  describe('calculatePayGapVariability', () => {
    it('should calculate median pay gap correctly', () => {
      const transactions = [
        { transaction_id: '1', account_id: 'acc1', date: '2025-01-01', amount: 2000, merchant_name: 'Payroll', payment_channel: 'ach' },
        { transaction_id: '2', account_id: 'acc1', date: '2025-01-15', amount: 2000, merchant_name: 'Payroll', payment_channel: 'ach' },
        { transaction_id: '3', account_id: 'acc1', date: '2025-01-29', amount: 2000, merchant_name: 'Payroll', payment_channel: 'ach' }
      ];

      const { medianPayGap, payGapVariability } = calculatePayGapVariability(transactions);
      
      expect(medianPayGap).toBe(14); // 14 days between payments
      expect(payGapVariability).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for single transaction', () => {
      const transactions = [
        { transaction_id: '1', account_id: 'acc1', date: '2025-01-01', amount: 2000, merchant_name: 'Payroll', payment_channel: 'ach' }
      ];

      const { medianPayGap, payGapVariability } = calculatePayGapVariability(transactions);
      
      expect(medianPayGap).toBe(0);
      expect(payGapVariability).toBe(0);
    });
  });

  describe('calculateCashFlowBuffer', () => {
    it('should calculate cash flow buffer correctly', async () => {
      // Set checking balance to $6000
      await run(
        `UPDATE accounts SET balances = ? WHERE account_id = ?`,
        [
          JSON.stringify({ available: 6000, current: 6000 }),
          testCheckingId
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
            `tx-expense-${i}`,
            testCheckingId,
            expenseDate.toISOString().split('T')[0],
            -2000, // $2000/month expenses
            'Monthly Expenses'
          ]
        );
      }

      const buffer = await calculateCashFlowBuffer(testUserId);
      
      // $6000 savings / $2000 monthly expenses = 3 months
      expect(buffer).toBeGreaterThan(0);
      expect(buffer).toBeLessThan(10); // Allow for variance
    });

    it('should return 0 if no checking account', async () => {
      const noCheckingUserId = `test-no-checking-${Date.now()}`;
      await run(
        'INSERT INTO users (user_id, email, name) VALUES (?, ?, ?)',
        [noCheckingUserId, 'no-checking@example.com', 'No Checking User']
      );

      const buffer = await calculateCashFlowBuffer(noCheckingUserId);
      expect(buffer).toBe(0);

      // Cleanup
      await run('DELETE FROM users WHERE user_id = ?', [noCheckingUserId]);
    });
  });

  describe('getIncomeStabilityAnalysis', () => {
    it('should return complete income stability analysis', async () => {
      const analysis = await getIncomeStabilityAnalysis(testUserId);

      expect(analysis).toBeDefined();
      expect(Array.isArray(analysis.payrollTransactions)).toBe(true);
      expect(['weekly', 'biweekly', 'twice-monthly', 'monthly', 'irregular']).toContain(analysis.paymentFrequency);
      expect(analysis.medianPayGap).toBeGreaterThanOrEqual(0);
      expect(analysis.payGapVariability).toBeGreaterThanOrEqual(0);
      expect(analysis.cashFlowBuffer).toBeGreaterThanOrEqual(0);
      expect(analysis.averageIncome).toBeGreaterThanOrEqual(0);
      expect(['stable', 'moderate', 'unstable']).toContain(analysis.incomeStability);
    });
  });
});

