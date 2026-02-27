/**
 * Health period utilities — shared date range logic for weekly/monthly views.
 * Single source of truth for period math across health cards.
 */

export type HealthPeriod = 'week' | 'month';

export const PERIOD_DAYS: Record<HealthPeriod, number> = {
  week: 7,
  month: 30,
};

/**
 * Returns YYYY-MM-DD for the start and end of the last N days (inclusive of today).
 */
export function getDateRange(period: HealthPeriod): { start: string; end: string } {
  const now = new Date();
  const end = formatDate(now);
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

/**
 * Human-readable label for the period.
 */
export function formatPeriodLabel(period: HealthPeriod): string {
  return period === 'week' ? 'Last 7 days' : 'Last 30 days';
}
