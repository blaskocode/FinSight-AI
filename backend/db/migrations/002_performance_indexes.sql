-- FinSight AI: Performance Optimization Indexes
-- Additional indexes for query optimization

-- Fix incorrect index and add composite indexes for common query patterns

-- Transactions: Composite index for user queries with date sorting
-- This optimizes queries that filter by user_id (via accounts join) and sort by date
CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(account_id, date DESC);

-- Transactions: Index for merchant name searches (used in transaction search)
CREATE INDEX IF NOT EXISTS idx_transactions_merchant_name ON transactions(merchant_name);

-- Transactions: Index for category searches
CREATE INDEX IF NOT EXISTS idx_transactions_category_primary ON transactions(personal_finance_category_primary);
CREATE INDEX IF NOT EXISTS idx_transactions_category_detailed ON transactions(personal_finance_category_detailed);

-- Personas: Composite index for user queries with date sorting (most recent first)
CREATE INDEX IF NOT EXISTS idx_personas_user_assigned_at ON personas(user_id, assigned_at DESC);

-- Recommendations: Composite index for user queries with type filtering
CREATE INDEX IF NOT EXISTS idx_recommendations_user_type ON recommendations(user_id, type);

-- Audit Log: Composite index for admin queries
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_timestamp ON audit_log(admin_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_timestamp ON audit_log(user_id, timestamp DESC);

-- Consents: Composite index for active consent lookups
CREATE INDEX IF NOT EXISTS idx_consents_user_status ON consents(user_id, status);

