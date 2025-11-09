// Shared TypeScript types for FinSight AI
// This file will contain common types used across backend and frontend

export type User = {
  user_id: string;
  email: string;
  name: string;
  created_at: string;
};

export type Persona = {
  persona_id: string;
  user_id: string;
  persona_type: string;
  assigned_at: string;
  window_days: number;
  signals: Record<string, unknown>;
};

// More types will be added as the project progresses


