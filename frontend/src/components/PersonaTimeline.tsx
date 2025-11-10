// PersonaTimeline Component
// Horizontal timeline showing persona evolution over time

import { useEffect, useState, useRef, useCallback } from 'react';
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
function generateNarrative(timeline: PersonaTimelineEntry[], _currentPersona: string): string {
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

/**
 * Badge component with tooltip that escapes container boundaries
 */
function BadgeWithTooltip({ 
  config, 
  entry, 
  Icon, 
  isFirst, 
  isLastItem 
}: { 
  config: ReturnType<typeof getPersonaConfig>; 
  entry: PersonaTimelineEntry; 
  Icon: any; 
  isFirst: boolean; 
  isLastItem: boolean;
}) {
  const badgeRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const updateTooltipPosition = useCallback(() => {
    if (!badgeRef.current || !tooltipRef.current) return;
    
    const badgeRect = badgeRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current;
    
    if (isFirst) {
      tooltip.style.left = `${badgeRect.left}px`;
      tooltip.style.top = `${badgeRect.bottom + 8}px`;
      tooltip.style.transform = 'none';
    } else if (isLastItem) {
      tooltip.style.left = 'auto';
      tooltip.style.right = `${window.innerWidth - badgeRect.right}px`;
      tooltip.style.top = `${badgeRect.bottom + 8}px`;
      tooltip.style.transform = 'none';
    } else {
      tooltip.style.left = `${badgeRect.left + badgeRect.width / 2}px`;
      tooltip.style.top = `${badgeRect.bottom + 8}px`;
      tooltip.style.transform = 'translateX(-50%)';
    }
  }, [isFirst, isLastItem]);

  useEffect(() => {
    if (isHovered) {
      updateTooltipPosition();
      // Update on scroll/resize
      window.addEventListener('scroll', updateTooltipPosition, true);
      window.addEventListener('resize', updateTooltipPosition);
    }
    
    return () => {
      window.removeEventListener('scroll', updateTooltipPosition, true);
      window.removeEventListener('resize', updateTooltipPosition);
    };
  }, [isHovered, updateTooltipPosition]);

  return (
    <>
      <div
        ref={badgeRef}
        className={`relative ${config.color.bg} ${config.color.border} rounded-full p-3 border-2 shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-2xl cursor-pointer`}
        title={`${config.displayName} - ${entry.month} ${entry.year}`}
        style={{ zIndex: 20, overflow: 'visible' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Icon className={`w-6 h-6 ${config.color.text}`} />
      </div>
      
      {/* Tooltip - Fixed positioning to escape all containers */}
      <div 
        ref={tooltipRef}
        className="fixed px-3 py-2 bg-gray-900 text-white text-xs rounded-lg transition-opacity pointer-events-none whitespace-nowrap shadow-2xl min-w-max"
        style={{ 
          zIndex: 99999,
          opacity: isHovered ? 1 : 0
        }}
      >
        <div className="font-semibold">{config.displayName}</div>
        <div className="text-gray-300">{entry.month} {entry.year}</div>
        {/* Arrow pointing up */}
        <div 
          className="absolute bottom-full -mb-1 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-transparent border-b-gray-900"
          style={{
            left: isFirst ? '16px' : isLastItem ? 'calc(100% - 16px)' : '50%',
            transform: isFirst ? 'none' : isLastItem ? 'none' : 'translateX(-50%)'
          }}
        />
      </div>
    </>
  );
}

export function PersonaTimeline({ userId }: PersonaTimelineProps) {
  const [timeline, setTimeline] = useState<PersonaTimelineEntry[]>([]);
  // History state kept for potential future use
  const [, setHistory] = useState<PersonaHistoryEntry[]>([]);
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
    <div className="bg-white rounded-lg shadow-md p-6 mb-8 relative" style={{ overflow: 'visible' }}>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Persona Evolution</h2>
      
      {/* Narrative */}
      {narrative && (
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-900 text-sm leading-relaxed">{narrative}</p>
        </div>
      )}

      {/* Timeline */}
      <div className="overflow-x-auto pb-4 pt-2 relative" style={{ overflowY: 'visible' }}>
        <div className="relative min-w-full" style={{ minWidth: `${Math.max(timeline.length * 120, 600)}px` }}>
          {/* Timeline Line */}
          <div className="absolute top-12 left-0 right-0 h-1 bg-gray-200 z-0" />
          
          {/* Timeline Entries */}
          <div className="relative flex gap-4" style={{ overflow: 'visible' }}>
            {timeline.map((entry, index) => {
              const config = getPersonaConfig(entry.persona_type);
              const Icon = config.icon;
              // isLast kept for potential future use
              // const isLast = index === timeline.length - 1;
              const isTransition = index > 0 && entry.persona_type !== timeline[index - 1].persona_type;
              const isFirst = index === 0;
              const isLastItem = index === timeline.length - 1;

              return (
                <div
                  key={`${entry.year}-${entry.monthIndex}-${entry.persona_type}-${entry.startDate}`}
                  className="flex flex-col items-center relative"
                  style={{ minWidth: '100px', overflow: 'visible' }}
                >
                  {/* Persona Badge */}
                  <BadgeWithTooltip
                    config={config}
                    entry={entry}
                    Icon={Icon}
                    isFirst={isFirst}
                    isLastItem={isLastItem}
                  />

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

