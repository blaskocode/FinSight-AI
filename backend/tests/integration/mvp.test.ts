// MVP Integration Test
// Tests the complete user flow: consent → profile → recommendations

import { recordConsent, checkConsent, revokeConsent } from '../../guardrails/consent';
import { assignPersona, storePersonaAssignment, getCurrentPersona } from '../../personas/assignPersona';
import { generateRecommendations, storeRecommendations, getRecommendations } from '../../recommendations/engine';
import { get } from '../../db/db';

// Set test timeout to 30 seconds
jest.setTimeout(30000);

describe('MVP Integration Test', () => {
  const testUserId = 'user-1762493514942-gm8c7gimv'; // High Utilization user

  beforeAll(async () => {
    // Ensure database is initialized
    // This test assumes the database is already set up with test data
  });

  afterAll(async () => {
    // Cleanup: revoke consent if it was set
    try {
      await revokeConsent(testUserId);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Complete User Flow', () => {
    it('should complete full flow: consent → persona → recommendations', async () => {
      // Step 1: User provides consent
      const consentId = await recordConsent(testUserId);
      expect(consentId).toBeTruthy();
      
      const hasConsent = await checkConsent(testUserId);
      expect(hasConsent).toBe(true);

      // Step 2: Assign persona
      const personaAssignment = await assignPersona(testUserId);
      expect(personaAssignment).not.toBeNull();
      expect(personaAssignment?.primary.personaType).toBe('high_utilization');
      expect(personaAssignment?.primary.criteriaMet.length).toBeGreaterThan(0);
      expect(personaAssignment?.primary.confidence).toBeGreaterThan(0);

      // Step 3: Store persona
      const secondaryPersonaTypes = personaAssignment!.secondary.map(p => p.personaType);
      const storedPersonaId = await storePersonaAssignment(testUserId, personaAssignment!.primary, secondaryPersonaTypes);
      expect(storedPersonaId).toBeTruthy();

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

      // Verify rationales contain specific data points
      const firstRec = retrievedRecommendations[0];
      expect(firstRec.rationale).toContain('utilization');
    });

    it('should enforce consent requirement', async () => {
      // Revoke consent
      await revokeConsent(testUserId);
      
      const hasConsent = await checkConsent(testUserId);
      expect(hasConsent).toBe(false);

      // Re-record consent
      await recordConsent(testUserId);
      const hasConsentAgain = await checkConsent(testUserId);
      expect(hasConsentAgain).toBe(true);
    });

    it('should assign High Utilization persona correctly', async () => {
      const personaAssignment = await assignPersona(testUserId);
      
      expect(personaAssignment).not.toBeNull();
      expect(personaAssignment?.primary.personaType).toBe('high_utilization');
      
      // Verify criteria met
      const criteriaMet = personaAssignment?.primary.criteriaMet || [];
      expect(criteriaMet.length).toBeGreaterThan(0);
      
      // Should have utilization criteria
      const hasUtilization = criteriaMet.some(c => c.includes('utilization'));
      expect(hasUtilization).toBe(true);
    });

    it('should generate personalized recommendations', async () => {
      const recommendations = await generateRecommendations(testUserId);
      
      expect(recommendations.length).toBeGreaterThanOrEqual(4);
      
      // Check that rationales are personalized
      recommendations.forEach(rec => {
        expect(rec.rationale.length).toBeGreaterThan(20); // Not empty
        // Rationales should contain personalized language (your/you/we noticed)
        const isPersonalized = 
          rec.rationale.toLowerCase().includes('your') ||
          rec.rationale.toLowerCase().includes('you') ||
          rec.rationale.toLowerCase().includes('we noticed');
        expect(isPersonalized).toBe(true);
      });
    });
  });
});

