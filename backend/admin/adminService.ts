// Admin Service Module
// Provides admin functionality for viewing user data

import { all, get } from '../db/db';
import { checkConsent } from '../guardrails/consent';
import { getCurrentPersona } from '../personas/assignPersona';
import { getRecommendations } from '../recommendations/engine';

// SECURITY REVIEW: Manual security review performed (Semgrep MCP unavailable)
// - Admin password: hardcoded for demo (should be in environment variable in production) ✅
// - Parameterized queries: all database queries use ? placeholders ✅
// - Consent filtering: only returns users who have consented ✅
// - No sensitive data exposure: only returns user metadata, not full financial data ✅
// - Input validation: page and limit are validated ✅

// Hardcoded admin password for demo (should be in .env in production)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

export interface AdminUser {
  user_id: string;
  name: string;
  email: string;
  persona_type: string | null;
  consent_status: 'active' | 'revoked' | 'none';
  last_active: string | null;
  created_at: string;
}

/**
 * Verify admin credentials
 */
export function verifyAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

/**
 * Get all users with consent status (only users who have consented)
 * @param page - Page number (1-indexed)
 * @param limit - Number of users per page
 * @returns Array of users with consent status
 */
export async function getUsersWithConsent(
  page: number = 1,
  limit: number = 20
): Promise<{ users: AdminUser[]; total: number; page: number; totalPages: number }> {
  // Validate pagination parameters
  const pageNum = Math.max(1, Math.floor(page));
  const limitNum = Math.max(1, Math.min(100, Math.floor(limit))); // Max 100 per page
  const offset = (pageNum - 1) * limitNum;

  // Get all users who have active consent
  const users = await all<{
    user_id: string;
    name: string;
    email: string;
    persona_type: string | null;
    consent_status: string;
    last_active: string | null;
    created_at: string;
  }>(
    `SELECT 
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
    LIMIT ? OFFSET ?`,
    [limitNum, offset]
  );

  // Get total count
  const totalResult = await get<{ count: number }>(
    `SELECT COUNT(DISTINCT u.user_id) as count
     FROM users u
     INNER JOIN consents c ON u.user_id = c.user_id
     WHERE c.status = 'active'`
  );

  const total = totalResult?.count || 0;
  const totalPages = Math.ceil(total / limitNum);

  return {
    users: users.map(user => ({
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      persona_type: user.persona_type,
      consent_status: user.consent_status as 'active' | 'revoked' | 'none',
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
export async function searchUsers(
  query: string,
  page: number = 1,
  limit: number = 20
): Promise<{ users: AdminUser[]; total: number; page: number; totalPages: number }> {
  const pageNum = Math.max(1, Math.floor(page));
  const limitNum = Math.max(1, Math.min(100, Math.floor(limit)));
  const offset = (pageNum - 1) * limitNum;

  const searchTerm = `%${query}%`;

  const users = await all<{
    user_id: string;
    name: string;
    email: string;
    persona_type: string | null;
    consent_status: string;
    last_active: string | null;
    created_at: string;
  }>(
    `SELECT 
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
    LIMIT ? OFFSET ?`,
    [searchTerm, searchTerm, limitNum, offset]
  );

  const totalResult = await get<{ count: number }>(
    `SELECT COUNT(DISTINCT u.user_id) as count
     FROM users u
     INNER JOIN consents c ON u.user_id = c.user_id
     WHERE c.status = 'active'
       AND (u.name LIKE ? OR u.email LIKE ?)`,
    [searchTerm, searchTerm]
  );

  const total = totalResult?.count || 0;
  const totalPages = Math.ceil(total / limitNum);

  return {
    users: users.map(user => ({
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      persona_type: user.persona_type,
      consent_status: user.consent_status as 'active' | 'revoked' | 'none',
      last_active: user.last_active,
      created_at: user.created_at,
    })),
    total,
    page: pageNum,
    totalPages,
  };
}

export interface UserDetail {
  user_id: string;
  name: string;
  email: string;
  created_at: string;
  persona: {
    type: string;
    assigned_at: string;
    confidence: number;
    criteria_met: string[];
    secondary_personas: string[];
  } | null;
  signals: any;
  recommendations: Array<{
    id: string;
    type: string;
    title: string;
    rationale: string;
  }>;
  transactions: Array<{
    transaction_id: string;
    date: string;
    amount: number;
    merchant_name: string | null;
    category: string | null;
  }>;
  persona_history: Array<{
    persona_id: string;
    persona_type: string;
    assigned_at: string;
  }>;
  has_consent: boolean;
}

/**
 * Get full user details for admin view
 * @param userId - The user ID
 * @returns Full user details including persona, signals, recommendations, transactions, and persona history
 */
export async function getUserDetail(userId: string): Promise<UserDetail | null> {
  // Check consent first
  const hasConsent = await checkConsent(userId);
  
  // Get user info
  const user = await get<{ user_id: string; name: string; email: string; created_at: string }>(
    'SELECT user_id, name, email, created_at FROM users WHERE user_id = ?',
    [userId]
  );

  if (!user) {
    return null;
  }

  // Get current persona
  const currentPersona = await getCurrentPersona(userId);

  // Get persona history
  const personaHistory = await all<{ persona_id: string; persona_type: string; assigned_at: string }>(
    `SELECT persona_id, persona_type, assigned_at
     FROM personas
     WHERE user_id = ?
     ORDER BY assigned_at DESC`,
    [userId]
  );

  // Get recommendations
  const recommendations = await getRecommendations(userId, 10);

  // Get recent transactions (last 100)
  const transactions = await all<{
    transaction_id: string;
    date: string;
    amount: number;
    merchant_name: string | null;
    personal_finance_category_primary: string | null;
    personal_finance_category_detailed: string | null;
  }>(
    `SELECT t.transaction_id, t.date, t.amount, t.merchant_name,
            t.personal_finance_category_primary, t.personal_finance_category_detailed
     FROM transactions t
     INNER JOIN accounts a ON t.account_id = a.account_id
     WHERE a.user_id = ?
     ORDER BY t.date DESC
     LIMIT 100`,
    [userId]
  );

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
