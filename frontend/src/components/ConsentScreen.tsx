// Consent Screen Component
// Displays consent form for user to opt-in

import { useState } from 'react';
import { useStore } from '../store/useStore';
import { ErrorMessage } from './ErrorMessage';
import { getErrorMessage } from '../services/api';

export function ConsentScreen() {
  const [userId, setUserId] = useState('user-1762493514942-gm8c7gimv'); // Default test user
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { submitConsent, setUserId: setStoreUserId } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await submitConsent(userId, true);
      setStoreUserId(userId);
    } catch (error: any) {
      // Error is handled by store, but show user-friendly message
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit consent. Please try again.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to FinSight AI</h1>
          <p className="text-gray-600">Transform your financial data into actionable insights</p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Consent</h2>
          <p className="text-gray-700 mb-4">
            To provide you with personalized financial insights, we need your consent to analyze your transaction data.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">What we'll do with your data:</h3>
            <ul className="list-disc list-inside text-blue-800 space-y-1">
              <li>Analyze your spending patterns and credit utilization</li>
              <li>Identify financial behaviors and assign a financial persona</li>
              <li>Generate personalized recommendations based on your situation</li>
              <li>Provide explainable insights you can understand</li>
            </ul>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Your rights:</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>You can revoke consent at any time</li>
              <li>Your data is stored securely and never shared with third parties</li>
              <li>All analysis is done locally on your device</li>
            </ul>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <ErrorMessage
              title="Error"
              message={error}
              variant="error"
            />
          )}

          <div>
            <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-2">
              User ID
            </label>
            <input
              type="text"
              id="userId"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setError(null);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your user ID"
              required
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500">
              Use: <code className="bg-gray-100 px-1 rounded">user-1762493514942-gm8c7gimv</code> for testing
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Processing...' : 'I Consent - Continue to Dashboard'}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-4">
          By clicking above, you agree to allow FinSight AI to analyze your financial data for personalized insights.
        </p>
      </div>
    </div>
  );
}

