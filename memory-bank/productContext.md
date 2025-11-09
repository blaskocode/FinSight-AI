# Product Context: FinSight AI

## Why This Project Exists

### Problem Statement
Banks and financial institutions have access to rich transaction data but are constrained from providing personalized financial advice due to regulatory limitations. Customers need guidance but often receive generic, one-size-fits-all recommendations that don't address their specific financial situation.

### Solution
FinSight AI bridges this gap by:
1. Analyzing transaction patterns to detect behavioral signals
2. Assigning users to financial personas based on their behavior
3. Providing personalized, explainable recommendations
4. Using AI to make insights conversational and educational
5. Maintaining strict guardrails to stay within educational boundaries

## How It Should Work

### User Experience Flow

#### New User Onboarding
1. Welcome screen with value proposition
2. Consent explanation (what data, why, how it's used)
3. Consent form with clear opt-in checkbox
4. Processing animation (analyzing transactions)
5. Reveal persona with animation
6. Dashboard with personalized recommendations

#### Returning User Flow
1. Login/authentication
2. Dashboard loads (if consent active)
3. View updated persona and recommendations
4. Explore chat for questions
5. Take action on recommendations

### Five Financial Personas

#### Persona 1: High Utilization (CRITICAL Priority)
- **Criteria**: Card utilization ≥50% OR interest charges > 0 OR minimum-payment-only OR overdue status
- **Focus**: Reduce utilization and interest; payment planning and autopay education

#### Persona 2: Variable Income Budgeter (HIGH Priority)
- **Criteria**: Median pay gap > 45 days AND cash-flow buffer < 1 month
- **Focus**: Percent-based budgets, emergency fund basics, income smoothing strategies

#### Persona 3: Subscription-Heavy (MEDIUM Priority)
- **Criteria**: Recurring merchants ≥3 AND (monthly recurring spend ≥$50 OR subscription share ≥10%)
- **Focus**: Subscription audit, cancellation/negotiation tips, bill alerts

#### Persona 4: Savings Builder (LOW Priority)
- **Criteria**: Savings growth ≥2% over window OR net inflow ≥$200/month AND all card utilizations < 30%
- **Focus**: Goal setting, automation, APY optimization (HYSA/CD basics)

#### Persona 5: Lifestyle Creep / High Earner Low Saver (MEDIUM-HIGH Priority)
- **Criteria**: High income (top 25% of dataset) + low savings rate (<5% of income) + high discretionary spending (>30% on dining/entertainment/travel)
- **Focus**: Wealth building, retirement gap analysis, opportunity cost education, tax-advantaged accounts

### Persona Prioritization
If multiple personas match, assign primary persona by severity:
**High Utilization > Variable Income > Lifestyle Creep > Subscription-Heavy > Savings Builder**

Display secondary personas as tags.

## Core Features

### Behavioral Signal Detection
- **Subscription Detection**: Recurring merchants (≥3 in 90 days), monthly recurring spend, subscription share
- **Savings Analysis**: Net inflow, growth rate, emergency fund coverage
- **Credit Monitoring**: Utilization (balance/limit), flags for ≥30%, ≥50%, ≥80%, minimum-payment detection, interest charges, overdue status
- **Income Stability**: Payroll ACH auto-detection, payment frequency, cash-flow buffer

### Personalized Recommendations
- **Education Content** (3-5 items): Articles, budget templates, calculators, checklists with plain-language rationale
- **Partner Offers** (1-3 items): Balance transfer cards, HYSAs, budgeting apps, subscription tools with eligibility checks
- **Debt Paydown Plans**: Auto-generated schedules with avalanche vs snowball strategies

### AI Conversational Interface
- GPT-4o-mini powered chat embedded in dashboard
- Transaction-level queries: "How much did I spend on dining in March?"
- General financial education: "What's a good emergency fund size?"
- Behavioral insights: "Why is my utilization high?"

### Dashboard Experience
- Persona identity card with distinct color scheme and iconography
- Financial health metrics with progress indicators
- Prioritized recommendation cards with impact estimates
- Persona evolution timeline showing transitions over time

## User Experience Goals

### Visual Excellence
- Stunning UI with persona-specific design
- Smooth animations and intuitive navigation
- Distinct visual identity for each persona

### Educational Tone
- Empowering, supportive language
- No shaming or judgmental phrasing
- Specific data points cited in every recommendation
- Plain language, no jargon

### Transparency
- Every recommendation includes "because" rationale
- Clear explanation of persona assignment
- Visible consent status and controls
- Users can revoke access at any time from multiple locations (Dashboard, ConsentScreen, Sign Out dialog)
- Sign out dialog clearly explains data retention unless access is revoked

## Guardrails & Compliance

### Critical Requirements
- All recommendations must include: "This is educational content, not financial advice. Consult a licensed advisor for personalized guidance."
- Explicit opt-in required before any data processing
- All-or-nothing consent model (simplicity for demo)
- Revoke consent at any time
- No recommendations without active consent

### Eligibility Filtering
- Don't recommend products user isn't eligible for
- Check minimum income/credit requirements
- Filter based on existing accounts (no duplicates)
- Blacklist predatory products
- Validate eligibility before every recommendation display

### Admin Oversight
- Read-only access to user data (with consent only)
- Audit trail: log admin views with timestamp + admin ID + user ID
- No ability to modify recommendations or personas
- Cannot access data for users who haven't consented

