"use strict";
// Audit Service Module
// Handles audit logging for admin actions
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAdminAction = logAdminAction;
exports.getAuditLog = getAuditLog;
const db_1 = require("../db/db");
const consent_1 = require("../guardrails/consent");
/**
 * Log an admin action
 * @param adminId - The admin ID (hardcoded as "admin" for demo)
 * @param userId - The user ID being accessed
 * @param action - The action being performed (e.g., "viewed_profile", "viewed_transactions")
 */
async function logAdminAction(adminId, userId, action) {
    try {
        // Check if user has consented before logging access
        const hasConsent = await (0, consent_1.checkConsent)(userId);
        if (!hasConsent) {
            // Still log the attempt, but note it was blocked
            action = `${action}_no_consent`;
        }
        const logId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await (0, db_1.run)(`INSERT INTO audit_log (log_id, admin_id, user_id, action, timestamp)
       VALUES (?, ?, ?, ?, datetime('now'))`, [logId, adminId, userId, action]);
    }
    catch (error) {
        console.error('Error logging admin action:', error);
        // Don't throw - audit logging should not break the application
    }
}
/**
 * Get audit log entries
 * @param filters - Optional filters (adminId, userId, action, dateRange)
 * @param page - Page number (1-indexed)
 * @param limit - Number of entries per page
 */
async function getAuditLog(filters, page = 1, limit = 50) {
    const pageNum = Math.max(1, Math.floor(page));
    const limitNum = Math.max(1, Math.min(100, Math.floor(limit)));
    const offset = (pageNum - 1) * limitNum;
    let query = `SELECT log_id, admin_id, user_id, action, timestamp FROM audit_log WHERE 1=1`;
    const params = [];
    if (filters?.adminId) {
        query += ` AND admin_id = ?`;
        params.push(filters.adminId);
    }
    if (filters?.userId) {
        query += ` AND user_id = ?`;
        params.push(filters.userId);
    }
    if (filters?.action) {
        query += ` AND action = ?`;
        params.push(filters.action);
    }
    if (filters?.startDate) {
        query += ` AND timestamp >= ?`;
        params.push(filters.startDate);
    }
    if (filters?.endDate) {
        query += ` AND timestamp <= ?`;
        params.push(filters.endDate);
    }
    query += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);
    const entries = await (0, db_1.all)(query, params);
    // Get total count
    let countQuery = `SELECT COUNT(*) as count FROM audit_log WHERE 1=1`;
    const countParams = [];
    if (filters?.adminId) {
        countQuery += ` AND admin_id = ?`;
        countParams.push(filters.adminId);
    }
    if (filters?.userId) {
        countQuery += ` AND user_id = ?`;
        countParams.push(filters.userId);
    }
    if (filters?.action) {
        countQuery += ` AND action = ?`;
        countParams.push(filters.action);
    }
    if (filters?.startDate) {
        countQuery += ` AND timestamp >= ?`;
        countParams.push(filters.startDate);
    }
    if (filters?.endDate) {
        countQuery += ` AND timestamp <= ?`;
        countParams.push(filters.endDate);
    }
    const totalResult = await (0, db_1.get)(countQuery, countParams);
    const total = totalResult?.count || 0;
    const totalPages = Math.ceil(total / limitNum);
    return {
        entries,
        total,
        page: pageNum,
        totalPages,
    };
}
