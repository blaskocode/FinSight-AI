# Technical Context: FinSight AI

## Technology Stack

### Frontend
- **React 18+** with TypeScript
- **Vite** - Build tool and dev server
- **Zustand** - State management
- **Tailwind CSS** - Utility-first CSS framework
- **Recharts** - Chart library for data visualization
- **Lucide React** - Icon library
- **Axios** - HTTP client for API calls

### Backend
- **Node.js 18+** - Runtime environment
- **Express 5.x** - Web framework
- **TypeScript** - Type-safe JavaScript
- **SQLite3** - Embedded database
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

### AI Integration
- **OpenAI GPT-4o-mini** - AI model for chat and rationale generation
- **OpenAI SDK** - Official Node.js SDK

### Development Tools
- **Nodemon** - Auto-restart backend on changes
- **ts-node** - TypeScript execution for Node.js
- **Concurrently** - Run multiple npm scripts simultaneously
- **ESLint** - Code linting
- **TypeScript Compiler** - Type checking and compilation

### Testing (Planned)
- **Jest** - Test framework
- **React Testing Library** - Component testing
- **SQLite in-memory** - Test database

## Development Setup

### Prerequisites
- Node.js 18+ and npm
- Git

### One-Command Setup
```bash
npm run install:all  # Install all dependencies (root, backend, frontend)
npm run dev          # Start development servers (backend + frontend concurrently)
```

### Port Configuration
- **Frontend**: http://localhost:3000 (Vite default)
- **Backend API**: http://localhost:3002

### Project Structure
```
finsight-ai/
├── backend/
│   ├── src/
│   │   └── index.ts          # Express server entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Main React component
│   │   ├── main.tsx          # React entry point
│   │   └── ...
│   ├── package.json
│   └── vite.config.ts
├── shared/
│   ├── index.ts              # Shared TypeScript types
│   └── package.json
├── data-gen/
│   ├── index.js              # Synthetic data generator
│   └── package.json
├── docs/                     # Documentation
└── memory-bank/              # Project memory
```

## Development Workflow

### Backend Development
```bash
cd backend
npm run dev    # Start with hot reload (nodemon)
npm run build  # Build for production
npm start      # Run production build
```

### Frontend Development
```bash
cd frontend
npm run dev    # Start development server
npm run build  # Build for production
npm run preview # Preview production build
```

### Running Tests
```bash
npm test                    # Run all tests
npm run test:coverage       # Run with coverage report
```

## Environment Variables

### Required
- `OPENAI_API_KEY` - OpenAI API key for GPT-4o-mini (not yet implemented)

### Optional
- `PORT` - Backend server port (default: 3002)
- `NODE_ENV` - Environment (development/production)

## Database

### SQLite Configuration
- Database file: `backend/db/finsight.db` (to be created)
- Schema: Normalized relational schema
- Migrations: `backend/db/migrations/` (to be created)
- Initialization: `backend/db/init.js` (to be created)

### Database Tables (Planned)
- `users` - User information
- `accounts` - Bank accounts
- `transactions` - Transaction history
- `liabilities` - Credit cards, loans
- `consents` - Consent management
- `personas` - Persona assignments
- `recommendations` - Generated recommendations
- `audit_log` - Admin audit trail
- `chat_cache` - AI response cache

## API Endpoints (Planned)

### User & Consent
- `POST /api/users` - Create user
- `POST /api/consent` - Record consent
- `GET /api/profile/:user_id` - Get behavioral profile

### Recommendations
- `GET /api/recommendations/:user_id` - Get recommendations

### AI Chat
- `POST /api/chat` - AI chat interaction

### Admin
- `GET /api/operator/users` - List users (admin)
- `GET /api/operator/user/:id` - View user data (admin)
- `GET /api/operator/audit` - Audit log (admin)

### Health
- `GET /api/health` - Health check (implemented)

## TypeScript Configuration

### Backend
- `backend/tsconfig.json` - TypeScript config for Node.js
- Target: ES2020
- Module: CommonJS
- Strict mode enabled

### Frontend
- `frontend/tsconfig.json` - TypeScript config for React
- `frontend/tsconfig.app.json` - App-specific config
- `frontend/tsconfig.node.json` - Node-specific config
- Target: ES2020
- Module: ESNext
- JSX: React

### Shared Types
- `shared/index.ts` - Shared TypeScript interfaces and types
- Used by both frontend and backend for type safety

## Build & Deployment

### Development
- Hot reload enabled for both frontend and backend
- Concurrent execution via `concurrently` package
- Source maps enabled for debugging

### Production Build
```bash
npm run build  # Build both backend and frontend
```

### Production Deployment (Render.com)
**Platform**: Render.com (Professional subscription)
**Architecture**: 
- Single web service serving both backend API and frontend static files
- Express serves frontend dist folder in production
- Persistent disk for SQLite database

**Build Process**:
1. `npm run install:all` - Install all dependencies (root, backend, frontend)
2. `npm run build` - Build backend TypeScript → JavaScript, build frontend React → static files
3. `npm start` - Start production server (node backend/dist/index.js)

**Environment Variables**:
- `NODE_ENV=production`
- `DATABASE_PATH=/opt/render/project/.data/finsight.db`
- `OPENAI_API_KEY` (secret)
- `ADMIN_PASSWORD` (secret)

**Infrastructure**:
- Web Service: Free tier ($0/month) with Pro subscription benefits
- Persistent Disk: 1GB SSD ($0.25/month)
- Zero cold starts (included with $19/month Professional subscription)
- Fast builds (included with Professional subscription)
- Total additional cost: $0.25/month

**Security**:
- Rate limiting (100 requests per 15 minutes per IP)
- Helmet security headers
- Production CORS (same-origin requests)
- Secure environment variable storage

**Configuration Files**:
- `render.yaml` - Render Blueprint for infrastructure-as-code
- `frontend/.env.production` - Production environment variables
- Static file serving in Express for SPA routing

## Code Quality

### Linting
- ESLint configured for frontend
- TypeScript compiler for type checking
- Consistent code style (to be enforced)

### Testing Strategy
- Unit tests for feature detection modules
- Integration tests for API endpoints
- Component tests for React components
- Target: ≥10 tests, >80% coverage on critical modules

## Dependencies

### Backend Dependencies
- `express` - Web framework
- `sqlite3` - Database
- `cors` - CORS middleware
- `dotenv` - Environment variables

### Backend Dev Dependencies
- `@types/express` - TypeScript types
- `@types/node` - Node.js types
- `@types/cors` - CORS types
- `nodemon` - Dev server
- `ts-node` - TypeScript execution
- `typescript` - TypeScript compiler

### Frontend Dependencies
- `react` - UI library
- `react-dom` - React DOM renderer
- `zustand` - State management
- `axios` - HTTP client
- `tailwindcss` - CSS framework
- `recharts` - Charts
- `lucide-react` - Icons

### Frontend Dev Dependencies
- `@vitejs/plugin-react` - Vite React plugin
- `typescript` - TypeScript compiler
- `eslint` - Linter
- `autoprefixer` - CSS post-processor
- `postcss` - CSS processor

## Technical Constraints

### Performance Requirements
- Recommendation generation: <5 seconds
- Dashboard load time: <3 seconds
- API response times: <5 seconds

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design for mobile/tablet/desktop

### Security Considerations
- No API keys in code (use environment variables)
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- XSS prevention (React's built-in escaping)

## Known Limitations

### Demo/Prototype Only
- No production-ready authentication
- No encryption at rest
- No multi-tenancy
- No real-time updates (batch processing)
- Synthetic data only (no real Plaid integration)

### Future Enhancements
- Real Plaid integration
- Multi-language support
- Mobile app
- Email/SMS notifications
- More sophisticated AI (RAG, fine-tuning)

