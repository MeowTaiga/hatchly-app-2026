import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { localDateStr } from '@/lib/api';

/**
 * Wraps a refresh callback to re-fetch when the app comes to foreground and
 * the calendar day has changed (local time). Fixes rings/counters showing
 * yesterday's data until force-close.
 *
 * @param refresh — The provider's refresh function (e.g. fetches food/water/weight logs)
 * @returns A wrapped refresh that tracks the last-fetched date and triggers
 *          a refetch when the day changes while the app was in background.
 */
export function useRefreshOnDayChange(refresh: () => Promise<void>): () => Promise<void> {
  const lastFetchedDateRef = useRef<string | null>(null);

  const wrappedRefresh = useCallback(async () => {
    await refresh();
    lastFetchedDateRef.current = localDateStr();
  }, [refresh]);

  useEffect(() => {
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state !== 'active') return;
      const now = localDateStr();
      if (lastFetchedDateRef.current !== null && lastFetchedDateRef.current !== now) {
        lastFetchedDateRef.current = now;
        wrappedRefresh();
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [refresh, wrappedRefresh]);

  return wrappedRefresh;
}
