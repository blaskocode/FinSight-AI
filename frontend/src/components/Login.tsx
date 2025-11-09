// Login Component
// Username/password login screen

import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Loader2, LogIn } from 'lucide-react';
import { getPersonaConfig } from '../utils/personaConfig';
import { fetchSampleUsers, type SampleUser } from '../services/api';

// Helper to get hover border class for persona (ensures Tailwind detects it)
function getHoverBorderClass(personaType: string): string {
  const hoverClasses: Record<string, string> = {
    'high_utilization': 'hover:border-red-500',
    'variable_income': 'hover:border-orange-500',
    'subscription_heavy': 'hover:border-purple-500',
    'savings_builder': 'hover:border-green-500',
    'lifestyle_creep': 'hover:border-blue-500',
  };
  return hoverClasses[personaType] || 'hover:border-gray-400';
}

// Fallback sample users if API fails
const FALLBACK_SAMPLE_USERS: SampleUser[] = [
  {
    username: 'diana.huang',
    name: 'Diana Huang',
    persona: 'savings_builder',
    description: 'Building healthy savings habits'
  },
  {
    username: 'marcus.chen',
    name: 'Marcus Chen',
    persona: 'high_utilization',
    description: 'High credit utilization focus'
  },
  {
    username: 'jordan.kim',
    name: 'Jordan Kim',
    persona: 'variable_income',
    description: 'Variable income budgeting'
  },
  {
    username: 'taylor.park',
    name: 'Taylor Park',
    persona: 'subscription_heavy',
    description: 'Multiple subscriptions'
  },
  {
    username: 'sophia.anderson',
    name: 'Sophia Anderson',
    persona: 'lifestyle_creep',
    description: 'High income, low savings rate'
  },
];

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sampleUsers, setSampleUsers] = useState<SampleUser[]>(FALLBACK_SAMPLE_USERS);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const { login, loading } = useStore();

  // Fetch real sample users from database
  useEffect(() => {
    const loadSampleUsers = async () => {
      try {
        const response = await fetchSampleUsers();
        if (response.users && response.users.length > 0) {
          setSampleUsers(response.users);
        }
      } catch (err) {
        console.warn('Failed to load sample users, using fallback:', err);
        // Keep fallback users
      } finally {
        setLoadingUsers(false);
      }
    };
    loadSampleUsers();
  }, []);

  const handleSampleUserClick = (sampleUsername: string) => {
    setUsername(sampleUsername);
    setPassword('test'); // Auto-fill password
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    try {
      await login(username.trim(), password);
      // Login success - App.tsx will handle navigation
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">FinSight AI</h1>
          <p className="text-gray-600">Sign in to access your financial dashboard</p>
        </div>

        {/* Sample Users */}
        <div className="mb-6 p-4 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p className="text-sm font-semibold text-gray-900">Try a sample user:</p>
            {loadingUsers && (
              <Loader2 className="w-3 h-3 text-gray-400 animate-spin ml-2" />
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sampleUsers.slice(0, 5).map((sampleUser, index) => {
              const personaConfig = getPersonaConfig(sampleUser.persona);
              // Get persona colors - these are Tailwind classes from the config
              const bgClass = personaConfig.color.bg;
              const borderClass = personaConfig.color.border;
              const textClass = personaConfig.color.text;
              const hoverBorderClass = getHoverBorderClass(sampleUser.persona);
              const isFifthItem = index === 4;
              
              return (
                <button
                  key={sampleUser.username}
                  type="button"
                  onClick={() => handleSampleUserClick(sampleUser.username)}
                  disabled={loading}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all text-center group disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md h-[85px] w-full ${bgClass} ${borderClass} ${hoverBorderClass} ${isFifthItem ? 'sm:col-span-2 sm:mx-auto sm:w-[calc(50%-0.25rem)]' : ''}`}
                >
                  <div className={`font-semibold text-sm ${textClass} transition-colors leading-tight`}>
                    {sampleUser.name}
                  </div>
                  <div className={`text-xs ${textClass} opacity-80 mt-0.5 leading-tight`}>
                    {personaConfig.displayName}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">
            Click any user above to auto-fill credentials
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="firstname.lastname"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              disabled={loading}
              autoComplete="username"
            />
            <p className="mt-1 text-xs text-gray-500">Format: firstname.lastname (e.g., john.doe)</p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Demo: All users have password <span className="font-mono font-semibold">test</span>
          </p>
        </div>
      </div>
    </div>
  );
}

