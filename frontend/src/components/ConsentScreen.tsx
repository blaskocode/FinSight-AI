// Consent Screen Component
// Displays consent form for user to opt-in

import { useState } from 'react';
import { useStore } from '../store/useStore';
import { ErrorMessage } from './ErrorMessage';
import { ConfirmDialog } from './ConfirmDialog';
// getErrorMessage imported but not used - keeping for potential future use

export function ConsentScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const { userId, submitConsent, reset } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setError('User ID not found. Please log in again.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitConsent(userId, true);
    } catch (error: any) {
      // Error is handled by store, but show user-friendly message
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit consent. Please try again.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeAccess = async () => {
    if (!userId) return;
    
    setIsRevoking(true);
    try {
      // Revoke consent (or confirm it's already revoked)
      await submitConsent(userId, false);
      
      // Clear onboarding completion flag so user goes through onboarding again
      localStorage.removeItem(`onboarding_complete_${userId}`);
      
      // Sign out
      reset();
    } catch (error: any) {
      // Check if error is because consent is already revoked
      const errorMessage = error?.response?.data?.message || error?.message || '';
      const isAlreadyRevoked = error?.response?.status === 404 && 
        (errorMessage.toLowerCase().includes('no active consent') || 
         errorMessage.toLowerCase().includes('already revoked'));
      
      if (isAlreadyRevoked) {
        // Consent is already revoked - that's fine, proceed with sign out
        console.log('Consent already revoked, proceeding with sign out');
        localStorage.removeItem(`onboarding_complete_${userId}`);
        setShowRevokeConfirm(false);
        reset();
      } else {
        // Other error - show message but still sign out
        console.error('Error revoking access:', error);
        setIsRevoking(false);
        setShowRevokeConfirm(false);
        alert('Failed to revoke access, but you have been signed out. Please contact support if this persists.');
        reset();
      }
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

          {!userId && (
            <ErrorMessage
              title="Error"
              message="User ID not found. Please log in again."
              variant="error"
            />
          )}

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={isSubmitting || isRevoking}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Processing...' : 'I Consent - Continue to Dashboard'}
            </button>
            
            <button
              type="button"
              onClick={() => setShowRevokeConfirm(true)}
              disabled={isSubmitting || isRevoking}
              className="w-full bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Revoke Access & Sign Out
            </button>
          </div>
        </form>

        <p className="text-xs text-gray-500 text-center mt-4">
          By clicking above, you agree to allow FinSight AI to analyze your financial data for personalized insights.
        </p>
      </div>
      
      {/* Revoke Access Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRevokeConfirm}
        title="Revoke Access"
        message="Are you sure you want to revoke access? This will sign you out and you'll need to go through onboarding again the next time you sign in."
        confirmText="Revoke Access"
        cancelText="Cancel"
        onConfirm={handleRevokeAccess}
        onCancel={() => {
          setShowRevokeConfirm(false);
        }}
        isLoading={isRevoking}
      />
    </div>
  );
}

