import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import {
  api,
  type ApiNotification,
  type CreateCustomGoalBody,
  type GoalRewardPayload,
  type GoalsTodayState,
  type UpdateGoalBody,
} from '@/lib/api';
import { useAuth } from '@/store/AuthProvider';
import { usePetHero } from '@/store/PetHeroProvider';
import { useGameSummary } from '@/hooks/useGameSummary';
import { showAppRewards } from '@/lib/showAppRewards';
import { useSocketEvent } from '@/lib/socket';
import {
  consumePendingTodoCompletions,
  isCompleteTodoDeepLink,
} from '@/lib/fastingLiveActivity';

const EMPTY: GoalsTodayState = {
  dateStr: '',
  dueCount: 0,
  completedCount: 0,
  rewardedCount: 0,
  goals: [],
  sharedGoals: [],
  marriage: null,
  catalog: [],
  iconPicker: [],
  iconArt: {},
};

interface GoalsContextValue {
  state: GoalsTodayState;
  isLoaded: boolean;
  refresh: () => Promise<void>;
  completeGoal: (id: string) => Promise<GoalRewardPayload>;
  uncompleteGoal: (id: string) => Promise<void>;
  createCustom: (body: CreateCustomGoalBody) => Promise<void>;
  updateGoal: (id: string, body: UpdateGoalBody) => Promise<void>;
  archiveGoal: (id: string) => Promise<void>;
  createShared: (body: CreateCustomGoalBody) => Promise<void>;
  shareCustom: (id: string, body?: UpdateGoalBody) => Promise<void>;
  updateShared: (id: string, body: UpdateGoalBody) => Promise<void>;
  archiveShared: (id: string) => Promise<void>;
  completeShared: (id: string) => Promise<GoalRewardPayload>;
  uncompleteShared: (id: string) => Promise<void>;
  proposeMarriage: (userId: string) => Promise<void>;
  respondToMarriage: (id: string, status: 'accepted' | 'rejected') => Promise<void>;
  endMarriage: () => Promise<void>;
}

const GoalsContext = createContext<GoalsContextValue | null>(null);

export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isHydrated, refreshUser } = useAuth();
  const { triggerXpGain } = usePetHero();
  const { refresh: refreshGameSummary } = useGameSummary();
  const [state, setState] = useState<GoalsTodayState>(EMPTY);
  const [isLoaded, setIsLoaded] = useState(false);
  const fetchedRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getGoals();
      setState({
        ...data,
        sharedGoals: data.sharedGoals ?? [],
        marriage: data.marriage ?? null,
      });
    } catch {
      fetchedRef.current = false;
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated) {
      fetchedRef.current = false;
      setState(EMPTY);
      setIsLoaded(false);
      return;
    }
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    void refresh();
  }, [isAuthenticated, isHydrated, refresh]);

  const onGoalNotification = useCallback(
    (payload: ApiNotification) => {
      if (
        payload.type === 'marriage_proposal' ||
        payload.type === 'marriage_accepted' ||
        payload.type === 'shared_goal_complete' ||
        payload.type === 'shared_goal_added'
      ) {
        void refresh();
      }
      if (payload.type !== 'shared_goal_complete') return;
      const data = payload.data ?? {};
      const itemType = typeof data.rewardItemType === 'string' ? data.rewardItemType : undefined;
      const label = typeof data.rewardItemLabel === 'string' ? data.rewardItemLabel : undefined;
      const xpGained = typeof data.xpGained === 'number' ? data.xpGained : Number(data.xpGained) || 0;
      if (!itemType && xpGained <= 0) return;
      if (xpGained > 0) triggerXpGain?.(xpGained);
      showAppRewards({
        xpGained,
        item:
          itemType && label
            ? {
                itemType,
                label,
                imageUrl: typeof data.rewardImageUrl === 'string' ? data.rewardImageUrl : undefined,
                emoji: typeof data.rewardEmoji === 'string' ? data.rewardEmoji : undefined,
                qty: typeof data.rewardQty === 'number' ? data.rewardQty : 1,
              }
            : undefined,
      });
      refreshGameSummary();
      if (xpGained > 0) void refreshUser();
    },
    [refresh, triggerXpGain, refreshGameSummary, refreshUser],
  );
  useSocketEvent<ApiNotification>('notification', onGoalNotification);

  const applyCompletion = useCallback(
    (data: GoalsTodayState & { reward: GoalRewardPayload }) => {
      const { reward, ...next } = data;
      setState(next);
      if (reward.xpGained > 0) triggerXpGain?.(reward.xpGained);
      if (reward.xpGained > 0 || reward.item) {
        showAppRewards({ xpGained: reward.xpGained, item: reward.item });
        refreshGameSummary();
      }
      if (reward.xpGained > 0) void refreshUser();
      return reward;
    },
    [triggerXpGain, refreshGameSummary, refreshUser],
  );

  const completeGoal = useCallback(
    async (id: string) => applyCompletion(await api.completeGoal(id)),
    [applyCompletion],
  );

  const uncompleteGoal = useCallback(async (id: string) => {
    setState(await api.uncompleteGoal(id));
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !isAuthenticated) return;

    const completeFromLockScreen = async (ids: string[]) => {
      const unique = [...new Set(ids.filter(Boolean))];
      for (const id of unique) {
        try {
          await completeGoal(id);
        } catch {
          // already done or missing
        }
      }
    };

    const flush = async () => {
      const pending = await consumePendingTodoCompletions();
      if (pending.length) await completeFromLockScreen(pending);
    };

    void flush();
    const appSub = AppState.addEventListener('change', (status) => {
      if (status === 'active') void flush();
    });
    const linkSub = Linking.addEventListener('url', ({ url }) => {
      const id = isCompleteTodoDeepLink(url);
      if (id) void completeFromLockScreen([id]);
    });
    const timer = setInterval(() => {
      void flush();
    }, 4000);
    return () => {
      appSub.remove();
      linkSub.remove();
      clearInterval(timer);
    };
  }, [isAuthenticated, completeGoal]);

  const createCustom = useCallback(async (body: CreateCustomGoalBody) => {
    setState(await api.createCustomGoal(body));
  }, []);

  const updateGoal = useCallback(async (id: string, body: UpdateGoalBody) => {
    setState(await api.updateGoal(id, body));
  }, []);

  const archiveGoal = useCallback(async (id: string) => {
    setState(await api.archiveGoal(id));
  }, []);

  const createShared = useCallback(async (body: CreateCustomGoalBody) => {
    setState(await api.createSharedGoal(body));
  }, []);

  const shareCustom = useCallback(async (id: string, body?: UpdateGoalBody) => {
    setState(await api.shareCustomGoal(id, body));
  }, []);

  const updateShared = useCallback(async (id: string, body: UpdateGoalBody) => {
    setState(await api.updateSharedGoal(id, body));
  }, []);

  const archiveShared = useCallback(async (id: string) => {
    setState(await api.archiveSharedGoal(id));
  }, []);

  const completeShared = useCallback(
    async (id: string) => applyCompletion(await api.completeSharedGoal(id)),
    [applyCompletion],
  );

  const uncompleteShared = useCallback(async (id: string) => {
    setState(await api.uncompleteSharedGoal(id));
  }, []);

  const proposeMarriage = useCallback(async (userId: string) => {
    setState(await api.proposeMarriage(userId));
  }, []);

  const respondToMarriage = useCallback(async (id: string, status: 'accepted' | 'rejected') => {
    setState(await api.respondToMarriage(id, status));
  }, []);

  const endMarriage = useCallback(async () => {
    setState(await api.endMarriage());
  }, []);

  return (
    <GoalsContext.Provider
      value={{
        state,
        isLoaded,
        refresh,
        completeGoal,
        uncompleteGoal,
        createCustom,
        updateGoal,
        archiveGoal,
        createShared,
        shareCustom,
        updateShared,
        archiveShared,
        completeShared,
        uncompleteShared,
        proposeMarriage,
        respondToMarriage,
        endMarriage,
      }}
    >
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoals(): GoalsContextValue {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error('useGoals must be used within <GoalsProvider>');
  return ctx;
}

/** Null outside the provider (e.g. bottom-sheet portals above the tab tree). */
export function useGoalsOptional(): GoalsContextValue | null {
  return useContext(GoalsContext);
}
