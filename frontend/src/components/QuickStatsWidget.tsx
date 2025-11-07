// QuickStatsWidget Component
// Displays persona-specific financial metrics with trend indicators and sparklines

import { TrendingUp, TrendingDown, Minus, CreditCard, DollarSign, Calendar, PiggyBank, AlertCircle, Layers, ArrowUpRight } from 'lucide-react';
import { getPersonaConfig } from '../utils/personaConfig';

interface QuickStatsWidgetProps {
  persona: {
    type: string;
    confidence: number;
  };
  signals: {
    utilization?: number | { utilization: number };
    interest_charges?: {
      monthlyAverage?: number;
      totalCharges?: number;
    };
    cashFlowBuffer?: number;
    monthlyIncome?: number;
    averageIncome?: number;
    subscriptionShare?: number;
    monthlyRecurringSpend?: number;
    activeSubscriptions?: number;
    savingsGrowthRate?: number;
    emergencyFundCoverage?: number;
    savingsRate?: number;
    totalSavingsBalance?: number;
    discretionarySpendPercent?: number;
    retirementSavingsRate?: number;
    is_overdue?: boolean;
  };
}

interface StatCard {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'green' | 'red' | 'yellow' | 'blue' | 'purple';
  trend?: 'up' | 'down' | 'neutral';
  tooltip?: string;
}

/**
 * Get persona-specific quick stats
 */
function getPersonaStats(personaType: string, signals: QuickStatsWidgetProps['signals']): StatCard[] {
  const stats: StatCard[] = [];

  switch (personaType) {
    case 'high_utilization':
      // Credit utilization %
      const utilization = typeof signals.utilization === 'number'
        ? signals.utilization
        : signals.utilization?.utilization || 0;
      
      stats.push({
        label: 'Credit Utilization',
        value: `${utilization.toFixed(1)}%`,
        icon: CreditCard,
        color: utilization >= 80 ? 'red' : utilization >= 50 ? 'yellow' : 'green',
        trend: utilization >= 50 ? 'down' : 'up',
        tooltip: `You're using ${utilization.toFixed(1)}% of your available credit. Keeping it below 30% is ideal for your credit score.`
      });

      // Monthly interest charges
      const monthlyInterest = signals.interest_charges?.monthlyAverage || 
                             (signals.interest_charges?.totalCharges || 0) / 3;
      stats.push({
        label: 'Monthly Interest',
        value: `$${monthlyInterest.toFixed(2)}`,
        icon: DollarSign,
        color: monthlyInterest > 100 ? 'red' : monthlyInterest > 50 ? 'yellow' : 'green',
        trend: monthlyInterest > 50 ? 'down' : 'neutral',
        tooltip: `You're paying approximately $${monthlyInterest.toFixed(2)} per month in interest charges.`
      });

      // Overdue status or days until next payment
      if (signals.is_overdue) {
        stats.push({
          label: 'Payment Status',
          value: 'Overdue',
          icon: AlertCircle,
          color: 'red',
          trend: 'down',
          tooltip: 'You have overdue payments. This can significantly impact your credit score.'
        });
      } else {
        stats.push({
          label: 'Payment Status',
          value: 'Current',
          icon: Calendar,
          color: 'green',
          trend: 'up',
          tooltip: 'All payments are current. Keep it up!'
        });
      }
      break;

    case 'variable_income':
      // Cash flow buffer
      const cashFlow = signals.cashFlowBuffer || 0;
      stats.push({
        label: 'Cash Flow Buffer',
        value: `${cashFlow.toFixed(1)} months`,
        icon: Calendar,
        color: cashFlow >= 3 ? 'green' : cashFlow >= 1 ? 'yellow' : 'red',
        trend: cashFlow >= 3 ? 'up' : cashFlow < 1 ? 'down' : 'neutral',
        tooltip: `You have enough cash to cover ${cashFlow.toFixed(1)} months of expenses. Aim for 3-6 months.`
      });

      // Average monthly income
      const avgIncome = signals.averageIncome || signals.monthlyIncome || 0;
      stats.push({
        label: 'Avg Monthly Income',
        value: `$${(avgIncome / 1000).toFixed(1)}k`,
        icon: DollarSign,
        color: 'blue',
        trend: 'neutral',
        tooltip: `Your average monthly income over the past 3 months is $${avgIncome.toLocaleString()}.`
      });

      // Next income date (simplified - would need backend calculation)
      stats.push({
        label: 'Income Stability',
        value: cashFlow >= 2 ? 'Stable' : 'Variable',
        icon: TrendingUp,
        color: cashFlow >= 2 ? 'green' : 'yellow',
        trend: cashFlow >= 2 ? 'up' : 'down',
        tooltip: cashFlow >= 2 ? 'Your income pattern shows good stability.' : 'Your income varies significantly month to month.'
      });
      break;

    case 'subscription_heavy':
      // Monthly recurring spend
      const recurringSpend = signals.monthlyRecurringSpend || 0;
      stats.push({
        label: 'Monthly Subscriptions',
        value: `$${recurringSpend.toFixed(0)}`,
        icon: Layers,
        color: recurringSpend > 200 ? 'red' : recurringSpend > 100 ? 'yellow' : 'green',
        trend: recurringSpend > 200 ? 'down' : 'neutral',
        tooltip: `You're spending $${recurringSpend.toFixed(2)} per month on recurring subscriptions.`
      });

      // Active subscriptions count
      const subCount = signals.activeSubscriptions || 0;
      stats.push({
        label: 'Active Subscriptions',
        value: `${subCount}`,
        icon: Layers,
        color: subCount > 10 ? 'red' : subCount > 5 ? 'yellow' : 'green',
        trend: subCount > 10 ? 'down' : 'neutral',
        tooltip: `You have ${subCount} active subscriptions. Consider reviewing which ones you actually use.`
      });

      // Subscription share of spending
      const subShare = signals.subscriptionShare || 0;
      stats.push({
        label: 'Subscription Share',
        value: `${subShare.toFixed(1)}%`,
        icon: TrendingUp,
        color: subShare > 20 ? 'red' : subShare > 10 ? 'yellow' : 'green',
        trend: subShare > 20 ? 'down' : 'neutral',
        tooltip: `Subscriptions make up ${subShare.toFixed(1)}% of your total spending.`
      });
      break;

    case 'savings_builder':
      // Savings growth rate
      const growthRate = signals.savingsGrowthRate || 0;
      stats.push({
        label: 'Savings Growth',
        value: `${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}%`,
        icon: PiggyBank,
        color: growthRate > 5 ? 'green' : growthRate > 0 ? 'blue' : 'red',
        trend: growthRate > 0 ? 'up' : 'down',
        tooltip: `Your savings are ${growthRate > 0 ? 'growing' : 'declining'} at ${Math.abs(growthRate).toFixed(1)}% per month.`
      });

      // Emergency fund coverage
      const emergencyFund = signals.emergencyFundCoverage || 0;
      stats.push({
        label: 'Emergency Fund',
        value: `${emergencyFund.toFixed(1)} months`,
        icon: PiggyBank,
        color: emergencyFund >= 6 ? 'green' : emergencyFund >= 3 ? 'blue' : emergencyFund >= 1 ? 'yellow' : 'red',
        trend: emergencyFund >= 6 ? 'up' : emergencyFund < 1 ? 'down' : 'neutral',
        tooltip: `Your emergency fund covers ${emergencyFund.toFixed(1)} months of expenses. Aim for 3-6 months.`
      });

      // Monthly savings rate
      const savingsRate = signals.savingsRate || 0;
      stats.push({
        label: 'Savings Rate',
        value: `${savingsRate.toFixed(1)}%`,
        icon: TrendingUp,
        color: savingsRate >= 20 ? 'green' : savingsRate >= 10 ? 'blue' : savingsRate >= 5 ? 'yellow' : 'red',
        trend: savingsRate >= 20 ? 'up' : savingsRate < 5 ? 'down' : 'neutral',
        tooltip: `You're saving ${savingsRate.toFixed(1)}% of your income. The recommended rate is 20% or more.`
      });
      break;

    case 'lifestyle_creep':
      // Income level
      const income = signals.monthlyIncome || signals.averageIncome || 0;
      stats.push({
        label: 'Monthly Income',
        value: `$${(income / 1000).toFixed(1)}k`,
        icon: DollarSign,
        color: 'blue',
        trend: 'neutral',
        tooltip: `Your monthly income is $${income.toLocaleString()}.`
      });

      // Discretionary spend %
      const discretionary = signals.discretionarySpendPercent || 0;
      stats.push({
        label: 'Discretionary Spend',
        value: `${discretionary.toFixed(1)}%`,
        icon: ArrowUpRight,
        color: discretionary > 50 ? 'red' : discretionary > 30 ? 'yellow' : 'green',
        trend: discretionary > 50 ? 'down' : discretionary < 20 ? 'up' : 'neutral',
        tooltip: `${discretionary.toFixed(1)}% of your spending is discretionary. Consider redirecting some to savings.`
      });

      // Retirement savings rate
      const retirementRate = signals.retirementSavingsRate || 0;
      stats.push({
        label: 'Retirement Savings',
        value: `${retirementRate.toFixed(1)}%`,
        icon: PiggyBank,
        color: retirementRate >= 15 ? 'green' : retirementRate >= 10 ? 'blue' : retirementRate >= 5 ? 'yellow' : 'red',
        trend: retirementRate >= 15 ? 'up' : retirementRate < 5 ? 'down' : 'neutral',
        tooltip: `You're saving ${retirementRate.toFixed(1)}% for retirement. Aim for 15-20% of income.`
      });
      break;

    default:
      // Default stats for unknown personas
      stats.push({
        label: 'Financial Health',
        value: 'Good',
        icon: TrendingUp,
        color: 'green',
        trend: 'up',
        tooltip: 'Your financial health is in good shape.'
      });
  }

  return stats;
}

/**
 * Get color classes for stat cards
 */
function getColorClasses(color: StatCard['color']) {
  const colors = {
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: 'text-green-600',
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: 'text-red-600',
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: 'text-yellow-600',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: 'text-blue-600',
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-800',
      icon: 'text-purple-600',
    },
  };
  return colors[color];
}

export function QuickStatsWidget({ persona, signals }: QuickStatsWidgetProps) {
  const stats = getPersonaStats(persona.type, signals);

  if (stats.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Stats</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, index) => {
          const colors = getColorClasses(stat.color);
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? TrendingUp :
                          stat.trend === 'down' ? TrendingDown : Minus;
          const trendColor = stat.trend === 'up' ? 'text-green-600' :
                           stat.trend === 'down' ? 'text-red-600' : 'text-gray-400';

          return (
            <div
              key={index}
              className={`${colors.bg} ${colors.border} rounded-lg p-4 border-2 hover:shadow-md transition-shadow group relative`}
              role="region"
              aria-label={`${stat.label}: ${stat.value}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-lg ${colors.icon} bg-white/50`} aria-hidden="true">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                {stat.trend && (
                  <TrendIcon className={`w-4 h-4 ${trendColor}`} aria-hidden="true" />
                )}
              </div>
              
              <div className="mt-2">
                <div className={`text-2xl font-bold ${colors.text} mb-1`}>
                  {stat.value}
                </div>
                <div className="text-sm font-medium text-gray-700">
                  {stat.label}
                </div>
              </div>

              {/* Tooltip */}
              {stat.tooltip && (
                <div 
                  className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-xl max-w-xs"
                  role="tooltip"
                  aria-hidden="true"
                >
                  {stat.tooltip}
                  <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-gray-900" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

