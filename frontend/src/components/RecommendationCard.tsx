// Recommendation Card Component
// Displays a single recommendation with rationale

import type { Recommendation } from '../services/api';
import { BookOpen, Gift } from 'lucide-react';

interface RecommendationCardProps {
  recommendation: Recommendation;
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const isEducation = recommendation.type === 'education';
  const Icon = isEducation ? BookOpen : Gift;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-start gap-4">
        <div
          className={`p-3 rounded-lg ${
            isEducation ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
          }`}
        >
          <Icon className="w-6 h-6" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-1 text-xs font-semibold rounded ${
                isEducation
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {isEducation ? 'Education' : 'Partner Offer'}
            </span>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {recommendation.title}
          </h3>

          <p className="text-gray-600 mb-4">{recommendation.description}</p>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-700 italic">"{recommendation.rationale}"</p>
          </div>

          {recommendation.impact_estimate && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-green-900">
                💡 Impact: {recommendation.impact_estimate}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

