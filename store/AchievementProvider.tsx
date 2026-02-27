import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, setAchievementListener, type UnlockedAchievement } from '@/lib/api';
import { useAuth } from '@/store/AuthProvider';
import { AchievementPopup } from '@/components/ui/AchievementPopup';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AchievementEntry {
  achievementId: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  xpReward: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

interface AchievementContextValue {
  /** All achievements with unlock status */
  achievements: AchievementEntry[];
  /** Only the unlocked ones, sorted most-recent first */
  unlocked: AchievementEntry[];
  /** Whether the initial fetch has completed */
  isLoaded: boolean;
  /** Re-fetch from the server */
  refresh: () => Promise<void>;
}

// ─── Context ────────────────────────────────────────────────────────────────

const AchievementContext = createContext<AchievementContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

/**
 * Achievement system provider.
 *
 * 1. Fetches all achievements (with unlock status) on auth.
 * 2. Listens for newly unlocked achievements from any API response
 *    and shows a fullscreen celebration popup automatically.
 * 3. Exposes the achievement list for display components.
 */
export function AchievementProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  // ── Popup queue ─────────────────────────────────────────────────────────
  const [queue, setQueue] = useState<UnlockedAchievement[]>([]);
  const [current, setCurrent] = useState<UnlockedAchievement | null>(null);
  const processingRef = useRef(false);

  // ── Achievement data ────────────────────────────────────────────────────
  const [achievements, setAchievements] = useState<AchievementEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const fetchedRef = useRef(false);

  // ── Fetch achievements from API ─────────────────────────────────────────

  const refresh = useCallback(async () => {
    try {
      const { achievements: list } = await api.getAchievements();
      setAchievements(list);
      setIsLoaded(true);
    } catch {
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
      setAchievements([]);
      setIsLoaded(false);
    }
  }, [isAuthenticated, refresh]);

  // ── Register the global listener on mount ───────────────────────────────

  useEffect(() => {
    setAchievementListener((newlyUnlocked) => {
      if (newlyUnlocked.length > 0) {
        setQueue((prev) => [...prev, ...newlyUnlocked]);

        // Optimistically mark them as unlocked in the local list
        const ids = new Set(newlyUnlocked.map((a) => a.achievementId));
        setAchievements((prev) =>
          prev.map((a) =>
            ids.has(a.achievementId)
              ? { ...a, unlocked: true, unlockedAt: new Date().toISOString() }
              : a,
          ),
        );
      }
    });

    return () => setAchievementListener(null);
  }, []);

  // ── Process queue: show one at a time ───────────────────────────────────

  useEffect(() => {
    if (queue.length > 0 && !current && !processingRef.current) {
      processingRef.current = true;
      const [next, ...rest] = queue;
      setCurrent(next);
      setQueue(rest);
    }
  }, [queue, current]);

  const handleDismiss = useCallback(() => {
    setCurrent(null);
    processingRef.current = false;
  }, []);

  // ── Derived data ────────────────────────────────────────────────────────

  const unlocked = achievements
    .filter((a) => a.unlocked)
    .sort((a, b) => {
      const ta = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
      const tb = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
      return tb - ta;
    });

  return (
    <AchievementContext.Provider value={{ achievements, unlocked, isLoaded, refresh }}>
      {children}
      {current && (
        <AchievementPopup
          achievement={current}
          onDismiss={handleDismiss}
        />
      )}
    </AchievementContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAchievements(): AchievementContextValue {
  const ctx = useContext(AchievementContext);
  if (!ctx) throw new Error('useAchievements must be used within <AchievementProvider>');
  return ctx;
}
