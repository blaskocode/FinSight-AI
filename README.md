# FinSight AI

Transform transaction data into actionable financial insights through explainable AI, delivering personalized education while maintaining strict consent and eligibility guardrails.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git

### One-Command Setup

```bash
# Install all dependencies (root, backend, frontend)
npm run install:all

# Start development servers (backend + frontend concurrently)
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3002

## 📁 Project Structure

```
finsight-ai/
├── backend/          # Express API with TypeScript
├── frontend/         # React + Vite + TypeScript
├── shared/           # Shared TypeScript types
├── data-gen/         # Synthetic data generation scripts
└── docs/             # Documentation and decision logs
```

## 🛠️ Development

### Backend

```bash
cd backend
npm run dev          # Start with hot reload
npm run build        # Build for production
npm start            # Run production build
```

### Frontend

```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

## 📋 MVP Status - Complete ✅

**MVP - All 9 PRs Complete**: Full working MVP with all core features

### ✅ What Works in MVP

1. **Database & Data**
   - ✅ SQLite database with normalized schema (9 tables)
   - ✅ Synthetic data generator (5 users, 11 accounts, 260 transactions)
   - ✅ Database migrations and initialization

2. **Feature Detection**
   - ✅ Credit monitoring (utilization, minimum payments, interest charges, overdue status)
   - ✅ 19 unit tests passing
   - ✅ Utilization thresholds: 30%, 50%, 80%, 90%

3. **Persona System**
   - ✅ High Utilization persona assignment
   - ✅ Criteria-based assignment (utilization ≥50% OR interest > 0 OR min payment only OR overdue)
   - ✅ Confidence scoring

4. **Recommendations**
   - ✅ Personalized recommendation engine
   - ✅ 3 education items + 1 partner offer for High Utilization persona
   - ✅ Template-based rationales with specific data points

5. **Consent Management**
   - ✅ Consent recording and revocation
   - ✅ Middleware protecting profile and recommendations endpoints
   - ✅ Returns 403 without consent

6. **Frontend Dashboard**
   - ✅ Consent screen with user ID input
   - ✅ Dashboard with persona display and confidence score
   - ✅ Financial signals visualization
   - ✅ Recommendations list with personalized rationales
   - ✅ Loading states and error handling
   - ✅ "Not financial advice" disclaimer

### 🧪 How to Test

1. **Start the application:**
   ```bash
   npm run install:all
   npm run dev
   ```

2. **Access the frontend:**
   - Open http://localhost:3000
   - Use test user ID: `user-1762493514942-gm8c7gimv`

3. **Test the flow:**
   - Enter user ID and click "I Consent"
   - View persona assignment (High Utilization)
   - See financial signals (65% utilization, interest charges, etc.)
   - Review 4 personalized recommendations

4. **Test API endpoints:**
   ```bash
   # Health check
   curl http://localhost:3002/api/health
   
   # Submit consent
   curl -X POST http://localhost:3002/api/consent \
     -H "Content-Type: application/json" \
     -d '{"user_id":"user-1762493514942-gm8c7gimv","consented":true}'
   
   # Get profile (requires consent)
   curl http://localhost:3002/api/profile/user-1762493514942-gm8c7gimv
   
   # Get recommendations (requires consent)
   curl http://localhost:3002/api/recommendations/user-1762493514942-gm8c7gimv
   ```

5. **Run backend tests:**
   ```bash
   cd backend
   npm test
   ```

### ⚠️ Known Limitations

- **Single Persona**: Only High Utilization persona is implemented (4 other personas planned)
- **Static Content**: Recommendations use static content catalog (AI-generated content planned)
- **No AI Chat**: Conversational AI interface not yet implemented
- **Limited Data**: Only 5 test users with 3 months of data
- **No Authentication**: User ID is manually entered (authentication planned)
- **No Real Bank Integration**: Uses synthetic data only (Plaid integration planned)

### 🎯 Next Steps (Phase 1)

- **PR-10**: Complete Feature Detection (all behavioral signals)
- **PR-11-14**: Implement remaining 4 personas
- **PR-15**: AI Chat Integration (GPT-4o-mini)
- **PR-16**: Enhanced Recommendations (AI-generated content)

## 📚 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- **Backend**: Node.js + Express + TypeScript + SQLite
- **AI**: OpenAI GPT-4o-mini (to be integrated)
- **Charts**: Recharts
- **Icons**: Lucide React

## 📝 License

ISC

