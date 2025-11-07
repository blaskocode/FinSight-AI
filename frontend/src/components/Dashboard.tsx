// Dashboard Component
// Main dashboard layout showing persona and recommendations

import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { PersonaCard } from './PersonaCard';
import { RecommendationCard } from './RecommendationCard';
import { AlertCircle, Loader2 } from 'lucide-react';

export function Dashboard() {
  const {
    userId,
    hasConsent,
    persona,
    signals,
    recommendations,
    loading,
    error,
    loadProfile,
    loadRecommendations,
  } = useStore();

  useEffect(() => {
    if (userId && hasConsent) {
      loadProfile(userId);
      loadRecommendations(userId);
    }
  }, [userId, hasConsent, loadProfile, loadRecommendations]);

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please provide consent first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">FinSight AI Dashboard</h1>
            <div className="text-sm text-gray-500">User: {userId}</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Disclaimer */}
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ Not Financial Advice:</strong> The information and recommendations provided by FinSight AI are for educational and informational purposes only. They do not constitute financial, investment, or legal advice. Always consult with a qualified financial advisor before making financial decisions.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-semibold mb-1">Error Loading Data</p>
              <p className="text-red-700 text-sm">{error}</p>
              <button
                onClick={() => {
                  if (userId) {
                    loadProfile(userId);
                    loadRecommendations(userId);
                  }
                }}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {loading && !persona && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="ml-3 text-gray-600">Loading your financial profile...</span>
          </div>
        )}

        {persona && (
          <div className="mb-8">
            <PersonaCard persona={persona} />
          </div>
        )}

        {/* Signals Section */}
        {signals && (
          <div className="mb-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Financial Signals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {signals.utilization && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Credit Utilization</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {signals.utilization.utilization.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    ${signals.utilization.balance.toLocaleString()} of ${signals.utilization.limit.toLocaleString()} limit
                  </div>
                </div>
              )}
              {signals.interest_charges && (
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Monthly Interest</div>
                  <div className="text-2xl font-bold text-red-600">
                    ${signals.interest_charges.monthlyAverage.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Total: ${signals.interest_charges.totalCharges.toFixed(2)}
                  </div>
                </div>
              )}
              {signals.minimum_payment_only && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Payment Pattern</div>
                  <div className="text-lg font-semibold text-yellow-800">
                    Minimum Payments Only
                  </div>
                </div>
              )}
              {signals.is_overdue && (
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Status</div>
                  <div className="text-lg font-semibold text-red-800">Overdue</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recommendations Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Personalized Recommendations ({recommendations.length})
          </h2>

          {loading && recommendations.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="ml-3 text-gray-600">Loading recommendations...</span>
            </div>
          )}

          {recommendations.length === 0 && !loading && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600">No recommendations available at this time.</p>
            </div>
          )}

          <div className="space-y-4">
            {recommendations.map((rec) => (
              <RecommendationCard key={rec.id} recommendation={rec} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

