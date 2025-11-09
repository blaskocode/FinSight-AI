// PersonaTimeline Component
// Horizontal timeline showing persona evolution over time

import { useEffect, useState, useRef } from 'react';
import { fetchPersonaHistory } from '../services/api';
import type { PersonaTimelineEntry, PersonaHistoryEntry } from '../services/api';
import { getPersonaConfig } from '../utils/personaConfig';
import { Loader2, AlertCircle } from 'lucide-react';

interface PersonaTimelineProps {
  userId: string;
}

/**
 * Generate narrative description of persona evolution
 */
function generateNarrative(timeline: PersonaTimelineEntry[], currentPersona: string): string {
  if (timeline.length === 0) {
    return 'Your financial journey is just beginning!';
  }

  const firstPersona = timeline[0];
  const lastPersona = timeline[timeline.length - 1];
  const config = getPersonaConfig(firstPersona.persona_type);
  const lastConfig = getPersonaConfig(lastPersona.persona_type);

  if (timeline.length === 1) {
    return `You've been a ${config.displayName} since ${firstPersona.month} ${firstPersona.year}. Keep up the great work!`;
  }

  const transitions = timeline.filter((entry, index) => {
    if (index === 0) return false;
    return entry.persona_type !== timeline[index - 1].persona_type;
  });

  if (transitions.length === 0) {
    return `You've maintained your ${config.displayName} persona since ${firstPersona.month} ${firstPersona.year}.`;
  }

  // Check if it's a positive transition (e.g., High Utilization -> Savings Builder)
  const positiveTransitions = [
    ['high_utilization', 'savings_builder'],
    ['variable_income', 'savings_builder'],
    ['subscription_heavy', 'savings_builder'],
    ['high_utilization', 'variable_income'],
  ];

  const isPositive = positiveTransitions.some(
    ([from, to]) => firstPersona.persona_type === from && lastPersona.persona_type === to
  );

  if (isPositive) {
    return `You started as a ${config.displayName} in ${firstPersona.month} ${firstPersona.year}. Through consistent financial improvements, you've evolved into a ${lastConfig.displayName}! 🎉`;
  }

  return `Your financial persona has evolved from ${config.displayName} to ${lastConfig.displayName} over the past ${timeline.length} months.`;
}

export function PersonaTimeline({ userId }: PersonaTimelineProps) {
  const [timeline, setTimeline] = useState<PersonaTimelineEntry[]>([]);
  const [history, setHistory] = useState<PersonaHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [narrative, setNarrative] = useState('');
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!userId || loadingRef.current) {
      return;
    }
    loadPersonaHistory();
  }, [userId]);

  const loadPersonaHistory = async () => {
    if (loadingRef.current) {
      return; // Already loading
    }
    loadingRef.current = true;
    if (!userId) {
      console.warn('PersonaTimeline: No userId provided');
      loadingRef.current = false;
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      console.log('PersonaTimeline: Fetching history for user:', userId);
      const data = await fetchPersonaHistory(userId, 12);
      console.log('PersonaTimeline: Received data:', { 
        timelineLength: data.timeline?.length, 
        historyLength: data.history?.length,
        timeline: data.timeline,
        history: data.history
      });
      
      setTimeline(data.timeline || []);
      setHistory(data.history || []);
      
      // Generate narrative
      const currentPersona = data.timeline && data.timeline.length > 0 
        ? data.timeline[data.timeline.length - 1].persona_type 
        : '';
      setNarrative(generateNarrative(data.timeline || [], currentPersona));
    } catch (err: any) {
      console.error('PersonaTimeline: Failed to fetch persona history:', err);
      console.error('PersonaTimeline: Error details:', err.response?.data || err.message);
      setError(err.response?.data?.error || err.message || 'Failed to load persona history');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Persona Evolution</h2>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="ml-3 text-gray-600">Loading persona history...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Persona Evolution</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-semibold mb-1">Error Loading Timeline</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Persona Evolution</h2>
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600">No persona history available yet.</p>
          <p className="text-gray-500 text-sm mt-2">Your persona evolution will appear here as your financial situation changes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8 overflow-visible relative z-0">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Persona Evolution</h2>
      
      {/* Narrative */}
      {narrative && (
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-900 text-sm leading-relaxed">{narrative}</p>
        </div>
      )}

      {/* Timeline */}
      <div className="overflow-x-auto overflow-y-visible pb-4 pt-4 relative z-10">
        <div className="relative min-w-full z-10" style={{ minWidth: `${Math.max(timeline.length * 120, 600)}px` }}>
          {/* Timeline Line */}
          <div className="absolute top-12 left-0 right-0 h-1 bg-gray-200 z-0" />
          
          {/* Timeline Entries */}
          <div className="relative flex gap-4 overflow-visible z-10">
            {timeline.map((entry, index) => {
              const config = getPersonaConfig(entry.persona_type);
              const Icon = config.icon;
              const isLast = index === timeline.length - 1;
              const isTransition = index > 0 && entry.persona_type !== timeline[index - 1].persona_type;

              return (
                <div
                  key={`${entry.year}-${entry.monthIndex}-${entry.persona_type}-${entry.startDate}`}
                  className="flex flex-col items-center relative z-10"
                  style={{ minWidth: '100px' }}
                >
                  {/* Persona Badge */}
                  <div
                    className={`relative z-20 ${config.color.bg} ${config.color.border} rounded-full p-3 border-2 shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-2xl cursor-pointer group`}
                    title={`${config.displayName} - ${entry.month} ${entry.year}`}
                  >
                    <Icon className={`w-6 h-6 ${config.color.text}`} />
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                      <div className="font-semibold">{config.displayName}</div>
                      <div className="text-gray-300">{entry.month} {entry.year}</div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
                    </div>
                  </div>

                  {/* Month Label */}
                  <div className="mt-2 text-center">
                    <div className="text-xs font-semibold text-gray-700">{entry.month}</div>
                    <div className="text-xs text-gray-500">{entry.year}</div>
                  </div>

                  {/* Transition Marker */}
                  {isTransition && (
                    <div className="absolute top-12 left-0 w-full flex items-center justify-center">
                      <div className={`${config.color.bg} ${config.color.border} border-2 rounded-full w-3 h-3 shadow-md`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-4 text-sm">
          {Array.from(new Set(timeline.map(e => e.persona_type))).map(personaType => {
            const config = getPersonaConfig(personaType);
            const Icon = config.icon;
            return (
              <div key={personaType} className="flex items-center gap-2">
                <div className={`${config.color.bg} ${config.color.border} rounded-full p-1.5 border`}>
                  <Icon className={`w-3 h-3 ${config.color.text}`} />
                </div>
                <span className="text-gray-700">{config.displayName}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

