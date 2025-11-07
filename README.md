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

## 📋 Current Status

**MVP - PR-1 Complete**: Project foundation and setup
- ✅ Monorepo structure created
- ✅ Backend: Express + TypeScript with health check endpoint
- ✅ Frontend: React + Vite + TypeScript + Tailwind CSS
- ✅ Concurrent development scripts
- ✅ Basic "Hello World" endpoints

## 🎯 Next Steps

- **PR-2**: Database Schema & SQLite Setup
- **PR-3**: Minimal Synthetic Data Generator
- **PR-4**: Feature Detection - Credit Monitoring

## 📚 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- **Backend**: Node.js + Express + TypeScript + SQLite
- **AI**: OpenAI GPT-4o-mini (to be integrated)
- **Charts**: Recharts
- **Icons**: Lucide React

## 📝 License

ISC

