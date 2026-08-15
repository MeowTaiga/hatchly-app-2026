/**
 * Health period utilities — shared date range logic for weekly/monthly/all-time views.
 */

export type HealthPeriod = 'week' | 'month' | 'all';

export const PERIOD_DAYS: Record<Exclude<HealthPeriod, 'all'>, number> = {
  week: 7,
  month: 30,
};

/**
 * Returns YYYY-MM-DD for the start and end of the last N days (inclusive of today).
 * For `all`, start is empty so callers skip date filtering.
 */
export function getDateRange(period: HealthPeriod): { start: string; end: string } {
  const now = new Date();
  const end = formatDate(now);
  if (period === 'all') return { start: '', end };
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - PERIOD_DAYS[period] + 1);
  const start = formatDate(startDate);
  return { start, end };
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Human-readable label for the period. */
export function formatPeriodLabel(period: HealthPeriod): string {
  if (period === 'week') return 'Last 7 days';
  if (period === 'month') return 'Last 30 days';
  return 'All time';
}
