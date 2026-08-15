import { api } from '@/lib/api';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useGame } from './GameProvider';
import type { ActiveWeather } from './types';

const POLL_MS = 5 * 60 * 1000;

/**
 * Returns display weather: admin override when set, otherwise server calendar.
 * Also refreshes server weather periodically / on foreground.
 */
export function useWeather(): ActiveWeather {
  const { weather, setWeather, weatherOverride, connected } = useGame();
  const setWeatherRef = useRef(setWeather);
  setWeatherRef.current = setWeather;

  const refresh = useCallback(async () => {
    try {
      const next = await api.getWeather();
      setWeatherRef.current(next);
    } catch {
      // Non-critical — keep last known weather.
    }
  }, []);

  useEffect(() => {
    if (!connected) return;
    void refresh();
    const id = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(id);
  }, [connected, refresh]);

  useEffect(() => {
    const onChange = (status: AppStateStatus) => {
      if (status === 'active') void refresh();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [refresh]);

  return useMemo(() => {
    if (weatherOverride == null) return weather;
    return {
      type: weatherOverride,
      date: weather.date || 'preview',
      label: weatherOverride === 'clear' ? 'Admin: Clear' : `Admin: ${weatherOverride}`,
    };
  }, [weather, weatherOverride]);
}
