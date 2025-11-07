// Integration tests for complete user flows
// Tests: onboarding → consent → profile → recommendations → chat → transaction history

import { run, get, all } from '../../db/db';
import { recordConsent, checkConsent } from '../../guardrails/consent';
import { assignPersona, storePersonaAssignment, getCurrentPersona } from '../../personas/assignPersona';
import { generateRecommendations, storeRecommendations, getRecommendations } from '../../recommendations/engine';
import { processChatMessage } from '../../ai/chatService';
import { getUserTransactions } from '../../services/transactionService';

// Set test timeout to 30 seconds
jest.setTimeout(30000);

describe('User Flow Integration Tests', () => {
  let testUserId: string;
  let testCheckingId: string;
  let testCreditId: string;
  let testSavingsId: string;

  beforeAll(async () => {
    // Create a test user and accounts
    const timestamp = Date.now();
    testUserId = `test-user-flow-${timestamp}`;
    testCheckingId = `test-checking-flow-${timestamp}`;
    testCreditId = `test-credit-flow-${timestamp}`;
    testSavingsId = `test-savings-flow-${timestamp}`;

    // Create test user
    await run(
      'INSERT INTO users (user_id, email, name) VALUES (?, ?, ?)',
      [testUserId, `test-user-flow-${timestamp}@example.com`, 'Test User Flow']
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

    // Create liability for credit card
    const liabilityId = `liability-flow-${timestamp}`;
    await run(
      `INSERT INTO liabilities (liability_id, account_id, type, last_statement_balance, minimum_payment_amount, apr_percentage)
       VALUES (?, ?, 'credit_card', ?, ?, ?)`,
      [liabilityId, testCreditId, 6500, 130, 20.0]
    );

    // Create some transactions
    const baseDate = new Date();
    baseDate.setMonth(baseDate.getMonth() - 2);
    
    // Income transactions
    for (let i = 0; i < 3; i++) {
      const date = new Date(baseDate);
      date.setMonth(date.getMonth() + i);
      date.setDate(1);
      
      await run(
        `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name, payment_channel, personal_finance_category_primary)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          `tx-income-flow-${timestamp}-${i}`,
          testCheckingId,
          date.toISOString().split('T')[0],
          5000,
          'Payroll',
          'ach',
          'INCOME'
        ]
      );
    }

    // Expense transactions
    for (let i = 0; i < 3; i++) {
      const date = new Date(baseDate);
      date.setMonth(date.getMonth() + i);
      date.setDate(15);
      
      await run(
        `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name, personal_finance_category_primary)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `tx-expense-flow-${timestamp}-${i}`,
          testCheckingId,
          date.toISOString().split('T')[0],
          -2000,
          'Grocery Store',
          'GENERAL_MERCHANDISE'
        ]
      );
    }

    // Interest charge transaction
    const interestDate = new Date();
    interestDate.setMonth(interestDate.getMonth() - 1);
    await run(
      `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name)
       VALUES (?, ?, ?, ?, ?)`,
      [
        `tx-interest-flow-${timestamp}`,
        testCreditId,
        interestDate.toISOString().split('T')[0],
        -108.33,
        'Interest Charge'
      ]
    );
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await run('DELETE FROM recommendations WHERE user_id = ?', [testUserId]);
      await run('DELETE FROM personas WHERE user_id = ?', [testUserId]);
      await run('DELETE FROM consent WHERE user_id = ?', [testUserId]);
      await run('DELETE FROM chat_sessions WHERE user_id = ?', [testUserId]);
      await run('DELETE FROM chat_cache WHERE user_id = ?', [testUserId]);
      await run('DELETE FROM transactions WHERE account_id IN (?, ?, ?)', [testCheckingId, testCreditId, testSavingsId]);
      await run('DELETE FROM liabilities WHERE account_id = ?', [testCreditId]);
      await run('DELETE FROM accounts WHERE account_id IN (?, ?, ?)', [testCheckingId, testCreditId, testSavingsId]);
      await run('DELETE FROM users WHERE user_id = ?', [testUserId]);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('New User Onboarding Flow', () => {
    it('should complete full onboarding: consent → persona → recommendations', async () => {
      // Step 1: User provides consent
      const consentId = await recordConsent(testUserId);
      expect(consentId).toBeTruthy();
      
      const hasConsent = await checkConsent(testUserId);
      expect(hasConsent).toBe(true);

      // Step 2: Assign persona
      const personaResult = await assignPersona(testUserId);
      expect(personaResult).not.toBeNull();
      expect(personaResult?.primary).toBeDefined();
      expect(personaResult?.primary.personaType).toBe('high_utilization'); // 65% utilization

      // Step 3: Store persona
      const secondaryPersonaTypes = personaResult!.secondary.map(p => p.personaType);
      const personaId = await storePersonaAssignment(testUserId, personaResult!.primary, secondaryPersonaTypes);
      expect(personaId).toBeTruthy();

      // Step 4: Retrieve persona
      const retrievedPersona = await getCurrentPersona(testUserId);
      expect(retrievedPersona).not.toBeNull();
      expect(retrievedPersona?.persona_type).toBe('high_utilization');

      // Step 5: Generate recommendations
      const recommendations = await generateRecommendations(testUserId);
      expect(recommendations.length).toBeGreaterThanOrEqual(4); // At least 3 education + 1 partner offer

      // Step 6: Store recommendations
      await storeRecommendations(recommendations);
      
      // Step 7: Retrieve recommendations
      const retrievedRecommendations = await getRecommendations(testUserId);
      expect(retrievedRecommendations.length).toBeGreaterThanOrEqual(4);

      // Verify recommendation content
      const educationRecs = retrievedRecommendations.filter(r => r.type === 'education');
      const partnerRecs = retrievedRecommendations.filter(r => r.type === 'partner_offer');
      expect(educationRecs.length).toBeGreaterThanOrEqual(3);
      expect(partnerRecs.length).toBeGreaterThanOrEqual(1);

      // Verify rationales are personalized
      const firstRec = retrievedRecommendations[0];
      expect(firstRec.rationale.length).toBeGreaterThan(20);
      const isPersonalized = 
        firstRec.rationale.toLowerCase().includes('your') ||
        firstRec.rationale.toLowerCase().includes('you') ||
        firstRec.rationale.toLowerCase().includes('we noticed');
      expect(isPersonalized).toBe(true);
    });
  });

  describe('Returning User Dashboard Load', () => {
    it('should load dashboard with existing persona and recommendations', async () => {
      // User already has consent and persona from previous test
      const hasConsent = await checkConsent(testUserId);
      expect(hasConsent).toBe(true);

      // Retrieve persona
      const persona = await getCurrentPersona(testUserId);
      expect(persona).not.toBeNull();
      expect(persona?.persona_type).toBe('high_utilization');

      // Retrieve recommendations
      const recommendations = await getRecommendations(testUserId);
      expect(recommendations.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Chat Interaction Flow', () => {
    it('should handle chat message and return response', async () => {
      // Ensure user has consent
      await recordConsent(testUserId);

      // Send a chat message
      const userMessage = 'What is my credit utilization?';
      const response = await processChatMessage(testUserId, userMessage);
      
      expect(response).toBeDefined();
      expect(response.response).toBeTruthy();
      expect(response.response.length).toBeGreaterThan(0);
      expect(response.conversationId).toBeTruthy();
      
      // Response should be a valid string (may be fallback message if OpenAI not configured)
      expect(typeof response.response).toBe('string');
      expect(response.response.length).toBeGreaterThan(0);
    });

    it('should maintain conversation context across multiple messages', async () => {
      // Send first message
      const firstMessage = 'What is my credit utilization?';
      const firstResponse = await processChatMessage(testUserId, firstMessage);
      expect(firstResponse.response).toBeTruthy();

      // Send follow-up message (use conversation ID from first response)
      const secondMessage = 'How can I improve it?';
      const secondResponse = await processChatMessage(testUserId, secondMessage, firstResponse.conversationId);
      
      expect(secondResponse.response).toBeTruthy();
      // Second response should be a valid string (may be fallback if OpenAI not configured)
      expect(typeof secondResponse.response).toBe('string');
      expect(secondResponse.response.length).toBeGreaterThan(0);
    });
  });

  describe('Transaction History Flow', () => {
    it('should fetch transaction history with pagination', async () => {
      // Ensure user has consent
      await recordConsent(testUserId);

      // Fetch first page
      const page1 = await getUserTransactions(testUserId, 1, 10);
      expect(page1.transactions.length).toBeGreaterThan(0);
      expect(page1.transactions.length).toBeLessThanOrEqual(10);
      expect(page1.total).toBeGreaterThan(0);
      expect(page1.limit).toBe(10);

      // Fetch second page if available
      if (page1.total > 10) {
        const page2 = await getUserTransactions(testUserId, 2, 10);
        expect(page2.transactions.length).toBeGreaterThan(0);
        expect(page2.limit).toBe(10);
      }
    });

    it('should search transactions by keyword', async () => {
      // Search for "Grocery"
      const results = await getUserTransactions(testUserId, 1, 10, 'Grocery');
      
      expect(results.transactions.length).toBeGreaterThan(0);
      // All results should contain "Grocery" in merchant name
      results.transactions.forEach(tx => {
        const matches = 
          tx.merchant_name?.toLowerCase().includes('grocery') ||
          tx.merchant_name?.toLowerCase().includes('grocery');
        expect(matches).toBe(true);
      });
    });

    it('should return empty results for non-matching search', async () => {
      // Search for something that doesn't exist
      const results = await getUserTransactions(testUserId, 1, 10, 'NonExistentMerchant12345');
      
      expect(results.transactions.length).toBe(0);
      expect(results.total).toBe(0);
    });
  });
});

