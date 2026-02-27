/**
 * Reusable hook for "click to add 1, hold to add multiple" behavior.
 * Used in CookingDrawer (ingredients) and ShopDrawer (sell items).
 */

import { useCallback, useEffect, useRef } from 'react';

const DEFAULT_HOLD_DELAY_MS = 400;
const DEFAULT_HOLD_INTERVAL_MS = 150;

export interface UseHoldToAddOptions {
  /** Delay before hold starts adding (ms). */
  holdDelayMs?: number;
  /** Interval between adds while holding (ms). */
  holdIntervalMs?: number;
}

export function useHoldToAdd(
  onAdd: (id: string) => void,
  options: UseHoldToAddOptions = {},
) {
  const { holdDelayMs = DEFAULT_HOLD_DELAY_MS, holdIntervalMs = DEFAULT_HOLD_INTERVAL_MS } = options;
  const timerRef = useRef<{ timeoutId: ReturnType<typeof setTimeout>; intervalId: ReturnType<typeof setInterval> | null } | null>(null);
  const holdTriggeredRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current.timeoutId);
      if (timerRef.current.intervalId) clearInterval(timerRef.current.intervalId);
      timerRef.current = null;
    }
  }, []);

  const handlePressIn = useCallback((id: string) => {
    holdTriggeredRef.current = false;
    clear();
    const timeoutId = setTimeout(() => {
      holdTriggeredRef.current = true;
      onAdd(id);
      const intervalId = setInterval(() => onAdd(id), holdIntervalMs);
      timerRef.current = { timeoutId, intervalId };
    }, holdDelayMs);
    timerRef.current = { timeoutId, intervalId: null };
  }, [onAdd, holdDelayMs, holdIntervalMs, clear]);

  const handlePressOut = useCallback(() => {
    clear();
  }, [clear]);

  const handlePress = useCallback((id: string) => {
    if (holdTriggeredRef.current) return;
    onAdd(id);
  }, [onAdd]);

  useEffect(() => () => clear(), [clear]);

  return { handlePressIn, handlePressOut, handlePress };
}
