// Partner Offer Card Component
// Displays partner offer details with eligibility status

import { ExternalLink, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { Recommendation } from '../services/api';

interface PartnerOfferCardProps {
  recommendation: Recommendation;
}

export function PartnerOfferCard({ recommendation }: PartnerOfferCardProps) {
  // Parse offer details from description or impact_estimate
  // In a real app, this would come from structured data
  const isEligible = true; // Would come from API
  const eligibilityReason = 'You meet all eligibility requirements';

  return (
    <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4 border-2 border-green-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {isEligible ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-green-800">Eligible</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm font-semibold text-red-800">Not Eligible</span>
              </>
            )}
          </div>
          
          {isEligible && (
            <p className="text-xs text-gray-600 mb-3">{eligibilityReason}</p>
          )}
        </div>
      </div>

      {/* Offer Details */}
      <div className="space-y-2 text-sm mb-4">
        {recommendation.impact_estimate && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Estimated Impact:</span>
            <span className="font-semibold text-gray-900">{recommendation.impact_estimate}</span>
          </div>
        )}
      </div>

      {/* CTA Button */}
      <a
        href="#"
        className="block w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold text-center flex items-center justify-center gap-2"
        onClick={(e) => {
          e.preventDefault();
          // In a real app, this would open the partner's application page
          alert('This would open the partner offer application page');
        }}
      >
        Apply Now
        <ExternalLink className="w-4 h-4" />
      </a>

      {/* Disclaimer */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500">
            This is an educational recommendation. FinSight AI does not endorse any specific financial products. 
            Please review all terms and conditions before applying.
          </p>
        </div>
      </div>
    </div>
  );
}

