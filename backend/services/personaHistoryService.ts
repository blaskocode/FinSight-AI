// Persona History Service
// Fetches persona history for timeline visualization

import { all } from '../db/db';

export interface PersonaHistoryEntry {
  persona_id: string;
  persona_type: string;
  assigned_at: string;
  signals?: any;
  secondary_personas?: string[];
}

/**
 * Get persona history for a user, ordered by date
 * @param userId - The user ID
 * @param months - Number of months to look back (default: 12)
 * @returns Array of persona assignments ordered by date
 */
export async function getPersonaHistory(
  userId: string,
  months: number = 12
): Promise<PersonaHistoryEntry[]> {
  // Get all persona history for the user, then filter in memory if needed
  // This ensures we get all history even if dates are close together
  const history = await all<{
    persona_id: string;
    persona_type: string;
    assigned_at: string;
    signals: string;
    secondary_personas: string | null;
  }>(
    `SELECT persona_id, persona_type, assigned_at, signals, secondary_personas
     FROM personas
     WHERE user_id = ?
     ORDER BY assigned_at ASC`,
    [userId]
  );

  // If months filter is specified, filter by date
  let filteredHistory = history;
  if (months > 0) {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    filteredHistory = history.filter(entry => {
      const entryDate = new Date(entry.assigned_at);
      return entryDate >= cutoffDate;
    });
  }

  return filteredHistory.map(entry => {
    // Safely parse signals
    let parsedSignals: any = undefined;
    try {
      if (entry.signals) {
        parsedSignals = JSON.parse(entry.signals);
      }
    } catch (e) {
      console.error(`Error parsing signals for persona ${entry.persona_id}:`, e);
    }

    // Safely parse secondary personas
    let parsedSecondaryPersonas: string[] | undefined = undefined;
    try {
      if (entry.secondary_personas) {
        parsedSecondaryPersonas = JSON.parse(entry.secondary_personas);
        if (!Array.isArray(parsedSecondaryPersonas)) {
          parsedSecondaryPersonas = undefined;
        }
      }
    } catch (e) {
      console.error(`Error parsing secondary_personas for persona ${entry.persona_id}:`, e);
    }

    return {
      persona_id: entry.persona_id,
      persona_type: entry.persona_type,
      assigned_at: entry.assigned_at,
      signals: parsedSignals,
      secondary_personas: parsedSecondaryPersonas,
    };
  });
}

/**
 * Group persona history by month for timeline visualization
 * Shows all persona assignments, grouping consecutive same-persona assignments by month
 * @param history - Array of persona history entries
 * @returns Array of monthly persona assignments
 */
export function groupPersonaHistoryByMonth(
  history: PersonaHistoryEntry[]
): Array<{
  month: string;
  year: number;
  monthIndex: number;
  persona_type: string;
  startDate: string;
  endDate: string | null;
}> {
  if (history.length === 0) {
    return [];
  }

  const grouped: Array<{
    month: string;
    year: number;
    monthIndex: number;
    persona_type: string;
    startDate: string;
    endDate: string | null;
  }> = [];

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Group by month - create separate entries for each month, even if persona is the same
  // This ensures we show all months in the timeline, not just persona transitions
  const monthMap = new Map<string, PersonaHistoryEntry[]>();
  
  history.forEach((entry) => {
    const entryDate = new Date(entry.assigned_at);
    const monthKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, []);
    }
    monthMap.get(monthKey)!.push(entry);
  });

  // Create one entry per month, using the most recent persona for that month
  monthMap.forEach((entries, monthKey) => {
    // Sort entries by date (most recent first) and use the most recent one
    entries.sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime());
    const primaryEntry = entries[0];
    const entryDate = new Date(primaryEntry.assigned_at);
    const month = entryDate.getMonth();
    const year = entryDate.getFullYear();
    
    // Find the earliest and latest dates in this month
    const dates = entries.map(e => new Date(e.assigned_at));
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const latestDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    grouped.push({
      month: monthNames[month],
      year,
      monthIndex: month,
      persona_type: primaryEntry.persona_type,
      startDate: earliestDate.toISOString(),
      endDate: latestDate.toISOString(),
    });
  });

  // OLD LOGIC - REMOVED - was collapsing consecutive same-persona entries
  /*
  let currentGroup: {
    persona_type: string;
    startDate: Date;
    endDate: Date;
    entries: PersonaHistoryEntry[];
  } | null = null;

  history.forEach((entry, index) => {
    const entryDate = new Date(entry.assigned_at);
    
    // If this is the first entry or persona changed, start a new group
    if (!currentGroup || currentGroup.persona_type !== entry.persona_type) {
      // If we had a previous group, add it to the result
      if (currentGroup) {
        const startMonth = currentGroup.startDate.getMonth();
        const startYear = currentGroup.startDate.getFullYear();
        const endMonth = currentGroup.endDate.getMonth();
        const endYear = currentGroup.endDate.getFullYear();
        
        // If start and end are in the same month, add one entry
        if (startYear === endYear && startMonth === endMonth) {
          grouped.push({
            month: monthNames[startMonth],
            year: startYear,
            monthIndex: startMonth,
            persona_type: currentGroup.persona_type,
            startDate: currentGroup.startDate.toISOString(),
            endDate: currentGroup.endDate.toISOString(),
          });
        } else {
          // If spanning multiple months, add entries for each month
          let currentDate = new Date(currentGroup.startDate);
          while (currentDate <= currentGroup.endDate) {
            const month = currentDate.getMonth();
            const year = currentDate.getFullYear();
            const monthStart = new Date(year, month, 1);
            const monthEnd = new Date(year, month + 1, 0);
            
            const groupStart = currentDate > monthStart ? currentDate : monthStart;
            const groupEnd = currentGroup.endDate < monthEnd ? currentGroup.endDate : monthEnd;
            
            grouped.push({
              month: monthNames[month],
              year,
              monthIndex: month,
              persona_type: currentGroup.persona_type,
              startDate: groupStart.toISOString(),
              endDate: groupEnd.toISOString(),
            });
            
            // Move to next month
            currentDate = new Date(year, month + 1, 1);
          }
        }
      }
      
      // Start new group
      currentGroup = {
        persona_type: entry.persona_type,
        startDate: entryDate,
        endDate: entryDate,
        entries: [entry],
      };
    } else {
      // Same persona, extend current group
      currentGroup.endDate = entryDate;
      currentGroup.entries.push(entry);
    }
  });

  // Add the last group
  if (currentGroup) {
    const startMonth = currentGroup.startDate.getMonth();
    const startYear = currentGroup.startDate.getFullYear();
    const endMonth = currentGroup.endDate.getMonth();
    const endYear = currentGroup.endDate.getFullYear();
    
    if (startYear === endYear && startMonth === endMonth) {
      grouped.push({
        month: monthNames[startMonth],
        year: startYear,
        monthIndex: startMonth,
        persona_type: currentGroup.persona_type,
        startDate: currentGroup.startDate.toISOString(),
        endDate: currentGroup.endDate.toISOString(),
      });
    } else {
      let currentDate = new Date(currentGroup.startDate);
      while (currentDate <= currentGroup.endDate) {
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        
        const groupStart = currentDate > monthStart ? currentDate : monthStart;
        const groupEnd = currentGroup.endDate < monthEnd ? currentGroup.endDate : monthEnd;
        
        grouped.push({
          month: monthNames[month],
          year,
          monthIndex: month,
          persona_type: currentGroup.persona_type,
          startDate: groupStart.toISOString(),
          endDate: groupEnd.toISOString(),
        });
        
        currentDate = new Date(year, month + 1, 1);
      }
    }
  }
  */

  // Sort by date
  grouped.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.monthIndex - b.monthIndex;
  });

  return grouped;
}

