# Project Brief: FinSight AI

## Mission Statement
Transform transaction data into actionable financial insights through explainable AI, delivering personalized education while maintaining strict consent and eligibility guardrails.

## Core Value Proposition
Netflix-style personalization for your finances with AI-powered insights and conversational support.

## Primary User
Individual banking customers seeking personalized financial guidance without crossing into regulated advice territory.

## Key Differentiators
- **Explainable by Default**: Every recommendation includes a "because" rationale with specific data points
- **Consent-First**: No analysis without explicit opt-in; users control their data
- **Education Over Sales**: Empowering tone, no shaming, focus on learning not product pushing
- **AI-Enhanced**: GPT-4o-mini provides personalized explanations and conversational Q&A

## Project Goals
1. Build a functional prototype demonstrating persona-based financial recommendations
2. Showcase AI chat interface for financial education
3. Demonstrate strict compliance with consent and eligibility guardrails
4. Create visually stunning, persona-driven user experience

## Success Criteria
- 100% coverage: All users have assigned persona + ≥3 detected behaviors
- 100% explainability: All recommendations have plain-language rationales
- <5 seconds latency: Time to generate recommendations per user
- 100% auditability: All recommendations have decision traces
- ≥10 passing unit/integration tests
- Complete documentation

## Project Structure
```
finsight-ai/
├── backend/          # Express API with TypeScript
├── frontend/         # React + Vite + TypeScript
├── shared/           # Shared TypeScript types
├── data-gen/         # Synthetic data generation scripts
├── docs/             # Documentation and decision logs
└── memory-bank/      # Project memory and context
```

## Development Approach
- **Thin slice approach**: Working end-to-end at each phase
- **MVP first**: Demonstrate core concept before adding complexity
- **Incremental delivery**: Organized into MVP + 4 phases
- **One-command setup**: Easy local development experience

## Timeline
- **MVP**: 25-30 hours (9 PRs)
- **Phase 1**: Complete Feature Detection & All Personas (20-25 hours)
- **Phase 2**: Recommendations & Content System (20-25 hours)
- **Phase 3**: AI Chat Interface & Admin View (18-22 hours)
- **Phase 4**: Visual Polish & Persona Evolution (18-22 hours)
- **Phase 5**: Testing, Documentation & Polish (22-26 hours)

**Total Estimated**: ~120-150 hours (3-4 weeks full-time)

## Critical Constraints
- Must maintain "not financial advice" disclaimer on all recommendations
- Consent must be explicit and revocable
- Eligibility filtering required for all partner offers
- No shaming language - empowering, educational tone only
- Admin access must be read-only with audit trail

