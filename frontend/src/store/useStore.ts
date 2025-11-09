// Zustand Store
// Global state management for the application

import { create } from 'zustand';
import { login as apiLogin, submitConsent, fetchProfile, fetchRecommendations, fetchChatMessage, getErrorMessage } from '../services/api';
import type { ProfileResponse, Recommendation, ChatMessage } from '../services/api';
import { toast } from '../components/Toast';

interface UserState {
  userId: string | null;
  userName: string | null;
  hasConsent: boolean;
  persona: ProfileResponse['persona'] | null;
  signals: ProfileResponse['signals'] | null;
  recommendations: Recommendation[];
  loading: boolean;
  error: string | null;
  // Chat state
  chatOpen: boolean;
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  conversationId: string | null;
  // Admin state
  isAdmin: boolean;
  currentView: 'user' | 'admin';
}

interface UserActions {
  setUserId: (userId: string) => void;
  setUserName: (userName: string | null) => void;
  setConsent: (hasConsent: boolean) => void;
  setPersona: (persona: ProfileResponse['persona']) => void;
  setSignals: (signals: ProfileResponse['signals']) => void;
  setRecommendations: (recommendations: Recommendation[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (username: string, password: string) => Promise<void>;
  submitConsent: (userId: string, consented: boolean) => Promise<void>;
  loadProfile: (userId: string) => Promise<void>;
  loadRecommendations: (userId: string) => Promise<void>;
  // Chat actions
  toggleChat: () => void;
  sendMessage: (userId: string, message: string) => Promise<void>;
  clearHistory: () => void;
  // Admin actions
  setAdmin: (isAdmin: boolean) => void;
  setView: (view: 'user' | 'admin') => void;
  reset: () => void;
}

const initialState: UserState = {
  userId: null,
  userName: null,
  hasConsent: false,
  persona: null,
  signals: null,
  recommendations: [],
  loading: false,
  error: null,
  chatOpen: false,
  chatMessages: [],
  chatLoading: false,
  conversationId: null,
  isAdmin: false,
  currentView: 'user',
};

export const useStore = create<UserState & UserActions>((set) => ({
  ...initialState,

  setUserId: (userId: string) => set({ userId }),

  setUserName: (userName: string | null) => set({ userName }),

  setConsent: (hasConsent: boolean) => set({ hasConsent }),

  setPersona: (persona: ProfileResponse['persona']) => set({ persona }),

  setSignals: (signals: ProfileResponse['signals']) => set({ signals }),

  setRecommendations: (recommendations: Recommendation[]) => set({ recommendations }),

  setLoading: (loading: boolean) => set({ loading }),

  setError: (error: string | null) => set({ error }),

  login: async (username: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const response = await apiLogin(username, password);
      if (response.success) {
        // Store userId and userName in localStorage for persistence
        localStorage.setItem('userId', response.user_id);
        localStorage.setItem('userName', response.name);
        set({
          userId: response.user_id,
          userName: response.name,
          loading: false,
        });
        toast.success('Login successful');
      } else {
        const errorMessage = response.error || 'Login failed';
        set({
          error: errorMessage,
          loading: false,
        });
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      set({
        error: errorMessage,
        loading: false,
      });
      toast.error(errorMessage);
      throw error;
    }
  },

  submitConsent: async (userId: string, consented: boolean) => {
    set({ loading: true, error: null });
    try {
      await submitConsent(userId, consented);
      set({ hasConsent: consented, loading: false });
      toast.success('Consent recorded successfully');
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      set({
        error: errorMessage,
        loading: false,
      });
      toast.error(errorMessage);
      throw error;
    }
  },

  loadProfile: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const profile = await fetchProfile(userId);
      // Update userName in localStorage if it changed
      if (profile.name) {
        localStorage.setItem('userName', profile.name);
      }
      set({
        persona: profile.persona,
        signals: profile.signals,
        userName: profile.name,
        loading: false,
      });
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      set({
        error: errorMessage,
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
      // No toast notification - loading indicators show state, content appears when ready
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      set({
        error: errorMessage,
        loading: false,
      });
      throw error;
    }
  },

  toggleChat: () => set((state) => ({ chatOpen: !state.chatOpen })),

  sendMessage: async (userId: string, message: string) => {
    const state = useStore.getState();
    
    // Add user message immediately
    const userMessage: ChatMessage = { role: 'user', content: message };
    const updatedMessages = [...state.chatMessages, userMessage];
    set({
      chatMessages: updatedMessages,
      chatLoading: true,
    });

    try {
      const response = await fetchChatMessage(userId, message, state.conversationId || undefined);
      
      // Check if response contains an error message
      const isErrorResponse = response.response?.toLowerCase().includes('error') || 
                             response.response?.toLowerCase().includes('apologize') ||
                             response.response?.toLowerCase().includes('not available');
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
        cached: response.cached,
        tokensUsed: response.tokensUsed,
      };

      set({
        chatMessages: [...updatedMessages, assistantMessage],
        chatLoading: false,
        conversationId: response.conversationId,
      });
      
      if (isErrorResponse) {
        console.warn('Chat response indicates an error:', response.response);
        toast.error('Unable to process your message. Please try again.');
      }
      // No success toast - chat messages send silently
    } catch (error: any) {
      // Log error details for debugging
      console.error('Error sending chat message:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      const errorMessageText = getErrorMessage(error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: errorMessageText,
      };
      
      set({
        chatMessages: [...updatedMessages, errorMessage],
        chatLoading: false,
      });
      toast.error(errorMessageText);
    }
  },

  clearHistory: () => set({ chatMessages: [], conversationId: null }),

  setAdmin: (isAdmin: boolean) => set({ isAdmin }),
  setView: (view: 'user' | 'admin') => set({ currentView: view }),

  reset: () => {
    // Clear localStorage on logout
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    // Reset all state - user will see login screen
    set({
      ...initialState,
      // Also reset admin state and view to ensure clean logout
      isAdmin: false,
      currentView: 'user',
    });
  },
}));

