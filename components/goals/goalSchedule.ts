import type { GoalRepeat } from '@/lib/api';

export const DAY_FULL = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export function formatRemindAt(hm: string): string {
  const parsed = parseHHmm(hm);
  if (!parsed) return hm;
  return `${parsed.hour}:${String(parsed.minute).padStart(2, '0')} ${parsed.am ? 'AM' : 'PM'}`;
}

export interface ClockTime {
  hour: number;
  minute: number;
  am: boolean;
}

export const CUSTOM_DEFAULT_CLOCK: ClockTime = { hour: 11, minute: 0, am: true };

export function parseHHmm(hm: string): ClockTime | null {
  const [hs, ms] = hm.split(':');
  const h = Number(hs);
  const m = Number(ms);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  const am = h < 12;
  const hour = h % 12 || 12;
  return { hour, minute: m, am };
}

export function toHHmm(hour: number, minute: number, am: boolean): string {
  let h = hour % 12;
  if (!am) h += 12;
  const m = Math.max(0, Math.min(59, minute));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatGoalRepeat(repeat: GoalRepeat, repeatDays: number[] = []): string {
  if (repeat === 'once') return 'One time';
  if (repeat === 'daily') return 'Every day';

  const days = [...new Set(repeatDays.filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b);
  if (days.length === 0 || days.length === 7) return 'Every day';
  if (days.length === 5 && days.every((d, i) => d === i + 1)) return 'Weekdays';
  if (days.length === 2 && days[0] === 0 && days[1] === 6) return 'Weekends';
  if (days.length === 1) return `Every ${DAY_FULL[days[0]]}`;

  const names = days.map((d) => DAY_FULL[d]);
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  const last = names.pop();
  return `${names.join(', ')}, and ${last}`;
}
