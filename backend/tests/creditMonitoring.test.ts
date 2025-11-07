// Unit tests for credit monitoring feature detection

import {
  calculateUtilization,
  detectMinimumPaymentOnly,
  calculateInterestCharges,
  checkOverdueStatus,
  getCreditSignals,
  UTILIZATION_THRESHOLDS
} from '../features/creditMonitoring';
import { run, get, all, getDatabase, closeDatabase } from '../db/db';
import path from 'path';
import fs from 'fs';

// Use test database file
const TEST_DB_PATH = path.join(__dirname, '..', 'test.db');

beforeAll(async () => {
  // Delete test database if it exists
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  
  // Set environment variable to use test database
  process.env.DATABASE_PATH = TEST_DB_PATH;
  
  // Initialize test database
  const db = getDatabase();
  
  // Create test tables
  await run(`
    CREATE TABLE IF NOT EXISTS accounts (
      account_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      balances TEXT NOT NULL
    )
  `);
  
  await run(`
    CREATE TABLE IF NOT EXISTS liabilities (
      liability_id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      minimum_payment_amount REAL,
      last_payment_amount REAL,
      apr_percentage REAL,
      is_overdue INTEGER DEFAULT 0,
      next_payment_due_date TEXT
    )
  `);
  
  await run(`
    CREATE TABLE IF NOT EXISTS transactions (
      transaction_id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      merchant_name TEXT,
      personal_finance_category_detailed TEXT
    )
  `);
});

afterAll(async () => {
  await closeDatabase();
  
  // Clean up test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  
  // Reset environment variable
  delete process.env.DATABASE_PATH;
});

describe('Credit Monitoring', () => {
  let testAccountId: string;
  let testCreditAccountId: string;

  beforeEach(async () => {
    // Create test credit account
    testCreditAccountId = `test-credit-${Date.now()}`;
    testAccountId = `test-account-${Date.now()}`;
    
    // Insert test credit account with 65% utilization
    await run(
      `INSERT INTO accounts (account_id, user_id, type, balances) 
       VALUES (?, ?, 'credit', ?)`,
      [
        testCreditAccountId,
        testAccountId,
        JSON.stringify({
          available: 3500,
          current: 6500,
          limit: 10000
        })
      ]
    );
  });

  afterEach(async () => {
    // Clean up test data
    await run('DELETE FROM accounts WHERE account_id = ?', [testCreditAccountId]);
    await run('DELETE FROM liabilities WHERE account_id = ?', [testCreditAccountId]);
    await run('DELETE FROM transactions WHERE account_id = ?', [testCreditAccountId]);
  });

  describe('calculateUtilization', () => {
    it('should calculate utilization correctly for 65% utilization', async () => {
      const result = await calculateUtilization(testCreditAccountId);
      
      expect(result.utilization).toBe(65);
      expect(result.balance).toBe(6500);
      expect(result.limit).toBe(10000);
      expect(result.threshold).toBe('high');
      expect(result.isHighUtilization).toBe(true);
    });

    it('should calculate utilization correctly for 30% utilization', async () => {
      await run(
        'UPDATE accounts SET balances = ? WHERE account_id = ?',
        [
          JSON.stringify({
            available: 7000,
            current: 3000,
            limit: 10000
          }),
          testCreditAccountId
        ]
      );

      const result = await calculateUtilization(testCreditAccountId);
      
      expect(result.utilization).toBe(30);
      // 30% is at the 30% flag threshold, so it should be "medium" (not "low")
      expect(result.threshold).toBe('medium');
      expect(result.isHighUtilization).toBe(false);
    });

    it('should handle zero balance', async () => {
      await run(
        'UPDATE accounts SET balances = ? WHERE account_id = ?',
        [
          JSON.stringify({
            available: 10000,
            current: 0,
            limit: 10000
          }),
          testCreditAccountId
        ]
      );

      const result = await calculateUtilization(testCreditAccountId);
      
      expect(result.utilization).toBe(0);
      expect(result.threshold).toBe('low');
      expect(result.isHighUtilization).toBe(false);
    });

    it('should handle null/zero limit', async () => {
      await run(
        'UPDATE accounts SET balances = ? WHERE account_id = ?',
        [
          JSON.stringify({
            available: 0,
            current: 1000,
            limit: 0
          }),
          testCreditAccountId
        ]
      );

      const result = await calculateUtilization(testCreditAccountId);
      
      expect(result.utilization).toBe(0);
      expect(result.threshold).toBe('none');
      expect(result.limit).toBe(0);
    });

    it('should handle negative balance (credit)', async () => {
      // Negative balance means user has a credit (overpayment)
      await run(
        'UPDATE accounts SET balances = ? WHERE account_id = ?',
        [
          JSON.stringify({
            available: 11000,
            current: -1000, // Negative = credit
            limit: 10000
          }),
          testCreditAccountId
        ]
      );

      const result = await calculateUtilization(testCreditAccountId);
      
      // Utilization should be 0% when balance is negative
      expect(result.utilization).toBe(0);
      expect(result.balance).toBe(-1000);
      expect(result.threshold).toBe('low');
      expect(result.isHighUtilization).toBe(false);
    });

    it('should throw error for non-credit account', async () => {
      const checkingAccountId = `test-checking-${Date.now()}`;
      await run(
        `INSERT INTO accounts (account_id, user_id, type, balances) 
         VALUES (?, ?, 'checking', ?)`,
        [
          checkingAccountId,
          testAccountId,
          JSON.stringify({ available: 1000, current: 1000, limit: null })
        ]
      );

      await expect(calculateUtilization(checkingAccountId)).rejects.toThrow();
      
      await run('DELETE FROM accounts WHERE account_id = ?', [checkingAccountId]);
    });

    it('should throw error for non-existent account', async () => {
      await expect(calculateUtilization('non-existent')).rejects.toThrow();
    });

    it('should correctly identify critical utilization (>=90%)', async () => {
      await run(
        'UPDATE accounts SET balances = ? WHERE account_id = ?',
        [
          JSON.stringify({
            available: 500,
            current: 9500,
            limit: 10000
          }),
          testCreditAccountId
        ]
      );

      const result = await calculateUtilization(testCreditAccountId);
      
      expect(result.utilization).toBe(95);
      expect(result.threshold).toBe('critical');
      expect(result.isHighUtilization).toBe(true);
    });
  });

  describe('detectMinimumPaymentOnly', () => {
    it('should detect minimum payment only when last payment equals minimum', async () => {
      await run(
        `INSERT INTO liabilities (liability_id, account_id, minimum_payment_amount, last_payment_amount)
         VALUES (?, ?, ?, ?)`,
        [`liab-${Date.now()}`, testCreditAccountId, 130, 130]
      );

      const result = await detectMinimumPaymentOnly(testCreditAccountId);
      expect(result).toBe(true);
    });

    it('should detect minimum payment when within 5% tolerance', async () => {
      await run(
        `INSERT INTO liabilities (liability_id, account_id, minimum_payment_amount, last_payment_amount)
         VALUES (?, ?, ?, ?)`,
        [`liab-${Date.now()}`, testCreditAccountId, 100, 103] // 3% difference
      );

      const result = await detectMinimumPaymentOnly(testCreditAccountId);
      expect(result).toBe(true);
    });

    it('should not detect minimum payment when payment is significantly higher', async () => {
      await run(
        `INSERT INTO liabilities (liability_id, account_id, minimum_payment_amount, last_payment_amount)
         VALUES (?, ?, ?, ?)`,
        [`liab-${Date.now()}`, testCreditAccountId, 100, 500] // 5x minimum
      );

      const result = await detectMinimumPaymentOnly(testCreditAccountId);
      expect(result).toBe(false);
    });

    it('should return false when no liability record exists', async () => {
      const result = await detectMinimumPaymentOnly(testCreditAccountId);
      expect(result).toBe(false);
    });
  });

  describe('calculateInterestCharges', () => {
    it('should calculate interest charges from actual transactions', async () => {
      await run(
        `INSERT INTO liabilities (liability_id, account_id, apr_percentage)
         VALUES (?, ?, ?)`,
        [`liab-${Date.now()}`, testCreditAccountId, 20.0] // 20% APR
      );

      // Create actual interest charge transactions
      const baseDate = new Date();
      baseDate.setMonth(baseDate.getMonth() - 2);
      
      for (let i = 0; i < 3; i++) {
        const date = new Date(baseDate);
        date.setMonth(date.getMonth() + i);
        date.setDate(15); // Mid-month
        
        await run(
          `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name)
           VALUES (?, ?, ?, ?, ?)`,
          [
            `tx-interest-${i}`,
            testCreditAccountId,
            date.toISOString().split('T')[0],
            -108.33, // ~$108.33/month interest (6500 * 20% / 12)
            'Interest Charge'
          ]
        );
      }

      const result = await calculateInterestCharges(testCreditAccountId, 90);
      
      // Should sum up the 3 interest charge transactions
      expect(result.totalCharges).toBeGreaterThan(300);
      expect(result.totalCharges).toBeLessThan(350);
      expect(result.monthlyAverage).toBeGreaterThan(100);
      expect(result.chargeCount).toBe(3);
    });

    it('should return zero when no APR is set', async () => {
      await run(
        `INSERT INTO liabilities (liability_id, account_id, apr_percentage)
         VALUES (?, ?, ?)`,
        [`liab-${Date.now()}`, testCreditAccountId, null]
      );

      const result = await calculateInterestCharges(testCreditAccountId);
      
      expect(result.totalCharges).toBe(0);
      expect(result.monthlyAverage).toBe(0);
      expect(result.chargeCount).toBe(0);
    });

    it('should return zero when no liability exists', async () => {
      const result = await calculateInterestCharges(testCreditAccountId);
      
      expect(result.totalCharges).toBe(0);
      expect(result.monthlyAverage).toBe(0);
    });
  });

  describe('checkOverdueStatus', () => {
    it('should return true when is_overdue flag is set', async () => {
      await run(
        `INSERT INTO liabilities (liability_id, account_id, is_overdue)
         VALUES (?, ?, ?)`,
        [`liab-${Date.now()}`, testCreditAccountId, 1]
      );

      const result = await checkOverdueStatus(testCreditAccountId);
      expect(result).toBe(true);
    });

    it('should return true when payment due date has passed', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      await run(
        `INSERT INTO liabilities (liability_id, account_id, is_overdue, next_payment_due_date)
         VALUES (?, ?, ?, ?)`,
        [`liab-${Date.now()}`, testCreditAccountId, 0, pastDateStr]
      );

      const result = await checkOverdueStatus(testCreditAccountId);
      expect(result).toBe(true);
    });

    it('should return false when payment is not overdue', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      await run(
        `INSERT INTO liabilities (liability_id, account_id, is_overdue, next_payment_due_date)
         VALUES (?, ?, ?, ?)`,
        [`liab-${Date.now()}`, testCreditAccountId, 0, futureDateStr]
      );

      const result = await checkOverdueStatus(testCreditAccountId);
      expect(result).toBe(false);
    });

    it('should return false when no liability exists', async () => {
      const result = await checkOverdueStatus(testCreditAccountId);
      expect(result).toBe(false);
    });
  });

  describe('getCreditSignals', () => {
    it('should return all credit signals', async () => {
      await run(
        `INSERT INTO liabilities (liability_id, account_id, minimum_payment_amount, last_payment_amount, apr_percentage, is_overdue)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [`liab-${Date.now()}`, testCreditAccountId, 130, 130, 20.0, 0]
      );

      const signals = await getCreditSignals(testCreditAccountId);
      
      expect(signals.utilization).toBeDefined();
      expect(signals.utilization.utilization).toBe(65);
      expect(signals.minimumPaymentOnly).toBeDefined();
      expect(signals.interestCharges).toBeDefined();
      expect(signals.isOverdue).toBeDefined();
    });
  });
});

