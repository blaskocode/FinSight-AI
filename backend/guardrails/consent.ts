// Consent Management Module
// Handles user consent recording, checking, and revocation

import { get, run } from '../db/db';

export interface ConsentRecord {
  consent_id: string;
  user_id: string;
  consented_at: string | null;
  revoked_at: string | null;
  status: 'pending' | 'active' | 'revoked';
  created_at: string;
}

/**
 * Record user consent
 * @param userId - The user ID
 * @returns The consent ID
 */
export async function recordConsent(userId: string): Promise<string> {
  // Check if user already has an active consent
  const existing = await checkConsent(userId);
  if (existing) {
    // Get existing active consent
    const consent = await get<ConsentRecord>(
      `SELECT consent_id FROM consents 
       WHERE user_id = ? AND status = 'active' 
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    
    if (consent && consent.consent_id) {
      return consent.consent_id;
    }
  }

  // Create new consent record
  const consentId = `consent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  await run(
    `INSERT INTO consents (consent_id, user_id, consented_at, revoked_at, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [consentId, userId, now, null, 'active', now]
  );

  return consentId;
}

/**
 * Check if user has active consent
 * @param userId - The user ID
 * @returns True if user has active consent, false otherwise
 */
export async function checkConsent(userId: string): Promise<boolean> {
  const consent = await get<ConsentRecord>(
    `SELECT * FROM consents 
     WHERE user_id = ? AND status = 'active' 
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );

  return consent !== null && consent !== undefined && consent.status === 'active';
}

/**
 * Revoke user consent
 * @param userId - The user ID
 * @returns True if consent was revoked, false if no active consent found
 */
export async function revokeConsent(userId: string): Promise<boolean> {
  // Find active consent
  const consent = await get<ConsentRecord>(
    `SELECT * FROM consents 
     WHERE user_id = ? AND status = 'active' 
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );

  if (!consent) {
    return false; // No active consent to revoke
  }

  // Update consent status to revoked
  const now = new Date().toISOString();
  await run(
    `UPDATE consents 
     SET status = 'revoked', revoked_at = ? 
     WHERE consent_id = ?`,
    [now, consent.consent_id]
  );

  return true;
}

/**
 * Get consent record for a user
 * @param userId - The user ID
 * @returns The most recent consent record or null
 */
export async function getConsentRecord(userId: string): Promise<ConsentRecord | null> {
  const consent = await get<ConsentRecord>(
    `SELECT * FROM consents 
     WHERE user_id = ? 
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );

  return consent || null;
}

