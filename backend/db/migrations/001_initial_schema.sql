-- FinSight AI: Initial Database Schema
-- SQLite normalized schema for financial data, personas, and recommendations

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Accounts Table (Plaid-style)
CREATE TABLE IF NOT EXISTS accounts (
    account_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('checking', 'savings', 'credit', 'money_market', 'HSA')),
    subtype TEXT,
    balances TEXT NOT NULL, -- JSON: {available, current, limit}
    iso_currency_code TEXT DEFAULT 'USD',
    holder_category TEXT DEFAULT 'individual',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    date DATE NOT NULL,
    amount REAL NOT NULL,
    merchant_name TEXT,
    merchant_entity_id TEXT,
    payment_channel TEXT,
    personal_finance_category_primary TEXT,
    personal_finance_category_detailed TEXT,
    pending INTEGER DEFAULT 0, -- 0 = false, 1 = true
    category_tags TEXT, -- JSON array
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
);

-- Liabilities Table (Credit Cards, Mortgages, Student Loans)
CREATE TABLE IF NOT EXISTS liabilities (
    liability_id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('credit_card', 'mortgage', 'student_loan')),
    apr_type TEXT, -- For credit cards: 'purchase', 'balance_transfer', 'cash_advance'
    apr_percentage REAL,
    interest_rate REAL, -- For mortgages/loans
    minimum_payment_amount REAL,
    last_payment_amount REAL,
    last_statement_balance REAL,
    is_overdue INTEGER DEFAULT 0, -- 0 = false, 1 = true
    next_payment_due_date DATE,
    principal REAL, -- For mortgages/loans
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
);

-- Consents Table
CREATE TABLE IF NOT EXISTS consents (
    consent_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    consented_at DATETIME,
    revoked_at DATETIME,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'revoked')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Personas Table
CREATE TABLE IF NOT EXISTS personas (
    persona_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    persona_type TEXT NOT NULL CHECK(persona_type IN ('high_utilization', 'variable_income', 'subscription_heavy', 'savings_builder', 'lifestyle_creep')),
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    window_days INTEGER DEFAULT 30, -- Analysis window in days
    signals TEXT NOT NULL, -- JSON: {utilization, interest_charges, subscriptions, etc.}
    secondary_personas TEXT, -- JSON array of secondary persona types
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Recommendations Table
CREATE TABLE IF NOT EXISTS recommendations (
    rec_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    persona_id TEXT,
    type TEXT NOT NULL CHECK(type IN ('education', 'partner_offer', 'payment_plan')),
    content TEXT NOT NULL, -- Title/description
    rationale TEXT NOT NULL, -- AI-generated or template rationale
    impact_estimate TEXT, -- JSON: {savings, urgency, difficulty}
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (persona_id) REFERENCES personas(persona_id) ON DELETE SET NULL
);

-- Audit Log Table
CREATE TABLE IF NOT EXISTS audit_log (
    log_id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL, -- 'viewed_profile', 'viewed_transactions', etc.
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Chat Cache Table (for AI response caching)
CREATE TABLE IF NOT EXISTS chat_cache (
    cache_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    query_hash TEXT NOT NULL, -- Hash of normalized query
    response TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_liabilities_account_id ON liabilities(account_id);
CREATE INDEX IF NOT EXISTS idx_consents_user_id ON consents(user_id);
CREATE INDEX IF NOT EXISTS idx_consents_status ON consents(status);
CREATE INDEX IF NOT EXISTS idx_personas_user_id ON personas(user_id);
CREATE INDEX IF NOT EXISTS idx_personas_assigned_at ON personas(assigned_at);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_cache_user_id ON chat_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_cache_query_hash ON chat_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_chat_cache_expires_at ON chat_cache(expires_at);

