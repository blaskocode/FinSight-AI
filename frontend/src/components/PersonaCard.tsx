// Persona Card Component
// Displays user's financial persona with badge and details

import { getPersonaConfig } from '../utils/personaConfig';

interface PersonaCardProps {
  persona: {
    type: string;
    assigned_at: string;
    confidence: number;
    criteria_met: string[];
    secondary_personas?: string[];
  };
}

export function PersonaCard({ persona }: PersonaCardProps) {
  const config = getPersonaConfig(persona.type);
  const Icon = config.icon;
  const confidencePercentage = Math.round(persona.confidence * 100);

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${config.color.accent} hover:shadow-lg transition-shadow`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4 flex-1">
          {/* Icon */}
          <div className={`p-3 rounded-lg ${config.color.bg} ${config.color.text}`} aria-hidden="true">
            <Icon className="w-6 h-6" aria-hidden="true" />
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Financial Persona</h2>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Primary Persona Badge */}
              <span
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${config.color.bg} ${config.color.text} ${config.color.border}`}
                aria-label={`Primary persona: ${config.displayName}`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {config.displayName}
              </span>

              {/* Secondary Personas */}
              {persona.secondary_personas && persona.secondary_personas.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500">Also:</span>
                  {persona.secondary_personas.map((secondaryType, index) => {
                    const secondaryConfig = getPersonaConfig(secondaryType);
                    const SecondaryIcon = secondaryConfig.icon;
                    return (
                      <span
                        key={index}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${secondaryConfig.color.bg} ${secondaryConfig.color.text} ${secondaryConfig.color.border}`}
                        aria-label={`Secondary persona: ${secondaryConfig.displayName}`}
                      >
                        <SecondaryIcon className="w-3 h-3" aria-hidden="true" />
                        {secondaryConfig.displayName}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Confidence Score */}
        <div className="text-right ml-4">
          <div className="text-sm text-gray-500">Confidence</div>
          <div className={`text-2xl font-bold ${config.color.text}`}>
            {confidencePercentage}%
          </div>
        </div>
      </div>

      {/* Description */}
      <div className={`mt-4 p-4 rounded-lg ${config.color.bg} ${config.color.text} border ${config.color.border}`}>
        <p className="text-sm font-medium mb-1">{config.description}</p>
        <p className="text-xs opacity-80">Focus: {config.focus}</p>
      </div>

      {/* Criteria Met */}
      <div className="mt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Criteria Met:</h3>
        <div className="flex flex-wrap gap-2">
          {persona.criteria_met.map((criterion, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
            >
              {criterion.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        Assigned: {new Date(persona.assigned_at).toLocaleDateString()}
      </div>
    </div>
  );
}

