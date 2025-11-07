// Persona Card Component
// Displays user's financial persona with badge and details

interface PersonaCardProps {
  persona: {
    type: string;
    assigned_at: string;
    confidence: number;
    criteria_met: string[];
  };
}

export function PersonaCard({ persona }: PersonaCardProps) {
  const formatPersonaType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getPersonaColor = (type: string) => {
    if (type === 'high_utilization') {
      return 'bg-red-100 text-red-800 border-red-300';
    }
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  const confidencePercentage = Math.round(persona.confidence * 100);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Financial Persona</h2>
          <span
            className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${getPersonaColor(
              persona.type
            )}`}
          >
            {formatPersonaType(persona.type)}
          </span>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Confidence</div>
          <div className="text-2xl font-bold text-blue-600">{confidencePercentage}%</div>
        </div>
      </div>

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

