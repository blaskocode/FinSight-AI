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
              className={`relative p-6 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 transition-all duration-500 shadow-2xl ${
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
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
                    {config.displayName}
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold text-white border border-white/30">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Personalized
                  </span>
                </div>
                <p className="text-lg md:text-xl text-white/95 max-w-2xl drop-shadow-md leading-relaxed">
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

              </div>
            </div>
          </div>

          {/* Right Side: Secondary Personas (replacing confidence) - Only show if secondary personas exist */}
          {persona.secondary_personas && persona.secondary_personas.length > 0 && (
            <div className="text-center md:text-right">
              <div className="inline-block bg-white/20 backdrop-blur-sm rounded-2xl p-6 border-2 border-white/30 shadow-xl">
                <div className="text-sm text-white/90 mb-3 font-medium">Also Applies</div>
                <div className="flex flex-col gap-2 items-center md:items-end">
                  {persona.secondary_personas.map((secondaryType, index) => {
                    const secondaryConfig = getPersonaConfig(secondaryType);
                    const SecondaryIcon = secondaryConfig.icon;
                    return (
                      <span
                        key={index}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/15 backdrop-blur-sm border border-white/30 text-white"
                        aria-label={`Secondary persona: ${secondaryConfig.displayName}`}
                      >
                        <SecondaryIcon className="w-4 h-4" aria-hidden="true" />
                        {secondaryConfig.displayName}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Focus Area */}
        <div className="mt-6 pt-6 border-t border-white/20">
          <div className="flex items-center gap-3 text-white/95">
            <div className="p-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-white/80">Educational Focus</span>
              <p className="text-sm font-medium mt-1">{config.focus}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

