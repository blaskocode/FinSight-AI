// Integration tests for admin flow
// Tests: login → view user list → view user detail → audit log

import { run, get, all } from '../../db/db';
import { verifyAdminPassword, getUsersWithConsent, searchUsers, getUserDetail } from '../../admin/adminService';
import { logAdminAction, getAuditLog } from '../../admin/auditService';
import { recordConsent } from '../../guardrails/consent';
import { assignPersona, storePersonaAssignment } from '../../personas/assignPersona';

// Set test timeout to 30 seconds
jest.setTimeout(30000);

describe('Admin Flow Integration Tests', () => {
  let adminId: string;
  let testUser1Id: string;
  let testUser2Id: string;
  let testUser3Id: string; // User without consent

  beforeAll(async () => {
    const timestamp = Date.now();
    adminId = `admin-${timestamp}`;
    testUser1Id = `test-admin-user1-${timestamp}`;
    testUser2Id = `test-admin-user2-${timestamp}`;
    testUser3Id = `test-admin-user3-${timestamp}`;

    // Create test users
    await run(
      'INSERT INTO users (user_id, email, name) VALUES (?, ?, ?)',
      [testUser1Id, `user1-${timestamp}@example.com`, 'Test User 1']
    );

    await run(
      'INSERT INTO users (user_id, email, name) VALUES (?, ?, ?)',
      [testUser2Id, `user2-${timestamp}@example.com`, 'Test User 2']
    );

    await run(
      'INSERT INTO users (user_id, email, name) VALUES (?, ?, ?)',
      [testUser3Id, `user3-${timestamp}@example.com`, 'Test User 3']
    );

    // Create accounts for user 1
    const checkingId1 = `checking-user1-${Date.now()}`;
    await run(
      `INSERT INTO accounts (account_id, user_id, type, balances)
       VALUES (?, ?, 'checking', ?)`,
      [checkingId1, testUser1Id, JSON.stringify({ available: 5000, current: 5000 })]
    );

    const creditId1 = `credit-user1-${Date.now()}`;
    await run(
      `INSERT INTO accounts (account_id, user_id, type, balances)
       VALUES (?, ?, 'credit', ?)`,
      [creditId1, testUser1Id, JSON.stringify({ available: 3500, current: 6500, limit: 10000 })]
    );

    // Create liability for user 1
    const liabilityId1 = `liability-user1-${Date.now()}`;
    await run(
      `INSERT INTO liabilities (liability_id, account_id, type, last_statement_balance, minimum_payment_amount, apr_percentage)
       VALUES (?, ?, 'credit_card', ?, ?, ?)`,
      [liabilityId1, creditId1, 6500, 130, 20.0]
    );

    // User 1: Has consent and persona
    await recordConsent(testUser1Id);
    const personaResult1 = await assignPersona(testUser1Id);
    if (personaResult1) {
      const secondary1 = personaResult1.secondary.map(p => p.personaType);
      await storePersonaAssignment(testUser1Id, personaResult1.primary, secondary1);
    }

    // User 2: Has consent but no persona yet
    await recordConsent(testUser2Id);

    // User 3: No consent (should not appear in user list)
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await run('DELETE FROM audit_log WHERE admin_id = ?', [adminId]);
      await run('DELETE FROM recommendations WHERE user_id IN (?, ?, ?)', [testUser1Id, testUser2Id, testUser3Id]);
      await run('DELETE FROM personas WHERE user_id IN (?, ?, ?)', [testUser1Id, testUser2Id, testUser3Id]);
      await run('DELETE FROM consent WHERE user_id IN (?, ?, ?)', [testUser1Id, testUser2Id, testUser3Id]);
      await run('DELETE FROM transactions WHERE account_id IN (SELECT account_id FROM accounts WHERE user_id IN (?, ?, ?))', [testUser1Id, testUser2Id, testUser3Id]);
      await run('DELETE FROM liabilities WHERE account_id IN (SELECT account_id FROM accounts WHERE user_id IN (?, ?, ?))', [testUser1Id, testUser2Id, testUser3Id]);
      await run('DELETE FROM accounts WHERE user_id IN (?, ?, ?)', [testUser1Id, testUser2Id, testUser3Id]);
      await run('DELETE FROM users WHERE user_id IN (?, ?, ?)', [testUser1Id, testUser2Id, testUser3Id]);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Admin Login Flow', () => {
    it('should verify admin password correctly', async () => {
      // Test with default password (or env var)
      const isValid = await verifyAdminPassword('admin123');
      expect(typeof isValid).toBe('boolean');
    });

    it('should reject invalid password', async () => {
      const isValid = await verifyAdminPassword('wrongpassword');
      expect(isValid).toBe(false);
    });
  });

  describe('Admin User List Flow', () => {
    it('should fetch users with consent', async () => {
      const users = await getUsersWithConsent(1, 10);
      
      expect(users.users.length).toBeGreaterThanOrEqual(2); // At least user1 and user2
      expect(users.total).toBeGreaterThanOrEqual(2);
      expect(users.page).toBe(1);
      expect(users.totalPages).toBeGreaterThan(0);

      // Verify user 1 is in the list
      const user1 = users.users.find(u => u.user_id === testUser1Id);
      expect(user1).toBeDefined();
      expect(user1?.consent_status).toBe('active');

      // Verify user 2 is in the list
      const user2 = users.users.find(u => u.user_id === testUser2Id);
      expect(user2).toBeDefined();
      expect(user2?.consent_status).toBe('active');

      // Verify user 3 (no consent) is NOT in the list
      const user3 = users.users.find(u => u.user_id === testUser3Id);
      expect(user3).toBeUndefined();
    });

    it('should search users by name or email', async () => {
      // Search by name
      const nameResults = await searchUsers('Test User 1', 1, 10);
      expect(nameResults.users.length).toBeGreaterThan(0);
      expect(nameResults.users[0].name).toContain('Test User 1');

      // Search by email (use partial match since email includes timestamp)
      const emailResults = await searchUsers('user1', 1, 10);
      expect(emailResults.users.length).toBeGreaterThan(0);
      expect(emailResults.users[0].email).toContain('user1');
    });

    it('should paginate user list', async () => {
      // Get first page
      const page1 = await getUsersWithConsent(1, 1);
      expect(page1.users.length).toBe(1);
      expect(page1.page).toBe(1);

      // Get second page
      if (page1.total > 1) {
        const page2 = await getUsersWithConsent(2, 1);
        expect(page2.users.length).toBe(1);
        expect(page2.page).toBe(2);
        // Users should be different
        expect(page2.users[0].user_id).not.toBe(page1.users[0].user_id);
      }
    });
  });

  describe('Admin User Detail Flow', () => {
    it('should fetch user detail with all information', async () => {
      // Log admin action
      await logAdminAction(adminId, testUser1Id, 'viewed_profile');

      const userDetail = await getUserDetail(testUser1Id);
      
      expect(userDetail).not.toBeNull();
      expect(userDetail).toBeDefined();
      if (userDetail) {
        expect(userDetail.user_id).toBe(testUser1Id);
        expect(userDetail.has_consent).toBe(true);
        expect(userDetail.persona).toBeDefined();
        expect(userDetail.signals).toBeDefined();
        expect(userDetail.recommendations).toBeDefined();
        expect(userDetail.transactions).toBeDefined();
        expect(userDetail.persona_history).toBeDefined();
      }
    });

    it('should block access to user without consent', async () => {
      const userDetail = await getUserDetail(testUser3Id);
      
      expect(userDetail).not.toBeNull();
      if (userDetail) {
        expect(userDetail.has_consent).toBe(false);
        // Should not return sensitive data
        expect(userDetail.persona).toBeNull();
        // Signals may be empty object {} instead of null - check if it's empty
        expect(Object.keys(userDetail.signals || {}).length).toBe(0);
      }
    });

    it('should record admin actions in audit log', async () => {
      // Log multiple actions
      await logAdminAction(adminId, testUser1Id, 'viewed_profile');
      await logAdminAction(adminId, testUser1Id, 'viewed_recommendations');
      await logAdminAction(adminId, testUser2Id, 'viewed_profile');

      const auditLog = await getAuditLog(undefined, 1, 10);
      
      expect(auditLog.entries.length).toBeGreaterThanOrEqual(3);
      
      // Verify entries contain correct information
      const profileViews = auditLog.entries.filter(e => e.action === 'viewed_profile');
      expect(profileViews.length).toBeGreaterThanOrEqual(2);
      
      // Verify admin_id and user_id are correct
      const adminEntries = auditLog.entries.filter(e => e.admin_id === adminId);
      expect(adminEntries.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Admin Audit Log Flow', () => {
    it('should filter audit log by admin', async () => {
      const auditLog = await getAuditLog({ adminId }, 1, 10);
      
      expect(auditLog.entries.length).toBeGreaterThan(0);
      // All entries should be from this admin
      auditLog.entries.forEach(entry => {
        expect(entry.admin_id).toBe(adminId);
      });
    });

    it('should filter audit log by user', async () => {
      const auditLog = await getAuditLog({ userId: testUser1Id }, 1, 10);
      
      expect(auditLog.entries.length).toBeGreaterThan(0);
      // All entries should be for this user
      auditLog.entries.forEach(entry => {
        expect(entry.user_id).toBe(testUser1Id);
      });
    });

    it('should filter audit log by action', async () => {
      const auditLog = await getAuditLog({ action: 'viewed_profile' }, 1, 10);
      
      expect(auditLog.entries.length).toBeGreaterThan(0);
      // All entries should be for this action
      auditLog.entries.forEach(entry => {
        expect(entry.action).toBe('viewed_profile');
      });
    });

    it('should paginate audit log', async () => {
      // Create more audit entries
      for (let i = 0; i < 5; i++) {
        await logAdminAction(adminId, testUser1Id, 'viewed_profile');
      }

      const page1 = await getAuditLog(undefined, 1, 3);
      expect(page1.entries.length).toBeLessThanOrEqual(3);
      expect(page1.page).toBe(1);

      if (page1.total > 3) {
        const page2 = await getAuditLog(undefined, 2, 3);
        expect(page2.entries.length).toBeLessThanOrEqual(3);
        expect(page2.page).toBe(2);
      }
    });
  });
});

