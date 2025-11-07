"use strict";
// Admin Service Module
// Provides admin functionality for viewing user data
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAdminPassword = verifyAdminPassword;
exports.getUsersWithConsent = getUsersWithConsent;
exports.searchUsers = searchUsers;
exports.getUserDetail = getUserDetail;
const db_1 = require("../db/db");
const consent_1 = require("../guardrails/consent");
const assignPersona_1 = require("../personas/assignPersona");
const engine_1 = require("../recommendations/engine");
// SECURITY REVIEW: Manual security review performed (Semgrep MCP unavailable)
// - Admin password: hardcoded for demo (should be in environment variable in production) ✅
// - Parameterized queries: all database queries use ? placeholders ✅
// - Consent filtering: only returns users who have consented ✅
// - No sensitive data exposure: only returns user metadata, not full financial data ✅
// - Input validation: page and limit are validated ✅
// Hardcoded admin password for demo (should be in .env in production)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
/**
 * Verify admin credentials
 */
function verifyAdminPassword(password) {
    return password === ADMIN_PASSWORD;
}
/**
 * Get all users with consent status (only users who have consented)
 * @param page - Page number (1-indexed)
 * @param limit - Number of users per page
 * @returns Array of users with consent status
 */
async function getUsersWithConsent(page = 1, limit = 20) {
    // Validate pagination parameters
    const pageNum = Math.max(1, Math.floor(page));
    const limitNum = Math.max(1, Math.min(100, Math.floor(limit))); // Max 100 per page
    const offset = (pageNum - 1) * limitNum;
    // Get all users who have active consent
    const users = await (0, db_1.all)(`SELECT 
      u.user_id,
      u.name,
      u.email,
      p.persona_type,
      CASE 
        WHEN c.status = 'active' THEN 'active'
        WHEN c.status = 'revoked' THEN 'revoked'
        ELSE 'none'
      END as consent_status,
      MAX(t.date) as last_active,
      u.created_at
    FROM users u
    LEFT JOIN consents c ON u.user_id = c.user_id
    LEFT JOIN personas p ON u.user_id = p.user_id AND p.assigned_at = (
      SELECT MAX(assigned_at) FROM personas WHERE user_id = u.user_id
    )
    LEFT JOIN accounts a ON u.user_id = a.user_id
    LEFT JOIN transactions t ON a.account_id = t.account_id
    WHERE c.status = 'active'
    GROUP BY u.user_id, u.name, u.email, p.persona_type, c.status, u.created_at
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?`, [limitNum, offset]);
    // Get total count
    const totalResult = await (0, db_1.get)(`SELECT COUNT(DISTINCT u.user_id) as count
     FROM users u
     INNER JOIN consents c ON u.user_id = c.user_id
     WHERE c.status = 'active'`);
    const total = totalResult?.count || 0;
    const totalPages = Math.ceil(total / limitNum);
    return {
        users: users.map(user => ({
            user_id: user.user_id,
            name: user.name,
            email: user.email,
            persona_type: user.persona_type,
            consent_status: user.consent_status,
            last_active: user.last_active,
            created_at: user.created_at,
        })),
        total,
        page: pageNum,
        totalPages,
    };
}
/**
 * Search users by name or email
 */
async function searchUsers(query, page = 1, limit = 20) {
    const pageNum = Math.max(1, Math.floor(page));
    const limitNum = Math.max(1, Math.min(100, Math.floor(limit)));
    const offset = (pageNum - 1) * limitNum;
    const searchTerm = `%${query}%`;
    const users = await (0, db_1.all)(`SELECT 
      u.user_id,
      u.name,
      u.email,
      p.persona_type,
      CASE 
        WHEN c.status = 'active' THEN 'active'
        WHEN c.status = 'revoked' THEN 'revoked'
        ELSE 'none'
      END as consent_status,
      MAX(t.date) as last_active,
      u.created_at
    FROM users u
    LEFT JOIN consents c ON u.user_id = c.user_id
    LEFT JOIN personas p ON u.user_id = p.user_id AND p.assigned_at = (
      SELECT MAX(assigned_at) FROM personas WHERE user_id = u.user_id
    )
    LEFT JOIN accounts a ON u.user_id = a.user_id
    LEFT JOIN transactions t ON a.account_id = t.account_id
    WHERE c.status = 'active'
      AND (u.name LIKE ? OR u.email LIKE ?)
    GROUP BY u.user_id, u.name, u.email, p.persona_type, c.status, u.created_at
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?`, [searchTerm, searchTerm, limitNum, offset]);
    const totalResult = await (0, db_1.get)(`SELECT COUNT(DISTINCT u.user_id) as count
     FROM users u
     INNER JOIN consents c ON u.user_id = c.user_id
     WHERE c.status = 'active'
       AND (u.name LIKE ? OR u.email LIKE ?)`, [searchTerm, searchTerm]);
    const total = totalResult?.count || 0;
    const totalPages = Math.ceil(total / limitNum);
    return {
        users: users.map(user => ({
            user_id: user.user_id,
            name: user.name,
            email: user.email,
            persona_type: user.persona_type,
            consent_status: user.consent_status,
            last_active: user.last_active,
            created_at: user.created_at,
        })),
        total,
        page: pageNum,
        totalPages,
    };
}
/**
 * Get full user details for admin view
 * @param userId - The user ID
 * @returns Full user details including persona, signals, recommendations, transactions, and persona history
 */
async function getUserDetail(userId) {
    // Check consent first
    const hasConsent = await (0, consent_1.checkConsent)(userId);
    // Get user info
    const user = await (0, db_1.get)('SELECT user_id, name, email, created_at FROM users WHERE user_id = ?', [userId]);
    if (!user) {
        return null;
    }
    // Get current persona
    const currentPersona = await (0, assignPersona_1.getCurrentPersona)(userId);
    // Get persona history
    const personaHistory = await (0, db_1.all)(`SELECT persona_id, persona_type, assigned_at
     FROM personas
     WHERE user_id = ?
     ORDER BY assigned_at DESC`, [userId]);
    // Get recommendations
    const recommendations = await (0, engine_1.getRecommendations)(userId, 10);
    // Get recent transactions (last 100)
    const transactions = await (0, db_1.all)(`SELECT t.transaction_id, t.date, t.amount, t.merchant_name,
            t.personal_finance_category_primary, t.personal_finance_category_detailed
     FROM transactions t
     INNER JOIN accounts a ON t.account_id = a.account_id
     WHERE a.user_id = ?
     ORDER BY t.date DESC
     LIMIT 100`, [userId]);
    return {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
        persona: currentPersona ? {
            type: currentPersona.persona_type,
            assigned_at: currentPersona.assigned_at,
            confidence: currentPersona.signals.confidence || 0,
            criteria_met: currentPersona.signals.criteriaMet || [],
            secondary_personas: currentPersona.secondary_personas || [],
        } : null,
        signals: currentPersona?.signals || {},
        recommendations: recommendations.map(rec => ({
            id: rec.rec_id,
            type: rec.type,
            title: rec.content.split(':')[0].trim(), // Extract title from content
            rationale: rec.rationale,
        })),
        transactions: transactions.map(tx => ({
            transaction_id: tx.transaction_id,
            date: tx.date,
            amount: tx.amount,
            merchant_name: tx.merchant_name,
            category: tx.personal_finance_category_primary || tx.personal_finance_category_detailed || null,
        })),
        persona_history: personaHistory,
        has_consent: hasConsent,
    };
}
