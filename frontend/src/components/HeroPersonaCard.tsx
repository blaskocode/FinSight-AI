// HeroPersonaCard Component
// Large, visually striking persona card with gradient background and animations

import { useEffect, useState } from 'react';
import { getPersonaConfig } from '../utils/personaConfig';

interface HeroPersonaCardProps {
  persona: {
    type: string;
    assigned_at: string;
    confidence: number;
    criteria_met: string[];
    secondary_personas?: string[];
  };
}

// Persona-specific gradient classes
const personaGradients: Record<string, string> = {
  high_utilization: 'from-red-500 via-red-400 to-orange-500',
  variable_income: 'from-orange-500 via-orange-400 to-yellow-500',
  subscription_heavy: 'from-purple-500 via-purple-400 to-pink-500',
  savings_builder: 'from-green-500 via-green-400 to-teal-500',
  lifestyle_creep: 'from-blue-500 via-blue-400 to-indigo-500',
};

// Persona taglines (one sentence descriptions)
const personaTaglines: Record<string, string> = {
  high_utilization: 'You\'re carrying high credit balances that could be costing you more than you realize.',
  variable_income: 'Your income varies, making it hard to plan ahead and build financial security.',
  subscription_heavy: 'Multiple subscriptions are quietly eating into your monthly budget.',
  savings_builder: 'You\'re building healthy savings habits and making smart financial choices.',
  lifestyle_creep: 'High income, but your savings aren\'t keeping pace with your earnings.',
};

export function HeroPersonaCard({ persona }: HeroPersonaCardProps) {
  const config = getPersonaConfig(persona.type);
  const Icon = config.icon;
  const confidencePercentage = Math.round(persona.confidence * 100);
  const [isVisible, setIsVisible] = useState(false);
  const [iconPulse, setIconPulse] = useState(false);

  const gradientClass = personaGradients[persona.type] || personaGradients.high_utilization;
  const tagline = personaTaglines[persona.type] || config.description;

  useEffect(() => {
    // Animated reveal on load
    setIsVisible(true);
    // Icon pulse animation
    const pulseInterval = setInterval(() => {
      setIconPulse(true);
      setTimeout(() => setIconPulse(false), 1000);
    }, 3000);
    return () => clearInterval(pulseInterval);
  }, []);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl shadow-2xl mb-8 transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-90`} />
      
      {/* Subtle Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGMwIDMuMzE0LTIuNjg2IDYtNiA2cy02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiA2IDIuNjg2IDYgNnoiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz48L2c+PC9zdmc+')] opacity-20" />
      
      {/* Content */}
      <div className="relative z-10 p-8 md:p-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Left Side: Icon and Persona Info */}
          <div className="flex items-start gap-6 flex-1">
            {/* Animated Icon */}
            <div
              className={`relative p-6 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 transition-all duration-500 ${
                iconPulse ? 'scale-110 shadow-2xl' : 'scale-100'
              }`}
            >
              <Icon 
                className={`w-12 h-12 text-white transition-all duration-500 ${
                  iconPulse ? 'drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]' : ''
                }`}
                aria-hidden="true"
              />
              {/* Glow effect */}
              <div
                className={`absolute inset-0 rounded-2xl bg-white/20 blur-xl transition-opacity duration-500 ${
                  iconPulse ? 'opacity-100' : 'opacity-50'
                }`}
              />
            </div>

            {/* Persona Details */}
            <div className="flex-1">
              <div className="mb-4">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 drop-shadow-lg">
                  {config.displayName}
                </h1>
                <p className="text-lg md:text-xl text-white/90 max-w-2xl drop-shadow-md">
                  {tagline}
                </p>
              </div>

              {/* Persona Badge and Secondary Personas */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Primary Badge */}
                <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-base font-bold bg-white/20 backdrop-blur-sm border-2 border-white/40 text-white shadow-lg">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                  {config.displayName}
                </span>

                {/* Secondary Personas */}
                {persona.secondary_personas && persona.secondary_personas.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-white/80">Also:</span>
                    {persona.secondary_personas.map((secondaryType, index) => {
                      const secondaryConfig = getPersonaConfig(secondaryType);
                      const SecondaryIcon = secondaryConfig.icon;
                      return (
                        <span
                          key={index}
                          className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/15 backdrop-blur-sm border border-white/30 text-white hover:bg-white/25 transition-all cursor-help"
                          title={secondaryConfig.description}
                          aria-label={`Secondary persona: ${secondaryConfig.displayName}. ${secondaryConfig.description}`}
                        >
                          <SecondaryIcon className="w-4 h-4" aria-hidden="true" />
                          {secondaryConfig.displayName}
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-xl">
                            {secondaryConfig.description}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
                          </div>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side: Confidence Score */}
          <div className="text-center md:text-right">
            <div className="inline-block bg-white/20 backdrop-blur-sm rounded-2xl p-6 border-2 border-white/30 shadow-xl">
              <div className="text-sm text-white/90 mb-1 font-medium">Confidence</div>
              <div className="text-5xl font-bold text-white drop-shadow-lg">
                {confidencePercentage}%
              </div>
              <div className="text-xs text-white/70 mt-2">
                {persona.criteria_met.length} criteria met
              </div>
            </div>
          </div>
        </div>

        {/* Focus Area */}
        <div className="mt-6 pt-6 border-t border-white/20">
          <div className="flex items-center gap-2 text-white/90">
            <span className="text-sm font-semibold">Focus:</span>
            <span className="text-sm">{config.focus}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

