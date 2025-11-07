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
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

  const history = await all<{
    persona_id: string;
    persona_type: string;
    assigned_at: string;
    signals: string;
    secondary_personas: string | null;
  }>(
    `SELECT persona_id, persona_type, assigned_at, signals, secondary_personas
     FROM personas
     WHERE user_id = ? AND assigned_at >= ?
     ORDER BY assigned_at ASC`,
    [userId, cutoffDateStr]
  );

  return history.map(entry => ({
    persona_id: entry.persona_id,
    persona_type: entry.persona_type,
    assigned_at: entry.assigned_at,
    signals: entry.signals ? JSON.parse(entry.signals) : undefined,
    secondary_personas: entry.secondary_personas ? JSON.parse(entry.secondary_personas) : undefined,
  }));
}

/**
 * Group persona history by month for timeline visualization
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

  // Group by month, taking the persona that was active for most of that month
  const monthMap = new Map<string, Map<string, number>>(); // month -> persona -> count

  history.forEach((entry, index) => {
    const date = new Date(entry.assigned_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, new Map());
    }
    
    const personaMap = monthMap.get(monthKey)!;
    const count = personaMap.get(entry.persona_type) || 0;
    personaMap.set(entry.persona_type, count + 1);
  });

  // Convert to array and determine primary persona for each month
  monthMap.forEach((personaMap, monthKey) => {
    let maxCount = 0;
    let primaryPersona = '';
    
    personaMap.forEach((count, persona) => {
      if (count > maxCount) {
        maxCount = count;
        primaryPersona = persona;
      }
    });

    const [yearStr, monthStr] = monthKey.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Find start and end dates for this month
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    
    const monthEntries = history.filter(entry => {
      const entryDate = new Date(entry.assigned_at);
      return entryDate >= monthStart && entryDate <= monthEnd && entry.persona_type === primaryPersona;
    });

    grouped.push({
      month: monthNames[month - 1],
      year,
      monthIndex: month - 1,
      persona_type: primaryPersona,
      startDate: monthEntries.length > 0 ? monthEntries[0].assigned_at : monthStart.toISOString(),
      endDate: monthEntries.length > 0 ? monthEntries[monthEntries.length - 1].assigned_at : null,
    });
  });

  // Sort by date
  grouped.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.monthIndex - b.monthIndex;
  });

  return grouped;
}

