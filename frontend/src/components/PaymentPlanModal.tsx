// Payment Plan Modal Component
// Displays avalanche vs snowball comparison with timeline chart

import { useState, useEffect, memo, useMemo } from 'react';
import { X, TrendingDown, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchPaymentPlanComparison } from '../services/api';
import type { PaymentPlan, PaymentPlanComparison } from '../services/api';

interface PaymentPlanModalProps {
  userId: string | null;
  onClose: () => void;
}

export const PaymentPlanModal = memo(function PaymentPlanModal({ userId, onClose }: PaymentPlanModalProps) {
  const [comparison, setComparison] = useState<PaymentPlanComparison | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<'avalanche' | 'snowball'>('avalanche');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadPaymentPlans();
    }
  }, [userId]);

  async function loadPaymentPlans() {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPaymentPlanComparison(userId);
      setComparison(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load payment plans');
    } finally {
      setLoading(false);
    }
  }

  if (!userId) {
    return null;
  }

  const plan = comparison?.[selectedStrategy];

  // Memoize chart data to prevent unnecessary re-renders
  const chartData = useMemo(() => {
    return plan?.timeline.map((month, index) => ({
      month: `Month ${index + 1}`,
      date: month.date,
      remaining: month.debts.reduce((sum, debt) => sum + debt.remainingBalance, 0),
      payment: month.totalPayment,
    })) || [];
  }, [plan?.timeline]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Debt Payment Plan</h2>
          <button
            onClick={onClose}
            className="p-2 min-w-[44px] min-h-[44px] hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-sm sm:text-base text-gray-600">Loading payment plans...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm sm:text-base text-red-800">{error}</p>
            </div>
          )}

          {comparison && (
            <>
              {/* Strategy Toggle */}
              <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={() => setSelectedStrategy('avalanche')}
                  className={`flex-1 px-4 sm:px-6 py-3 min-h-[44px] rounded-lg border-2 transition-all touch-manipulation ${
                    selectedStrategy === 'avalanche'
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 active:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <TrendingDown className="w-5 h-5 flex-shrink-0" />
                    <div className="text-left">
                      <div className="font-semibold text-sm sm:text-base">Avalanche Method</div>
                      <div className="text-xs sm:text-sm opacity-75">Saves ${comparison.avalanche.totalInterestSaved.toFixed(2)} in interest</div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setSelectedStrategy('snowball')}
                  className={`flex-1 px-4 sm:px-6 py-3 min-h-[44px] rounded-lg border-2 transition-all touch-manipulation ${
                    selectedStrategy === 'snowball'
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 active:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Target className="w-5 h-5 flex-shrink-0" />
                    <div className="text-left">
                      <div className="font-semibold text-sm sm:text-base">Snowball Method</div>
                      <div className="text-xs sm:text-sm opacity-75">Saves ${comparison.snowball.totalInterestSaved.toFixed(2)} in interest</div>
                    </div>
                  </div>
                </button>
              </div>

              {plan && (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="text-sm text-gray-600 mb-1">Total Debt</div>
                      <div className="text-2xl font-bold text-blue-600">
                        ${plan.totalDebt.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="text-sm text-gray-600 mb-1">Interest Saved</div>
                      <div className="text-2xl font-bold text-green-600">
                        ${plan.totalInterestSaved.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                      <div className="text-sm text-gray-600 mb-1">Payoff Time</div>
                      <div className="text-2xl font-bold text-orange-600">
                        {plan.payoffMonths} months
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <div className="text-sm text-gray-600 mb-1">Monthly Surplus</div>
                      <div className="text-2xl font-bold text-purple-600">
                        ${plan.monthlySurplus.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Timeline Chart */}
                  <div className="mb-6 bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Payoff Timeline</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fontSize: 12 }}
                          interval="preserveStartEnd"
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip 
                          formatter={(value: number) => `$${value.toLocaleString()}`}
                          labelFormatter={(label) => `Month ${label}`}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="remaining" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          name="Remaining Balance"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Debt Details */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Schedule</h3>
                    <div className="space-y-3">
                      {plan.debts.map((debt) => (
                        <div key={debt.liabilityId} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-semibold text-gray-900">
                                {debt.accountName || `Account ${debt.accountId.slice(-4)}`}
                              </div>
                              <div className="text-sm text-gray-600">
                                {debt.type === 'credit_card' ? 'Credit Card' : 'Student Loan'} • {debt.apr.toFixed(1)}% APR
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-gray-900">
                                ${debt.monthlyPayment.toFixed(2)}/month
                              </div>
                              <div className="text-sm text-gray-600">
                                Payoff: Month {debt.payoffMonth}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">
                              Starting balance: ${debt.balance.toLocaleString()}
                            </span>
                            <span className="text-gray-600">
                              Total interest: ${debt.totalInterest.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

