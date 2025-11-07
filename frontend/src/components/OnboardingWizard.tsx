// OnboardingWizard Component
// Multi-step onboarding flow with animations

import { useState } from 'react';
import { useStore } from '../store/useStore';
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  Loader2, 
  Sparkles, 
  Shield, 
  BarChart3,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

type OnboardingStep = 1 | 2 | 3;

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [userId, setUserId] = useState('user-1762493514942-gm8c7gimv');
  const [consentChecked, setConsentChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { submitConsent, setUserId: setStoreUserId, loadProfile } = useStore();

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as OnboardingStep);
      setError(null);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as OnboardingStep);
      setError(null);
    }
  };

  const handleConsentSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await submitConsent(userId, true);
      setStoreUserId(userId);
      // Load profile in the background (for dashboard)
      loadProfile(userId).catch((error) => {
        console.error('Failed to load profile:', error);
      });
      // Complete onboarding and go to dashboard
      onComplete();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit consent. Please try again.';
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  const progressPercentage = ((currentStep - 1) / 2) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Progress Bar */}
        <div className="h-2 bg-gray-200">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Step Indicator */}
        <div className="px-8 pt-6 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Step {currentStep} of 3
            </span>
            {onSkip && currentStep < 3 && (
              <button
                onClick={onSkip}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Skip to Dashboard
              </button>
            )}
          </div>
        </div>

        {/* Step Content */}
        <div className="px-8 pb-8">
          {/* Step 1: Welcome */}
          {currentStep === 1 && (
            <div className="text-center animate-fade-in">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mb-4">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-3">
                  Welcome to FinSight AI
                </h1>
                <p className="text-xl text-gray-600 mb-6">
                  Transform your financial data into actionable insights
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <BarChart3 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900 mb-1">Smart Analysis</h3>
                  <p className="text-sm text-gray-600">AI-powered insights from your transactions</p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <TrendingUp className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900 mb-1">Personalized</h3>
                  <p className="text-sm text-gray-600">Recommendations tailored to your financial persona</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <Shield className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900 mb-1">Secure & Private</h3>
                  <p className="text-sm text-gray-600">Your data stays safe and never shared</p>
                </div>
              </div>

              <button
                onClick={handleNext}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 sm:px-8 py-3 min-h-[44px] rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 transition-all shadow-lg hover:shadow-xl touch-manipulation"
              >
                Get Started <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Step 2: Consent Explanation */}
          {currentStep === 2 && (
            <div className="animate-fade-in">
              <div className="text-center mb-6">
                <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-gray-900 mb-2">How We Use Your Data</h2>
                <p className="text-gray-600">Transparency is important to us</p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    What We Analyze
                  </h3>
                  <ul className="space-y-2 text-blue-800">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>Your spending patterns and categories</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>Credit utilization and payment behavior</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>Income stability and cash flow</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>Savings habits and subscription patterns</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                  <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Why We Need It
                  </h3>
                  <p className="text-green-800">
                    To provide you with personalized financial insights, identify your financial persona, 
                    and generate recommendations that actually help you improve your financial health.
                  </p>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
                  <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Your Privacy
                  </h3>
                  <ul className="space-y-2 text-purple-800">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 mt-1">•</span>
                      <span>Data is stored securely and never shared with third parties</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 mt-1">•</span>
                      <span>You can revoke consent at any time</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 mt-1">•</span>
                      <span>All analysis is done with your explicit permission</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={handleBack}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                >
                  <ArrowLeft className="w-5 h-5" /> Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 min-h-[44px] rounded-lg font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation"
                >
                  Continue <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Consent Form */}
          {currentStep === 3 && (
            <div className="animate-fade-in">
              <div className="text-center mb-6">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Ready to Begin?</h2>
                <p className="text-gray-600">Provide your user ID and consent to continue</p>
              </div>

              <div className="max-w-md mx-auto space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-800 font-semibold mb-1">Error</p>
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-2">
                    User ID
                  </label>
                  <input
                    type="text"
                    id="userId"
                    value={userId}
                    onChange={(e) => {
                      setUserId(e.target.value);
                      setError(null);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                    placeholder="Enter your user ID"
                    required
                    disabled={isSubmitting}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Use: <code className="bg-gray-100 px-1 rounded">user-1762493514942-gm8c7gimv</code> for testing
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      disabled={isSubmitting}
                    />
                    <div>
                      <span className="font-semibold text-gray-900">
                        I consent to FinSight AI analyzing my financial data
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        I understand that my transaction data will be analyzed to provide personalized financial insights, 
                        and I can revoke this consent at any time.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button
                    onClick={handleBack}
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50 touch-manipulation"
                  >
                    <ArrowLeft className="w-5 h-5" /> Back
                  </button>
                  <button
                    onClick={handleConsentSubmit}
                    disabled={!consentChecked || !userId.trim() || isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 min-h-[44px] rounded-lg font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Processing...
                      </>
                    ) : (
                      <>
                        Continue to Dashboard <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

