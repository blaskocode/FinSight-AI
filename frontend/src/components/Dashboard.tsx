// Dashboard Component
// Main dashboard layout showing persona and recommendations

import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
// PersonaCard not used - using HeroPersonaCard instead
import { HeroPersonaCard } from './HeroPersonaCard';
import { FinancialHealthScore } from './FinancialHealthScore';
import { QuickStatsWidget } from './QuickStatsWidget';
import { PersonaTimeline } from './PersonaTimeline';
import { SpendingBreakdown } from './SpendingBreakdown';
import { RecommendationCard } from './RecommendationCard';
import { ChatBubble } from './ChatBubble';
import { TransactionHistory } from './TransactionHistory';
import { SkeletonLoader } from './SkeletonLoader';
import { ErrorMessage } from './ErrorMessage';
import { ConfirmDialog } from './ConfirmDialog';
import { OverarchingMessage } from './OverarchingMessage';
import { LogOut } from 'lucide-react';

export function Dashboard() {
  const {
    userId,
    userName,
    hasConsent,
    persona,
    signals,
    recommendations,
    loading,
    error,
    loadProfile,
    loadRecommendations,
    chatOpen,
    toggleChat,
    reset,
    submitConsent,
  } = useStore();
  
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    if (userId && hasConsent) {
      // Load profile first, then recommendations (recommendations require persona)
      loadProfile(userId).then(() => {
        // Only load recommendations after profile (and persona) is loaded
        if (persona) {
          loadRecommendations(userId);
        }
      }).catch(() => {
        // If profile fails, still try to load recommendations (they'll handle the error)
        loadRecommendations(userId);
      });
    }
  }, [userId, hasConsent, loadProfile, loadRecommendations]);

  // Also load recommendations when persona becomes available
  useEffect(() => {
    if (userId && hasConsent && persona && recommendations.length === 0) {
      loadRecommendations(userId);
    }
  }, [userId, hasConsent, persona]);

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
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">FinSight AI</h1>
                <p className="text-xs sm:text-sm text-slate-300">Your Financial Education Hub</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <span className="text-sm font-medium text-white">{userName || userId}</span>
                <p className="text-xs text-slate-400">Signed in</p>
              </div>
              <button
                onClick={() => {
                  setShowRevokeConfirm(true);
                }}
                className="flex items-center gap-2 text-sm text-red-300 hover:text-red-200 px-4 py-2 rounded-lg hover:bg-red-900/30 transition-all border border-red-700/50"
                title="Revoke Access"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <span className="hidden sm:inline">Revoke Access</span>
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(true);
                }}
                className="flex items-center gap-2 text-sm text-slate-200 hover:text-white px-4 py-2 rounded-lg hover:bg-slate-700/50 transition-all border border-slate-600"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gradient-to-b from-gray-50 to-white">
        {/* Disclaimer */}
        <div className="mb-6 bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-400 rounded-lg p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900 mb-1">Educational Information Only</p>
              <p className="text-xs text-amber-800 leading-relaxed">
                The information and recommendations provided by FinSight AI are for educational and informational purposes only. They do not constitute financial, investment, or legal advice. Always consult with a qualified financial advisor before making financial decisions.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <ErrorMessage
            title="Error Loading Data"
            message={error}
            onRetry={() => {
              if (userId) {
                loadProfile(userId).catch(() => {});
                loadRecommendations(userId).catch(() => {});
              }
            }}
            variant="error"
            className="mb-6"
          />
        )}

        {loading && !persona && (
          <div className="space-y-6 mb-8">
            <SkeletonLoader type="card" />
            <SkeletonLoader type="card" />
          </div>
        )}

        {/* Hero Section with Persona and Health Score */}
        {persona && (
          <div className="mb-8 space-y-6">
            <HeroPersonaCard persona={persona} />
            {signals && (
              <FinancialHealthScore signals={signals} />
            )}
          </div>
        )}

        {/* Overarching AI Message with Actionable Recommendations */}
        {userId && <OverarchingMessage userId={userId} />}

        {/* Quick Stats Widget */}
        {persona && signals && (
          <QuickStatsWidget persona={persona} signals={signals} />
        )}

        {/* Persona Evolution Timeline */}
        {userId && (
          <PersonaTimeline userId={userId} />
        )}

        {/* Spending Insights */}
        {userId && (
          <SpendingBreakdown userId={userId} />
        )}

        {/* Signals Section */}
        {signals && (
          <div className="mb-8 bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Financial Signals</h2>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Insights from your data</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Credit Signals */}
              {signals.utilization && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-sm text-gray-600 mb-1">Credit Utilization</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {typeof signals.utilization === 'number' 
                      ? signals.utilization.toFixed(1)
                      : signals.utilization.utilization?.toFixed(1) || '0.0'}%
                  </div>
                  {typeof signals.utilization === 'object' && signals.utilization.balance && signals.utilization.limit && (
                    <div className="text-xs text-gray-500 mt-1">
                      ${signals.utilization.balance.toLocaleString()} of ${signals.utilization.limit.toLocaleString()} limit
                    </div>
                  )}
                </div>
              )}
              {signals.interest_charges && (
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="text-sm text-gray-600 mb-1">Monthly Interest</div>
                  <div className="text-2xl font-bold text-red-600">
                    ${(signals.interest_charges.monthlyAverage || signals.interest_charges.totalCharges / 3).toFixed(2)}
                  </div>
                  {signals.interest_charges.totalCharges && (
                    <div className="text-xs text-gray-500 mt-1">
                      Total: ${signals.interest_charges.totalCharges.toFixed(2)}
                    </div>
                  )}
                </div>
              )}
              {signals.minimum_payment_only && (
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <div className="text-sm text-gray-600 mb-1">Payment Pattern</div>
                  <div className="text-lg font-semibold text-yellow-800">
                    Minimum Payments Only
                  </div>
                </div>
              )}
              {signals.is_overdue && (
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="text-sm text-gray-600 mb-1">Status</div>
                  <div className="text-lg font-semibold text-red-800">Overdue</div>
                </div>
              )}

              {/* Income Stability Signals */}
              {signals.medianPayGap !== undefined && (
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="text-sm text-gray-600 mb-1">Median Pay Gap</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {signals.medianPayGap.toFixed(0)} days
                  </div>
                  {signals.paymentFrequency && (
                    <div className="text-xs text-gray-500 mt-1">
                      Frequency: {signals.paymentFrequency}
                    </div>
                  )}
                </div>
              )}
              {signals.cashFlowBuffer !== undefined && (
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="text-sm text-gray-600 mb-1">Cash Flow Buffer</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {signals.cashFlowBuffer.toFixed(1)} months
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {signals.cashFlowBuffer < 1 ? '⚠️ Low buffer' : '✓ Healthy buffer'}
                  </div>
                </div>
              )}

              {/* Subscription Signals */}
              {signals.monthlyRecurringSpend !== undefined && (
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="text-sm text-gray-600 mb-1">Monthly Recurring Spend</div>
                  <div className="text-2xl font-bold text-purple-600">
                    ${signals.monthlyRecurringSpend.toFixed(2)}
                  </div>
                  {signals.recurringMerchants !== undefined && (
                    <div className="text-xs text-gray-500 mt-1">
                      {signals.recurringMerchants} recurring services
                    </div>
                  )}
                </div>
              )}
              {signals.subscriptionShare !== undefined && (
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="text-sm text-gray-600 mb-1">Subscription Share</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {signals.subscriptionShare.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    of total spending
                  </div>
                </div>
              )}

              {/* Savings Signals */}
              {signals.emergencyFundCoverage !== undefined && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-sm text-gray-600 mb-1">Emergency Fund Coverage</div>
                  <div className="text-2xl font-bold text-green-600">
                    {signals.emergencyFundCoverage.toFixed(1)} months
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {signals.emergencyFundCoverage >= 6 ? '✓ Recommended' : '⚠️ Below recommended'}
                  </div>
                </div>
              )}
              {signals.savingsGrowthRate !== undefined && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-sm text-gray-600 mb-1">Savings Growth Rate</div>
                  <div className="text-2xl font-bold text-green-600">
                    {signals.savingsGrowthRate.toFixed(2)}%
                  </div>
                  {signals.monthlyInflow !== undefined && (
                    <div className="text-xs text-gray-500 mt-1">
                      ${signals.monthlyInflow.toFixed(2)}/month inflow
                    </div>
                  )}
                </div>
              )}
              {signals.savingsRate !== undefined && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-sm text-gray-600 mb-1">Savings Rate</div>
                  <div className="text-2xl font-bold text-green-600">
                    {signals.savingsRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    of income
                  </div>
                </div>
              )}

              {/* Lifestyle Creep Signals */}
              {signals.discretionaryShare !== undefined && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-sm text-gray-600 mb-1">Discretionary Spending</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {signals.discretionaryShare.toFixed(1)}%
                  </div>
                  {signals.monthlyDiscretionary !== undefined && (
                    <div className="text-xs text-gray-500 mt-1">
                      ${signals.monthlyDiscretionary.toFixed(2)}/month
                    </div>
                  )}
                </div>
              )}
              {signals.monthlyIncome !== undefined && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-sm text-gray-600 mb-1">Monthly Income</div>
                  <div className="text-2xl font-bold text-blue-600">
                    ${signals.monthlyIncome.toFixed(2)}
                  </div>
                  {signals.savingsRate !== undefined && (
                    <div className="text-xs text-gray-500 mt-1">
                      Savings rate: {signals.savingsRate.toFixed(1)}%
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recommendations Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Personalized Recommendations</h2>
                <p className="text-sm text-gray-600 mt-1">Learn and take action to improve your financial health</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-200">
              <span className="text-2xl font-bold text-indigo-600">{recommendations.length}</span>
              <span className="text-sm text-indigo-800">items</span>
            </div>
          </div>

          {loading && recommendations.length === 0 && (
            <div className="space-y-4">
              <SkeletonLoader type="card" />
              <SkeletonLoader type="card" />
              <SkeletonLoader type="card" />
            </div>
          )}

          {recommendations.length === 0 && !loading && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600">No recommendations available at this time.</p>
            </div>
          )}

          <div className="space-y-4">
            {recommendations.map((rec, index) => {
              // Determine priority based on position (top recommendations are higher priority)
              const priority: 'critical' | 'high' | 'medium' | 'low' = 
                index === 0 ? 'critical' : 
                index === 1 ? 'high' : 
                index === 2 ? 'medium' : 'low';
              
              // Determine difficulty (simplified - would come from backend in real app)
              const difficulty: 'quick_win' | 'moderate' | 'long_term' = 
                rec.type === 'partner_offer' ? 'quick_win' : 
                rec.title?.toLowerCase().includes('payment plan') ? 'moderate' : 'long_term';
              
              return (
                <div
                  key={rec.id}
                  className="animate-fade-in"
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animationFillMode: 'both'
                  }}
                >
                  <RecommendationCard 
                    recommendation={rec} 
                    priority={priority}
                    difficulty={difficulty}
                    userId={userId || null}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Transaction History Section */}
        {userId && (
          <div className="mb-8">
            <TransactionHistory userId={userId} />
          </div>
        )}
      </main>
      
      {/* Chat Bubble */}
      <ChatBubble userId={userId} isOpen={chatOpen} onToggle={toggleChat} />
      
      {/* Revoke Access Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRevokeConfirm}
        title="Revoke Access"
        message="Are you sure you want to revoke access? This will sign you out and you'll need to go through onboarding again the next time you sign in."
        confirmText="Revoke Access"
        cancelText="Cancel"
        onConfirm={async () => {
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
        }}
        onCancel={() => {
          setShowRevokeConfirm(false);
        }}
        isLoading={isRevoking}
      />
      
      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out? You'll need to log in again to access your dashboard. Note: The app will retain access to your financial data unless you revoke access."
        confirmText="Sign Out"
        cancelText="Cancel"
        thirdActionText="Revoke Access"
        thirdActionVariant="danger"
        onThirdAction={async () => {
          if (!userId) return;
          
          setIsRevoking(true);
          try {
            // Revoke consent (or confirm it's already revoked)
            await submitConsent(userId, false);
            
            // Clear onboarding completion flag so user goes through onboarding again
            localStorage.removeItem(`onboarding_complete_${userId}`);
            
            // Close both dialogs
            setShowLogoutConfirm(false);
            
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
              setShowLogoutConfirm(false);
              reset();
            } else {
              // Other error - show message but still sign out
              console.error('Error revoking access:', error);
              setIsRevoking(false);
              setShowLogoutConfirm(false);
              alert('Failed to revoke access, but you have been signed out. Please contact support if this persists.');
              reset();
            }
          }
        }}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          reset();
        }}
        onCancel={() => {
          setShowLogoutConfirm(false);
        }}
        isLoading={isRevoking}
      />
    </div>
  );
}

