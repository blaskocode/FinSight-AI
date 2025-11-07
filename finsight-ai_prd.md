# FinSight AI: Product Requirements Document

## Product Overview

### Mission Statement
Transform transaction data into actionable financial insights through explainable AI, delivering personalized education while maintaining strict consent and eligibility guardrails.

### Primary User
Individual banking customers seeking personalized financial guidance without crossing into regulated advice territory

### Core Value Proposition
Netflix-style personalization for your finances with AI-powered insights and conversational support

### Key Differentiators
- **Explainable by Default**: Every recommendation includes a "because" rationale with specific data points
- **Consent-First**: No analysis without explicit opt-in; users control their data
- **Education Over Sales**: Empowering tone, no shaming, focus on learning not product pushing
- **AI-Enhanced**: GPT-4o-mini provides personalized explanations and conversational Q&A

---

## Five Personas

### Persona 1: High Utilization
**Priority**: CRITICAL - Highest severity due to immediate financial risk

**Criteria**:
- Card utilization ≥50% OR interest charges > 0 OR minimum-payment-only OR overdue status

**Primary Focus**:
- Reduce utilization and interest; payment planning and autopay education

---

### Persona 2: Variable Income Budgeter
**Priority**: HIGH - Financial instability risk

**Criteria**:
- Median pay gap > 45 days AND cash-flow buffer < 1 month

**Primary Focus**:
- Percent-based budgets, emergency fund basics, income smoothing strategies

---

### Persona 3: Subscription-Heavy
**Priority**: MEDIUM - Opportunity for quick wins

**Criteria**:
- Recurring merchants ≥3 AND (monthly recurring spend ≥$50 OR subscription share ≥10%)

**Primary Focus**:
- Subscription audit, cancellation/negotiation tips, bill alerts

---

### Persona 4: Savings Builder
**Priority**: LOW - Already healthy, focus on optimization

**Criteria**:
- Savings growth ≥2% over window OR net inflow ≥$200/month AND all card utilizations < 30%

**Primary Focus**:
- Goal setting, automation, APY optimization (HYSA/CD basics)

---

### Persona 5: Lifestyle Creep / High Earner Low Saver
**Priority**: MEDIUM-HIGH - High earning potential at risk

**Criteria**:
- High income (top 25% of dataset) + low savings rate (<5% of income) + high discretionary spending (>30% on dining/entertainment/travel)

**Primary Focus**:
- Wealth building, retirement gap analysis, opportunity cost education, tax-advantaged accounts

---

### Persona Overlap Handling
If multiple personas match, assign primary persona by severity:
**High Utilization > Variable Income > Lifestyle Creep > Subscription-Heavy > Savings Builder**

Display secondary personas as tags.

---

## Core Features & Capabilities

### Behavioral Signal Detection
Automated analysis of transaction patterns over 30-day and 180-day windows

#### Subscription Detection
- Recurring merchants (≥3 in 90 days)
- Monthly recurring spend
- Subscription share of total spend

#### Savings Analysis
- Net inflow to savings accounts
- Growth rate
- Emergency fund coverage = savings balance / avg monthly expenses (6-month trailing average)

#### Credit Monitoring
- Utilization (balance/limit)
- Flags for ≥30%, ≥50%, ≥80%
- Minimum-payment detection
- Interest charge tracking
- Overdue status

#### Income Stability
- Payroll ACH auto-detection
- Payment frequency (weekly/biweekly/twice-monthly/monthly)
- Cash-flow buffer in months

---

### Personalized Recommendations
AI-powered, ranked by impact and urgency for each user

#### Education Content (3-5 items)
- Articles, budget templates, calculators, checklists
- Each with plain-language rationale citing specific data

#### Partner Offers (1-3 items)
- Balance transfer cards, HYSAs, budgeting apps, subscription tools
- With eligibility checks and impact estimates

#### Debt Paydown Plans
- Auto-generated schedules based on available cash flow (income - expenses - safety buffer)
- AI recommends avalanche vs snowball
- Shows multiple scenarios side-by-side

---

### AI Conversational Interface
GPT-4o-mini powered chat embedded in dashboard (bottom-right bubble)

#### Transaction-Level Queries
"How much did I spend on dining in March?" - full transaction history access with consent

#### General Financial Education
"What's a good emergency fund size?" - contextual education beyond user's data

#### Behavioral Insights
"Why is my utilization high?" - explains signals and persona assignments with specific examples

---

### Dashboard Experience
Visually stunning, persona-driven UI

#### Persona Identity Card
- Distinct color scheme
- Custom iconography
- Visual badge
- Secondary persona tags

#### Financial Health Metrics
- Progress indicators
- Quick stats (utilization %, savings rate, monthly cash flow)

#### Prioritized Recommendation Cards
- Title + rationale + CTA
- Impact estimate
- Difficulty level
- Progress tracking

#### Persona Evolution Timeline
- Visual history showing transitions (e.g., High Utilization → Savings Builder)

---

## Guardrails & Compliance

### Critical Compliance Requirements
**All recommendations must include**: "This is educational content, not financial advice. Consult a licensed advisor for personalized guidance."

---

### Consent Management
- Explicit opt-in required before any data processing
- All-or-nothing consent model (simplicity for demo)
- Revoke consent at any time
- No recommendations without active consent
- Track consent status per user with timestamps

---

### Eligibility Filtering
- Don't recommend products user isn't eligible for
- Check minimum income/credit requirements
- Filter based on existing accounts (no duplicate account types)
- Blacklist predatory products (payday loans, high-fee services)
- Validate eligibility before every recommendation display

---

### Tone & Language
- No shaming language - avoid "you're overspending" or "bad with money"
- Empowering, educational tone throughout
- Neutral, supportive language in all copy
- Persona-specific tone adjustments (urgent for debt, encouraging for savings)
- AI responses filtered for harmful/judgmental phrasing

---

### Admin Oversight
- Read-only access to user data (with consent only)
- Audit trail: log admin views with timestamp + admin ID + user ID
- No ability to modify recommendations or personas
- Financial advisor use case: view data during client consultation
- Cannot access data for users who haven't consented

---

## Data Architecture & Synthetic Generation

### Dataset Specifications
- **100 synthetic users**
- **12 months transaction history per user**
- **Clear distribution across 5 personas** (20 users each)
- **Realistic merchant names and spending patterns**

---

### Plaid-Style Schema

#### Accounts Table
- account_id, user_id, type (checking/savings/credit/money_market/HSA)
- subtype, balances (available, current, limit)
- iso_currency_code, holder_category (exclude business)
- **Most users**: 1 checking + 1-2 savings + 1-2 credit accounts

#### Transactions Table
- transaction_id, account_id, date, amount
- merchant_name (real names: Netflix, Amazon, Kroger, etc.)
- merchant_entity_id, payment_channel
- personal_finance_category (Plaid taxonomy: primary/detailed)
- pending status, category tags

#### Liabilities Table
- **Credit Cards**: APRs (type/percentage), minimum_payment_amount, last_payment_amount
- is_overdue, next_payment_due_date, last_statement_balance
- **Mortgages/Student Loans**: interest_rate, next_payment_due_date, principal

---

### Synthetic Data Generation Rules

#### Income Patterns
- **Frequencies**: weekly, biweekly (every 14 days), twice-monthly (1st & 15th), monthly
- **Fixed amounts** (salary) or **variable** (hourly, commission, gig work)
- Auto-generate payroll ACH transactions with realistic employer names

#### Recurring Payments (Monthly)
- **Process on 1st of month**: Rent/Mortgage, Internet, Utilities, Phone, Insurance
- **Mid-month subscriptions**: Netflix, Spotify, NYT, gym memberships
- **Credit card payments**: due dates vary by card, auto-pay or manual

#### Spontaneous Spending
- **Groceries**: 1-2x/week, realistic amounts ($50-$200)
- **Dining Out**: variable frequency, correlated with income/persona
- **Fuel**: weekly for commuters, less for remote workers
- **Shopping**: Amazon, Target, Costco with realistic variability

#### Persona-Correlated Behaviors
- **High Utilization**: high credit balances, interest charges, minimum payments, occasional overdraft
- **Variable Income**: irregular income deposits, periods of low cash flow
- **Subscription-Heavy**: 5-10 recurring subscriptions, variety of streaming/software/gym
- **Savings Builder**: regular ACH transfers to savings (weekly or monthly), growing balances
- **Lifestyle Creep**: high income + high discretionary spend (travel, dining, entertainment) + low savings rate

---

### Hero Account for Demo
Create one special account showing persona evolution:
- **Started as "High Utilization"** 12 months ago
- Gradually paid down debt, increased savings
- **Now classified as "Savings Builder"**
- Perfect for showcasing the timeline feature

---

## Technical Architecture

### Frontend Stack
- React 18+ with TypeScript
- Zustand for state management
- Tailwind CSS for styling
- Recharts for data visualization
- Lucide React for icons

### Backend Stack
- Node.js + Express REST API
- SQLite (normalized schema)
- Parquet for analytics exports
- JSON for configs/logs

### AI Integration
- OpenAI GPT-4o-mini API
- Streaming responses for chat
- Query caching for cost optimization
- Context management for conversations

### DevOps
- One-command local setup
- Jest for unit/integration tests (≥10)
- Deterministic behavior (seeded RNG)
- Docker optional for portability

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users` | Create user |
| POST | `/consent` | Record consent |
| GET | `/profile/:user_id` | Get behavioral profile |
| GET | `/recommendations/:user_id` | Get recommendations |
| POST | `/chat` | AI chat interaction |
| GET | `/operator/users` | List users (admin) |
| GET | `/operator/user/:id` | View user data (admin) |
| GET | `/operator/audit` | Audit log (admin) |

---

### Deployment Model
Demo/prototype runs locally as web app from laptop. No cloud deployment required. Docker optional for cross-platform compatibility.

---

## Success Metrics & Evaluation

### Required Targets

| Category | Metric | Target |
|----------|--------|--------|
| **Coverage** | Users with assigned persona + ≥3 detected behaviors | 100% |
| **Explainability** | Recommendations with plain-language rationales | 100% |
| **Latency** | Time to generate recommendations per user | <5 seconds |
| **Auditability** | Recommendations with decision traces | 100% |
| **Code Quality** | Passing unit/integration tests | ≥10 tests |
| **Documentation** | Schema and decision log clarity | Complete |

---

### Additional Success Factors

#### Visual Excellence
Stunning UI with persona-specific design, smooth animations, intuitive navigation

#### AI Quality
Chat feels genuinely helpful, personalized responses, accurate transaction queries

#### Insight Relevance
Recommendations feel personally relevant, actionable, and well-timed

#### Demo Impact
Hero account shows compelling persona evolution story, clear value demonstration

---

## Content Examples

### Education Content by Persona

#### High Utilization
- "Understanding Credit Utilization and Your Score"
- "Debt Avalanche vs Snowball: Which is Right for You?"
- "Setting Up Autopay to Avoid Late Fees"
- "How to Negotiate Lower Interest Rates"

#### Variable Income
- "Budgeting with Irregular Income"
- "Building an Emergency Fund on Variable Pay"
- "Income Smoothing Strategies"

#### Subscription-Heavy
- "The Complete Subscription Audit Checklist"
- "How to Negotiate or Cancel Subscriptions"
- "Setting Up Bill Alerts and Reminders"

#### Savings Builder
- "Setting SMART Financial Goals"
- "Automating Your Savings"
- "High-Yield Savings Accounts Explained"
- "Introduction to CDs and Bonds"

#### Lifestyle Creep
- "Understanding Opportunity Cost"
- "Retirement Savings Gap Calculator"
- "Tax-Advantaged Account Guide (401k, IRA, HSA)"
- "Building Wealth on a High Income"

---

### Partner Offer Examples

#### Balance Transfer Cards
- Chase Slate Edge (0% APR 18 months, $0 transfer fee first 60 days)
- Citi Diamond Preferred (0% APR 21 months)
- **Eligibility**: Credit score ≥670, utilization <100%

#### High-Yield Savings Accounts
- Marcus by Goldman Sachs (4.40% APY)
- Ally Bank (4.35% APY)
- **Eligibility**: No minimum balance, don't already have HYSA

#### Budgeting Apps
- YNAB (You Need A Budget)
- EveryDollar
- **Eligibility**: Variable income users

#### Subscription Management
- Rocket Money
- Truebill
- **Eligibility**: ≥3 subscriptions detected

---

## Rationale Format Example

"We noticed your Visa ending in 4523 is at 68% utilization ($3,400 of $5,000 limit). Bringing this below 30% could improve your credit score and reduce interest charges of $87/month."

---

## User Experience Flow

### New User Onboarding
1. Welcome screen with value proposition
2. Consent explanation (what data, why, how it's used)
3. Consent form with clear opt-in checkbox
4. Processing animation (analyzing transactions)
5. Reveal persona with animation
6. Dashboard with personalized recommendations

### Returning User Flow
1. Login/authentication
2. Dashboard loads (if consent active)
3. View updated persona and recommendations
4. Explore chat for questions
5. Take action on recommendations

### Admin Flow
1. Admin login
2. View user list (only consented users visible)
3. Select user to view details
4. Read-only view of data
5. Audit trail logs access

---

## Core Principles

### Transparency Over Sophistication
Every recommendation needs a clear rationale that cites specific data points

### User Control Over Automation
Users must explicitly consent and can revoke at any time

### Education Over Sales
Focus on learning and empowerment, not pushing products

### Fairness Built In From Day One
Basic demographic parity checks, no discriminatory patterns