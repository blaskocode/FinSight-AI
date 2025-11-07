# Setup Guide - FinSight AI

This guide provides detailed setup instructions for FinSight AI, including environment variables, database initialization, and troubleshooting.

## Prerequisites

### Required
- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher
- **Git** for version control

### Verify Installation

```bash
node --version  # Should be v18.0.0 or higher
npm --version   # Should be 9.0.0 or higher
git --version   # Any recent version
```

### Optional
- **OpenAI API Key** (for AI features - app works without it using fallbacks)

## Environment Variables

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
cd backend
touch .env
```

#### Required Variables
None - the app works with defaults.

#### Optional Variables

```env
# Server Configuration
PORT=3002                    # Backend server port (default: 3002)

# OpenAI Configuration (Optional)
OPENAI_API_KEY=sk-...        # OpenAI API key for AI features
                              # If not provided, app uses fallback templates

# Admin Configuration (Optional)
ADMIN_PASSWORD=your_password # Admin login password (default: "admin")
```

### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory (optional):

```bash
cd frontend
touch .env
```

```env
# API Configuration
VITE_API_URL=http://localhost:3002/api  # Backend API URL (default: http://localhost:3002/api)
```

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd FinSight-AI
```

### 2. Install Dependencies

Install dependencies for root, backend, and frontend:

```bash
npm run install:all
```

This runs:
- `npm install` (root)
- `npm install --prefix backend`
- `npm install --prefix frontend`

### 3. Initialize Database

```bash
cd backend
npm run db:init
```

This will:
- Create the SQLite database file (`finsight.db`)
- Run all migrations (creates tables and indexes)
- Verify database setup

**Expected Output:**
```
Initializing database...
Running performance optimization migration...
✅ Performance indexes created
✅ Database initialization completed successfully
All tables verified: users, accounts, transactions, ...
```

### 4. Generate Synthetic Data (Optional)

For testing and development, generate synthetic data:

```bash
cd data-gen
node index.js
```

This generates:
- 100 users with realistic financial profiles
- 12 months of transaction history
- Persona-correlated behaviors
- "Hero accounts" showing persona evolution

**Expected Output:**
```
Generating synthetic data...
✅ Generated 100 users
✅ Generated accounts and transactions
✅ Data generation complete!
```

### 5. Start the Application

From the project root:

```bash
npm run dev
```

This starts both frontend and backend concurrently.

**Expected Output:**
```
[backend] Server running on http://localhost:3002
[frontend] VITE ready in XXX ms
[frontend] ➜  Local:   http://localhost:3000/
```

## Verification

### 1. Check Backend Health

```bash
curl http://localhost:3002/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "FinSight AI Backend is running"
}
```

### 2. Check Frontend

Open http://localhost:3000 in your browser. You should see the consent screen.

### 3. Test with a User

1. Open http://localhost:3000
2. Enter a user ID (if you generated synthetic data, use one from the output)
3. Click "I Consent"
4. View the dashboard with persona and recommendations

## Common Issues & Troubleshooting

### Issue: Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3002
```

**Solution:**
1. Find the process using the port:
   ```bash
   lsof -i :3002  # macOS/Linux
   netstat -ano | findstr :3002  # Windows
   ```
2. Kill the process or change the port in `.env`

### Issue: Database Not Found

**Error:**
```
Error: SQLITE_CANTOPEN: unable to open database file
```

**Solution:**
1. Ensure you're in the `backend/` directory
2. Run `npm run db:init` to create the database
3. Check file permissions on `finsight.db`

### Issue: Module Not Found

**Error:**
```
Error: Cannot find module 'sqlite3'
```

**Solution:**
1. Reinstall dependencies:
   ```bash
   cd backend
   rm -rf node_modules package-lock.json
   npm install
   ```

### Issue: TypeScript Errors

**Error:**
```
TS6059: File is not under 'rootDir'
```

**Solution:**
This is a TypeScript configuration warning, not an error. The code will still compile and run. If you want to fix it:
1. Check `tsconfig.json` in `backend/`
2. Ensure all source files are under the `src/` directory or adjust `rootDir`

### Issue: OpenAI API Errors

**Error:**
```
Error: Invalid API key
```

**Solution:**
1. Check your `.env` file in `backend/`
2. Ensure `OPENAI_API_KEY` is set correctly
3. Note: The app works without OpenAI API key using fallback templates

### Issue: CORS Errors

**Error:**
```
Access to fetch at 'http://localhost:3002/api/...' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solution:**
1. Ensure backend is running on port 3002
2. Check that CORS is enabled in `backend/src/index.ts`
3. Verify frontend is using correct API URL

### Issue: Database Migration Errors

**Error:**
```
SQLITE_ERROR: table already exists
```

**Solution:**
1. Delete the database file:
   ```bash
   cd backend
   rm finsight.db
   ```
2. Reinitialize:
   ```bash
   npm run db:init
   ```

## Production Build

### Build for Production

```bash
# Build both frontend and backend
npm run build
```

This creates:
- `backend/dist/` - Compiled backend code
- `frontend/dist/` - Built frontend assets

### Run Production Build

```bash
# Backend
cd backend
npm start

# Frontend (serve static files)
cd frontend
npm run preview
```

### Environment for Production

1. Set `NODE_ENV=production`
2. Use production database (PostgreSQL, MySQL) instead of SQLite
3. Configure proper CORS origins
4. Set up proper logging and monitoring
5. Use environment variables for all secrets

## Development Scripts

### Root Scripts
- `npm run install:all` - Install all dependencies
- `npm run dev` - Start both frontend and backend
- `npm run build` - Build both for production
- `npm test` - Run backend tests

### Backend Scripts
- `npm run dev` - Start with hot reload (nodemon)
- `npm run build` - Compile TypeScript
- `npm start` - Run production build
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run db:init` - Initialize database
- `npm run db:migrate` - Run migrations

### Frontend Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Database Management

### View Database

```bash
cd backend
sqlite3 finsight.db

# SQLite commands
.tables                    # List all tables
.schema users              # View table schema
SELECT * FROM users LIMIT 5;  # Query data
.quit                      # Exit
```

### Reset Database

```bash
cd backend
rm finsight.db
npm run db:init
```

### Backup Database

```bash
cd backend
cp finsight.db finsight.db.backup
```

## Testing

### Run All Tests

```bash
npm test
```

### Run Specific Test File

```bash
cd backend
npm test -- tests/creditMonitoring.test.ts
```

### Run Tests in Watch Mode

```bash
cd backend
npm run test:watch
```

### Test Coverage

```bash
cd backend
npm test -- --coverage
```

Coverage report will be in `backend/coverage/`

## Getting Help

If you encounter issues not covered here:

1. Check the [ARCHITECTURE.md](./ARCHITECTURE.md) for system details
2. Review error messages in the console
3. Check that all prerequisites are installed correctly
4. Verify environment variables are set correctly
5. Ensure database is initialized

## Next Steps

After setup:
1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system
2. Review [TEST_PLAN.md](./TEST_PLAN.md) for testing strategies
3. Explore the codebase starting with `backend/src/index.ts` and `frontend/src/App.tsx`
4. Generate synthetic data and test the application
5. Review API endpoints in `backend/src/index.ts`

