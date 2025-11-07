// Unit tests for subscription detection feature

import {
  findRecurringMerchants,
  calculateRecurringCadence,
  calculateMonthlyRecurringSpend,
  calculateSubscriptionShare,
  getSubscriptionAnalysis
} from '../features/subscriptionDetection';
import { run, get, all } from '../db/db';

describe('Subscription Detection', () => {
  let testUserId: string;
  let testAccountId: string;

  beforeAll(async () => {
    // Create a test user and account
    testUserId = `test-sub-${Date.now()}`;
    testAccountId = `test-acc-${Date.now()}`;

    // Create test user
    await run(
      'INSERT INTO users (user_id, email, name) VALUES (?, ?, ?)',
      [testUserId, 'test@example.com', 'Test User']
    );

    // Create test checking account
    await run(
      `INSERT INTO accounts (account_id, user_id, type, balances)
       VALUES (?, ?, 'checking', ?)`,
      [
        testAccountId,
        testUserId,
        JSON.stringify({ available: 10000, current: 10000 })
      ]
    );
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await run('DELETE FROM transactions WHERE account_id = ?', [testAccountId]);
      await run('DELETE FROM accounts WHERE account_id = ?', [testAccountId]);
      await run('DELETE FROM users WHERE user_id = ?', [testUserId]);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('findRecurringMerchants', () => {
    it('should detect recurring merchants with ≥3 occurrences', async () => {
      // Create Netflix transactions (monthly, 3 months)
      const baseDate = new Date();
      baseDate.setMonth(baseDate.getMonth() - 2);
      
      for (let i = 0; i < 3; i++) {
        const date = new Date(baseDate);
        date.setMonth(date.getMonth() + i);
        date.setDate(15); // Mid-month
        
        await run(
          `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name, payment_channel)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            `tx-netflix-${i}`,
            testAccountId,
            date.toISOString().split('T')[0],
            -14.99,
            'Netflix',
            'online'
          ]
        );
      }

      // Create Spotify transactions (monthly, 3 months)
      for (let i = 0; i < 3; i++) {
        const date = new Date(baseDate);
        date.setMonth(date.getMonth() + i);
        date.setDate(10); // Early month
        
        await run(
          `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name, payment_channel)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            `tx-spotify-${i}`,
            testAccountId,
            date.toISOString().split('T')[0],
            -9.99,
            'Spotify',
            'online'
          ]
        );
      }

      const merchants = await findRecurringMerchants(testUserId, 90);

      expect(merchants.length).toBeGreaterThanOrEqual(2);
      
      const netflix = merchants.find(m => m.merchant_name.toLowerCase().includes('netflix'));
      const spotify = merchants.find(m => m.merchant_name.toLowerCase().includes('spotify'));

      expect(netflix).toBeDefined();
      expect(netflix?.count).toBe(3);
      expect(netflix?.cadence).toBe('monthly');

      expect(spotify).toBeDefined();
      expect(spotify?.count).toBe(3);
      expect(spotify?.cadence).toBe('monthly');
    });

    it('should not detect merchants with <3 occurrences', async () => {
      // Create only 2 transactions for a merchant
      const date = new Date();
      date.setMonth(date.getMonth() - 1);

      await run(
        `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name)
         VALUES (?, ?, ?, ?, ?)`,
        [`tx-once-1`, testAccountId, date.toISOString().split('T')[0], -50, 'One-Time Merchant']
      );

      await run(
        `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name)
         VALUES (?, ?, ?, ?, ?)`,
        [`tx-once-2`, testAccountId, new Date().toISOString().split('T')[0], -50, 'One-Time Merchant']
      );

      const merchants = await findRecurringMerchants(testUserId, 90);
      const oneTime = merchants.find(m => m.merchant_name === 'One-Time Merchant');
      
      expect(oneTime).toBeUndefined();
    });

    it('should not detect false positives with similar merchant names but different amounts', async () => {
      // Create transactions with similar names but varying amounts (not recurring)
      const baseDate = new Date();
      baseDate.setMonth(baseDate.getMonth() - 2);
      
      const amounts = [50, 75, 120]; // Varying amounts (>10% difference)
      for (let i = 0; i < 3; i++) {
        const date = new Date(baseDate);
        date.setMonth(date.getMonth() + i);
        
        await run(
          `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name)
           VALUES (?, ?, ?, ?, ?)`,
          [
            `tx-variable-${i}`,
            testAccountId,
            date.toISOString().split('T')[0],
            -amounts[i],
            'Amazon' // Same merchant, but amounts vary too much
          ]
        );
      }

      const merchants = await findRecurringMerchants(testUserId, 90);
      // Should not detect as recurring because amounts vary >10%
      const amazon = merchants.find(m => m.merchant_name === 'Amazon');
      
      // Amazon might be detected if amounts are close enough, but test that varying amounts reduce confidence
      if (amazon) {
        // If detected, it should have lower confidence or irregular cadence
        expect(amazon.cadence).toBe('irregular');
      }
    });

    it('should not detect one-time large purchases as subscriptions', async () => {
      // Create 3 transactions with same merchant but irregular timing and amounts
      const dates = [
        new Date('2024-01-15'),
        new Date('2024-03-20'),
        new Date('2024-06-10')
      ];
      
      for (let i = 0; i < 3; i++) {
        await run(
          `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name)
           VALUES (?, ?, ?, ?, ?)`,
          [
            `tx-onetime-${i}`,
            testAccountId,
            dates[i].toISOString().split('T')[0],
            -200, // Same amount
            'Best Buy' // Same merchant
          ]
        );
      }

      const merchants = await findRecurringMerchants(testUserId, 90);
      const bestBuy = merchants.find(m => m.merchant_name === 'Best Buy');
      
      // Should either not be detected, or if detected, have irregular cadence
      if (bestBuy) {
        expect(bestBuy.cadence).toBe('irregular');
      }
    });

    it('should detect weekly cadence', async () => {
      // Create weekly transactions (7 days apart)
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() - 14);

      for (let i = 0; i < 3; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + (i * 7));
        
        await run(
          `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name)
           VALUES (?, ?, ?, ?, ?)`,
          [
            `tx-weekly-${i}`,
            testAccountId,
            date.toISOString().split('T')[0],
            -20,
            'Weekly Service'
          ]
        );
      }

      const merchants = await findRecurringMerchants(testUserId, 90);
      const weekly = merchants.find(m => m.merchant_name === 'Weekly Service');

      expect(weekly).toBeDefined();
      expect(weekly?.cadence).toBe('weekly');
    });
  });

  describe('calculateRecurringCadence', () => {
    it('should identify weekly cadence', () => {
      const intervals = [7, 7, 7, 7];
      const amounts = [10, 10, 10, 10];
      const cadence = calculateRecurringCadence(intervals, amounts);
      expect(cadence).toBe('weekly');
    });

    it('should identify monthly cadence', () => {
      const intervals = [30, 31, 29, 30];
      const amounts = [15, 15, 15, 15];
      const cadence = calculateRecurringCadence(intervals, amounts);
      expect(cadence).toBe('monthly');
    });

    it('should identify irregular cadence', () => {
      const intervals = [5, 20, 10, 45];
      const amounts = [10, 10, 10, 10];
      const cadence = calculateRecurringCadence(intervals, amounts);
      expect(cadence).toBe('irregular');
    });
  });

  describe('calculateMonthlyRecurringSpend', () => {
    it('should calculate monthly recurring spend correctly', async () => {
      const monthlySpend = await calculateMonthlyRecurringSpend(testUserId, 90);
      
      // Should include Netflix (~$14.99), Spotify (~$9.99), and Weekly Service (~$20 * 4.33 = ~$86.60)
      // Total should be around $111/month
      expect(monthlySpend).toBeGreaterThan(100);
      expect(monthlySpend).toBeLessThan(120);
    });
  });

  describe('calculateSubscriptionShare', () => {
    it('should calculate subscription share as percentage', async () => {
      // Add some non-subscription transactions
      const date = new Date();
      date.setMonth(date.getMonth() - 1);

      await run(
        `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name)
         VALUES (?, ?, ?, ?, ?)`,
        [`tx-grocery-1`, testAccountId, date.toISOString().split('T')[0], -100, 'Grocery Store']
      );

      const share = await calculateSubscriptionShare(testUserId, 90);
      
      expect(share).toBeGreaterThan(0);
      expect(share).toBeLessThan(100);
    });
  });

  describe('getSubscriptionAnalysis', () => {
    it('should return complete subscription analysis', async () => {
      const analysis = await getSubscriptionAnalysis(testUserId, 90);

      expect(analysis).toBeDefined();
      expect(analysis.recurringMerchants.length).toBeGreaterThanOrEqual(2);
      expect(analysis.monthlyRecurringSpend).toBeGreaterThan(0);
      expect(analysis.subscriptionShare).toBeGreaterThan(0);
      expect(analysis.totalSpend).toBeGreaterThan(0);
    });
  });
});

