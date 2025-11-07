# FinSight AI: Task List & Pull Request Breakdown

## Project Overview
**Goal**: Build a functional prototype demonstrating persona-based financial recommendations with AI chat
**Timeline**: Organized into MVP + 4 phases
**Delivery Model**: Thin slice approach - working end-to-end at each phase

---

## 🚀 MVP (Minimum Viable Product) ✅ COMPLETE
**Goal**: Demonstrate core concept - one persona, basic dashboard, simple recommendations
**Success Criteria**: User can consent, see their persona, get 1-2 recommendations with rationales
**Status**: All 9 PRs complete (PR-1 through PR-9)

### PR-1: Project Foundation & Setup ✅
**Estimated Effort**: 2-3 hours
**Status**: Complete

#### Tasks:
- [x] Initialize Git repository with `.gitignore` (node_modules, .env, *.db, etc.) ✅
- [x] Create monorepo structure:
  ```
  /backend (Express API)
  /frontend (React + Vite)
  /shared (TypeScript types)
  /data-gen (Synthetic data scripts)
  /docs (Decision log, API docs)
  ```
  ✅
- [x] Setup backend:
  - Initialize Node.js project with TypeScript ✅
  - Install dependencies: `express`, `sqlite3`, `cors`, `dotenv` ✅
  - Create basic Express server with health check endpoint ✅
- [x] Setup frontend:
  - Initialize React + Vite + TypeScript ✅
  - Install dependencies: `zustand`, `tailwindcss`, `lucide-react`, `recharts`, `axios` ✅
  - Configure Tailwind ✅
- [x] Create `README.md` with one-command setup instructions ✅
- [x] Create `package.json` scripts for concurrent dev (backend + frontend) ✅
- [x] Test: `npm install && npm run dev` works from root ✅

**Deliverable**: Running empty app with "Hello World" endpoints ✅
**Result**: Complete monorepo structure with backend Express server and frontend React app. One-command setup working. All dependencies installed and configured.

---

### PR-2: Database Schema & SQLite Setup ✅
**Estimated Effort**: 3-4 hours

#### Tasks:
- [x] Design normalized SQLite schema (see detailed schema below)
- [x] Create migration script: `backend/db/migrations/001_initial_schema.sql`
- [x] Implement tables:
  - `users` (user_id, email, name, created_at)
  - `accounts` (account_id, user_id, type, subtype, balances JSON, currency)
  - `transactions` (txn_id, account_id, date, amount, merchant_name, category, pending)
  - `liabilities` (liability_id, account_id, type, APR, min_payment, is_overdue, next_due_date)
  - `consents` (consent_id, user_id, consented_at, revoked_at, status)
  - `personas` (persona_id, user_id, persona_type, assigned_at, window_days, signals JSON)
  - `recommendations` (rec_id, user_id, persona_id, type, content, rationale, created_at)
  - `audit_log` (log_id, admin_id, user_id, action, timestamp)
  - `chat_cache` (cache_id, user_id, query_hash, response, expires_at) - Bonus table for AI caching
- [x] Create database initialization script: `backend/db/init.ts`
- [x] Create database helper module: `backend/db/db.ts` with connection pooling
- [x] Test: Run migration, verify tables exist, insert test row

**Deliverable**: Working SQLite database with schema ✅

---

### PR-3: Minimal Synthetic Data Generator ✅
**Estimated Effort**: 4-5 hours

#### Tasks:
- [x] Create `data-gen/generator.js` module
- [x] Generate 5 test users (1 per persona for MVP)
- [x] For each user, generate:
  - 1 checking account with realistic balance
  - 1 credit card with utilization matching persona
  - 3 months of transaction history (simplified)
- [x] Implement basic transaction types:
  - Income: monthly payroll (1st of month)
  - Recurring: rent/mortgage, internet, 1-2 subscriptions
  - Variable: groceries (weekly), dining (2-3x/month)
- [x] Create one "High Utilization" persona user:
  - Credit utilization 65% ✅
  - Interest charges present (APR 18-25%)
  - Minimum payments only ✅
- [x] Seed database with generated data
- [x] Test: Query database, verify realistic data

**Deliverable**: 5 users with 3 months of data, one clearly High Utilization ✅
**Result**: Generated 5 users, 11 accounts, 260 transactions. High Utilization user verified with 65% utilization.

---

### PR-4: Feature Detection - Credit Monitoring ✅
**Estimated Effort**: 3-4 hours

#### Tasks:
- [x] Create `backend/features/creditMonitoring.ts` module
- [x] Implement functions:
  - `calculateUtilization(accountId)` → balance/limit percentage ✅
  - `detectMinimumPaymentOnly(accountId, window)` → boolean ✅
  - `calculateInterestCharges(accountId, window)` → dollar amount ✅
  - `checkOverdueStatus(accountId)` → boolean ✅
  - `getCreditSignals(accountId, window)` → combined signals ✅
- [x] Create utilization flag thresholds: 30%, 50%, 80% ✅
- [x] Write unit tests: `backend/tests/creditMonitoring.test.ts` ✅
  - Test utilization calculation accuracy ✅
  - Test minimum payment detection logic ✅
  - Test edge cases (zero balance, null limit) ✅
  - 19 tests, all passing ✅
- [x] Test: Run tests, verify all pass ✅

**Deliverable**: Working credit monitoring feature with tests ✅
**Result**: Credit monitoring module with 4 core functions + combined signals function. All 19 unit tests passing.

---

### PR-5: Persona Assignment - High Utilization Only ✅
**Estimated Effort**: 2-3 hours

#### Tasks:
- [x] Create `backend/personas/assignPersona.ts` module
- [x] Implement `assignHighUtilizationPersona(userId)`:
  - Check: utilization ≥50% OR interest > 0 OR min payment only OR overdue ✅
  - Return: persona object with type, criteria_met, confidence ✅
- [x] Store persona assignment in `personas` table ✅
- [x] Create API endpoint: `GET /api/profile/:user_id` ✅
  - Fetch user's accounts and transactions ✅
  - Calculate credit signals ✅
  - Assign persona ✅
  - Return JSON with persona + signals ✅
- [x] Test: Call endpoint for test user, verify High Utilization assigned ✅

**Deliverable**: Working persona assignment for one persona type ✅
**Result**: High Utilization persona correctly assigned to test user (65% utilization, interest charges, minimum payments). API endpoint returns persona + signals.

---

### PR-6: Basic Recommendation Engine ✅
**Estimated Effort**: 3-4 hours

#### Tasks:
- [x] Create `backend/recommendations/engine.ts` module
- [x] Create static content catalog: `backend/recommendations/content.json` ✅
  - 3 education items for High Utilization:
    1. "Understanding Credit Utilization" article ✅
    2. "Debt Avalanche vs Snowball" guide ✅
    3. "Setting Up Autopay" tutorial ✅
  - 1 partner offer:
    1. Balance transfer card (0% APR for 18 months) ✅
- [x] Implement `generateRecommendations(userId)`:
  - Map persona to relevant content ✅
  - Generate rationale using template with specific data points ✅
  - Return 3 education items + 1 partner offer ✅
- [x] Create API endpoint: `GET /api/recommendations/:user_id` ✅
- [x] Store recommendations in database ✅
- [x] Test: Call endpoint, verify recommendations with rationales ✅

**Deliverable**: Working recommendations for High Utilization persona ✅
**Result**: Recommendation engine generates 4 recommendations (3 education + 1 partner offer) with personalized rationales citing specific data points (65% utilization, $70.76/month interest, etc.)

---

### PR-7: Consent Management ✅
**Estimated Effort**: 2-3 hours

#### Tasks:
- [x] Create `backend/guardrails/consent.ts` module
- [x] Implement functions:
  - `recordConsent(userId)` → insert into consents table ✅
  - `checkConsent(userId)` → boolean (has active consent) ✅
  - `revokeConsent(userId)` → update consent status ✅
  - `getConsentRecord(userId)` → get consent record ✅
- [x] Create API endpoint: `POST /api/consent` ✅
  - Body: `{ user_id, consented: true/false }` ✅
- [x] Add consent middleware: `backend/middleware/requireConsent.ts` ✅
  - Check consent before profile/recommendation endpoints ✅
  - Return 403 if no consent ✅
- [x] Apply middleware to protected routes ✅
- [x] Test: Try accessing profile without consent (should fail) ✅

**Deliverable**: Working consent enforcement ✅
**Result**: Consent management working. Profile and recommendations endpoints protected. Returns 403 without consent. Tested successfully.

---

### PR-8: Basic Frontend - Dashboard Structure ✅
**Estimated Effort**: 4-5 hours

#### Tasks:
- [x] Create Zustand store: `frontend/src/store/useStore.ts` ✅
  - State: user, persona, recommendations, consent status ✅
  - Actions: setUser, setPersona, setRecommendations, updateConsent ✅
- [x] Create components:
  - `App.tsx` - Main app shell with conditional rendering ✅
  - `ConsentScreen.tsx` - Consent form ✅
  - `Dashboard.tsx` - Main dashboard layout ✅
  - `PersonaCard.tsx` - Display persona with badge ✅
  - `RecommendationCard.tsx` - Display single recommendation ✅
- [x] Implement conditional rendering based on consent status ✅
- [x] Create API service: `frontend/src/services/api.ts` ✅
  - Functions: fetchProfile, fetchRecommendations, submitConsent ✅
- [x] Style with Tailwind (basic styling, no animations yet) ✅
- [x] Test: User flow from consent → dashboard → see persona ✅

**Deliverable**: Basic functional dashboard showing persona + recommendations ✅
**Result**: Complete frontend dashboard with consent screen, persona display, signals visualization, and recommendations list. All components styled with Tailwind CSS.

---

### PR-9: MVP Polish & Testing ✅
**Estimated Effort**: 2-3 hours

#### Tasks:
- [x] Add loading states to all API calls ✅
- [x] Add error handling and user-friendly error messages ✅
- [x] Implement "not financial advice" disclaimer on dashboard ✅
- [x] Add basic styling improvements:
  - Persona card with red color scheme (High Utilization) ✅
  - Recommendation cards with hover effects ✅
  - Responsive layout ✅
- [x] Write integration test: `backend/tests/integration/mvp.test.ts` ✅
  - Test full flow: consent → profile → recommendations ✅
- [x] Update README with:
  - Feature list (what works in MVP) ✅
  - Known limitations ✅
  - How to run and test ✅
- [x] Test: Complete user flow manually, verify everything works ✅

**Deliverable**: Polished MVP ready for demo ✅
**Result**: MVP complete with all polish, error handling, disclaimers, integration tests, and comprehensive README. All 4 integration tests passing.

---

## 📦 Phase 1: Complete Feature Detection & All Personas ✅ COMPLETE
**Goal**: Implement all behavioral signals and all 5 personas
**Success Criteria**: All users get accurate persona assignments with full behavioral analysis
**Status**: All 6 PRs complete (PR-10 through PR-15)

### PR-10: Subscription Detection Feature ✅
**Estimated Effort**: 3-4 hours

#### Tasks:
- [x] Create `backend/features/subscriptionDetection.ts` ✅
- [x] Implement functions:
  - `findRecurringMerchants(userId, window)` → array of merchants with ≥3 occurrences ✅
  - `calculateRecurringCadence(transactions)` → weekly/monthly ✅
  - `calculateMonthlyRecurringSpend(userId, window)` → dollar amount ✅
  - `calculateSubscriptionShare(userId, window)` → percentage of total spend ✅
  - `getSubscriptionAnalysis(userId, window)` → complete analysis ✅
- [x] Define recurring payment detection logic:
  - Same merchant name ✅
  - Similar amounts (±10% variance) ✅
  - Regular intervals (7, 14, 28-31 days) ✅
- [x] Write unit tests: `backend/tests/subscriptionDetection.test.ts` ✅
  - 9 tests, all passing ✅
- [x] Test: Run against synthetic data, verify Netflix/Spotify detected ✅

**Deliverable**: Working subscription detection ✅
**Result**: Subscription detection module complete (292 lines). Successfully detects Netflix and Spotify in synthetic data. All 9 unit tests passing.

---

### PR-11: Savings Analysis Feature ✅
**Estimated Effort**: 3-4 hours

#### Tasks:
- [x] Create `backend/features/savingsAnalysis.ts` ✅
- [x] Implement functions:
  - `calculateNetSavingsInflow(userId, window)` → dollar amount ✅
  - `calculateSavingsGrowthRate(userId, window)` → percentage ✅
  - `calculateEmergencyFundCoverage(userId)` → months ✅
    - Savings balance / avg monthly expenses (6-month trailing) ✅
  - `calculateMonthlyExpenses(userId, window)` → exclude transfers/payments between own accounts ✅
  - `calculateSavingsRate(userId, window)` → percentage of income ✅
  - `getSavingsAnalysis(userId, window)` → complete analysis ✅
- [x] Handle multiple savings account types: savings, money market, HSA ✅
- [x] Detect savings transfers from checking accounts (merchant name or category) ✅
- [x] Write unit tests: `backend/tests/savingsAnalysis.test.ts` ✅
  - 8 tests, all passing ✅
- [x] Test: Verify emergency fund calculation accuracy ✅

**Deliverable**: Working savings analysis ✅
**Result**: Savings analysis module complete (381 lines). All 8 unit tests passing. Detects savings transfers from checking accounts. Ready for Savings Builder persona assignment.

---

### PR-12: Income Stability Feature ✅
**Estimated Effort**: 3-4 hours

#### Tasks:
- [x] Create `backend/features/incomeStability.ts` ✅
- [x] Implement functions:
  - `detectPayrollACH(userId)` → array of income transactions ✅
  - `detectPaymentFrequency(incomeTransactions)` → weekly/biweekly/twice-monthly/monthly ✅
  - `calculatePayGapVariability(incomeTransactions)` → median days between payments ✅
  - `calculateCashFlowBuffer(userId)` → months (checking balance / avg monthly expenses) ✅
  - `getIncomeStabilityAnalysis(userId)` → complete analysis ✅
- [x] Pattern matching for payroll transactions:
  - ACH deposit ✅
  - Common employer patterns (names with "LLC", "INC", "CORP") ✅
  - Regular amounts or consistent variability ✅
  - Excludes transfers ✅
- [x] Write unit tests: `backend/tests/incomeStability.test.ts` ✅
  - 12 tests, all passing ✅
- [x] Test: Detect different payment frequencies correctly ✅

**Deliverable**: Working income stability detection ✅
**Result**: Income stability module complete (347 lines). All 12 unit tests passing. Detects payroll patterns, payment frequency, pay gap variability, and cash flow buffer. Ready for Variable Income persona assignment.

---

### PR-13: Remaining Personas Implementation ✅
**Estimated Effort**: 4-5 hours

#### Tasks:
- [x] Extend `backend/personas/assignPersona.ts` ✅
- [x] Implement persona assignment functions:
  - `assignVariableIncomePersona(userId)` ✅
  - `assignSubscriptionHeavyPersona(userId)` ✅
  - `assignSavingsBuilderPersona(userId)` ✅
  - `assignLifestyleCreepPersona(userId)` ✅
- [x] Implement prioritization logic:
  - If multiple match: High Util > Variable Income > Lifestyle Creep > Sub Heavy > Savings Builder ✅
  - Store primary + secondary personas ✅
- [x] Update `storePersonaAssignment` to support secondary personas (JSON array) ✅
- [x] Update `/api/profile` endpoint to return all matched personas ✅
- [x] Write unit tests: `backend/tests/personaAssignment.test.ts` ✅
  - 6 tests, all passing ✅
- [x] Test: Verify correct persona assignment for edge cases ✅

**Deliverable**: All 5 personas working with prioritization ✅
**Result**: All 5 personas implemented (499 lines). Prioritization working correctly. Secondary personas stored and returned. All 6 unit tests passing. API endpoint updated to use new assignment logic.

---

### PR-14: Enhanced Synthetic Data Generator ✅
**Estimated Effort**: 5-6 hours

#### Tasks:
- [x] Expand `data-gen/generator.js` to create 100 users ✅
- [x] Implement persona-correlated behavior generation:
  - High Utilization: high balances, interest charges, minimum payments ✅
  - Variable Income: irregular income deposits, cash flow gaps ✅
  - Subscription Heavy: 5-10 recurring subscriptions ✅
  - Savings Builder: regular savings transfers, growing balances ✅
  - Lifestyle Creep: high income + high discretionary + low savings rate ✅
- [x] Distribution: 20 users per persona ✅
- [x] Generate 12 months of transaction history per user ✅
- [x] Use realistic merchant names from common categories:
  - Groceries: Kroger, Whole Foods, Trader Joe's, Safeway ✅
  - Dining: Chipotle, Starbucks, local restaurant names ✅
  - Subscriptions: Netflix, Spotify, Amazon Prime, NYT, gym memberships ✅
  - Utilities: realistic utility company names by region ✅
- [x] Implement income patterns:
  - 60% monthly salary (fixed amount) ✅
  - 20% biweekly (fixed) ✅
  - 15% variable income (hourly, commission) ✅
  - 5% twice-monthly ✅
- [x] Create "hero account" showing persona evolution:
  - Months 1-6: High Utilization (65% util, interest charges) ✅
  - Months 7-12: Gradual improvement, now Savings Builder ✅
- [x] Add realistic account numbers (masked format: ****1234) ✅
- [x] Split code into modules to stay under 750 line limit ✅
  - `generator.js`: 539 lines (main generator)
  - `transactionHelpers.js`: 288 lines (transaction generation helpers)
  - `merchants.js`: Merchant name pools
  - `names.js`: Name pools for user generation

**Deliverable**: 100 users with realistic 12-month history ✅
**Result**: Enhanced data generator complete. Generates 100 users (20 per persona) with 12 months of transaction history. Includes hero account showing persona evolution. All files under 750 line limit. Realistic merchant names, income patterns, and persona-correlated behaviors implemented.

---

### PR-15: Frontend - All Personas Visual Identity ✅
**Estimated Effort**: 4-5 hours
**Status**: Complete

#### Tasks:
- [x] Create persona color schemes and icons:
  - High Utilization: Red (#EF4444), alert icon
  - Variable Income: Orange (#F59E0B), trending icon
  - Subscription Heavy: Purple (#A855F7), layers icon
  - Savings Builder: Green (#10B981), piggy bank icon
  - Lifestyle Creep: Blue (#3B82F6), trending up icon
- [x] Update `PersonaCard.tsx` to display:
  - Primary persona with large badge
  - Secondary personas as small tags
  - Persona-specific color scheme
  - Custom icon
- [x] Create persona descriptions (what this means)
- [x] Display behavioral signals on dashboard:
  - Credit utilization percentage
  - Emergency fund coverage (X months)
  - Monthly recurring spend
  - Savings growth rate
  - All other available signals (income stability, subscriptions, savings, lifestyle creep)
- [x] Add progress indicators/charts using Recharts (signals displayed in grid)
- [x] Test: View dashboard for each persona type, verify distinct visual identity

**Deliverable**: Beautiful persona-specific dashboard designs

**Implementation Details**:
- Created `frontend/src/utils/personaConfig.ts` with all 5 persona configurations (colors, icons, descriptions)
- Updated `PersonaCard.tsx` to use persona config, display icons, show secondary personas as tags
- Enhanced `Dashboard.tsx` to display all available behavioral signals in a responsive grid (3 columns on large screens)
- Updated TypeScript interfaces to support all signal types and secondary personas
- All files under 750 line limit
- Build successful, no TypeScript errors

---

## 📦 Phase 2: Recommendations & Content System
**Goal**: Build comprehensive recommendation engine with full content catalog
**Success Criteria**: Every persona gets 3-5 prioritized recommendations with impact estimates

### PR-16: Content Catalog & Education Library
**Estimated Effort**: 4-5 hours

#### Tasks:
- [ ] Create comprehensive content catalog: `backend/recommendations/content-library.json`
- [ ] Structure: `{ persona: string, category: string, items: [] }`
- [ ] Create content for each persona (3-5 items each):
  - **High Utilization**:
    - "Understanding Credit Utilization and Your Score"
    - "Debt Avalanche vs Snowball: Which is Right for You?"
    - "Setting Up Autopay to Avoid Late Fees"
    - "How to Negotiate Lower Interest Rates"
  - **Variable Income**:
    - "Budgeting with Irregular Income"
    - "Building an Emergency Fund on Variable Pay"
    - "Income Smoothing Strategies"
  - **Subscription Heavy**:
    - "The Complete Subscription Audit Checklist"
    - "How to Negotiate or Cancel Subscriptions"
    - "Setting Up Bill Alerts and Reminders"
  - **Savings Builder**:
    - "Setting SMART Financial Goals"
    - "Automating Your Savings"
    - "High-Yield Savings Accounts Explained"
    - "Introduction to CDs and Bonds"
  - **Lifestyle Creep**:
    - "Understanding Opportunity Cost"
    - "Retirement Savings Gap Calculator"
    - "Tax-Advantaged Account Guide (401k, IRA, HSA)"
    - "Building Wealth on a High Income"
- [ ] Each item includes:
  - Title, description, URL (can be placeholder), estimated read time
  - Tags for categorization
- [ ] Test: Load content library, verify structure

**Deliverable**: Comprehensive education content catalog

---

### PR-17: Partner Offer Catalog with Eligibility
**Estimated Effort**: 3-4 hours

#### Tasks:
- [ ] Create partner offers catalog: `backend/recommendations/partner-offers.json`
- [ ] Define realistic offers:
  - **Balance Transfer Cards**:
    - Chase Slate Edge (0% APR 18 months, $0 transfer fee first 60 days)
    - Citi Diamond Preferred (0% APR 21 months)
    - Eligibility: Credit score ≥670, utilization <100%
  - **High-Yield Savings Accounts**:
    - Marcus by Goldman Sachs (4.40% APY)
    - Ally Bank (4.35% APY)
    - Eligibility: No minimum balance, don't already have HYSA
  - **Budgeting Apps**:
    - YNAB (You Need A Budget)
    - EveryDollar
    - Eligibility: Variable income users
  - **Subscription Management**:
    - Rocket Money
    - Truebill
    - Eligibility: ≥3 subscriptions detected
- [ ] Implement eligibility checking: `backend/recommendations/eligibility.js`
  - `checkEligibility(userId, offer)` → boolean
  - Check existing accounts (don't duplicate)
  - Check income level (if offer has minimum)
  - Check credit utilization (if relevant)
- [ ] Create blacklist of predatory products
- [ ] Test: Verify eligibility logic works correctly

**Deliverable**: Partner offers with smart eligibility filtering

---

### PR-18: Recommendation Ranking & Prioritization
**Estimated Effort**: 4-5 hours

#### Tasks:
- [ ] Create `backend/recommendations/ranker.js` module
- [ ] Implement impact scoring:
  - **High Utilization**: Prioritize by potential interest savings
    - Calculate: current interest charges * months until paid off
    - Higher impact = higher priority
  - **Variable Income**: Prioritize emergency fund building
    - Impact = months until 3-month emergency fund reached
  - **Subscription Heavy**: Prioritize by subscription cost
    - Rank subscriptions by monthly cost
  - **Savings Builder**: Prioritize by APY difference
    - Impact = additional interest earned with HYSA
  - **Lifestyle Creep**: Prioritize retirement gap
    - Calculate savings shortfall vs. recommended rate
- [ ] Implement urgency scoring:
  - Overdue status = critical urgency
  - High utilization (≥80%) = high urgency
  - Low emergency fund (<1 month) = high urgency
  - Other = medium/low urgency
- [ ] Combine impact + urgency into final priority score
- [ ] Sort recommendations by priority
- [ ] Limit to top 3-5 recommendations
- [ ] Test: Verify ranking makes intuitive sense

**Deliverable**: Smart recommendation prioritization

---

### PR-19: Rationale Generator with GPT-4o-mini
**Estimated Effort**: 3-4 hours

#### Tasks:
- [ ] Create `backend/ai/rationaleGenerator.js` module
- [ ] Setup OpenAI SDK with GPT-4o-mini
- [ ] Create prompt template for generating rationales:
  ```
  Generate a personalized, empathetic explanation for this recommendation:
  User: {name}
  Persona: {persona}
  Behavioral Signals: {signals JSON}
  Recommendation: {recommendation title/description}
  
  Requirements:
  - Use specific data points from signals
  - Empowering tone, no shaming language
  - Plain language, no jargon
  - 2-3 sentences max
  - Include concrete example from their data
  ```
- [ ] Implement `generateRationale(userId, recommendation, signals)`:
  - Call GPT-4o-mini with structured prompt
  - Parse response
  - Validate tone (no harmful phrases)
  - Fallback to template if API fails
- [ ] Implement caching for common recommendations
- [ ] Test: Generate rationales for sample recommendations, verify quality

**Deliverable**: AI-powered personalized rationales

---

### PR-20: Debt Payment Plan Generator
**Estimated Effort**: 4-5 hours

#### Tasks:
- [ ] Create `backend/recommendations/paymentPlanner.js` module
- [ ] Implement `calculateAvailableCashFlow(userId)`:
  - Income - expenses - minimum payments - safety buffer (20%)
- [ ] Implement `generatePaymentPlan(userId, strategy)`:
  - **Avalanche** (highest APR first):
    - Sort debts by APR descending
    - Allocate surplus to highest APR
    - Calculate payoff timeline
  - **Snowball** (smallest balance first):
    - Sort debts by balance ascending
    - Allocate surplus to smallest balance
    - Calculate payoff timeline
  - Return plan with:
    - Monthly payment amounts per debt
    - Payoff dates
    - Total interest saved vs. minimum payments
    - Timeline visualization data
- [ ] Implement AI recommendation for strategy:
  - Use GPT-4o-mini to analyze user psychology
  - Consider: number of debts, balance distribution, user's persona
  - Recommend avalanche vs snowball with reasoning
- [ ] Generate multiple scenarios (aggressive vs. conservative)
- [ ] Test: Verify payment plan math is accurate

**Deliverable**: Smart debt payment plan generator

---

### PR-21: Frontend - Recommendation Cards & Details
**Estimated Effort**: 4-5 hours

#### Tasks:
- [ ] Enhance `RecommendationCard.jsx` component:
  - Display priority badge (Critical/High/Medium/Low)
  - Show impact estimate ("Could save $87/month")
  - Show difficulty level (Quick win / Moderate / Long-term)
  - Add "Learn More" / "Get Started" CTA button
  - Show AI-generated rationale with specific data
- [ ] Create `PaymentPlanModal.jsx` component:
  - Display avalanche vs. snowball comparison
  - Show payoff timeline chart (Recharts)
  - Show month-by-month payment schedule
  - Allow toggling between strategies
- [ ] Create `PartnerOfferCard.jsx` component:
  - Display offer details (APY, APR, fees)
  - Show eligibility status
  - "Apply Now" CTA (external link or modal)
  - Disclaimer: "This is educational content..."
- [ ] Add skeleton loading states
- [ ] Implement progressive disclosure (expand for details)
- [ ] Test: Interact with recommendations, verify all features work

**Deliverable**: Beautiful, functional recommendation UI

---

## 📦 Phase 3: AI Chat Interface & Admin View
**Goal**: Add conversational AI and admin oversight
**Success Criteria**: Users can ask questions about their finances, admins can view user data

### PR-22: AI Chat Backend - Core Infrastructure
**Estimated Effort**: 4-5 hours

#### Tasks:
- [ ] Create `backend/ai/chatService.js` module
- [ ] Setup OpenAI SDK for streaming responses
- [ ] Implement conversation context management:
  - Store chat history in memory (per session)
  - Include user's persona + signals in system prompt
  - Provide transaction data access via function calling
- [ ] Create system prompt template:
  ```
  You are a financial education assistant for FinSight AI.
  User Profile:
  - Name: {name}
  - Primary Persona: {persona}
  - Signals: {signals summary}
  
  Capabilities:
  - Answer questions about user's spending, income, savings
  - Provide general financial education
  - Explain persona and recommendations
  - Query transaction history
  
  Guidelines:
  - Empowering tone, no shaming
  - Cite specific data when relevant
  - Always add disclaimer: "not financial advice"
  - Keep responses concise (3-4 sentences unless explaining complex topic)
  ```
- [ ] Implement transaction query function for GPT:
  - `queryTransactions(category, dateRange)` → transactions array
  - Allow GPT to call this function when needed
- [ ] Create API endpoint: `POST /api/chat`
  - Body: `{ user_id, message, conversation_id }`
  - Return streaming response
- [ ] Test: Send test messages, verify responses and transaction queries

**Deliverable**: Working AI chat backend with transaction access

---

### PR-23: Response Caching & Cost Optimization
**Estimated Effort**: 2-3 hours

#### Tasks:
- [ ] Create `backend/ai/cache.js` module
- [ ] Implement caching strategy:
  - Cache common queries: "What's my utilization?", "How much did I spend on X?"
  - Key: hash of (user_id + normalized_query)
  - Store in SQLite table: `chat_cache`
  - TTL: 1 hour (since data updates on dashboard load)
- [ ] Implement query normalization:
  - Lowercase, remove punctuation
  - Detect semantic similarity (basic string matching for MVP)
- [ ] Add cache hit/miss logging
- [ ] Monitor token usage per request
- [ ] Test: Verify caching works, measure token savings

**Deliverable**: Smart caching reduces API costs

---

### PR-24: Frontend - Chat Interface Component
**Estimated Effort**: 4-5 hours

#### Tasks:
- [ ] Create `ChatBubble.jsx` component (bottom-right corner)
  - Minimized: small circle with icon
  - Expanded: chat window (400px x 600px)
  - Smooth animation on toggle
- [ ] Create `ChatWindow.jsx` component:
  - Message list with auto-scroll
  - User messages (right, blue)
  - AI messages (left, gray)
  - Typing indicator while loading
  - Input field with send button
- [ ] Integrate with Zustand store:
  - State: messages array, isOpen, isLoading
  - Actions: sendMessage, toggleChat, clearHistory
- [ ] Implement streaming response handling:
  - Display AI response word-by-word as it arrives
  - Show loading spinner during API call
- [ ] Add suggested questions/prompts:
  - "How much did I spend on dining last month?"
  - "Why am I in the High Utilization persona?"
  - "What's my savings growth rate?"
- [ ] Style with Tailwind, make it look modern and clean
- [ ] Test: Chat interaction, verify messages display correctly

**Deliverable**: Beautiful, functional chat interface

---

### PR-25: Admin View - User List & Overview
**Estimated Effort**: 3-4 hours

#### Tasks:
- [ ] Create admin routes: `/admin/*`
- [ ] Create `AdminLogin.jsx` component:
  - Simple password auth (hardcoded for demo)
  - Store admin session in Zustand
- [ ] Create `AdminDashboard.jsx` component:
  - List all users in table
  - Columns: Name, Email, Persona, Consent Status, Last Active
  - Search/filter functionality
  - Sort by column
- [ ] Create API endpoints:
  - `POST /api/admin/login` - verify admin credentials
  - `GET /api/admin/users` - list all users with consent status
  - Filter: only show users who have consented
- [ ] Apply consent filtering on backend
- [ ] Add pagination (20 users per page)
- [ ] Test: Login as admin, view user list

**Deliverable**: Admin dashboard with user list

---

### PR-26: Admin View - User Detail & Audit Trail
**Estimated Effort**: 4-5 hours

#### Tasks:
- [ ] Create `AdminUserDetail.jsx` component:
  - User overview (name, persona, signals)
  - Transaction history table
  - Persona history timeline
  - Current recommendations
  - Read-only view (no edit capabilities)
- [ ] Create API endpoints:
  - `GET /api/admin/user/:id` - get full user details (with consent check)
  - `GET /api/admin/audit` - get audit log
- [ ] Implement audit logging:
  - Log every admin view of user data
  - Store: admin_id, user_id, action ("viewed_profile"), timestamp
  - Insert into `audit_log` table
- [ ] Create `AuditLog.jsx` component:
  - Display audit trail in chronological order
  - Filter by admin, user, date range
- [ ] Add "Consent Required" warning if user hasn't consented
  - Show message: "User has not consented to data sharing"
  - Block access to detailed data
- [ ] Test: View user detail, verify audit log entry created

**Deliverable**: Complete admin oversight with audit trail

---

## 📦 Phase 4: Visual Polish & Persona Evolution
**Goal**: Make the app visually stunning and show persona evolution over time
**Success Criteria**: Wow factor on first load, compelling persona journey visualization

### PR-27: Dashboard Redesign - Hero Section
**Estimated Effort**: 4-5 hours

#### Tasks:
- [ ] Create `HeroPersonaCard.jsx` component:
  - Large persona badge with gradient background
  - Animated reveal on load
  - Persona icon with subtle animation (pulse, glow)
  - Tagline describing persona in 1 sentence
  - Secondary persona tags with hover tooltips
- [ ] Add persona-specific background gradients:
  - High Utilization: red to orange gradient
  - Variable Income: orange to yellow
  - Subscription Heavy: purple to pink
  - Savings Builder: green to teal
  - Lifestyle Creep: blue to indigo
- [ ] Create `FinancialHealthScore.jsx` component:
  - Circular progress indicator (0-100 score)
  - Color-coded by health level
  - Breakdown of score components
  - Trend indicator (improving/declining)
- [ ] Add micro-animations:
  - Fade in recommendations on load
  - Hover effects on cards (lift, shadow)
  - Smooth transitions between sections
- [ ] Implement skeleton loaders for all async content
- [ ] Test: Load dashboard, verify animations are smooth

**Deliverable**: Visually stunning hero section

---

### PR-28: Quick Stats Dashboard Widget
**Estimated Effort**: 3-4 hours

#### Tasks:
- [ ] Create `QuickStats.jsx` component grid:
  - 4-6 key metrics displayed as cards
  - Icon + number + label
  - Color-coded by status (green good, red warning)
- [ ] Implement persona-specific quick stats:
  - **High Utilization**: Credit utilization %, Monthly interest charges, Days until next payment
  - **Variable Income**: Cash flow buffer (months), Next income date, Average monthly income
  - **Subscription Heavy**: Monthly recurring spend, Active subscriptions count, Largest subscription
  - **Savings Builder**: Savings growth rate, Emergency fund coverage, Monthly savings rate
  - **Lifestyle Creep**: Income level, Discretionary spend %, Retirement savings rate
- [ ] Add trend indicators (↑ ↓ →) showing change from previous period
- [ ] Use Recharts for small sparkline charts in each card
- [ ] Implement tooltips with detailed explanations
- [ ] Make stats responsive (stack on mobile)
- [ ] Test: Verify stats are accurate and update correctly

**Deliverable**: Informative quick stats dashboard

---

### PR-29: Persona Evolution Timeline
**Estimated Effort**: 4-5 hours

#### Tasks:
- [ ] Create `PersonaTimeline.jsx` component:
  - Horizontal timeline showing persona changes over 12 months
  - Visual markers at transition points
  - Tooltips showing what changed and when
  - Animated scroll/swipe interaction
- [ ] Query persona history from database:
  - Get all persona assignments for user, ordered by date
  - Group by time periods (monthly)
- [ ] Create visual timeline elements:
  - Color-coded segments for each persona
  - Smooth transitions between personas
  - Key milestone markers (e.g., "Paid off credit card", "Built emergency fund")
- [ ] Add narrative description:
  - Auto-generate story: "You started as High Utilization in January. After 6 months of consistent payments, you're now a Savings Builder!"
- [ ] Create API endpoint: `GET /api/persona-history/:user_id`
- [ ] Implement for "hero account" showing evolution
- [ ] Add celebration UI for positive transitions (confetti effect?)
- [ ] Test: View timeline for hero account, verify story is compelling

**Deliverable**: Beautiful persona evolution visualization

---

### PR-30: Spending Insights & Visualizations
**Estimated Effort**: 4-5 hours

#### Tasks:
- [ ] Create `SpendingBreakdown.jsx` component:
  - Pie chart of spending by category (Recharts)
  - Bar chart of monthly spending trend
  - Top merchants list
  - Unusual spending alerts
- [ ] Implement spending analysis:
  - Categorize transactions by personal_finance_category
  - Calculate percentages
  - Detect outliers (spending >2 std dev from mean)
- [ ] Create `IncomeVsExpenses.jsx` component:
  - Dual-axis line chart showing income and expenses over time
  - Cash flow calculation (income - expenses)
  - Projected runway based on current balance
- [ ] Add interactive filtering:
  - Date range selector
  - Category filter
  - Merchant search
- [ ] Create API endpoint: `GET /api/spending-analysis/:user_id`
- [ ] Add export functionality (CSV download)
- [ ] Test: Interact with charts, verify data accuracy

**Deliverable**: Rich spending insights visualizations

---

### PR-31: Onboarding Flow & Animations
**Estimated Effort**: 3-4 hours

#### Tasks:
- [ ] Create `OnboardingWizard.jsx` multi-step component:
  - Step 1: Welcome screen with value proposition
  - Step 2: Consent explanation (what data, why, how it's used)
  - Step 3: Consent form with clear opt-in checkbox
  - Step 4: Processing animation (analyzing transactions)
  - Step 5: Reveal persona with animation
- [ ] Implement progress indicator (steps 1-5)
- [ ] Add smooth transitions between steps
- [ ] Create persona reveal animation:
  - Fade in persona badge
  - Show key signals one by one
  - Display welcome message tailored to persona
- [ ] Add "Skip to Dashboard" option for returning users
- [ ] Store onboarding completion status
- [ ] Test: Complete onboarding flow, verify smooth experience

**Deliverable**: Engaging onboarding experience

---

### PR-32: Responsive Design & Mobile Optimization
**Estimated Effort**: 3-4 hours

#### Tasks:
- [ ] Audit all components for mobile responsiveness
- [ ] Implement responsive breakpoints:
  - Mobile: <640px (single column)
  - Tablet: 640-1024px (adaptive layout)
  - Desktop: >1024px (full layout)
- [ ] Optimize touch targets (minimum 44px tap area)
- [ ] Adjust chat bubble for mobile (full screen on open)
- [ ] Stack dashboard elements vertically on mobile
- [ ] Make charts responsive (Recharts ResponsiveContainer)
- [ ] Test on various screen sizes (Chrome DevTools)
- [ ] Optimize images/icons for performance
- [ ] Add PWA manifest (optional for home screen install)
- [ ] Test: View on mobile device, verify usability

**Deliverable**: Fully responsive design

---

## 📦 Phase 5: Testing, Documentation & Polish
**Goal**: Production-ready code with comprehensive tests and documentation
**Success Criteria**: All tests pass, documentation complete, ready to demo

### PR-33: Unit Tests - Feature Detection
**Estimated Effort**: 4-5 hours

#### Tasks:
- [ ] Write tests for `creditMonitoring.js`:
  - Test utilization calculation with various balances/limits
  - Test edge cases (zero balance, null limit, negative balance)
  - Test minimum payment detection logic
  - Test interest charge aggregation
- [ ] Write tests for `subscriptionDetection.js`:
  - Test recurring merchant detection with various cadences
  - Test false positives (similar merchants, one-time purchases)
  - Test subscription spend calculation
- [ ] Write tests for `savingsAnalysis.js`:
  - Test net inflow calculation
  - Test emergency fund coverage with various expense patterns
  - Test growth rate calculation
- [ ] Write tests for `incomeStability.js`:
  - Test payroll detection with different frequencies
  - Test payment gap variability
  - Test cash flow buffer calculation
- [ ] Aim for >80% code coverage on feature modules
- [ ] Use Jest with SQLite in-memory database for tests
- [ ] Test: Run `npm test`, verify all pass

**Deliverable**: Comprehensive feature detection tests

---

### PR-34: Unit Tests - Persona Assignment & Recommendations
**Estimated Effort**: 4-5 hours

#### Tasks:
- [ ] Write tests for `assignPersona.js`:
  - Test each persona criteria independently
  - Test persona prioritization logic
  - Test edge case: user matches no personas
  - Test edge case: user matches all personas
  - Test secondary persona assignment
- [ ] Write tests for `ranker.js`:
  - Test impact scoring for each persona
  - Test urgency scoring
  - Test final priority calculation
  - Test recommendation ordering
- [ ] Write tests for `eligibility.js`:
  - Test eligibility checks for each offer type
  - Test blacklist filtering
  - Test duplicate account detection
- [ ] Write tests for `paymentPlanner.js`:
  - Test cash flow calculation
  - Test avalanche vs snowball math
  - Test payoff timeline accuracy
  - Test interest savings calculation
- [ ] Test: Run all tests, verify >80% coverage

**Deliverable**: Comprehensive business logic tests

---

### PR-35: Integration Tests - End-to-End Flows
**Estimated Effort**: 4-5 hours

#### Tasks:
- [ ] Create `tests/integration/userFlow.test.js`:
  - Test: New user onboarding → consent → profile → recommendations
  - Test: Returning user → dashboard load → chat interaction
  - Test: Admin login → view user list → view user detail → audit log
- [ ] Create `tests/integration/api.test.js`:
  - Test all API endpoints with valid/invalid inputs
  - Test error handling (404, 403, 500)
  - Test consent enforcement middleware
  - Test rate limiting (if implemented)
- [ ] Create `tests/integration/recommendations.test.js`:
  - Test full recommendation generation pipeline
  - Test rationale generation with GPT-4o-mini (mock in tests)
  - Test eligibility filtering
  - Test recommendation caching
- [ ] Setup test database seeding
- [ ] Mock OpenAI API calls in tests
- [ ] Test: Run integration suite, verify all pass

**Deliverable**: Comprehensive integration tests

---

### PR-36: Performance Optimization
**Estimated Effort**: 3-4 hours

#### Tasks:
- [ ] Profile API response times:
  - Identify slow endpoints (should be <5s per requirement)
  - Optimize database queries (add indexes)
  - Implement query result caching where appropriate
- [ ] Optimize frontend bundle size:
  - Code splitting for admin routes
  - Lazy load components
  - Optimize images (use WebP, compress)
- [ ] Implement database indexes:
  - Index on `transactions.user_id`, `transactions.date`
  - Index on `accounts.user_id`
  - Index on `personas.user_id`, `personas.assigned_at`
- [ ] Add API response caching headers
- [ ] Optimize Recharts rendering (memoization)
- [ ] Add loading states for all async operations
- [ ] Measure: Profile page load time (should be <3s)
- [ ] Test: Verify performance improvements

**Deliverable**: Fast, optimized application

---

### PR-37: Error Handling & User Feedback
**Estimated Effort**: 3-4 hours

#### Tasks:
- [ ] Implement global error boundary in React
- [ ] Create `ErrorMessage.jsx` component for user-friendly errors
- [ ] Add error handling to all API calls:
  - Network errors: "Unable to connect. Please try again."
  - 403 Consent: "Please consent to data sharing first."
  - 404 Not Found: "User not found."
  - 500 Server: "Something went wrong. We're looking into it."
- [ ] Add toast notifications for success/error actions:
  - "Consent recorded successfully"
  - "Recommendations updated"
  - "Chat message sent"
- [ ] Implement retry logic for failed API calls
- [ ] Add loading skeletons for all async content
- [ ] Log errors to console for debugging (no external logging in demo)
- [ ] Test: Trigger various error scenarios, verify handling

**Deliverable**: Robust error handling throughout app

---

### PR-38: Documentation - README & Setup Guide
**Estimated Effort**: 2-3 hours

#### Tasks:
- [ ] Write comprehensive README.md:
  - Project overview and value proposition
  - Features list
  - Tech stack
  - Prerequisites (Node.js, npm versions)
  - One-command setup instructions
  - How to run (dev mode, production build)
  - How to run tests
  - How to generate synthetic data
  - Project structure overview
- [ ] Create SETUP.md with detailed instructions:
  - Environment variables needed (OpenAI API key)
  - Database initialization
  - Troubleshooting common issues
- [ ] Create ARCHITECTURE.md:
  - System architecture diagram (embed Mermaid)
  - Component descriptions
  - Data flow explanations
  - Design decisions and rationale
- [ ] Add inline code comments for complex logic
- [ ] Test: Fresh clone of repo, follow README, verify it works

**Deliverable**: Clear, comprehensive documentation

---

### PR-39: API Documentation
**Estimated Effort**: 2-3 hours

#### Tasks:
- [ ] Create API.md with endpoint documentation:
  - For each endpoint:
    - Method, path
    - Request parameters/body
    - Response format (with examples)
    - Error responses
    - Authentication requirements
- [ ] Use OpenAPI/Swagger format (optional, but nice)
- [ ] Add example curl commands for testing
- [ ] Document rate limits (if any)
- [ ] Document consent requirements per endpoint
- [ ] Add Postman collection (optional)
- [ ] Test: Follow API docs, verify examples work

**Deliverable**: Complete API documentation

---

### PR-40: Decision Log & Limitations
**Estimated Effort**: 2-3 hours

#### Tasks:
- [ ] Create DECISIONS.md documenting key choices:
  - Why SQLite over PostgreSQL (simplicity for demo)
  - Why Zustand over Redux (less boilerplate)
  - Why GPT-4o-mini over GPT-4 (cost optimization)
  - Why normalized schema (data integrity)
  - Why thin slice approach (faster feedback)
- [ ] Create LIMITATIONS.md documenting known issues:
  - Demo-only auth (not production-ready)
  - No real Plaid integration (synthetic data)
  - No encryption at rest (would be required in production)
  - No multi-tenancy (single-user demo)
  - No real-time updates (batch processing)
  - AI rationales may vary in quality
  - No A/B testing framework
- [ ] Document future enhancements:
  - Real Plaid integration
  - Multi-language support
  - Mobile app
  - Email/SMS notifications
  - More sophisticated AI (RAG, fine-tuning)
- [ ] Add disclaimer about "not financial advice"
- [ ] Test: Review documents for completeness

**Deliverable**: Transparent decision log and limitations

---

### PR-41: Demo Video & Presentation
**Estimated Effort**: 3-4 hours

#### Tasks:
- [ ] Write demo script covering:
  - Problem statement (banks have data, can't give advice)
  - Solution overview (SpendSense personalized education)
  - User flow walkthrough
  - Persona system explanation
  - Recommendation examples
  - AI chat demonstration
  - Admin oversight
  - Persona evolution story (hero account)
- [ ] Record screen capture demo video:
  - 5-7 minutes ideal length
  - High-quality recording (1080p)
  - Clear narration
  - Show all key features
  - Highlight visual polish
- [ ] Create presentation slides (optional):
  - Problem/solution
  - Technical architecture
  - Key features
  - Demo screenshots
  - Metrics and evaluation
  - Future roadmap
- [ ] Export evaluation metrics report:
  - JSON with all metrics (coverage, latency, etc.)
  - 1-2 page summary PDF
- [ ] Test: Watch demo video, verify it's compelling

**Deliverable**: Polished demo video and presentation materials

---

### PR-42: Final Polish & Launch Prep
**Estimated Effort**: 2-3 hours

#### Tasks:
- [ ] Final UI/UX audit:
  - Check all colors/fonts for consistency
  - Verify all animations work smoothly
  - Test all interactive elements
  - Fix any visual bugs
- [ ] Accessibility audit:
  - Add alt text to images/icons
  - Ensure keyboard navigation works
  - Check color contrast (WCAG AA)
  - Add ARIA labels where needed
- [ ] Performance final check:
  - Measure page load times
  - Check bundle sizes
  - Verify API response times <5s
  - Test on slower connections (throttle network)
- [ ] Security audit:
  - Ensure no API keys in code
  - Validate all inputs
  - Sanitize user inputs
  - Check for XSS vulnerabilities
- [ ] Cross-browser testing:
  - Chrome, Firefox, Safari, Edge
  - Test all features in each browser
- [ ] Create launch checklist
- [ ] Test: Complete end-to-end manual test

**Deliverable**: Production-ready application

---

## 📊 Success Metrics Summary

### MVP Success Criteria
- ✅ User can consent to data sharing
- ✅ One persona (High Utilization) correctly assigned
- ✅ 2-3 recommendations displayed with rationales
- ✅ Basic dashboard showing persona and signals
- ✅ <5 seconds to load dashboard

### Phase 1 Success Criteria
- ✅ All 5 personas implemented and tested
- ✅ All behavioral signals detected accurately
- ✅ 100 synthetic users with 12 months of realistic data
- ✅ Persona prioritization working correctly
- ✅ 100% coverage (all users have persona + ≥3 signals)

### Phase 2 Success Criteria
- ✅ 3-5 prioritized recommendations per user
- ✅ All recommendations have plain-language rationales
- ✅ Partner offers filtered by eligibility
- ✅ Debt payment plans generated with avalanche/snowball
- ✅ AI-generated rationales are personalized and helpful
- ✅ 100% explainability (all recommendations have rationales)

### Phase 3 Success Criteria
- ✅ AI chat responds to user queries accurately
- ✅ Chat can query transaction history
- ✅ Admin can view user data (with consent only)
- ✅ Audit trail logs all admin actions
- ✅ Chat responses cached for cost optimization

### Phase 4 Success Criteria
- ✅ Visually stunning dashboard with animations
- ✅ Persona evolution timeline shows journey
- ✅ Quick stats provide at-a-glance insights
- ✅ Fully responsive design (mobile + desktop)
- ✅ Onboarding flow is engaging and clear

### Phase 5 Success Criteria
- ✅ ≥10 unit/integration tests, all passing
- ✅ >80% code coverage on critical modules
- ✅ Complete documentation (README, API, architecture)
- ✅ Demo video showcases all features
- ✅ <5 seconds recommendation generation latency
- ✅ 100% auditability (decision traces for all recommendations)

---

## 📈 Evaluation Metrics (Required Outputs)

### Metrics JSON Output
```json
{
  "coverage": {
    "users_with_persona": 100,
    "users_with_3plus_behaviors": 100,
    "percentage": 100
  },
  "explainability": {
    "recommendations_with_rationale": 500,
    "total_recommendations": 500,
    "percentage": 100
  },
  "latency": {
    "avg_recommendation_generation_ms": 2500,
    "p95_ms": 4200,
    "p99_ms": 4800,
    "target_ms": 5000,
    "within_target": true
  },
  "auditability": {
    "recommendations_with_traces": 500,
    "total_recommendations": 500,
    "percentage": 100
  },
  "code_quality": {
    "total_tests": 45,
    "passing_tests": 45,
    "code_coverage_percent": 85,
    "target_tests": 10
  },
  "fairness": {
    "persona_distribution": {
      "high_utilization": 20,
      "variable_income": 20,
      "subscription_heavy": 20,
      "savings_builder": 20,
      "lifestyle_creep": 20
    },
    "demographic_parity": "N/A - synthetic data without demographics"
  }
}
```

### Summary Report (1-2 pages)
Include:
- Overview of system capabilities
- Key metrics and achievement vs. targets
- Notable findings (e.g., most common persona, average recommendation impact)
- Limitations and future improvements
- Sample decision traces for 2-3 recommendations

---

## 🎯 Project Completion Checklist

### Code & Functionality
- [ ] All 42 PRs merged and tested
- [ ] Application runs locally with one command
- [ ] All API endpoints functional
- [ ] AI chat works reliably
- [ ] Admin view functional with audit trail
- [ ] Consent enforcement working
- [ ] All 5 personas correctly assigned
- [ ] Recommendations prioritized and relevant

### Testing & Quality
- [ ] ≥10 tests written and passing (target: 45)
- [ ] Integration tests cover main user flows
- [ ] Performance <5s recommendation generation
- [ ] No console errors or warnings
- [ ] Code follows consistent style
- [ ] All functions documented

### Documentation
- [ ] README with setup instructions
- [ ] API documentation complete
- [ ] Architecture diagram included
- [ ] Decision log documented
- [ ] Limitations clearly stated
- [ ] Inline code comments for complex logic

### Demo Materials
- [ ] Demo video recorded (5-7 minutes)
- [ ] Evaluation metrics exported (JSON + PDF)
- [ ] Hero account showing persona evolution
- [ ] Presentation slides (optional)
- [ ] GitHub repository clean and organized

### Visual & UX
- [ ] Dashboard visually polished
- [ ] Persona-specific design implemented
- [ ] Animations smooth and performant
- [ ] Mobile responsive
- [ ] Error states handled gracefully
- [ ] Loading states for all async operations

---

## 🚀 Quick Start Commands

```bash
# Clone and setup
git clone <repo-url>
cd finsight-ai
npm install

# Generate synthetic data
npm run generate-data

# Run development servers (frontend + backend)
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build for production (optional)
npm run build

# Start production server (optional)
npm start
```

---

## 📝 Notes

### Estimated Total Effort
- **MVP**: 25-30 hours
- **Phase 1**: 20-25 hours
- **Phase 2**: 20-25 hours
- **Phase 3**: 18-22 hours
- **Phase 4**: 18-22 hours
- **Phase 5**: 22-26 hours

**Total**: ~120-150 hours (3-4 weeks full-time)

### Prioritization Strategy
If time is limited, prioritize in this order:
1. **MVP** (must have)
2. **Phase 1** (complete personas)
3. **Phase 3** (AI chat - highest wow factor)
4. **Phase 4** (visual polish - demo impact)
5. **Phase 2** (comprehensive recommendations)
6. **Phase 5** (testing/docs - important but can compress)

### Tech Stack Summary
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- **Backend**: Node.js + Express + TypeScript + SQLite
- **AI**: OpenAI GPT-4o-mini
- **Charts**: Recharts
- **Icons**: Lucide React
- **Testing**: Jest + React Testing Library
- **Dev Tools**: ESLint, Prettier, Nodemon

### Key Success Factors
1. **Start simple**: MVP first, then layer complexity
2. **Test often**: Don't accumulate bugs
3. **Commit frequently**: Small, focused PRs
4. **Document as you go**: Don't leave it to the end
5. **Focus on demo**: What will look impressive?
6. **Keep it explainable**: Every recommendation needs "because"

---

**Good luck building FinSight AI! 🚀💰📊**