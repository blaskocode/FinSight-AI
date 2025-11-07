// Zustand Store
// Global state management for the application

import { create } from 'zustand';
import { submitConsent, fetchProfile, fetchRecommendations } from '../services/api';
import type { ProfileResponse, Recommendation } from '../services/api';

interface UserState {
  userId: string | null;
  hasConsent: boolean;
  persona: ProfileResponse['persona'] | null;
  signals: ProfileResponse['signals'] | null;
  recommendations: Recommendation[];
  loading: boolean;
  error: string | null;
}

interface UserActions {
  setUserId: (userId: string) => void;
  setConsent: (hasConsent: boolean) => void;
  setPersona: (persona: ProfileResponse['persona']) => void;
  setSignals: (signals: ProfileResponse['signals']) => void;
  setRecommendations: (recommendations: Recommendation[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  submitConsent: (userId: string, consented: boolean) => Promise<void>;
  loadProfile: (userId: string) => Promise<void>;
  loadRecommendations: (userId: string) => Promise<void>;
  reset: () => void;
}

const initialState: UserState = {
  userId: null,
  hasConsent: false,
  persona: null,
  signals: null,
  recommendations: [],
  loading: false,
  error: null,
};

export const useStore = create<UserState & UserActions>((set) => ({
  ...initialState,

  setUserId: (userId: string) => set({ userId }),

  setConsent: (hasConsent: boolean) => set({ hasConsent }),

  setPersona: (persona: ProfileResponse['persona']) => set({ persona }),

  setSignals: (signals: ProfileResponse['signals']) => set({ signals }),

  setRecommendations: (recommendations: Recommendation[]) => set({ recommendations }),

  setLoading: (loading: boolean) => set({ loading }),

  setError: (error: string | null) => set({ error }),

  submitConsent: async (userId: string, consented: boolean) => {
    set({ loading: true, error: null });
    try {
      await submitConsent(userId, consented);
      set({ hasConsent: consented, loading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || error.message || 'Failed to submit consent',
        loading: false,
      });
      throw error;
    }
  },

  loadProfile: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const profile = await fetchProfile(userId);
      set({
        persona: profile.persona,
        signals: profile.signals,
        loading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || error.message || 'Failed to load profile',
        loading: false,
      });
      throw error;
    }
  },

  loadRecommendations: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetchRecommendations(userId);
      
      // Deduplicate recommendations by title to prevent duplicates
      const seen = new Set<string>();
      const unique = response.recommendations.filter(rec => {
        const key = `${rec.type}:${rec.title}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
      
      set({
        recommendations: unique,
        loading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || error.message || 'Failed to load recommendations',
        loading: false,
      });
      throw error;
    }
  },

  reset: () => set(initialState),
}));

