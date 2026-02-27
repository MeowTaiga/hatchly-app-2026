import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, localDateStr, type WaterLogEntry } from '@/lib/api';
import { useAuth } from '@/store/AuthProvider';
import { useRefreshOnDayChange } from '@/hooks/useRefreshOnDayChange';

interface WaterContextValue {
  logs: WaterLogEntry[];
  totalOz: number;
  goalOz: number;
  goalSourceWeightLbs: number | null;
  isLoaded: boolean;
  refresh: () => Promise<void>;
  logWater: (amountOz: number) => Promise<{ xpGained: number; gemsAwarded?: number }>;
}

const WaterContext = createContext<WaterContextValue | null>(null);
const DEFAULT_GOAL_OZ = 64;

export function WaterProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [logs, setLogs] = useState<WaterLogEntry[]>([]);
  const [totalOz, setTotalOz] = useState(0);
  const [goalOz, setGoalOz] = useState(DEFAULT_GOAL_OZ);
  const [goalSourceWeightLbs, setGoalSourceWeightLbs] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const fetchedRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getWaterLog();
      setLogs(data.logs);
      setTotalOz(Math.round(data.totalOz * 10) / 10);
      setGoalOz(data.goalOz || DEFAULT_GOAL_OZ);
      setGoalSourceWeightLbs(data.goalSourceWeightLbs ?? null);
      setIsLoaded(true);
    } catch {
      setIsLoaded(true);
    }
  }, []);

  const refreshWithDayCheck = useRefreshOnDayChange(refresh);

  useEffect(() => {
    if (isAuthenticated && !fetchedRef.current) {
      fetchedRef.current = true;
      refreshWithDayCheck();
    }
    if (!isAuthenticated) {
      fetchedRef.current = false;
      setLogs([]);
      setTotalOz(0);
      setGoalOz(DEFAULT_GOAL_OZ);
      setGoalSourceWeightLbs(null);
      setIsLoaded(false);
    }
  }, [isAuthenticated, refreshWithDayCheck]);

  const logWater = useCallback(async (amountOz: number) => {
    const safeAmount = Math.round(amountOz * 10) / 10;
    const tempId = `temp-${Date.now()}`;
    const date = localDateStr();
    const optimistic: WaterLogEntry = { id: tempId, amountOz: safeAmount, date };

    setLogs((prev) => [optimistic, ...prev]);
    setTotalOz((prev) => Math.round((prev + safeAmount) * 10) / 10);

    try {
      const result = await api.logWater(safeAmount);
      setLogs((prev) => prev.map((l) => (l.id === tempId ? result.log : l)));
      return { xpGained: result.xpGained, gemsAwarded: result.gemsAwarded ?? 0 };
    } catch (err) {
      setLogs((prev) => prev.filter((l) => l.id !== tempId));
      setTotalOz((prev) => Math.max(0, Math.round((prev - safeAmount) * 10) / 10));
      throw err;
    }
  }, []);

  return (
    <WaterContext.Provider value={{ logs, totalOz, goalOz, goalSourceWeightLbs, isLoaded, refresh: refreshWithDayCheck, logWater }}>
      {children}
    </WaterContext.Provider>
  );
}

export function useWater(): WaterContextValue {
  const ctx = useContext(WaterContext);
  if (!ctx) throw new Error('useWater must be used within <WaterProvider>');
  return ctx;
}
