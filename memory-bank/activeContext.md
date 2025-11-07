# Active Context: FinSight AI

## Current Work Focus

### Phase: Phase 2 Complete ✅
**Status**: All Phase 2 PRs complete (PR-16 through PR-21)! Ready to continue with Phase 3.

### Completed (PR-1)
- ✅ Monorepo structure created
- ✅ Backend: Express + TypeScript with health check endpoint
- ✅ Frontend: React + Vite + TypeScript + Tailwind CSS
- ✅ Concurrent development scripts
- ✅ Basic "Hello World" endpoints
- ✅ One-command setup working (`npm run install:all && npm run dev`)

### Completed (PR-2)
- ✅ Normalized SQLite schema designed and implemented
- ✅ Migration script created: `backend/db/migrations/001_initial_schema.sql`
- ✅ All 9 tables implemented (users, accounts, transactions, liabilities, consents, personas, recommendations, audit_log, chat_cache)
- ✅ Database initialization script: `backend/db/init.ts`
- ✅ Database helper module: `backend/db/db.ts` with singleton connection pattern
- ✅ Database tested and verified (all tables created, test insert/query/delete successful)
- ✅ npm scripts added: `db:init` and `db:migrate`

### Completed (PR-3)
- ✅ Data generator module created: `data-gen/generator.js`
- ✅ Generated 5 test users (1 per persona: High Utilization, Variable Income, Subscription Heavy, Savings Builder, Lifestyle Creep)
- ✅ For each user: checking account, credit card, 3 months of transactions
- ✅ Implemented transaction types: income (monthly payroll), recurring (rent, subscriptions), variable (groceries, dining, shopping)
- ✅ High Utilization user created with 65% utilization, interest charges, minimum payments only
- ✅ Database seeded with 5 users, 11 accounts, 260 transactions
- ✅ Data verified: High Utilization user confirmed with correct characteristics

### Completed (PR-4)
- ✅ Credit monitoring module created: `backend/features/creditMonitoring.ts` (311 lines)
- ✅ Implemented `calculateUtilization()` - calculates utilization percentage with threshold flags (30%, 50%, 80%)
- ✅ Implemented `detectMinimumPaymentOnly()` - detects if user only makes minimum payments
- ✅ Implemented `calculateInterestCharges()` - calculates interest charges based on APR and balance
- ✅ Implemented `checkOverdueStatus()` - checks if credit card is overdue
- ✅ Implemented `getCreditSignals()` - combined function returning all credit signals
- ✅ Unit tests created: `backend/tests/creditMonitoring.test.ts` (364 lines)
- ✅ All 19 unit tests passing (utilization, minimum payments, interest charges, overdue status, edge cases)
- ✅ Jest testing framework configured

### Completed (PR-5)
- ✅ Persona assignment module created: `backend/personas/assignPersona.ts` (192 lines)
- ✅ Implemented `assignHighUtilizationPersona()` - checks criteria and assigns persona
- ✅ Criteria checking: utilization ≥50% OR interest > 0 OR min payment only OR overdue
- ✅ Persona storage: `storePersonaAssignment()` stores in personas table
- ✅ Persona retrieval: `getCurrentPersona()` gets most recent assignment
- ✅ API endpoint created: `GET /api/profile/:user_id` returns persona + signals
- ✅ Tested with High Utilization user: correctly assigned with 65% utilization, interest charges, minimum payments
- ✅ Confidence calculation based on number of criteria met

### Completed (PR-6)
- ✅ Recommendation engine module created: `backend/recommendations/engine.ts` (211 lines)
- ✅ Content catalog created: `backend/recommendations/content.json` with High Utilization content
- ✅ Implemented `generateRecommendations()` - maps persona to content and generates personalized rationales
- ✅ Rationale generation: template-based with specific data points (utilization %, interest charges, account info)
- ✅ API endpoint created: `GET /api/recommendations/:user_id` returns 4 recommendations (3 education + 1 partner offer)
- ✅ Recommendations stored in database
- ✅ Tested successfully: generates personalized recommendations with specific rationales

### Completed (PR-7)
- ✅ Consent management module created: `backend/guardrails/consent.ts` (111 lines)
- ✅ Implemented `recordConsent()` - records user consent in database
- ✅ Implemented `checkConsent()` - checks if user has active consent
- ✅ Implemented `revokeConsent()` - revokes user consent
- ✅ Implemented `getConsentRecord()` - retrieves consent record
- ✅ API endpoint created: `POST /api/consent` for recording/revoking consent
- ✅ Consent middleware created: `backend/middleware/requireConsent.ts` (42 lines)
- ✅ Middleware applied to profile and recommendations endpoints
- ✅ Tested successfully: returns 403 without consent, allows access with consent

### Completed (PR-8)
- ✅ Zustand store created: `frontend/src/store/useStore.ts` (110 lines)
- ✅ API service created: `frontend/src/services/api.ts` (96 lines)
- ✅ Consent screen component: `frontend/src/components/ConsentScreen.tsx` (93 lines)
- ✅ Dashboard component: `frontend/src/components/Dashboard.tsx` (148 lines)
- ✅ Persona card component: `frontend/src/components/PersonaCard.tsx` (69 lines)
- ✅ Recommendation card component: `frontend/src/components/RecommendationCard.tsx` (61 lines)
- ✅ App component updated with conditional rendering based on consent
- ✅ All components styled with Tailwind CSS
- ✅ Full integration with backend API endpoints

### Completed (PR-9) - MVP POLISH & TESTING
- ✅ Enhanced loading states in all components
- ✅ Improved error handling with user-friendly messages and retry buttons
- ✅ "Not financial advice" disclaimer added to dashboard
- ✅ Styling improvements: red persona card, hover effects, responsive layout
- ✅ Integration test created: `backend/tests/integration/mvp.test.ts` (4 tests, all passing)
- ✅ README updated with complete feature list, known limitations, and testing instructions
- ✅ All components polished and tested

### Completed (PR-10) - Subscription Detection Feature
- ✅ Subscription detection module created: `backend/features/subscriptionDetection.ts` (292 lines)
- ✅ Implemented `findRecurringMerchants()` - finds merchants with ≥3 occurrences
- ✅ Implemented `calculateRecurringCadence()` - determines weekly/monthly/irregular cadence
- ✅ Implemented `calculateMonthlyRecurringSpend()` - calculates monthly recurring spend
- ✅ Implemented `calculateSubscriptionShare()` - calculates subscription share percentage
- ✅ Implemented `getSubscriptionAnalysis()` - complete subscription analysis
- ✅ Recurring payment detection: same merchant, similar amounts (±10%), regular intervals
- ✅ Unit tests created: `backend/tests/subscriptionDetection.test.ts` (9 tests, all passing)
- ✅ Tested with synthetic data: successfully detects Netflix and Spotify

### Completed (PR-11) - Savings Analysis Feature
- ✅ Savings analysis module created: `backend/features/savingsAnalysis.ts` (416 lines)
- ✅ Implemented `calculateNetSavingsInflow()` - calculates net savings inflow (includes transfers from checking)
- ✅ Implemented `calculateSavingsGrowthRate()` - calculates savings growth percentage
- ✅ Implemented `calculateEmergencyFundCoverage()` - calculates months of expenses covered
- ✅ Implemented `calculateMonthlyExpenses()` - calculates monthly expenses (excludes transfers)
- ✅ Implemented `calculateSavingsRate()` - calculates savings rate as percentage of income
- ✅ Implemented `getSavingsAnalysis()` - complete savings analysis
- ✅ Handles multiple savings account types: savings, money_market, HSA
- ✅ Detects savings transfers from checking accounts (by merchant name or category)
- ✅ Unit tests created: `backend/tests/savingsAnalysis.test.ts` (8 tests, all passing)

### Completed (PR-12) - Income Stability Feature
- ✅ Income stability module created: `backend/features/incomeStability.ts` (347 lines)
- ✅ Implemented `detectPayrollACH()` - detects payroll transactions (ACH, employer patterns, payroll keywords)
- ✅ Implemented `detectPaymentFrequency()` - determines weekly/biweekly/twice-monthly/monthly/irregular
- ✅ Implemented `calculatePayGapVariability()` - calculates median pay gap and variability (standard deviation)
- ✅ Implemented `calculateCashFlowBuffer()` - calculates months of expenses covered by checking balance
- ✅ Implemented `getIncomeStabilityAnalysis()` - complete income stability analysis
- ✅ Pattern matching: ACH deposits, employer patterns (LLC, INC, CORP), excludes transfers
- ✅ Determines income stability rating: stable, moderate, or unstable
- ✅ Unit tests created: `backend/tests/incomeStability.test.ts` (12 tests, all passing)

### Completed (PR-13) - Remaining Personas Implementation
- ✅ Extended persona assignment module: `backend/personas/assignPersona.ts` (499 lines)
- ✅ Implemented `assignVariableIncomePersona()` - median pay gap > 45 days AND cash flow buffer < 1 month
- ✅ Implemented `assignSubscriptionHeavyPersona()` - recurring merchants ≥3 AND (monthly spend ≥$50 OR share ≥10%)
- ✅ Implemented `assignSavingsBuilderPersona()` - savings growth ≥2% OR net inflow ≥$200/month AND all utilizations < 30%
- ✅ Implemented `assignLifestyleCreepPersona()` - high income (top 25%) + low savings rate (<5%) + high discretionary (>30%)
- ✅ Implemented `assignPersona()` - main function with prioritization (High Util > Variable Income > Lifestyle Creep > Sub Heavy > Savings Builder)
- ✅ Updated `storePersonaAssignment()` to support secondary personas (JSON array)
- ✅ Updated `getCurrentPersona()` to return secondary personas
- ✅ Updated `/api/profile` endpoint to use new assignment logic and return secondary personas
- ✅ Unit tests created: `backend/tests/personaAssignment.test.ts` (6 tests, all passing)

### Completed (PR-14) - Enhanced Synthetic Data Generator
- ✅ Expanded data generator: `data-gen/generator.js` (539 lines) + `data-gen/transactionHelpers.js` (288 lines)
- ✅ Generates 100 users (20 per persona) with 12 months of transaction history
- ✅ Implemented persona-correlated behaviors for all 5 personas
- ✅ Added realistic merchant names: `data-gen/merchants.js` (groceries, dining, subscriptions, utilities, shopping, travel, entertainment)
- ✅ Added name pools: `data-gen/names.js` (large pool of first and last names)
- ✅ Implemented income patterns: 60% monthly, 20% biweekly, 15% variable, 5% twice-monthly
- ✅ Created hero account showing persona evolution (High Utilization months 1-6 → Savings Builder months 7-12)
- ✅ All files under 750 line limit (split into modules)
- ✅ Security review: Manual security review performed (Semgrep MCP unavailable), all SQL queries use parameterized statements, security notes added to code

### Completed (PR-15) - Frontend - All Personas Visual Identity
- ✅ Created `frontend/src/utils/personaConfig.ts` (121 lines) with all 5 persona configurations:
  - High Utilization: Red (#EF4444), AlertCircle icon
  - Variable Income: Orange (#F59E0B), TrendingUp icon
  - Subscription Heavy: Purple (#A855F7), Layers icon
  - Savings Builder: Green (#10B981), PiggyBank icon
  - Lifestyle Creep: Blue (#3B82F6), ArrowUpRight icon
- ✅ Updated `PersonaCard.tsx` (100 lines) to:
  - Display persona icon in colored badge
  - Show primary persona with large badge
  - Display secondary personas as small tags with icons
  - Include persona description and focus area
  - Use persona-specific color scheme throughout
- ✅ Enhanced `Dashboard.tsx` (291 lines) to display all behavioral signals:
  - Credit signals (utilization, interest charges, payment patterns)
  - Income stability signals (pay gap, cash flow buffer)
  - Subscription signals (monthly recurring spend, subscription share)
  - Savings signals (emergency fund coverage, savings growth rate, savings rate)
  - Lifestyle creep signals (discretionary spending, monthly income)
  - Responsive grid layout (1 column mobile, 2 tablet, 3 desktop)
- ✅ Updated TypeScript interfaces to support all signal types and secondary personas
- ✅ All files under 750 line limit
- ✅ Build successful, no TypeScript errors

### Completed (PR-16) - Content Catalog & Education Library
- ✅ Created `backend/recommendations/content-library.json` (347 lines) with comprehensive content for all 5 personas
- ✅ Total content: 22 education items + 10 partner offers
  - High Utilization: 4 education items, 2 partner offers
  - Variable Income: 4 education items, 2 partner offers
  - Subscription Heavy: 4 education items, 2 partner offers
  - Savings Builder: 5 education items, 2 partner offers
  - Lifestyle Creep: 5 education items, 2 partner offers
- ✅ Each education item includes: id, title, description, url, estimatedReadTime, category, tags
- ✅ Each partner offer includes: id, title, description, url, type, eligibility, impact
- ✅ Updated `engine.ts` to prefer `content-library.json` with fallback to `content.json` for backward compatibility
- ✅ All personas have comprehensive, persona-specific content coverage

### Completed (PR-17) - Partner Offer Catalog with Eligibility
- ✅ Created `backend/recommendations/eligibility.ts` (355 lines) with comprehensive eligibility checking:
  - Credit score estimation (based on utilization and payment history, 500-850 range)
  - Income estimation (from transaction history, fallback to persona signals)
  - Existing account detection (prevents duplicates by provider/type)
  - Credit utilization checking (max utilization across all credit accounts)
  - Persona matching (for persona-specific offers)
  - Subscription count checking (for subscription management offers)
  - Account type exclusion (prevents duplicate account types like HYSA)
- ✅ Blacklist system for predatory products:
  - Payday loans, cash advance apps
  - High-fee products (check cashing, rent-to-own)
  - Predatory credit repair services
- ✅ Updated `engine.ts` to filter partner offers by eligibility before generating recommendations
- ✅ All eligibility checks are async and database-backed
- ✅ File under 750 line limit

### Completed (PR-18) - Recommendation Ranking & Prioritization
- ✅ Created `backend/recommendations/ranker.ts` (378 lines) with comprehensive ranking system:
  - Impact scoring for all 5 personas:
    - High Utilization: Potential interest savings (interest charges * months to pay off)
    - Variable Income: Months until 3-month emergency fund reached
    - Subscription Heavy: Monthly recurring spend and subscription share
    - Savings Builder: Additional interest earned with HYSA (APY difference)
    - Lifestyle Creep: Retirement savings shortfall vs. recommended 20% rate
  - Urgency scoring based on financial situation:
    - Overdue status = 100 (critical)
    - High utilization (≥80%) = 90
    - Low emergency fund (<1 month) = 85
    - Low cash flow buffer (<0.5 months) = 80
    - Other = 30-70 (medium/low)
  - Priority score = (impact * 0.6) + (urgency * 0.4)
  - Recommendations sorted by priority score (descending)
- ✅ Updated `engine.ts` to use ranking system in `getRecommendations`
- ✅ Default limit changed from 10 to 5 recommendations (top priority)
- ✅ All ranking calculations are async and database-backed
- ✅ File under 750 line limit

### Completed (PR-19) - Rationale Generator with GPT-4o-mini
- ✅ Created `backend/ai/rationaleGenerator.ts` (327 lines) with comprehensive AI rationale generation:
  - OpenAI SDK integration with GPT-4o-mini
  - Structured prompt template with user data, persona, signals, and recommendation details
  - Tone validation (checks for harmful phrases like "you should be ashamed", "you're terrible", etc.)
  - Fallback to template-based rationales if API fails or tone validation fails
  - Caching system using `chat_cache` table (30 days for AI, 7 days for fallback)
  - Cache key generation based on userId, recommendationId, personaType, and signals hash
- ✅ Updated `engine.ts` to use AI rationale generator (with fallback)
- ✅ All rationale generation is async and database-backed
- ✅ File under 750 line limit
- ✅ Security review: API key from environment, input validation, tone validation, error handling

### Completed (PR-20) - Debt Payment Plan Generator
- ✅ Created `backend/recommendations/paymentPlanner.ts` (438 lines) with comprehensive payment plan generation:
  - `calculateAvailableCashFlow`: Calculates available cash flow from income, expenses, minimum payments, and 20% safety buffer
  - `generatePaymentPlan`: Generates payment plans for both avalanche and snowball strategies
  - `generatePaymentPlansComparison`: Generates both strategies for comparison
  - Payment plan includes: monthly payments per debt, payoff dates, total interest, total interest saved, timeline data
  - Timeline includes month-by-month payment schedule for visualization
- ✅ Added API endpoints:
  - `GET /api/payment-plan/:user_id?strategy=avalanche|snowball` - Generate single payment plan
  - `GET /api/payment-plan/:user_id/compare` - Generate both strategies for comparison
- ✅ All payment plan calculations are async and database-backed
- ✅ File under 750 line limit
- ✅ Security review: All database queries use parameterized statements, input validation, financial calculations validated

### Completed (PR-21) - Frontend - Recommendation Cards & Details
- ✅ Enhanced `RecommendationCard.tsx` (176 lines) with:
  - Priority badges (Critical/High/Medium/Low) with color coding
  - Impact estimate display with trending icon
  - Difficulty level badges (Quick Win/Moderate/Long-term) with icons
  - Progressive disclosure (expand/collapse details)
  - Context-aware CTAs (View Payment Plan, Learn More, Apply Now)
  - Integration with PaymentPlanModal and PartnerOfferCard
- ✅ Created `PaymentPlanModal.tsx` (230 lines) with:
  - Strategy toggle (Avalanche vs Snowball)
  - Payoff timeline chart using Recharts
  - Summary cards (Total Debt, Interest Saved, Payoff Time, Monthly Surplus)
  - Month-by-month payment schedule with debt details
  - Loading and error states
- ✅ Created `PartnerOfferCard.tsx` (78 lines) with:
  - Eligibility status display
  - Offer details and impact estimate
  - "Apply Now" CTA button
  - Educational disclaimer
- ✅ Added API service methods:
  - `fetchPaymentPlan(userId, strategy)` - Get single payment plan
  - `fetchPaymentPlanComparison(userId)` - Get both strategies for comparison
- ✅ Updated Dashboard to pass priority and difficulty to RecommendationCard
- ✅ All components under 750 line limit
- ✅ Responsive design with Tailwind CSS

### Current State - Phase 1 Complete, Phase 2 Complete ✅
- **Backend**: Express server with health check, profile, recommendations, and consent endpoints
- **Frontend**: ✅ Complete polished dashboard with consent screen, persona display, signals visualization, recommendations, error handling, and disclaimers
- **Database**: ✅ SQLite database initialized with complete schema (9 tables, indexes, foreign keys)
- **Data Generation**: ✅ Enhanced synthetic data generator complete (100 users, 12 months history, hero account, realistic merchants)
- **Feature Detection**: ✅ Credit monitoring complete, ✅ Subscription detection complete, ✅ Savings analysis complete, ✅ Income stability complete
- **Persona System**: ✅ All 5 personas implemented with prioritization (High Utilization, Variable Income, Subscription Heavy, Savings Builder, Lifestyle Creep)
- **Recommendations**: ✅ Basic recommendation engine working (4 recommendations with personalized rationales)
- **Consent Management**: ✅ Consent enforcement working (protected routes return 403 without consent)
- **Testing**: ✅ 19 unit tests + 4 integration tests passing
- **Documentation**: ✅ Comprehensive README with features, limitations, and testing guide

### Next Steps: Phase 1 - Complete Feature Detection & All Personas
**Goal**: Implement all behavioral signals and all 5 personas

#### First Tasks (PR-10)
1. Implement remaining feature detection modules
2. Add all behavioral signals
3. Expand persona system to support all 5 personas

## Recent Changes
- Project initialized with monorepo structure
- Backend and frontend basic setup completed
- Development environment configured
- Memory bank initialized with all 6 core files
- Cursor rules established (`.cursor/rules/project-workflow.mdc`):
  - Rule 1: Never run git commands (absolute prohibition)
  - Rule 2: `finsight-ai_tasks.md` is universal source of truth - must be updated before any task changes
  - Rule 3: Memory bank must be updated after every prompt if needed (mandatory)
- **PR-2 Complete**: Database schema and SQLite setup implemented
  - Created normalized schema with 9 tables (users, accounts, transactions, liabilities, consents, personas, recommendations, audit_log, chat_cache)
  - Database helper module with singleton connection pattern
  - Initialization script with testing capability
  - All tables verified and tested successfully
- **Cursor Rules Updated**:
  - Removed `firebase.mdc` (not relevant to this project - using SQLite)
  - Updated `process-task-list.mdc` to explicitly exclude `finsight-ai_tasks.md`
  - Clarified that `process-task-list.mdc` only applies to task lists in `/tasks/` directory
  - Main project task list (`finsight-ai_tasks.md`) is governed by `project-workflow.mdc` for sequential execution
  - Added `file-length-limit.mdc`: Enforces 750-line maximum for all application files (non-negotiable)
    - Files must be intelligently split by function when approaching/exceeding limit
    - All related files must be checked and refactored after splitting
- **PR-3 Complete**: Synthetic data generator implemented
  - Created comprehensive generator with persona-specific behaviors
  - Generated 5 users (one per persona) with 3 months of transaction history
  - High Utilization user verified with 65% utilization, interest charges, minimum payments
  - All data successfully seeded into database
- **PR-4 Complete**: Credit monitoring feature detection implemented
  - Created credit monitoring module with 5 functions (311 lines)
  - Utilization calculation with threshold flags (30%, 50%, 80%)
  - Minimum payment detection, interest charge calculation, overdue status checking
  - Comprehensive unit tests (19 tests, all passing)
  - Jest testing framework configured
- **PR-5 Complete**: Persona assignment implemented
  - Created persona assignment module (192 lines)
  - High Utilization persona assignment working
  - API endpoint `/api/profile/:user_id` returns persona + signals
  - Tested successfully with High Utilization user (65% utilization, interest charges, minimum payments)
  - Persona stored in database with confidence score
- **PR-6 Complete**: Basic recommendation engine implemented
  - Created recommendation engine module (211 lines)
  - Content catalog with 3 education items + 1 partner offer for High Utilization
  - Personalized rationale generation with specific data points
  - API endpoint `/api/recommendations/:user_id` returns 4 recommendations
  - Tested successfully: rationales include specific utilization %, interest charges, account details
- **PR-7 Complete**: Consent management implemented
  - Created consent management module (111 lines)
  - Consent recording, checking, revocation functions
  - API endpoint `/api/consent` for managing consent
  - Consent middleware protecting profile and recommendations endpoints
  - Tested successfully: returns 403 without consent, allows access with consent
- **PR-8 Complete**: Basic frontend dashboard implemented
  - Zustand store for state management (110 lines)
  - API service for backend integration (96 lines)
  - Consent screen component (93 lines)
  - Dashboard component with persona and recommendations (148 lines)
  - Persona card and recommendation card components
  - Full Tailwind CSS styling
  - Complete user flow: consent → profile → recommendations
- **PR-9 Complete**: MVP polish and testing
  - Enhanced loading states and error handling
  - "Not financial advice" disclaimer
  - Styling improvements (red persona card, hover effects)
  - Integration tests (4 tests, all passing)
  - Comprehensive README with features, limitations, and testing guide
  - **MVP COMPLETE** - All 9 PRs finished
- **PR-10 Complete**: Subscription detection feature
  - Created subscription detection module (292 lines)
  - Detects recurring merchants with ≥3 occurrences
  - Calculates cadence (weekly/monthly), monthly spend, subscription share
  - Unit tests (9 tests, all passing)
  - Successfully detects Netflix and Spotify in synthetic data
- **PR-11 Complete**: Savings analysis feature
  - Created savings analysis module (416 lines)
  - Calculates net savings inflow, growth rate, emergency fund coverage, savings rate
  - Detects savings transfers from checking accounts
  - Handles multiple savings account types (savings, money_market, HSA)
  - Unit tests (8 tests, all passing)
  - Ready for Savings Builder persona assignment
- **PR-12 Complete**: Income stability feature
  - Created income stability module (347 lines)
  - Detects payroll ACH transactions, payment frequency, pay gap variability
  - Calculates cash flow buffer and income stability rating
  - Pattern matching for ACH deposits, employer patterns, excludes transfers
  - Unit tests (12 tests, all passing)
  - Ready for Variable Income persona assignment
- **PR-13 Complete**: Remaining personas implementation
  - Extended persona assignment module (499 lines)
  - All 5 personas implemented with correct criteria
  - Prioritization logic working (High Util > Variable Income > Lifestyle Creep > Sub Heavy > Savings Builder)
  - Secondary personas stored and returned
  - API endpoint updated
  - Unit tests (6 tests, all passing)
- **PR-14 Complete**: Enhanced synthetic data generator
  - Expanded to 100 users (20 per persona) with 12 months of history
  - Persona-correlated behaviors implemented
  - Realistic merchant names and income patterns
  - Hero account showing persona evolution
  - Split into modules to stay under 750 line limit

## Active Decisions & Considerations

### Database Design
- **Decision**: Using SQLite for simplicity (no external database server) ✅
- **Decision**: Schema normalized for data integrity ✅
- **Decision**: JSON fields used for flexible data (balances, signals) ✅
- **Decision**: Singleton connection pattern for database access ✅
- **Decision**: Migration-based schema management ✅
- **Implementation**: 9 tables with foreign keys, indexes, and constraints
- **Location**: Database file at `backend/finsight.db`
- **Scripts**: `npm run db:init` and `npm run db:migrate` available

### Development Approach
- **Decision**: Thin slice approach - working end-to-end at each phase
- **Decision**: MVP first, then layer complexity
- **Consideration**: Each PR should be independently testable

### Code Organization
- **Decision**: Feature-based modules in backend (creditMonitoring, subscriptionDetection, etc.)
- **Decision**: Shared types in `/shared` directory
- **Consideration**: Need to establish patterns early for consistency

### Project Workflow Rules
- **Decision**: Cursor rules established in `.cursor/rules/project-workflow.mdc`
- **Rule 1**: Never run git commands - user controls all git operations
- **Rule 2**: `finsight-ai_tasks.md` is the universal source of truth - must be consulted before work, updated before task changes
- **Rule 3**: Memory bank must be updated after every prompt if changes occur - mandatory maintenance
- **Enforcement**: These rules are non-negotiable and must be followed strictly

## Immediate Priorities

1. **MVP Complete** ✅ - All 9 PRs finished (PR-1 through PR-9)
2. **Phase 1 Complete** ✅ - All 6 PRs finished (PR-10 through PR-15)
3. **Phase 2 Complete** ✅ - All 6 PRs finished (PR-16 through PR-21):
   - PR-16: Content catalog with 22 education items and 10 partner offers for all 5 personas
   - PR-17: Eligibility checking system with comprehensive filtering for all partner offers
   - PR-18: Recommendation ranking system with impact and urgency scoring
   - PR-19: AI rationale generator with GPT-4o-mini, tone validation, and caching
   - PR-20: Debt payment plan generator with avalanche and snowball strategies
   - PR-21: Frontend recommendation cards with priority badges, payment plan modal, and partner offer cards
4. **Phase 3 - PR-22**: AI Chat Backend - Core Infrastructure ⏳ NEXT
   - Create chat service module
   - Setup OpenAI SDK for streaming responses
   - Implement conversation context management

## Blockers & Dependencies

### Current Blockers
- None - Phase 2 complete! Ready to proceed with Phase 3 (PR-22)

### Recent Updates
- **Phase 2 Complete**: All 6 PRs finished (PR-16 through PR-21):
  - PR-16: Content catalog with 22 education items and 10 partner offers
  - PR-17: Eligibility checking system with comprehensive filtering
  - PR-18: Recommendation ranking system with impact and urgency scoring
  - PR-19: AI rationale generator with GPT-4o-mini, tone validation, and caching
  - PR-20: Debt payment plan generator with avalanche and snowball strategies
  - PR-21: Frontend recommendation cards with priority badges, payment plan modal, and partner offer cards

### Dependencies
- ✅ **MVP COMPLETE** - All 9 PRs finished!
- ✅ PR-10 complete - subscription detection working
- ✅ PR-11 complete - savings analysis working
- ✅ PR-12 complete - income stability working
- ✅ PR-13 complete - all 5 personas working
- ✅ PR-14 complete - enhanced data generator working
- ✅ PR-2 complete - database schema ready
- ✅ PR-3 complete - test data generated
- ✅ PR-4 complete - credit monitoring signals available
- ✅ PR-5 complete - persona assignment working
- ✅ PR-6 complete - recommendations working
- ✅ PR-7 complete - consent enforcement working
- ✅ PR-8 complete - frontend dashboard working
- ✅ PR-9 complete - MVP polish and testing
- Ready for PR-15: Frontend - All Personas Visual Identity

## Notes for Next Session

### PR-14 Complete! 🎉
- Enhanced data generator complete
- 100 users (20 per persona) with 12 months of history
- Persona-correlated behaviors implemented
- Realistic merchant names and income patterns
- Hero account showing persona evolution
- All files under 750 line limit
- Ready for PR-15: Frontend - All Personas Visual Identity

### When Starting PR-15
- Create persona color schemes and icons
- Update dashboard to show all personas
- Add persona-specific styling
- Update PersonaCard component for all personas

### Architecture Decisions Made
- ✅ Database connection pattern: Singleton pattern (one connection per process)
- ✅ Migration management: Simple SQL scripts in `backend/db/migrations/`
- ✅ Database initialization: Separate `init.ts` script with testing capability
- ✅ Error handling: Promise-based wrapper functions for SQLite operations

### Architecture Decisions Still Needed
- Error handling strategy for API endpoints
- Logging strategy
- Database seed script structure (will be needed for PR-3)

