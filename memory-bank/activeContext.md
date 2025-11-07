# Active Context: FinSight AI

## Current Work Focus

### Phase: MVP - PR-2 Complete ✅
**Status**: Database schema and SQLite setup complete. Ready to begin PR-3.

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

### Current State
- **Backend**: Basic Express server running on port 3002 with health check endpoint
- **Frontend**: Basic React app with Tailwind CSS, showing "Welcome to FinSight AI Frontend"
- **Database**: ✅ SQLite database initialized with complete schema (9 tables, indexes, foreign keys)
- **Data Generation**: Not yet implemented
- **Feature Detection**: Not yet implemented
- **Persona System**: Not yet implemented
- **Recommendations**: Not yet implemented

### Next Steps: PR-3 - Minimal Synthetic Data Generator
**Estimated Effort**: 4-5 hours

#### Tasks to Complete
1. Create data generator module: `data-gen/generator.js`
2. Generate 5 test users (1 per persona for MVP)
3. For each user, generate:
   - 1 checking account with realistic balance
   - 1 credit card with utilization matching persona
   - 3 months of transaction history (simplified)
4. Implement basic transaction types (income, recurring, variable)
5. Create one "High Utilization" persona user with clear signals
6. Seed database with generated data

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

1. **PR-3**: Minimal Synthetic Data Generator ⏳ NEXT
   - Need test data to develop against
   - Start with 5 users (1 per persona) for MVP

3. **PR-4**: Feature Detection - Credit Monitoring
   - First feature detection module
   - Will inform persona assignment logic

## Blockers & Dependencies

### Current Blockers
- None - ready to proceed with PR-3

### Dependencies
- ✅ PR-2 complete - database schema ready
- PR-3 must complete before PR-4 (need test data)
- PR-4 must complete before PR-5 (need credit signals for persona assignment)

## Notes for Next Session

### When Starting PR-3
- Review persona criteria to generate appropriate test data
- Create one "High Utilization" user with clear signals
- Keep it simple for MVP (3 months of data, not 12)

### Architecture Decisions Made
- ✅ Database connection pattern: Singleton pattern (one connection per process)
- ✅ Migration management: Simple SQL scripts in `backend/db/migrations/`
- ✅ Database initialization: Separate `init.ts` script with testing capability
- ✅ Error handling: Promise-based wrapper functions for SQLite operations

### Architecture Decisions Still Needed
- Error handling strategy for API endpoints
- Logging strategy
- Database seed script structure (will be needed for PR-3)

