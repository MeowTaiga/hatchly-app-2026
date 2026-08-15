/**
 * Shared game summary for home cards (farm, gems, quests, adventure counts).
 * Refreshes on demand — call refresh() when returning to home or after rewards.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/AuthProvider';

export interface GameSummary {
  farmLevel: number;
  gems: number;
  questCount: number;
  farmLevelTitle: string;
  farmLevelEmoji: string;
  xpProgress: number;
  activeQuestTitles: string[];
  fishCaught: number;
  fishTotal: number;
  bugsCaught: number;
  bugsTotal: number;
  recipesDiscovered: number;
  recipesTotal: number;
  craftsDiscovered: number;
  craftsTotal: number;
}

const DEFAULT: GameSummary = {
  farmLevel: 1,
  gems: 0,
  questCount: 0,
  farmLevelTitle: 'Seedling',
  farmLevelEmoji: '🌱',
  xpProgress: 0,
  activeQuestTitles: [],
  fishCaught: 0,
  fishTotal: 0,
  bugsCaught: 0,
  bugsTotal: 0,
  recipesDiscovered: 0,
  recipesTotal: 0,
  craftsDiscovered: 0,
  craftsTotal: 0,
};

interface GameSummaryContextValue {
  summary: GameSummary;
  refresh: () => Promise<void>;
  isLoaded: boolean;
}

const GameSummaryContext = createContext<GameSummaryContextValue | null>(null);

export function GameSummaryProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [summary, setSummary] = useState<GameSummary>(DEFAULT);
  const [isLoaded, setIsLoaded] = useState(false);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setSummary(DEFAULT);
      setIsLoaded(false);
      return;
    }
    if (inFlightRef.current) return inFlightRef.current;

    const run = (async () => {
      try {
        const data = await api.getGameSummary();
        setSummary({ ...DEFAULT, ...data });
      } catch {
        // Keep last good snapshot on transient failures.
      } finally {
        setIsLoaded(true);
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = run;
    return run;
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refresh();
    } else {
      setSummary(DEFAULT);
      setIsLoaded(false);
    }
  }, [isAuthenticated, refresh]);

  const value = useMemo(
    () => ({ summary, refresh, isLoaded }),
    [summary, refresh, isLoaded],
  );

  return (
    <GameSummaryContext.Provider value={value}>{children}</GameSummaryContext.Provider>
  );
}

export function useGameSummary(): GameSummaryContextValue {
  const ctx = useContext(GameSummaryContext);
  if (!ctx) {
    throw new Error('useGameSummary must be used within GameSummaryProvider');
  }
  return ctx;
}
