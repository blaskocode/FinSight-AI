// Recommendation Card Component
// Displays a single recommendation with rationale, priority, impact, and CTA

import { useState } from 'react';
import type { Recommendation } from '../services/api';
import { BookOpen, Gift, ExternalLink, ChevronDown, ChevronUp, TrendingUp, Clock, Zap, GraduationCap, Lightbulb, Info } from 'lucide-react';
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
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">
        <div className="flex items-start gap-4">
          <div
            className={`p-4 rounded-xl flex-shrink-0 shadow-md ${
              isEducation 
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
                : 'bg-gradient-to-br from-green-500 to-green-600 text-white'
            }`}
            aria-hidden="true"
          >
            <Icon className="w-7 h-7" aria-hidden="true" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header with badges */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span
                className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm ${
                  isEducation
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}
              >
                {isEducation ? (
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" />
                    Learn
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Gift className="w-3 h-3" />
                    Opportunity
                  </span>
                )}
              </span>
              
              <span className={`px-3 py-1.5 text-xs font-bold rounded-lg border shadow-sm ${priorityColors[priority]}`}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
              </span>
              
              <span className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1 shadow-sm ${difficultyInfo.color}`}>
                <DifficultyIcon className="w-3 h-3" />
                {difficultyInfo.label}
              </span>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors" id={`rec-title-${recommendation.id}`}>
              {recommendation.title}
            </h3>

            <p className="text-gray-700 mb-4 leading-relaxed">{recommendation.description}</p>

            {/* Impact Estimate */}
            {recommendation.impact_estimate && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-lg p-4 mb-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-1">Potential Impact</p>
                    <p className="text-sm font-bold text-green-900">{recommendation.impact_estimate}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Rationale - Educational Focus */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-4 mb-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">Why This Matters</p>
                  <p className="text-sm text-gray-800 leading-relaxed">"{recommendation.rationale}"</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              {isPaymentPlan ? (
                <button
                  onClick={() => setShowPaymentPlan(true)}
                  className="px-4 py-3 min-h-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm font-semibold flex items-center gap-2 touch-manipulation"
                  aria-label={`View payment plan for ${recommendation.title}`}
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
                  className="px-6 py-3 min-h-[44px] bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 active:from-blue-800 active:to-blue-900 transition-all text-sm font-bold flex items-center gap-2 touch-manipulation shadow-md hover:shadow-lg"
                  onClick={(e) => {
                    e.preventDefault();
                    // In a real app, this would navigate to the article
                    alert('This would open the educational content');
                  }}
                  aria-label={`Learn more about ${recommendation.title}`}
                >
                  <GraduationCap className="w-4 h-4" aria-hidden="true" />
                  Learn More
                  <ExternalLink className="w-4 h-4" aria-hidden="true" />
                </a>
              )}
              
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-4 py-3 min-h-[44px] bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors text-sm font-medium flex items-center gap-2 touch-manipulation border border-gray-200"
                aria-expanded={isExpanded}
                aria-controls={`rec-details-${recommendation.id}`}
                aria-label={isExpanded ? 'Hide recommendation details' : 'Show recommendation details'}
              >
                <Info className="w-4 h-4" aria-hidden="true" />
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" aria-hidden="true" />
                    Less Info
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" aria-hidden="true" />
                    More Info
                  </>
                )}
              </button>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div id={`rec-details-${recommendation.id}`} className="mt-4 pt-4 border-t border-gray-200" role="region" aria-labelledby={`rec-title-${recommendation.id}`}>
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

