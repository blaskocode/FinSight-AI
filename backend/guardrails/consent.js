"use strict";
// Consent Management Module
// Handles user consent recording, checking, and revocation
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordConsent = recordConsent;
exports.checkConsent = checkConsent;
exports.revokeConsent = revokeConsent;
exports.getConsentRecord = getConsentRecord;
const db_1 = require("../db/db");
/**
 * Record user consent
 * @param userId - The user ID
 * @returns The consent ID
 */
async function recordConsent(userId) {
    // Check if user already has an active consent
    const existing = await checkConsent(userId);
    if (existing) {
        // Get existing active consent
        const consent = await (0, db_1.get)(`SELECT consent_id FROM consents 
       WHERE user_id = ? AND status = 'active' 
       ORDER BY created_at DESC LIMIT 1`, [userId]);
        if (consent && consent.consent_id) {
            return consent.consent_id;
        }
    }
    // Create new consent record
    const consentId = `consent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    await (0, db_1.run)(`INSERT INTO consents (consent_id, user_id, consented_at, revoked_at, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`, [consentId, userId, now, null, 'active', now]);
    return consentId;
}
/**
 * Check if user has active consent
 * @param userId - The user ID
 * @returns True if user has active consent, false otherwise
 */
async function checkConsent(userId) {
    const consent = await (0, db_1.get)(`SELECT * FROM consents 
     WHERE user_id = ? AND status = 'active' 
     ORDER BY created_at DESC LIMIT 1`, [userId]);
    return consent !== null && consent !== undefined && consent.status === 'active';
}
/**
 * Revoke user consent
 * @param userId - The user ID
 * @returns True if consent was revoked, false if no active consent found
 */
async function revokeConsent(userId) {
    // Find active consent
    const consent = await (0, db_1.get)(`SELECT * FROM consents 
     WHERE user_id = ? AND status = 'active' 
     ORDER BY created_at DESC LIMIT 1`, [userId]);
    if (!consent) {
        return false; // No active consent to revoke
    }
    // Update consent status to revoked
    const now = new Date().toISOString();
    await (0, db_1.run)(`UPDATE consents 
     SET status = 'revoked', revoked_at = ? 
     WHERE consent_id = ?`, [now, consent.consent_id]);
    return true;
}
/**
 * Get consent record for a user
 * @param userId - The user ID
 * @returns The most recent consent record or null
 */
async function getConsentRecord(userId) {
    const consent = await (0, db_1.get)(`SELECT * FROM consents 
     WHERE user_id = ? 
     ORDER BY created_at DESC LIMIT 1`, [userId]);
    return consent || null;
}
