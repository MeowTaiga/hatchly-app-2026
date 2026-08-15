import { useEffect, useState } from 'react';

/** Re-renders on an interval so countdown UIs stay live. */
export function useTick(intervalMs = 1000, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
  return now;
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  if (totalSec >= 3600) return `${Math.floor(totalSec / 3600)}hr`;
  if (totalSec <= 0) return '0 min';
  return `${Math.max(1, Math.ceil(totalSec / 60))} min`;
}

export function formatClock(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
