import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '@/lib/api';
import { useAuth } from '@/store/AuthProvider';
import { useWeight } from '@/store/WeightProvider';
import {
  NUTRIENT_KEYS,
  type MacroGoals,
  type NutrientKey,
  getDefaultGoals,
  mergeGoals,
} from '@/lib/nutrients';

const MACRO_ORDER_KEY = 'macro_order';

interface MacroGoalsContextValue {
  goals: MacroGoals;
  isLoaded: boolean;
  /** Ordered nutrient keys for display (chips, drawer). User can reorder. */
  orderedNutrientKeys: NutrientKey[];
  updateGoal: (key: NutrientKey, value: number) => Promise<void>;
  updateNutrientOrder: (order: NutrientKey[]) => Promise<void>;
  refresh: () => Promise<void>;
}

const MacroGoalsContext = createContext<MacroGoalsContextValue | null>(null);

function isValidOrder(order: unknown): order is NutrientKey[] {
  if (!Array.isArray(order) || order.length !== NUTRIENT_KEYS.length) return false;
  const set = new Set(NUTRIENT_KEYS);
  return order.every((k) => set.has(k)) && new Set(order).size === NUTRIENT_KEYS.length;
}

export function MacroGoalsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { dailyCalorieTarget } = useWeight();
  const [overrides, setOverrides] = useState<Partial<MacroGoals> | null>(null);
  const [orderedKeys, setOrderedKeys] = useState<NutrientKey[]>(() => [...NUTRIENT_KEYS]);
  const [isLoaded, setIsLoaded] = useState(false);
  const fetchedRef = useRef(false);

  const defaults = getDefaultGoals(dailyCalorieTarget);
  const goals = mergeGoals(defaults, overrides);

  useEffect(() => {
    SecureStore.getItemAsync(MACRO_ORDER_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (isValidOrder(parsed)) setOrderedKeys(parsed);
      } catch { /* ignore */ }
    });
  }, []);

  const updateNutrientOrder = useCallback(async (order: NutrientKey[]) => {
    if (!isValidOrder(order)) return;
    setOrderedKeys(order);
    await SecureStore.setItemAsync(MACRO_ORDER_KEY, JSON.stringify(order));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { goals: stored } = await api.getMacroGoals();
      setOverrides(stored && Object.keys(stored).length > 0 ? stored : null);
    } catch {
      setOverrides(null);
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
      setOverrides(null);
      setIsLoaded(false);
    }
  }, [isAuthenticated, refresh]);

  const updateGoal = useCallback(async (key: NutrientKey, value: number) => {
    const next = { ...(overrides ?? {}), [key]: value };
    setOverrides(next);
    try {
      await api.updateMacroGoals({ [key]: value });
    } catch {
      setOverrides(overrides);
    }
  }, [overrides]);

  return (
    <MacroGoalsContext.Provider value={{ goals, isLoaded, orderedNutrientKeys: orderedKeys, updateGoal, updateNutrientOrder, refresh }}>
      {children}
    </MacroGoalsContext.Provider>
  );
}

export function useMacroGoals(): MacroGoalsContextValue {
  const ctx = useContext(MacroGoalsContext);
  if (!ctx) throw new Error('useMacroGoals must be used within <MacroGoalsProvider>');
  return ctx;
}
