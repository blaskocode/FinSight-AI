// Recommendation Card Component
// Displays a single recommendation with rationale, priority, impact, and CTA

import { useState } from 'react';
import type { Recommendation } from '../services/api';
import { BookOpen, Gift, ExternalLink, ChevronDown, ChevronUp, TrendingUp, Clock, Zap } from 'lucide-react';
import { PaymentPlanModal } from './PaymentPlanModal';
import { PartnerOfferCard } from './PartnerOfferCard';

interface RecommendationCardProps {
  recommendation: Recommendation;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  difficulty?: 'quick_win' | 'moderate' | 'long_term';
  userId?: string | null;
}

export function RecommendationCard({ recommendation, priority = 'medium', difficulty = 'moderate', userId = null }: RecommendationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPaymentPlan, setShowPaymentPlan] = useState(false);
  
  const isEducation = recommendation.type === 'education';
  const Icon = isEducation ? BookOpen : Gift;

  // Priority badge colors
  const priorityColors = {
    critical: 'bg-red-100 text-red-800 border-red-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-blue-100 text-blue-800 border-blue-300',
  };

  // Difficulty badge colors and labels
  const difficultyConfig = {
    quick_win: { label: 'Quick Win', color: 'bg-green-100 text-green-800', icon: Zap },
    moderate: { label: 'Moderate', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    long_term: { label: 'Long-term', color: 'bg-blue-100 text-blue-800', icon: TrendingUp },
  };

  const difficultyInfo = difficultyConfig[difficulty];
  const DifficultyIcon = difficultyInfo.icon;

  // Check if this is a payment plan recommendation
  const isPaymentPlan = recommendation.title?.toLowerCase().includes('payment plan') || 
                        recommendation.title?.toLowerCase().includes('debt payoff');

  // Check if this is a partner offer
  const isPartnerOffer = recommendation.type === 'partner_offer';

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-lg flex-shrink-0 ${
              isEducation ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
            }`}
          >
            <Icon className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header with badges */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className={`px-2 py-1 text-xs font-semibold rounded ${
                  isEducation
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {isEducation ? 'Education' : 'Partner Offer'}
              </span>
              
              <span className={`px-2 py-1 text-xs font-semibold rounded border ${priorityColors[priority]}`}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
              </span>
              
              <span className={`px-2 py-1 text-xs font-semibold rounded flex items-center gap-1 ${difficultyInfo.color}`}>
                <DifficultyIcon className="w-3 h-3" />
                {difficultyInfo.label}
              </span>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {recommendation.title}
            </h3>

            <p className="text-gray-600 mb-4 line-clamp-2">{recommendation.description}</p>

            {/* Impact Estimate */}
            {recommendation.impact_estimate && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm font-semibold text-green-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Impact: {recommendation.impact_estimate}
                </p>
              </div>
            )}

            {/* Rationale */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 italic">"{recommendation.rationale}"</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              {isPaymentPlan ? (
                <button
                  onClick={() => setShowPaymentPlan(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold flex items-center gap-2"
                >
                  View Payment Plan
                </button>
              ) : isPartnerOffer ? (
                <div className="w-full">
                  <PartnerOfferCard recommendation={recommendation} />
                </div>
              ) : (
                <a
                  href="#"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold flex items-center gap-2"
                  onClick={(e) => {
                    e.preventDefault();
                    // In a real app, this would navigate to the article
                    alert('This would open the educational content');
                  }}
                >
                  Learn More
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-semibold flex items-center gap-2"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show Details
                  </>
                )}
              </button>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Type:</strong> {isEducation ? 'Educational Content' : 'Partner Offer'}</p>
                  <p><strong>Created:</strong> {new Date(recommendation.created_at).toLocaleDateString()}</p>
                  {recommendation.impact_estimate && (
                    <p><strong>Estimated Impact:</strong> {recommendation.impact_estimate}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Plan Modal */}
      {showPaymentPlan && (
        <PaymentPlanModal
          userId={userId}
          onClose={() => setShowPaymentPlan(false)}
        />
      )}
    </>
  );
}

