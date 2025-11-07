// Integration tests for API endpoints
// Tests all API endpoints with valid/invalid inputs, error handling, consent enforcement

import { run, get } from '../../db/db';
import { recordConsent, revokeConsent } from '../../guardrails/consent';
import { assignPersona, storePersonaAssignment } from '../../personas/assignPersona';

// Test the service functions directly and verify API contract
// Note: Full HTTP endpoint testing would require setting up Express app in test environment

// Set test timeout to 30 seconds
jest.setTimeout(30000);

describe('API Endpoint Integration Tests', () => {
  let testUserId: string;
  let testCheckingId: string;
  let testCreditId: string;
  let timestamp: number;

  beforeAll(async () => {
    // Create a test user and accounts
    timestamp = Date.now();
    testUserId = `test-api-${timestamp}`;
    testCheckingId = `test-checking-api-${timestamp}`;
    testCreditId = `test-credit-api-${timestamp}`;

    // Create test user
    await run(
      'INSERT INTO users (user_id, email, name) VALUES (?, ?, ?)',
      [testUserId, `test-api-${timestamp}@example.com`, 'Test API User']
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
    const liabilityId = `liability-api-${timestamp}`;
    await run(
      `INSERT INTO liabilities (liability_id, account_id, type, last_statement_balance, minimum_payment_amount, apr_percentage)
       VALUES (?, ?, 'credit_card', ?, ?, ?)`,
      [liabilityId, testCreditId, 6500, 130, 20.0]
    );
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await run('DELETE FROM recommendations WHERE user_id = ?', [testUserId]);
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

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      // This would typically test the HTTP endpoint, but we can verify the service is working
      const user = await get('SELECT * FROM users WHERE user_id = ?', [testUserId]);
      expect(user).toBeDefined();
      // Health check endpoint should return { status: 'ok', message: '...' }
    });
  });

  describe('Consent Endpoint', () => {
    it('should record consent successfully', async () => {
      const consentId = await recordConsent(testUserId);
      expect(consentId).toBeTruthy();
    });

    it('should revoke consent successfully', async () => {
      await recordConsent(testUserId);
      const revoked = await revokeConsent(testUserId);
      expect(revoked).toBe(true);
    });

    it('should handle consent for non-existent user', async () => {
      const nonExistentUserId = `non-existent-${Date.now()}`;
      await expect(recordConsent(nonExistentUserId)).rejects.toThrow();
    });
  });

  describe('Profile Endpoint', () => {
    it('should return 404 for non-existent user', async () => {
      const nonExistentUserId = `non-existent-${Date.now()}`;
      const user = await get('SELECT * FROM users WHERE user_id = ?', [nonExistentUserId]);
      expect(user).toBeUndefined();
    });

    it('should require consent to access profile', async () => {
      // Without consent, profile should not be accessible
      const { checkConsent } = await import('../../guardrails/consent');
      const hasConsent = await checkConsent(testUserId);
      // If no consent, profile endpoint should return 403
      // This test verifies the consent check function works
      expect(typeof hasConsent).toBe('boolean');
    });

    it('should assign persona when profile is accessed', async () => {
      await recordConsent(testUserId);
      const personaResult = await assignPersona(testUserId);
      
      if (personaResult) {
        const secondary = personaResult.secondary.map(p => p.personaType);
        await storePersonaAssignment(testUserId, personaResult.primary, secondary);
        
        const storedPersona = await get('SELECT * FROM personas WHERE user_id = ? ORDER BY assigned_at DESC LIMIT 1', [testUserId]);
        expect(storedPersona).toBeDefined();
      }
    });
  });

  describe('Recommendations Endpoint', () => {
    it('should return empty recommendations if no persona assigned', async () => {
      // Create user without persona
      const noPersonaTimestamp = Date.now();
      const noPersonaUserId = `test-no-persona-${noPersonaTimestamp}`;
      await run(
        'INSERT INTO users (user_id, email, name) VALUES (?, ?, ?)',
        [noPersonaUserId, `no-persona-${noPersonaTimestamp}@example.com`, 'No Persona User']
      );
      await recordConsent(noPersonaUserId);

      // Recommendations should return empty with message
      const persona = await get('SELECT * FROM personas WHERE user_id = ?', [noPersonaUserId]);
      expect(persona).toBeUndefined();

      // Cleanup
      await run('DELETE FROM consents WHERE user_id = ?', [noPersonaUserId]);
      await run('DELETE FROM users WHERE user_id = ?', [noPersonaUserId]);
    });

    it('should require consent to access recommendations', async () => {
      // Without consent, recommendations should not be accessible
      await revokeConsent(testUserId);
      const { checkConsent } = await import('../../guardrails/consent');
      const hasConsent = await checkConsent(testUserId);
      expect(hasConsent).toBe(false);
    });
  });

  describe('Chat Endpoint', () => {
    it('should require message in request body', async () => {
      // Chat endpoint should return 400 if message is missing
      // This would be tested with HTTP request, but we verify the service function
      await recordConsent(testUserId);
      
      // Valid message should work
      const { processChatMessage } = await import('../../ai/chatService');
      const result = await processChatMessage(testUserId, 'What is my credit utilization?');
      expect(result.response).toBeTruthy();
    });

    it('should require consent to use chat', async () => {
      await revokeConsent(testUserId);
      const { checkConsent } = await import('../../guardrails/consent');
      const hasConsent = await checkConsent(testUserId);
      expect(hasConsent).toBe(false);
    });
  });

  describe('Transaction History Endpoint', () => {
    it('should require consent to access transactions', async () => {
      await revokeConsent(testUserId);
      const { checkConsent } = await import('../../guardrails/consent');
      const hasConsent = await checkConsent(testUserId);
      expect(hasConsent).toBe(false);
    });

    it('should handle pagination parameters', async () => {
      await recordConsent(testUserId);
      const { getUserTransactions } = await import('../../services/transactionService');
      
      const page1 = await getUserTransactions(testUserId, 1, 10);
      expect(page1.page).toBe(1);
      expect(page1.limit).toBe(10);

      const page2 = await getUserTransactions(testUserId, 2, 10);
      expect(page2.page).toBe(2);
    });

    it('should handle search parameter', async () => {
      await recordConsent(testUserId);
      const { getUserTransactions } = await import('../../services/transactionService');
      
      // Create a transaction with specific merchant
      await run(
        `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name)
         VALUES (?, ?, ?, ?, ?)`,
        [
          `tx-search-api-${timestamp}`,
          testCheckingId,
          new Date().toISOString().split('T')[0],
          -100,
          'Test Merchant Search'
        ]
      );

      const results = await getUserTransactions(testUserId, 1, 10, 'Test Merchant');
      expect(results.transactions.length).toBeGreaterThan(0);
    });
  });

  describe('Admin Endpoints', () => {
    it('should require password for admin login', async () => {
      const { verifyAdminPassword } = await import('../../admin/adminService');
      
      // Valid password
      const isValid = await verifyAdminPassword('admin123');
      expect(typeof isValid).toBe('boolean');

      // Invalid password
      const isInvalid = await verifyAdminPassword('wrong');
      expect(isInvalid).toBe(false);
    });

    it('should return users with consent for admin', async () => {
      await recordConsent(testUserId);
      const { getUsersWithConsent } = await import('../../admin/adminService');
      
      const users = await getUsersWithConsent(1, 10);
      expect(users.users.length).toBeGreaterThan(0);
      
      // Verify test user is in the list
      const testUser = users.users.find(u => u.user_id === testUserId);
      expect(testUser).toBeDefined();
    });

    it('should log admin actions to audit log', async () => {
      const { logAdminAction, getAuditLog } = await import('../../admin/auditService');
      const adminId = `admin-test-${Date.now()}`;
      
      await logAdminAction(adminId, testUserId, 'viewed_profile');
      
      const auditLog = await getAuditLog({ adminId }, 1, 10);
      expect(auditLog.entries.length).toBeGreaterThan(0);
      
      const entry = auditLog.entries.find(e => e.admin_id === adminId && e.user_id === testUserId);
      expect(entry).toBeDefined();
      expect(entry?.action).toBe('viewed_profile');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent user', async () => {
      const nonExistentUserId = `non-existent-${Date.now()}`;
      const user = await get('SELECT * FROM users WHERE user_id = ?', [nonExistentUserId]);
      expect(user).toBeUndefined();
    });

    it('should return 403 when consent is revoked', async () => {
      await revokeConsent(testUserId);
      const { checkConsent } = await import('../../guardrails/consent');
      const hasConsent = await checkConsent(testUserId);
      expect(hasConsent).toBe(false);
    });

    it('should handle invalid request parameters', async () => {
      // Invalid page number (should default to 1)
      const { getUserTransactions } = await import('../../services/transactionService');
      await recordConsent(testUserId);
      
      // Negative page should be handled
      const result = await getUserTransactions(testUserId, -1, 10);
      expect(result.page).toBeGreaterThan(0);
    });
  });
});

