"use strict";
// Transaction Service
// Handles user transaction queries with pagination and search
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserTransactions = getUserTransactions;
const db_1 = require("../db/db");
/**
 * Get user transactions with pagination and search
 * Search is performed across ALL transactions, then results are paginated
 * @param userId - The user ID
 * @param page - Page number (1-indexed)
 * @param limit - Number of transactions per page
 * @param search - Optional search term (searches merchant_name and categories)
 * @returns Paginated transactions with metadata
 */
async function getUserTransactions(userId, page = 1, limit = 20, search) {
    // Validate inputs
    const pageNum = Math.max(1, Math.floor(page));
    const limitNum = Math.max(1, Math.min(100, Math.floor(limit))); // Max 100 per page
    const offset = (pageNum - 1) * limitNum;
    // Build base query - search ALL transactions first
    let countQuery = `
    SELECT COUNT(*) as total
    FROM transactions t
    INNER JOIN accounts a ON t.account_id = a.account_id
    WHERE a.user_id = ?
  `;
    let dataQuery = `
    SELECT 
      t.transaction_id,
      t.date,
      t.amount,
      t.merchant_name,
      COALESCE(t.personal_finance_category_detailed, t.personal_finance_category_primary) as category
    FROM transactions t
    INNER JOIN accounts a ON t.account_id = a.account_id
    WHERE a.user_id = ?
  `;
    const params = [userId];
    const countParams = [userId];
    // Add search filter if provided
    if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        const searchCondition = `
      AND (
        LOWER(t.merchant_name) LIKE LOWER(?) 
        OR LOWER(t.personal_finance_category_primary) LIKE LOWER(?)
        OR LOWER(t.personal_finance_category_detailed) LIKE LOWER(?)
      )
    `;
        countQuery += searchCondition;
        dataQuery += searchCondition;
        params.push(searchTerm, searchTerm, searchTerm);
        countParams.push(searchTerm, searchTerm, searchTerm);
    }
    // Add ordering and pagination
    dataQuery += ` ORDER BY t.date DESC LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);
    // Execute queries
    const [totalResult, transactions] = await Promise.all([
        (0, db_1.get)(countQuery, countParams),
        (0, db_1.all)(dataQuery, params)
    ]);
    const total = totalResult?.total || 0;
    const totalPages = Math.ceil(total / limitNum);
    // Format transactions
    const formattedTransactions = transactions.map(tx => ({
        transaction_id: tx.transaction_id,
        date: tx.date,
        amount: tx.amount,
        merchant_name: tx.merchant_name,
        category: tx.category
    }));
    return {
        transactions: formattedTransactions,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages
    };
}
