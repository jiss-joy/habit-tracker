export interface TimelineDay {
  dateStr: string;   // "2026-06-25" (The unique transactional key)
  label: string;     // "T", "F", "S" (Single-character day header)
}

/**
 * Returns an array containing the last 10 days up to today, 
* ordered reverse-chronologically (Newest to Oldest / Today first).
*/
export function generatePastNDays(n: number = 10): TimelineDay[] {
  return Array.from({ length: n }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (n - 1 - i));

    // Force timezone-safe ISO layout string segmentation (YYYY-MM-DD)
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    const dateStr = localDate.toISOString().split('T')[0];

    // Single narrow character day initial
    const label = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();

    return { dateStr, label };
  }).reverse();
}