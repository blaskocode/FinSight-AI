// FinancialHealthScore Component
// Circular progress indicator showing overall financial health score

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface FinancialHealthScoreProps {
  signals: {
    utilization?: number | { utilization: number };
    emergencyFundCoverage?: number;
    cashFlowBuffer?: number;
    savingsRate?: number;
    is_overdue?: boolean;
    interest_charges?: {
      monthlyAverage?: number;
      totalCharges?: number;
    };
  };
}

interface ScoreComponent {
  label: string;
  score: number;
  maxScore: number;
  trend?: 'up' | 'down' | 'neutral';
}

/**
 * Calculate financial health score (0-100) based on various signals
 */
function calculateHealthScore(signals: FinancialHealthScoreProps['signals']): {
  totalScore: number;
  components: ScoreComponent[];
  trend: 'up' | 'down' | 'neutral';
} {
  const components: ScoreComponent[] = [];
  let totalScore = 0;
  const maxPossibleScore = 100;

  // 1. Credit Utilization (0-25 points)
  const utilization = typeof signals.utilization === 'number'
    ? signals.utilization
    : signals.utilization?.utilization || 0;
  
  let utilizationScore = 25;
  if (utilization >= 80) utilizationScore = 0;
  else if (utilization >= 50) utilizationScore = 5;
  else if (utilization >= 30) utilizationScore = 15;
  else if (utilization > 0) utilizationScore = 20;
  
  components.push({
    label: 'Credit Utilization',
    score: utilizationScore,
    maxScore: 25,
    trend: utilization >= 50 ? 'down' : utilization < 30 ? 'up' : 'neutral'
  });
  totalScore += utilizationScore;

  // 2. Emergency Fund Coverage (0-25 points)
  const emergencyFund = signals.emergencyFundCoverage || 0;
  let emergencyScore = 0;
  if (emergencyFund >= 6) emergencyScore = 25;
  else if (emergencyFund >= 3) emergencyScore = 20;
  else if (emergencyFund >= 1) emergencyScore = 10;
  else if (emergencyFund > 0) emergencyScore = 5;
  
  components.push({
    label: 'Emergency Fund',
    score: emergencyScore,
    maxScore: 25,
    trend: emergencyFund >= 6 ? 'up' : emergencyFund < 1 ? 'down' : 'neutral'
  });
  totalScore += emergencyScore;

  // 3. Cash Flow Buffer (0-20 points)
  const cashFlow = signals.cashFlowBuffer || 0;
  let cashFlowScore = 0;
  if (cashFlow >= 3) cashFlowScore = 20;
  else if (cashFlow >= 1) cashFlowScore = 15;
  else if (cashFlow >= 0.5) cashFlowScore = 10;
  else if (cashFlow > 0) cashFlowScore = 5;
  
  components.push({
    label: 'Cash Flow Buffer',
    score: cashFlowScore,
    maxScore: 20,
    trend: cashFlow >= 3 ? 'up' : cashFlow < 0.5 ? 'down' : 'neutral'
  });
  totalScore += cashFlowScore;

  // 4. Savings Rate (0-15 points)
  const savingsRate = signals.savingsRate || 0;
  let savingsScore = 0;
  if (savingsRate >= 20) savingsScore = 15;
  else if (savingsRate >= 10) savingsScore = 12;
  else if (savingsRate >= 5) savingsScore = 8;
  else if (savingsRate > 0) savingsScore = 4;
  
  components.push({
    label: 'Savings Rate',
    score: savingsScore,
    maxScore: 15,
    trend: savingsRate >= 20 ? 'up' : savingsRate < 5 ? 'down' : 'neutral'
  });
  totalScore += savingsScore;

  // 5. Payment Status (0-15 points)
  let paymentScore = 15;
  if (signals.is_overdue) {
    paymentScore = 0;
  } else {
    // Deduct for interest charges
    const monthlyInterest = signals.interest_charges?.monthlyAverage || 
                           (signals.interest_charges?.totalCharges || 0) / 3;
    if (monthlyInterest > 100) paymentScore = 5;
    else if (monthlyInterest > 50) paymentScore = 10;
  }
  
  components.push({
    label: 'Payment Status',
    score: paymentScore,
    maxScore: 15,
    trend: signals.is_overdue ? 'down' : paymentScore >= 12 ? 'up' : 'neutral'
  });
  totalScore += paymentScore;

  // Determine overall trend (simplified - would compare to previous period in real app)
  const upCount = components.filter(c => c.trend === 'up').length;
  const downCount = components.filter(c => c.trend === 'down').length;
  let trend: 'up' | 'down' | 'neutral' = 'neutral';
  if (upCount > downCount) trend = 'up';
  else if (downCount > upCount) trend = 'down';

  return { totalScore, components, trend };
}

/**
 * Get color based on score
 */
function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-50 border-green-200';
  if (score >= 60) return 'bg-blue-50 border-blue-200';
  if (score >= 40) return 'bg-yellow-50 border-yellow-200';
  return 'bg-red-50 border-red-200';
}

function getScoreRingColor(score: number): string {
  if (score >= 80) return 'stroke-green-600';
  if (score >= 60) return 'stroke-blue-600';
  if (score >= 40) return 'stroke-yellow-600';
  return 'stroke-red-600';
}

export function FinancialHealthScore({ signals }: FinancialHealthScoreProps) {
  const { totalScore, components, trend } = calculateHealthScore(signals);
  const circumference = 2 * Math.PI * 45; // radius = 45
  const offset = circumference - (totalScore / 100) * circumference;

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600';

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 border-2 ${getScoreBgColor(totalScore)}`}>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Financial Health Score</h2>
      
      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Circular Progress */}
        <div className="relative flex-shrink-0">
          <svg className="transform -rotate-90 w-32 h-32">
            {/* Background circle */}
            <circle
              cx="64"
              cy="64"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-200"
            />
            {/* Progress circle */}
            <circle
              cx="64"
              cy="64"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className={`transition-all duration-1000 ${getScoreRingColor(totalScore)}`}
            />
          </svg>
          {/* Score text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={`text-4xl font-bold ${getScoreColor(totalScore)}`}>
                {totalScore}
              </div>
              <div className="text-xs text-gray-500 mt-1">out of 100</div>
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="flex-1 space-y-3">
          {components.map((component, index) => {
            const percentage = (component.score / component.maxScore) * 100;
            const TrendIcon = component.trend === 'up' ? TrendingUp : 
                            component.trend === 'down' ? TrendingDown : Minus;
            const trendColor = component.trend === 'up' ? 'text-green-600' : 
                             component.trend === 'down' ? 'text-red-600' : 'text-gray-400';
            
            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">{component.label}</span>
                    <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                  </div>
                  <span className="text-gray-600">
                    {component.score}/{component.maxScore}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      percentage >= 80 ? 'bg-green-600' :
                      percentage >= 60 ? 'bg-blue-600' :
                      percentage >= 40 ? 'bg-yellow-600' :
                      'bg-red-600'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trend Indicator */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-center gap-2">
        <span className="text-sm text-gray-600">Overall Trend:</span>
        <div className={`flex items-center gap-1 ${trendColor}`}>
          <TrendIcon className="w-4 h-4" />
          <span className="text-sm font-medium capitalize">
            {trend === 'up' ? 'Improving' : trend === 'down' ? 'Needs Attention' : 'Stable'}
          </span>
        </div>
      </div>
    </div>
  );
}

