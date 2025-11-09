# System Patterns: FinSight AI

## Architecture Overview

### High-Level Architecture
```
User Interface (React) 
  → State Management (Zustand)
    → API Layer (Express REST)
      → Business Logic Layer
        → Feature Detection
        → Persona Assignment
        → Recommendation Engine
        → AI Service
      → Data Storage (SQLite)
```

### Component Relationships

#### Frontend Layer
- **React 18** with TypeScript
- **Zustand** for state management (user, persona, recommendations, chat, consent)
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Lucide React** for icons

#### API Layer
- **Express REST API** with TypeScript
- Endpoints organized by feature:
  - `/api/consent` - Consent management
  - `/api/profile/:user_id` - User profile and persona
  - `/api/recommendations/:user_id` - Personalized recommendations
  - `/api/chat` - AI chat interaction
  - `/api/operator/*` - Admin endpoints

#### Business Logic Layer

##### Feature Detection Modules
- `creditMonitoring.js` - Utilization, interest charges, overdue status
- `subscriptionDetection.js` - Recurring merchants, subscription spend
- `savingsAnalysis.js` - Net inflow, growth rate, emergency fund
- `incomeStability.js` - Payroll detection, payment frequency, cash flow buffer

##### Persona System
- `assignPersona.js` - Persona assignment logic
- Prioritization: High Util > Variable Income > Lifestyle Creep > Sub Heavy > Savings Builder
- Stores primary + secondary personas

##### Recommendation Engine
- `engine.js` - Main recommendation generator
- `content-library.json` - Education content catalog
- `partner-offers.json` - Partner offer catalog with eligibility
- `ranker.js` - Impact/urgency scoring and prioritization
- `rationaleGenerator.js` - AI-powered rationale generation
- `paymentPlanner.js` - Debt paydown plan generator
- `eligibility.js` - Eligibility checking and filtering

##### AI Service
- `chatService.js` - Conversational AI with GPT-4o-mini
- `cache.js` - Response caching for cost optimization
- Transaction query functions for GPT function calling

##### Guardrails
- `consent.js` - Consent management and enforcement
- Middleware: `requireConsent.js` - Protects routes requiring consent
- Audit logging for admin access
- Revoke access functionality: Users can revoke consent from Dashboard, ConsentScreen, or Sign Out dialog
- Already-revoked consent handling: Backend returns success (200) if consent already revoked, frontend proceeds gracefully

#### Data Storage

##### SQLite Schema (Normalized)
- `users` - User information
- `accounts` - Bank accounts (checking, savings, credit, etc.)
- `transactions` - Transaction history
- `liabilities` - Credit cards, mortgages, loans
- `consents` - Consent status and history
- `personas` - Persona assignments with history
- `recommendations` - Generated recommendations
- `audit_log` - Admin access audit trail
- `chat_cache` - Cached AI responses

##### Synthetic Data Generation
- `data-gen/generator.js` - Main data generator
- Creates 100 users with 12 months of transaction history
- Persona-correlated behaviors
- Realistic merchant names and spending patterns
- "Hero account" showing persona evolution

## Design Patterns

### State Management Pattern
- **Zustand stores** organized by domain:
  - User state (profile, consent status)
  - Persona state (current persona, signals)
  - Recommendations state (list, loading, error)
  - Chat state (messages, conversation history)
  - Admin state (session, selected user)

### API Pattern
- RESTful endpoints with consistent error handling
- Middleware for consent enforcement
- JSON responses with consistent structure
- Error responses: `{ error: string, code: number }`

### Feature Detection Pattern
- Each feature module exports pure functions
- Functions take `userId` and optional `window` parameter
- Return structured data (objects, arrays)
- Unit testable with mock data

### Persona Assignment Pattern
- Calculate all behavioral signals first
- Check each persona's criteria
- Apply prioritization logic
- Store assignment with timestamp and signals JSON

### Recommendation Pattern
- Map persona to relevant content catalog
- Filter by eligibility
- Rank by impact + urgency
- Generate personalized rationale
- Store in database for auditability

### AI Integration Pattern
- System prompt includes user context (persona, signals)
- Function calling for transaction queries
- Streaming responses for chat
- Caching for common queries
- Fallback to templates if API fails

## Data Flow

### User Onboarding Flow
1. User submits consent → `POST /api/consent`
2. Backend stores consent → `consents` table
3. Frontend requests profile → `GET /api/profile/:user_id`
4. Backend calculates signals → Feature detection modules
5. Backend assigns persona → Persona assignment logic
6. Backend returns profile → Frontend updates Zustand store
7. Frontend requests recommendations → `GET /api/recommendations/:user_id`
8. Backend generates recommendations → Recommendation engine
9. Backend returns recommendations → Frontend displays

### Chat Flow
1. User sends message → Frontend Zustand store
2. Frontend calls API → `POST /api/chat`
3. Backend checks cache → `chat_cache` table
4. If cache miss → Call OpenAI API with context
5. Backend streams response → Frontend displays word-by-word
6. Backend stores in cache → For future similar queries

### Admin Flow
1. Admin logs in → `POST /api/admin/login`
2. Admin views user list → `GET /api/admin/users` (filtered by consent)
3. Admin selects user → `GET /api/admin/user/:id`
4. Backend checks consent → Return 403 if no consent
5. Backend logs access → `audit_log` table
6. Backend returns user data → Admin views read-only

## Key Technical Decisions

### Why SQLite?
- Simplicity for demo/prototype
- No external database server required
- Sufficient for 100 users with 12 months of data
- Easy to backup and share

### Why Zustand?
- Less boilerplate than Redux
- Simple API for state management
- Good TypeScript support
- Sufficient for MVP scope

### Why GPT-4o-mini?
- Cost optimization vs GPT-4
- Sufficient quality for educational content
- Faster response times
- Lower token usage

### Why Normalized Schema?
- Data integrity
- Avoid duplication
- Easier to query and analyze
- Standard relational database practices

### Why Thin Slice Approach?
- Faster feedback loops
- Working end-to-end at each phase
- Easier to demo and validate
- Reduces risk of building wrong thing

## Security Patterns

### Consent Enforcement
- Middleware checks consent before protected routes
- Returns 403 if no active consent
- All data access requires consent check

### Admin Access
- Read-only access only
- Audit trail for all admin actions
- Cannot access non-consented users
- Simple password auth for demo (not production-ready)

### Input Validation
- Validate all API inputs
- Sanitize user inputs
- Check for SQL injection (parameterized queries)
- Validate user IDs and account IDs

## Performance Patterns

### Caching Strategy
- AI chat responses cached for 1 hour
- Query normalization for cache hits
- Recommendation results can be cached per user

### Database Optimization
- Indexes on frequently queried columns:
  - `transactions.user_id`, `transactions.date`
  - `accounts.user_id`
  - `personas.user_id`, `personas.assigned_at`

### Frontend Optimization
- Code splitting for admin routes
- Lazy loading of components
- Memoization for Recharts
- Skeleton loaders for async content

