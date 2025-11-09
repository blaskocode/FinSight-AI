// SpendingBreakdown Component
// Visualizations for spending insights: pie chart, bar chart, top merchants, unusual spending

import { useEffect, useState, memo, useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchSpendingAnalysis } from '../services/api';
import type { SpendingAnalysisResponse } from '../services/api';
import { Loader2, AlertCircle, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface SpendingBreakdownProps {
  userId: string;
}

// Color palette for charts
const CHART_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Orange
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange-600
  '#84CC16', // Lime
  '#6366F1', // Indigo
];

export const SpendingBreakdown = memo(function SpendingBreakdown({ userId }: SpendingBreakdownProps) {
  const [analysis, setAnalysis] = useState<SpendingAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSpendingAnalysis();
  }, [userId]);

  const loadSpendingAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSpendingAnalysis(userId, 6);
      setAnalysis(data);
    } catch (err: any) {
      console.error('Failed to fetch spending analysis:', err);
      setError(err.response?.data?.error || 'Failed to load spending analysis');
    } finally {
      setLoading(false);
    }
  };

  // Memoize pie chart data (top 8 categories, rest grouped as "Other")
  // MUST be called before any conditional returns to follow Rules of Hooks
  const pieData = useMemo(() => {
    if (!analysis || !analysis.categoryBreakdown || analysis.categoryBreakdown.length === 0) {
      return [];
    }
    
    const topCategories = analysis.categoryBreakdown.slice(0, 8);
    const otherCategories = analysis.categoryBreakdown.slice(8);
    const otherTotal = otherCategories.reduce((sum, cat) => sum + cat.amount, 0);
    
    return [
      ...topCategories.map(cat => ({
        name: cat.category.length > 20 ? cat.category.substring(0, 20) + '...' : cat.category,
        value: cat.amount,
        percentage: cat.percentage
      })),
      ...(otherTotal > 0 ? [{
        name: 'Other',
        value: otherTotal,
        percentage: (otherTotal / (analysis.totalSpending || 1)) * 100
      }] : [])
    ];
  }, [analysis?.categoryBreakdown, analysis?.totalSpending]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-teal-100 rounded-lg">
            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Spending Insights</h2>
            <p className="text-sm text-gray-600 mt-1">Understand where your money goes</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="ml-3 text-gray-600">Loading spending analysis...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-teal-100 rounded-lg">
            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Spending Insights</h2>
            <p className="text-sm text-gray-600 mt-1">Understand where your money goes</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-semibold mb-1">Error Loading Analysis</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis || analysis.categoryBreakdown.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-teal-100 rounded-lg">
            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Spending Insights</h2>
            <p className="text-sm text-gray-600 mt-1">Understand where your money goes</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600">No spending data available yet.</p>
        </div>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Custom tooltip for pie chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-blue-600 font-medium">{formatCurrency(data.value)}</p>
          <p className="text-sm text-gray-600">{data.payload.percentage.toFixed(1)}% of total</p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for bar chart
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-teal-100 rounded-lg">
          <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Spending Insights</h2>
          <p className="text-sm text-gray-600 mt-1">Understand where your money goes</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-sm text-gray-600 mb-1">Total Spending</div>
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(analysis.totalSpending)}</div>
          <div className="text-xs text-gray-500 mt-1">Over {analysis.months} months</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="text-sm text-gray-600 mb-1">Total Income</div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(analysis.totalIncome)}</div>
          <div className="text-xs text-gray-500 mt-1">Over {analysis.months} months</div>
        </div>
        <div className={`${analysis.netCashFlow >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} rounded-lg p-4 border`}>
          <div className="text-sm text-gray-600 mb-1">Net Cash Flow</div>
          <div className={`text-2xl font-bold flex items-center gap-2 ${analysis.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {analysis.netCashFlow >= 0 ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
            {formatCurrency(Math.abs(analysis.netCashFlow))}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {analysis.netCashFlow >= 0 ? 'Positive' : 'Negative'} cash flow
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Pie Chart - Category Breakdown */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Category</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="45%"
                labelLine={false}
                label={false}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={80}
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value, entry: any) => `${value}: ${entry.payload.percentage.toFixed(1)}%`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart - Monthly Trend */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Income vs Expenses</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analysis.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                label={{ value: 'Month', position: 'insideBottom', offset: 0 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft', offset: 0 }}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36}
                wrapperStyle={{ paddingTop: '10px' }}
              />
              <Bar dataKey="income" fill="#10B981" name="Income" />
              <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Merchants and Unusual Spending */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        {/* Top Merchants */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-gray-700" />
            Top Merchants
          </h3>
          <div className="space-y-2">
            {analysis.topMerchants.slice(0, 10).map((merchant, index) => (
              <div
                key={merchant.merchant_name}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{merchant.merchant_name}</div>
                    <div className="text-xs text-gray-500">{merchant.transactionCount} transactions</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatCurrency(merchant.total)}</div>
                  <div className="text-xs text-gray-500">Avg: {formatCurrency(merchant.averageAmount)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unusual Spending Alerts */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            Unusual Spending Alerts
          </h3>
          {analysis.unusualSpending.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-green-800 text-sm">No unusual spending detected. Your spending patterns look normal!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {analysis.unusualSpending.map((alert) => (
                <div
                  key={alert.transaction_id}
                  className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="font-medium text-gray-900">
                      {alert.merchant_name || 'Unknown Merchant'}
                    </div>
                    <div className="font-semibold text-yellow-800">{formatCurrency(alert.amount)}</div>
                  </div>
                  <div className="text-xs text-gray-600 mb-1">
                    {new Date(alert.date).toLocaleDateString()} • {alert.category || 'Uncategorized'}
                  </div>
                  <div className="text-xs text-yellow-700">{alert.reason}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

