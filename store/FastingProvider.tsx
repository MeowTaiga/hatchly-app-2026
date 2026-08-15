import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api, type FastingSession, type FastingState, type PublicGoal } from '@/lib/api';
import { useAuth } from '@/store/AuthProvider';
import { useGoals } from '@/store/GoalsProvider';
import { ensureItemPreviewCache, peekItemPreview } from '@/lib/itemPreviewCache';
import {
  syncFastingLiveActivity,
  endFastingLiveActivity,
  consumePendingDoneEating,
  isDoneEatingDeepLink,
  takeInitialDoneEatingUrl,
} from '@/lib/fastingLiveActivity';

const LIVE_ACTIVITY_KEY = 'hatchly_fasting_live_activity';
const HIDE_FASTING_LIVE_KEY = 'hatchly_hide_fasting_live';

interface FastingContextValue {
  interested: boolean | null;
  active: FastingSession | null;
  isLoaded: boolean;
  liveActivityEnabled: boolean;
  setLiveActivityEnabled: (enabled: boolean) => Promise<void>;
  hideFastingOnLockScreen: boolean;
  setHideFastingOnLockScreen: (hide: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  setInterest: (interested: boolean) => Promise<void>;
  startFast: (goalHours: number) => Promise<void>;
  endFast: () => Promise<void>;
}

const FastingContext = createContext<FastingContextValue | null>(null);

function remindSortKey(remindAt?: string): string {
  return remindAt && /^\d{2}:\d{2}$/.test(remindAt) ? remindAt : '99:99';
}

function pickNextLiveGoal(goals: PublicGoal[]): PublicGoal | undefined {
  return [...goals]
    .filter((goal) => goal.enabled && goal.dueToday && !goal.completedToday)
    .sort((a, b) => {
      const byRemind = remindSortKey(a.remindAt).localeCompare(remindSortKey(b.remindAt));
      if (byRemind !== 0) return byRemind;
      return a.sortOrder - b.sortOrder;
    })[0];
}

function applyState(
  data: FastingState,
  setInterested: (v: boolean | null) => void,
  setActive: (v: FastingSession | null) => void,
) {
  setInterested(data.interested);
  setActive(data.active);
}

export function FastingProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const { state: goalsState } = useGoals();
  const [interested, setInterested] = useState<boolean | null>(null);
  const [active, setActive] = useState<FastingSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [liveActivityEnabled, setLiveActivityEnabledState] = useState(true);
  const [hideFastingOnLockScreen, setHideFastingOnLockScreenState] = useState(false);
  const [livePrefLoaded, setLivePrefLoaded] = useState(Platform.OS !== 'ios');
  const [previewReady, setPreviewReady] = useState(false);
  const fetchedRef = useRef(false);
  const activeRef = useRef<FastingSession | null>(null);
  const startingFromLiveRef = useRef(false);

  const petName = user?.pet?.customName || user?.pet?.name || 'Buddy';
  const petImageUrl =
    user?.pet?.pose?.idle ||
    user?.pet?.pose?.standing ||
    user?.pet?.pose?.neutral ||
    user?.pet?.pose?.sitting ||
    (user?.pet?.pose ? Object.values(user.pet.pose).find(Boolean) : undefined) ||
    user?.pet?.imageUrl;
  activeRef.current = active;

  const refresh = useCallback(async () => {
    try {
      const data = await api.getFasting();
      applyState(data, setInterested, setActive);
    } catch {
      // keep prior
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    Promise.all([
      SecureStore.getItemAsync(LIVE_ACTIVITY_KEY),
      SecureStore.getItemAsync(HIDE_FASTING_LIVE_KEY),
    ]).then(([stored, hideFasting]) => {
      if (stored === '0') setLiveActivityEnabledState(false);
      if (hideFasting === '1') setHideFastingOnLockScreenState(true);
      setLivePrefLoaded(true);
    });
    void ensureItemPreviewCache().then(() => setPreviewReady(true));
  }, []);

  useEffect(() => {
    if (isAuthenticated && !fetchedRef.current) {
      fetchedRef.current = true;
      void refresh();
    }
    if (!isAuthenticated) {
      fetchedRef.current = false;
      setInterested(null);
      setActive(null);
      setIsLoaded(false);
      void endFastingLiveActivity();
    }
  }, [isAuthenticated, refresh]);

  const nextGoal = pickNextLiveGoal(goalsState.goals);
  const liveTodos = nextGoal
    ? [
        {
          id: nextGoal.id,
          title: nextGoal.title,
          emoji:
            nextGoal.iconEmoji ||
            goalsState.iconArt[nextGoal.iconItemType]?.emoji ||
            (previewReady ? peekItemPreview(nextGoal.iconItemType)?.emoji : undefined),
          iconUrl:
            nextGoal.iconImageUrl ||
            goalsState.iconArt[nextGoal.iconItemType]?.imageUrl ||
            (previewReady ? peekItemPreview(nextGoal.iconItemType)?.imageUrl : undefined),
          letter: nextGoal.title.trim().charAt(0).toUpperCase() || '?',
        },
      ]
    : [];
  const liveTodoKey = liveTodos
    .map((todo) => `${todo.id}:${todo.iconUrl ?? ''}:${todo.emoji ?? ''}`)
    .join('|');

  useEffect(() => {
    if (!livePrefLoaded || Platform.OS !== 'ios') return;
    if (!isAuthenticated) return;
    const timer = setTimeout(() => {
      void syncFastingLiveActivity(active, {
        enabled: liveActivityEnabled,
        fastingEnabled: interested === true && !hideFastingOnLockScreen,
        petName,
        petImageUrl,
        todos: liveTodos,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [active, interested, hideFastingOnLockScreen, liveActivityEnabled, livePrefLoaded, isAuthenticated, petName, petImageUrl, liveTodoKey, previewReady]);

  const setInterest = useCallback(async (value: boolean) => {
    const data = await api.setFastingInterest(value);
    applyState(data, setInterested, setActive);
  }, []);

  const startFast = useCallback(async (goalHours: number) => {
    const data = await api.startFast(goalHours);
    applyState(data, setInterested, setActive);
  }, []);

  const endFast = useCallback(async () => {
    const data = await api.endFast();
    applyState(data, setInterested, setActive);
  }, []);

  const startNextFastFromLiveActivity = useCallback(async (force = false) => {
    if (Platform.OS !== 'ios' || !isAuthenticated || startingFromLiveRef.current) return;
    if (interested !== true) return;
    const fromFile = await consumePendingDoneEating();
    if (!force && !fromFile) return;
    startingFromLiveRef.current = true;
    try {
      const data = await api.startFast(activeRef.current?.goalHours ?? 16);
      applyState(data, setInterested, setActive);
    } catch {
      // User may not be fasting-enabled; ignore.
    } finally {
      startingFromLiveRef.current = false;
    }
  }, [isAuthenticated, interested]);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !isAuthenticated) return;
    void startNextFastFromLiveActivity(false);

    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void startNextFastFromLiveActivity(false);
    });
    const linkSub = Linking.addEventListener('url', ({ url }) => {
      if (isDoneEatingDeepLink(url)) void startNextFastFromLiveActivity(true);
    });
    void Linking.getInitialURL().then((url) => {
      if (takeInitialDoneEatingUrl(url)) void startNextFastFromLiveActivity(true);
    });

    return () => {
      appSub.remove();
      linkSub.remove();
    };
  }, [isAuthenticated, startNextFastFromLiveActivity]);

  const setLiveActivityEnabled = useCallback(async (enabled: boolean) => {
    setLiveActivityEnabledState(enabled);
    await SecureStore.setItemAsync(LIVE_ACTIVITY_KEY, enabled ? '1' : '0');
  }, []);

  const setHideFastingOnLockScreen = useCallback(async (hide: boolean) => {
    setHideFastingOnLockScreenState(hide);
    await SecureStore.setItemAsync(HIDE_FASTING_LIVE_KEY, hide ? '1' : '0');
  }, []);

  return (
    <FastingContext.Provider
      value={{
        interested,
        active,
        isLoaded,
        liveActivityEnabled,
        setLiveActivityEnabled,
        hideFastingOnLockScreen,
        setHideFastingOnLockScreen,
        refresh,
        setInterest,
        startFast,
        endFast,
      }}
    >
      {children}
    </FastingContext.Provider>
  );
}

export function useFasting(): FastingContextValue {
  const ctx = useContext(FastingContext);
  if (!ctx) throw new Error('useFasting must be used within <FastingProvider>');
  return ctx;
}
