import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/AuthProvider';

export interface GameSummary {
  farmLevel: number;
  gems: number;
  questCount: number;
  farmLevelTitle: string;
  farmLevelEmoji: string;
  xpProgress: number;
}

const DEFAULT: GameSummary = {
  farmLevel: 1,
  gems: 0,
  questCount: 0,
  farmLevelTitle: 'Seedling',
  farmLevelEmoji: '🌱',
  xpProgress: 0,
};

export function useGameSummary(): { summary: GameSummary; refresh: () => Promise<void>; isLoaded: boolean } {
  const { isAuthenticated } = useAuth();
  const [summary, setSummary] = useState<GameSummary>(DEFAULT);
  const [isLoaded, setIsLoaded] = useState(false);
  const fetchedRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getGameSummary();
      setSummary(data);
    } catch {
      setSummary(DEFAULT);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !fetchedRef.current) {
      fetchedRef.current = true;
      refresh();
    }
    if (!isAuthenticated) {
      fetchedRef.current = false;
      setSummary(DEFAULT);
      setIsLoaded(false);
    }
  }, [isAuthenticated, refresh]);

  return { summary, refresh, isLoaded };
}
