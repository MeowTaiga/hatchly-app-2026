import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, localDateStr, type WeightLogEntry, type WeightGoalData, type RateOption } from '@/lib/api';
import { useAuth } from '@/store/AuthProvider';
import { useRefreshOnDayChange } from '@/hooks/useRefreshOnDayChange';

// ─── Types ──────────────────────────────────────────────────────────────────

interface WeightContextValue {
  /** Current weight (latest log or onboarding weight) */
  currentWeight: number | null;
  /** Today's log entry (null if not yet logged today) */
  todayLog: WeightLogEntry | null;
  /** Weekly change in lbs (negative = loss, positive = gain) */
  weeklyChange: number | null;
  /** Goal weight from onboarding */
  goalWeight: number;
  /** All recent logs */
  logs: WeightLogEntry[];
  isLoaded: boolean;
  refresh: () => Promise<void>;
  logWeight: (weight: number) => Promise<{ xpGained: number; gemsAwarded?: number }>;
  updateTodayWeight: (weight: number) => Promise<void>;
  /** Active calorie goal (null if user hasn't set one yet) */
  goal: WeightGoalData | null;
  /** Daily calorie target from goal (falls back to 2000 if no goal) */
  dailyCalorieTarget: number;
  /** TDEE calculated from profile */
  tdee: number | null;
  /** Available rate-based options for goal setup */
  rateOptions: RateOption[];
  /** Whether goal data has been fetched */
  goalLoaded: boolean;
  /** Set a new calorie goal by rate or direct calories */
  setGoal: (params: { weeklyRateLbs: number } | { dailyCalories: number }) => Promise<void>;
  /** Refresh goal data */
  refreshGoal: () => Promise<void>;
}

const WeightContext = createContext<WeightContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

export function WeightProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [logs, setLogs] = useState<WeightLogEntry[]>([]);
  const [todayLog, setTodayLog] = useState<WeightLogEntry | null>(null);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [weeklyChange, setWeeklyChange] = useState<number | null>(null);
  const [goalWeight, setGoalWeight] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const fetchedRef = useRef(false);

  // Goal state
  const [goal, setGoalState] = useState<WeightGoalData | null>(null);
  const [tdee, setTdee] = useState<number | null>(null);
  const [rateOptions, setRateOptions] = useState<RateOption[]>([]);
  const [goalLoaded, setGoalLoaded] = useState(false);

  const dailyCalorieTarget = goal?.dailyCalories ?? 2000;

  const refresh = useCallback(async () => {
    try {
      const data = await api.getWeightLog();
      setLogs(data.logs);
      setTodayLog(data.today);
      setCurrentWeight(data.latest?.weight ?? data.onboardingWeight ?? null);
      setWeeklyChange(data.weeklyChange);
      if (data.onboardingGoalWeight) setGoalWeight(data.onboardingGoalWeight);
      setIsLoaded(true);
    } catch {
      setIsLoaded(true);
    }
  }, []);

  const refreshGoal = useCallback(async () => {
    try {
      const data = await api.getWeightGoal();
      setGoalState(data.goal);
      setTdee(data.tdee);
      setRateOptions(data.rateOptions);
      if (data.goalWeight) setGoalWeight(data.goalWeight);
      setGoalLoaded(true);
    } catch {
      setGoalLoaded(true);
    }
  }, []);

  const refreshWithDayCheck = useRefreshOnDayChange(refresh);

  useEffect(() => {
    if (isAuthenticated && !fetchedRef.current) {
      fetchedRef.current = true;
      refreshWithDayCheck();
      refreshGoal();
    }
    if (!isAuthenticated) {
      fetchedRef.current = false;
      setLogs([]);
      setTodayLog(null);
      setCurrentWeight(null);
      setWeeklyChange(null);
      setIsLoaded(false);
      setGoalState(null);
      setTdee(null);
      setRateOptions([]);
      setGoalLoaded(false);
    }
  }, [isAuthenticated, refreshWithDayCheck, refreshGoal]);

  const logWeight = useCallback(async (weight: number) => {
    const tempId = `temp-${Date.now()}`;
    const date = localDateStr();
    const optimistic: WeightLogEntry = { id: tempId, weight, date };

    setTodayLog(optimistic);
    setCurrentWeight(weight);

    try {
      const result = await api.logWeight(weight);
      setTodayLog(result.log);
      refresh();
      return { xpGained: result.xpGained, gemsAwarded: result.gemsAwarded ?? 0 };
    } catch (err) {
      setTodayLog(null);
      setCurrentWeight(logs[0]?.weight ?? null);
      throw err;
    }
  }, [logs, refresh]);

  const updateTodayWeight = useCallback(async (weight: number) => {
    const prev = todayLog;
    if (todayLog) {
      setTodayLog({ ...todayLog, weight });
      setCurrentWeight(weight);
    }

    try {
      const result = await api.updateTodayWeight(weight);
      setTodayLog(result.log);
      refresh();
    } catch {
      setTodayLog(prev);
      setCurrentWeight(prev?.weight ?? logs[0]?.weight ?? null);
    }
  }, [todayLog, logs, refresh]);

  const setGoal = useCallback(async (params: { weeklyRateLbs: number } | { dailyCalories: number }) => {
    const { goal: newGoal } = await api.setWeightGoal(params);
    setGoalState(newGoal);
  }, []);

  return (
    <WeightContext.Provider value={{
      currentWeight, todayLog, weeklyChange, goalWeight,
      logs, isLoaded, refresh: refreshWithDayCheck, logWeight, updateTodayWeight,
      goal, dailyCalorieTarget, tdee, rateOptions, goalLoaded, setGoal, refreshGoal,
    }}>
      {children}
    </WeightContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useWeight(): WeightContextValue {
  const ctx = useContext(WeightContext);
  if (!ctx) throw new Error('useWeight must be used within <WeightProvider>');
  return ctx;
}
