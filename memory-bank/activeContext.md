# Active Context: FinSight AI

## Current Work Focus

### Phase: MVP - PR-1 Complete ✅
**Status**: Project foundation and setup is complete. Ready to begin PR-2.

### Completed (PR-1)
- ✅ Monorepo structure created
- ✅ Backend: Express + TypeScript with health check endpoint
- ✅ Frontend: React + Vite + TypeScript + Tailwind CSS
- ✅ Concurrent development scripts
- ✅ Basic "Hello World" endpoints
- ✅ One-command setup working (`npm run install:all && npm run dev`)

### Current State
- **Backend**: Basic Express server running on port 3002 with health check endpoint
- **Frontend**: Basic React app with Tailwind CSS, showing "Welcome to FinSight AI Frontend"
- **Database**: Not yet implemented
- **Data Generation**: Not yet implemented
- **Feature Detection**: Not yet implemented
- **Persona System**: Not yet implemented
- **Recommendations**: Not yet implemented

### Next Steps: PR-2 - Database Schema & SQLite Setup
**Estimated Effort**: 3-4 hours

#### Tasks to Complete
1. Design normalized SQLite schema
2. Create migration script: `backend/db/migrations/001_initial_schema.sql`
3. Implement tables:
   - `users` (user_id, email, name, created_at)
   - `accounts` (account_id, user_id, type, subtype, balances JSON, currency)
   - `transactions` (txn_id, account_id, date, amount, merchant_name, category, pending)
   - `liabilities` (liability_id, account_id, type, APR, min_payment, is_overdue, next_due_date)
   - `consents` (consent_id, user_id, consented_at, revoked_at, status)
   - `personas` (persona_id, user_id, persona_type, assigned_at, window_days, signals JSON)
   - `recommendations` (rec_id, user_id, persona_id, type, content, rationale, created_at)
   - `audit_log` (log_id, admin_id, user_id, action, timestamp)
4. Create database initialization script: `backend/db/init.js`
5. Create database helper module: `backend/db/db.js` with connection pooling
6. Test: Run migration, verify tables exist, insert test row

## Recent Changes
- Project initialized with monorepo structure
- Backend and frontend basic setup completed
- Development environment configured

## Active Decisions & Considerations

### Database Design
- **Decision**: Using SQLite for simplicity (no external database server)
- **Consideration**: Schema should be normalized for data integrity
- **Consideration**: Need to support JSON fields for flexible data (balances, signals)

### Development Approach
- **Decision**: Thin slice approach - working end-to-end at each phase
- **Decision**: MVP first, then layer complexity
- **Consideration**: Each PR should be independently testable

### Code Organization
- **Decision**: Feature-based modules in backend (creditMonitoring, subscriptionDetection, etc.)
- **Decision**: Shared types in `/shared` directory
- **Consideration**: Need to establish patterns early for consistency

## Immediate Priorities

1. **PR-2**: Database Schema & SQLite Setup
   - Critical foundation for all future work
   - Must be completed before data generation or feature detection

2. **PR-3**: Minimal Synthetic Data Generator
   - Need test data to develop against
   - Start with 5 users (1 per persona) for MVP

3. **PR-4**: Feature Detection - Credit Monitoring
   - First feature detection module
   - Will inform persona assignment logic

## Blockers & Dependencies

### Current Blockers
- None - ready to proceed with PR-2

### Dependencies
- PR-2 must complete before PR-3 (need database schema)
- PR-3 must complete before PR-4 (need test data)
- PR-4 must complete before PR-5 (need credit signals for persona assignment)

## Notes for Next Session

### When Starting PR-2
- Review PRD for detailed schema requirements
- Consider Plaid-style schema for compatibility
- Plan for JSON fields in accounts table (balances)
- Plan for JSON fields in personas table (signals)
- Ensure indexes are created for frequently queried columns

### When Starting PR-3
- Review persona criteria to generate appropriate test data
- Create one "High Utilization" user with clear signals
- Keep it simple for MVP (3 months of data, not 12)

### Architecture Decisions Needed
- Database connection pattern (singleton vs pool)
- Error handling strategy
- Logging strategy
- Migration management approach

## Questions to Resolve

1. Should we use a migration library or simple SQL scripts?
2. How should we handle database initialization in development vs production?
3. Should we create a database seed script separate from migrations?
4. What's the best pattern for database connection management in Express?

