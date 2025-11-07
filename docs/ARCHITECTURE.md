# Architecture Documentation - FinSight AI

This document describes the system architecture, design patterns, data flow, and key technical decisions for FinSight AI.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Component Architecture](#component-architecture)
3. [Data Flow](#data-flow)
4. [Database Schema](#database-schema)
5. [Design Patterns](#design-patterns)
6. [Key Technical Decisions](#key-technical-decisions)
7. [Security Architecture](#security-architecture)
8. [Performance Architecture](#performance-architecture)

## System Architecture

### High-Level Architecture

```mermaid
graph TB
    User[User Browser] --> Frontend[React Frontend<br/>Port 3000]
    Frontend --> API[Express API<br/>Port 3002]
    API --> BL[Business Logic Layer]
    BL --> DB[(SQLite Database)]
    BL --> AI[OpenAI GPT-4o-mini]
    
    subgraph Frontend
        UI[UI Components]
        State[Zustand Store]
        Services[API Services]
    end
    
    subgraph API
        Routes[Express Routes]
        Middleware[Middleware<br/>Consent, CORS]
    end
    
    subgraph BL
        Features[Feature Detection]
        Personas[Persona Assignment]
        Recs[Recommendation Engine]
        Chat[AI Chat Service]
    end
    
    subgraph DB
        Tables[(9 Tables<br/>Users, Accounts,<br/>Transactions, etc.)]
    end
```

### Technology Stack

#### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Recharts** - Data visualization
- **Axios** - HTTP client
- **Lucide React** - Icons

#### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **SQLite** - Database
- **OpenAI API** - AI features
- **Jest** - Testing framework

## Component Architecture

### Frontend Architecture

```mermaid
graph LR
    App[App.tsx] --> Router[Route Logic]
    Router --> Consent[ConsentScreen]
    Router --> Onboarding[OnboardingWizard]
    Router --> Dashboard[Dashboard]
    Router --> Admin[AdminDashboard]
    
    Dashboard --> Hero[HeroPersonaCard]
    Dashboard --> Stats[QuickStatsWidget]
    Dashboard --> Timeline[PersonaTimeline]
    Dashboard --> Spending[SpendingBreakdown]
    Dashboard --> Recs[RecommendationCard]
    Dashboard --> Chat[ChatBubble]
    Dashboard --> History[TransactionHistory]
    
    App --> Store[Zustand Store]
    Store --> API[API Service]
    API --> Backend[Express Backend]
```

### Backend Architecture

```mermaid
graph TB
    Express[Express Server] --> Routes[Route Handlers]
    
    Routes --> ConsentRoute[Consent Routes]
    Routes --> ProfileRoute[Profile Routes]
    Routes --> RecRoute[Recommendation Routes]
    Routes --> ChatRoute[Chat Routes]
    Routes --> AdminRoute[Admin Routes]
    
    ProfileRoute --> ConsentMW[Consent Middleware]
    RecRoute --> ConsentMW
    ChatRoute --> ConsentMW
    
    ProfileRoute --> PersonaService[Persona Service]
    RecRoute --> RecService[Recommendation Service]
    ChatRoute --> ChatService[Chat Service]
    AdminRoute --> AdminService[Admin Service]
    
    PersonaService --> Features[Feature Detection]
    PersonaService --> AssignPersona[Persona Assignment]
    
    RecService --> ContentCatalog[Content Catalog]
    RecService --> Eligibility[Eligibility Checker]
    RecService --> Ranker[Recommendation Ranker]
    RecService --> RationaleGen[Rationale Generator]
    
    ChatService --> Cache[Response Cache]
    ChatService --> OpenAI[OpenAI API]
    
    PersonaService --> DB[(Database)]
    RecService --> DB
    ChatService --> DB
    AdminService --> DB
```

### Feature Detection Modules

```mermaid
graph LR
    Profile[Profile Request] --> Credit[Credit Monitoring]
    Profile --> Sub[Subscription Detection]
    Profile --> Savings[Savings Analysis]
    Profile --> Income[Income Stability]
    
    Credit --> Signals1[Utilization<br/>Interest Charges<br/>Overdue Status]
    Sub --> Signals2[Recurring Merchants<br/>Monthly Spend<br/>Subscription Share]
    Savings --> Signals3[Net Inflow<br/>Growth Rate<br/>Emergency Fund]
    Income --> Signals4[Pay Frequency<br/>Pay Gap<br/>Cash Flow Buffer]
    
    Signals1 --> Persona[Persona Assignment]
    Signals2 --> Persona
    Signals3 --> Persona
    Signals4 --> Persona
```

## Data Flow

### User Onboarding Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant API as Express API
    participant BL as Business Logic
    participant DB as Database
    
    U->>F: Enter User ID
    U->>F: Click "I Consent"
    F->>API: POST /api/consent
    API->>DB: Store Consent
    DB-->>API: Consent Recorded
    API-->>F: Success Response
    F->>API: GET /api/profile/:user_id
    API->>BL: Calculate Signals
    BL->>DB: Query Transactions
    DB-->>BL: Transaction Data
    BL->>BL: Feature Detection
    BL->>BL: Persona Assignment
    BL->>DB: Store Persona
    DB-->>BL: Persona Stored
    BL-->>API: Profile Data
    API-->>F: Profile Response
    F->>API: GET /api/recommendations/:user_id
    API->>BL: Generate Recommendations
    BL->>DB: Query Content Catalog
    BL->>BL: Filter by Eligibility
    BL->>BL: Rank Recommendations
    BL->>DB: Store Recommendations
    BL-->>API: Recommendations
    API-->>F: Recommendations Response
    F->>U: Display Dashboard
```

### Chat Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant API as Express API
    participant Cache as Cache Service
    participant AI as OpenAI API
    participant DB as Database
    
    U->>F: Type Message
    F->>API: POST /api/chat/:user_id
    API->>Cache: Check Cache
    Cache->>DB: Query Cache Table
    alt Cache Hit
        DB-->>Cache: Cached Response
        Cache-->>API: Return Cached
    else Cache Miss
        API->>AI: Generate Response
        AI-->>API: AI Response
        API->>Cache: Store in Cache
        Cache->>DB: Save Cache Entry
    end
    API-->>F: Chat Response
    F->>U: Display Message
```

### Recommendation Generation Flow

```mermaid
graph TB
    Request[Recommendation Request] --> Persona[Get User Persona]
    Persona --> Catalog[Load Content Catalog]
    Catalog --> Filter[Filter by Persona]
    Filter --> Eligibility[Check Eligibility]
    Eligibility --> Rank[Rank by Impact/Urgency]
    Rank --> Rationale[Generate Rationale]
    Rationale --> Store[Store Recommendations]
    Store --> Return[Return to User]
```

## Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ ACCOUNTS : has
    USERS ||--o{ CONSENTS : has
    USERS ||--o{ PERSONAS : has
    USERS ||--o{ RECOMMENDATIONS : has
    USERS ||--o{ AUDIT_LOG : accessed_by
    
    ACCOUNTS ||--o{ TRANSACTIONS : has
    ACCOUNTS ||--o{ LIABILITIES : has
    
    PERSONAS ||--o{ RECOMMENDATIONS : generates
    
    USERS {
        string user_id PK
        string email UK
        string name
        datetime created_at
    }
    
    ACCOUNTS {
        string account_id PK
        string user_id FK
        string type
        json balances
        datetime created_at
    }
    
    TRANSACTIONS {
        string transaction_id PK
        string account_id FK
        date date
        real amount
        string merchant_name
        string category
    }
    
    LIABILITIES {
        string liability_id PK
        string account_id FK
        string type
        real apr_percentage
        real minimum_payment_amount
    }
    
    CONSENTS {
        string consent_id PK
        string user_id FK
        datetime consented_at
        datetime revoked_at
        string status
    }
    
    PERSONAS {
        string persona_id PK
        string user_id FK
        string persona_type
        datetime assigned_at
        json signals
        json secondary_personas
    }
    
    RECOMMENDATIONS {
        string rec_id PK
        string user_id FK
        string persona_id FK
        string type
        text content
        text rationale
        json impact_estimate
    }
    
    AUDIT_LOG {
        string log_id PK
        string admin_id
        string user_id FK
        string action
        datetime timestamp
    }
    
    CHAT_CACHE {
        string cache_id PK
        string user_id FK
        string query_hash
        text response
        datetime expires_at
    }
```

### Indexes

The database includes optimized indexes for performance:

- `idx_accounts_user_id` - Fast user account lookups
- `idx_transactions_account_id` - Fast transaction queries
- `idx_transactions_account_date` - Composite index for date-sorted queries
- `idx_transactions_merchant_name` - Fast merchant searches
- `idx_personas_user_assigned_at` - Fast persona history queries
- `idx_recommendations_user_type` - Fast recommendation filtering
- `idx_consents_user_status` - Fast consent checks
- `idx_chat_cache_query_hash` - Fast cache lookups

## Design Patterns

### State Management Pattern

**Zustand Store Structure:**
```typescript
interface UserState {
  userId: string | null;
  hasConsent: boolean;
  persona: Persona | null;
  signals: Signals | null;
  recommendations: Recommendation[];
  loading: boolean;
  error: string | null;
  chatOpen: boolean;
  chatMessages: ChatMessage[];
  isAdmin: boolean;
}
```

**Benefits:**
- Simple API with minimal boilerplate
- TypeScript support
- Easy to test and debug
- Sufficient for MVP scope

### API Pattern

**RESTful Endpoints:**
- `GET /api/health` - Health check
- `POST /api/consent` - Consent management
- `GET /api/profile/:user_id` - User profile (requires consent)
- `GET /api/recommendations/:user_id` - Recommendations (requires consent)
- `POST /api/chat/:user_id` - AI chat (requires consent)
- `GET /api/admin/*` - Admin endpoints

**Response Format:**
```typescript
// Success
{ data: T }

// Error
{ error: string, message?: string }
```

### Feature Detection Pattern

Each feature module follows this pattern:

```typescript
export async function detectFeature(
  userId: string,
  windowDays?: number
): Promise<FeatureResult> {
  // 1. Query database
  // 2. Process data
  // 3. Calculate metrics
  // 4. Return structured result
}
```

**Benefits:**
- Pure functions (testable)
- Consistent interface
- Reusable across personas
- Easy to extend

### Persona Assignment Pattern

```mermaid
graph LR
    Signals[All Signals] --> Check1[Check High Util]
    Signals --> Check2[Check Variable Income]
    Signals --> Check3[Check Lifestyle Creep]
    Signals --> Check4[Check Sub Heavy]
    Signals --> Check5[Check Savings Builder]
    
    Check1 --> Priority[Prioritize]
    Check2 --> Priority
    Check3 --> Priority
    Check4 --> Priority
    Check5 --> Priority
    
    Priority --> Store[Store Primary + Secondary]
```

### Recommendation Pattern

1. **Load Content Catalog** - Get all available content
2. **Filter by Persona** - Match persona to relevant content
3. **Check Eligibility** - Verify user meets requirements
4. **Rank by Impact** - Calculate impact and urgency scores
5. **Generate Rationale** - AI-powered or template-based
6. **Store Results** - Save for auditability

## Key Technical Decisions

### Why SQLite?

**Decision:** Use SQLite for local development and demo.

**Rationale:**
- No external database server required
- Sufficient for 100 users with 12 months of data
- Easy to backup and share
- Fast for read-heavy workloads
- Simple setup for developers

**Trade-offs:**
- Not suitable for production scale
- Limited concurrent writes
- No built-in replication

**Future:** Migrate to PostgreSQL for production.

### Why Zustand?

**Decision:** Use Zustand for state management.

**Rationale:**
- Less boilerplate than Redux
- Simple API for MVP scope
- Good TypeScript support
- Sufficient for current needs

**Trade-offs:**
- Less ecosystem than Redux
- May need migration for complex state

**Future:** Consider Redux Toolkit if state becomes complex.

### Why GPT-4o-mini?

**Decision:** Use GPT-4o-mini for AI features.

**Rationale:**
- Cost optimization vs GPT-4
- Sufficient quality for educational content
- Faster response times
- Lower token usage

**Trade-offs:**
- Less capable than GPT-4
- May need upgrade for complex queries

**Future:** Consider GPT-4 for premium features.

### Why Normalized Schema?

**Decision:** Use normalized database schema.

**Rationale:**
- Data integrity
- Avoid duplication
- Easier to query and analyze
- Standard relational practices

**Trade-offs:**
- More joins required
- Slightly more complex queries

**Future:** Consider denormalization for read-heavy paths.

## Security Architecture

### Consent Enforcement

```mermaid
graph TB
    Request[API Request] --> Middleware[Consent Middleware]
    Middleware --> Check{Has Active<br/>Consent?}
    Check -->|Yes| Allow[Allow Request]
    Check -->|No| Deny[Return 403]
    
    Allow --> Route[Route Handler]
    Route --> Response[Response]
```

**Implementation:**
- Middleware checks `consents` table
- Returns 403 if no active consent
- All sensitive endpoints protected

### Admin Access Control

```mermaid
graph TB
    Admin[Admin Request] --> Auth[Password Auth]
    Auth --> Check{Valid<br/>Password?}
    Check -->|No| Deny[Return 401]
    Check -->|Yes| Consent{User Has<br/>Consent?}
    Consent -->|No| Block[Block Access]
    Consent -->|Yes| Log[Log to Audit]
    Log --> Allow[Allow Access]
```

**Implementation:**
- Simple password authentication (demo only)
- Audit logging for all admin actions
- Cannot access non-consented users
- Read-only access

### Input Validation

- All API inputs validated
- User IDs and account IDs checked
- SQL injection protection (parameterized queries)
- Type checking with TypeScript

## Performance Architecture

### Caching Strategy

```mermaid
graph LR
    Request[Chat Request] --> Normalize[Normalize Query]
    Normalize --> Hash[Generate Hash]
    Hash --> Check{Check Cache}
    Check -->|Hit| Return[Return Cached]
    Check -->|Miss| AI[Call OpenAI]
    AI --> Store[Store in Cache]
    Store --> Return
```

**Implementation:**
- 1-hour TTL for chat responses
- Query normalization for cache hits
- SHA-256 hash for cache keys

### Database Optimization

- Composite indexes for common queries
- Indexes on foreign keys
- Query optimization for date ranges
- Pagination for large result sets

### Frontend Optimization

- Code splitting for admin routes
- Lazy loading of components
- Memoization for Recharts
- Skeleton loaders for async content
- API response caching headers

## Future Considerations

### Production Readiness

1. **Authentication & Authorization**
   - OAuth 2.0 / JWT tokens
   - Role-based access control
   - Session management

2. **Database**
   - Migrate to PostgreSQL
   - Connection pooling
   - Read replicas for scale

3. **Infrastructure**
   - Docker containers
   - Kubernetes orchestration
   - CI/CD pipelines
   - Monitoring and logging

4. **Security**
   - HTTPS/TLS
   - Rate limiting
   - Input sanitization
   - Security headers

5. **Scalability**
   - Horizontal scaling
   - Load balancing
   - Caching layer (Redis)
   - Message queue for async tasks

