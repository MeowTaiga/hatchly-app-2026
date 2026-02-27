import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, type FoodLogEntry, type MealType } from '@/lib/api';
import { useAuth } from '@/store/AuthProvider';
import { useRefreshOnDayChange } from '@/hooks/useRefreshOnDayChange';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Totals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  sugar: number;
  fiber: number;
  saturatedFat: number;
  transFat: number;
  addedSugars: number;
  sodium: number;
  potassium: number;
  cholesterol: number;
  iron: number;
  calcium: number;
  vitaminA: number;
  vitaminC: number;
  vitaminD: number;
}

interface FoodContextValue {
  logs: FoodLogEntry[];
  totals: Totals;
  isLoaded: boolean;
  refresh: () => Promise<void>;
  logFood: (data: {
    foodId: string;
    foodName: string;
    brandName?: string;
    servingDescription: string;
    numberOfServings: number;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    sugar?: number;
    fiber?: number;
    saturatedFat?: number;
    transFat?: number;
    addedSugars?: number;
    sodium?: number;
    potassium?: number;
    cholesterol?: number;
    iron?: number;
    calcium?: number;
    vitaminA?: number;
    vitaminC?: number;
    vitaminD?: number;
    mealType: MealType;
  }) => Promise<{ xpGained: number; gemsAwarded?: number }>;
  deleteLog: (id: string) => Promise<void>;
  updateLogMeal: (id: string, mealType: MealType) => Promise<void>;
}

const EMPTY_TOTALS: Totals = { calories: 0, protein: 0, fat: 0, carbs: 0, sugar: 0, fiber: 0, saturatedFat: 0, transFat: 0, addedSugars: 0, sodium: 0, potassium: 0, cholesterol: 0, iron: 0, calcium: 0, vitaminA: 0, vitaminC: 0, vitaminD: 0 };

// ─── Context ────────────────────────────────────────────────────────────────

const FoodContext = createContext<FoodContextValue | null>(null);

// ─── Helpers ────────────────────────────────────────────────────────────────

const safe = (v: number | undefined) => v ?? 0;

function computeTotals(logs: FoodLogEntry[]): Totals {
  return logs.reduce(
    (acc, l) => ({
      ...acc,
      calories: acc.calories + Math.round(l.calories * l.numberOfServings),
      protein: acc.protein + +(safe(l.protein) * l.numberOfServings).toFixed(1),
      fat: acc.fat + +(safe(l.fat) * l.numberOfServings).toFixed(1),
      carbs: acc.carbs + +(safe(l.carbs) * l.numberOfServings).toFixed(1),
      sugar: acc.sugar + +(safe(l.sugar) * l.numberOfServings).toFixed(1),
      fiber: acc.fiber + +(safe(l.fiber) * l.numberOfServings).toFixed(1),
      saturatedFat: acc.saturatedFat + +(safe(l.saturatedFat) * l.numberOfServings).toFixed(1),
      transFat: acc.transFat + +(safe(l.transFat) * l.numberOfServings).toFixed(1),
      addedSugars: acc.addedSugars + +(safe(l.addedSugars) * l.numberOfServings).toFixed(1),
      sodium: acc.sodium + Math.round(safe(l.sodium) * l.numberOfServings),
      potassium: acc.potassium + Math.round(safe(l.potassium) * l.numberOfServings),
      cholesterol: acc.cholesterol + Math.round(safe(l.cholesterol) * l.numberOfServings),
      iron: acc.iron + Math.round(safe(l.iron) * l.numberOfServings),
      calcium: acc.calcium + Math.round(safe(l.calcium) * l.numberOfServings),
      vitaminA: acc.vitaminA + Math.round(safe(l.vitaminA) * l.numberOfServings),
      vitaminC: acc.vitaminC + Math.round(safe(l.vitaminC) * l.numberOfServings),
      vitaminD: acc.vitaminD + Math.round(safe(l.vitaminD) * l.numberOfServings),
    }),
    { ...EMPTY_TOTALS },
  );
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function FoodProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [logs, setLogs] = useState<FoodLogEntry[]>([]);
  const [totals, setTotals] = useState<Totals>(EMPTY_TOTALS);
  const [isLoaded, setIsLoaded] = useState(false);
  const fetchedRef = useRef(false);

  // ── Fetch from backend ──────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    try {
      const { logs: serverLogs, totals: serverTotals } = await api.getFoodLog();
      setLogs(serverLogs);
      setTotals({
        calories: Math.round(serverTotals.calories),
        protein: Math.round(serverTotals.protein * 10) / 10,
        fat: Math.round(serverTotals.fat * 10) / 10,
        carbs: Math.round(serverTotals.carbs * 10) / 10,
        sugar: Math.round((serverTotals.sugar ?? 0) * 10) / 10,
        fiber: Math.round((serverTotals.fiber ?? 0) * 10) / 10,
        saturatedFat: Math.round((serverTotals.saturatedFat ?? 0) * 10) / 10,
        transFat: Math.round((serverTotals.transFat ?? 0) * 10) / 10,
        addedSugars: Math.round((serverTotals.addedSugars ?? 0) * 10) / 10,
        sodium: Math.round(serverTotals.sodium ?? 0),
        potassium: Math.round(serverTotals.potassium ?? 0),
        cholesterol: Math.round(serverTotals.cholesterol ?? 0),
        iron: Math.round(serverTotals.iron ?? 0),
        calcium: Math.round(serverTotals.calcium ?? 0),
        vitaminA: Math.round(serverTotals.vitaminA ?? 0),
        vitaminC: Math.round(serverTotals.vitaminC ?? 0),
        vitaminD: Math.round(serverTotals.vitaminD ?? 0),
      });
      setIsLoaded(true);
    } catch {
      setIsLoaded(true);
    }
  }, []);

  const refreshWithDayCheck = useRefreshOnDayChange(refresh);

  // Auto-fetch on authentication; also re-fetches when app returns from background and day changed
  useEffect(() => {
    if (isAuthenticated && !fetchedRef.current) {
      fetchedRef.current = true;
      refreshWithDayCheck();
    }
    if (!isAuthenticated) {
      fetchedRef.current = false;
      setLogs([]);
      setTotals(EMPTY_TOTALS);
      setIsLoaded(false);
    }
  }, [isAuthenticated, refreshWithDayCheck]);

  // ── Optimistic log food ─────────────────────────────────────────────────

  const logFood = useCallback(async (data: Parameters<FoodContextValue['logFood']>[0]) => {
    // Optimistic: add a temporary entry
    const tempId = `temp-${Date.now()}`;
    const optimistic: FoodLogEntry = {
      id: tempId,
      foodId: data.foodId,
      foodName: data.foodName,
      brandName: data.brandName,
      servingDescription: data.servingDescription,
      numberOfServings: data.numberOfServings,
      calories: data.calories,
      protein: data.protein,
      fat: data.fat,
      carbs: data.carbs,
      sugar: data.sugar,
      fiber: data.fiber,
      saturatedFat: data.saturatedFat,
      transFat: data.transFat,
      addedSugars: data.addedSugars,
      sodium: data.sodium,
      potassium: data.potassium,
      cholesterol: data.cholesterol,
      iron: data.iron,
      calcium: data.calcium,
      vitaminA: data.vitaminA,
      vitaminC: data.vitaminC,
      vitaminD: data.vitaminD,
      mealType: data.mealType,
      loggedAt: new Date().toISOString(),
    };

    const mult = data.numberOfServings;
    setLogs((prev) => [optimistic, ...prev]);
    setTotals((prev) => ({
      calories: prev.calories + Math.round(data.calories * mult),
      protein: prev.protein + +(data.protein * mult).toFixed(1),
      fat: prev.fat + +(data.fat * mult).toFixed(1),
      carbs: prev.carbs + +(data.carbs * mult).toFixed(1),
      sugar: prev.sugar + +(safe(data.sugar) * mult).toFixed(1),
      fiber: prev.fiber + +(safe(data.fiber) * mult).toFixed(1),
      saturatedFat: prev.saturatedFat + +(safe(data.saturatedFat) * mult).toFixed(1),
      transFat: prev.transFat + +(safe(data.transFat) * mult).toFixed(1),
      addedSugars: prev.addedSugars + +(safe(data.addedSugars) * mult).toFixed(1),
      sodium: prev.sodium + Math.round(safe(data.sodium) * mult),
      potassium: prev.potassium + Math.round(safe(data.potassium) * mult),
      cholesterol: prev.cholesterol + Math.round(safe(data.cholesterol) * mult),
      iron: prev.iron + Math.round(safe(data.iron) * mult),
      calcium: prev.calcium + Math.round(safe(data.calcium) * mult),
      vitaminA: prev.vitaminA + Math.round(safe(data.vitaminA) * mult),
      vitaminC: prev.vitaminC + Math.round(safe(data.vitaminC) * mult),
      vitaminD: prev.vitaminD + Math.round(safe(data.vitaminD) * mult),
    }));

    try {
      const result = await api.logFood(data);
      // Replace temp entry with real one from server
      setLogs((prev) =>
        prev.map((l) => (l.id === tempId ? result.log : l)),
      );
      return { xpGained: result.xpGained, gemsAwarded: result.gemsAwarded ?? 0 };
    } catch (err) {
      // Rollback on failure
      setLogs((prev) => prev.filter((l) => l.id !== tempId));
      const mult = data.numberOfServings;
      setTotals((prev) => ({
        calories: prev.calories - Math.round(data.calories * mult),
        protein: prev.protein - +(data.protein * mult).toFixed(1),
        fat: prev.fat - +(data.fat * mult).toFixed(1),
        carbs: prev.carbs - +(data.carbs * mult).toFixed(1),
        sugar: prev.sugar - +(safe(data.sugar) * mult).toFixed(1),
        fiber: prev.fiber - +(safe(data.fiber) * mult).toFixed(1),
        saturatedFat: prev.saturatedFat - +(safe(data.saturatedFat) * mult).toFixed(1),
        transFat: prev.transFat - +(safe(data.transFat) * mult).toFixed(1),
        addedSugars: prev.addedSugars - +(safe(data.addedSugars) * mult).toFixed(1),
        sodium: prev.sodium - Math.round(safe(data.sodium) * mult),
        potassium: prev.potassium - Math.round(safe(data.potassium) * mult),
        cholesterol: prev.cholesterol - Math.round(safe(data.cholesterol) * mult),
        iron: prev.iron - Math.round(safe(data.iron) * mult),
        calcium: prev.calcium - Math.round(safe(data.calcium) * mult),
        vitaminA: prev.vitaminA - Math.round(safe(data.vitaminA) * mult),
        vitaminC: prev.vitaminC - Math.round(safe(data.vitaminC) * mult),
        vitaminD: prev.vitaminD - Math.round(safe(data.vitaminD) * mult),
      }));
      throw err;
    }
  }, []);

  // ── Optimistic delete ───────────────────────────────────────────────────

  const deleteLog = useCallback(async (id: string) => {
    const prev = logs;
    const entry = prev.find((l) => l.id === id);
    if (!entry) return;

    // Optimistic remove
    setLogs((p) => p.filter((l) => l.id !== id));
    const mult = entry.numberOfServings;
    setTotals((p) => ({
      calories: p.calories - Math.round(entry.calories * mult),
      protein: p.protein - +(safe(entry.protein) * mult).toFixed(1),
      fat: p.fat - +(safe(entry.fat) * mult).toFixed(1),
      carbs: p.carbs - +(safe(entry.carbs) * mult).toFixed(1),
      sugar: p.sugar - +(safe(entry.sugar) * mult).toFixed(1),
      fiber: p.fiber - +(safe(entry.fiber) * mult).toFixed(1),
      saturatedFat: p.saturatedFat - +(safe(entry.saturatedFat) * mult).toFixed(1),
      transFat: p.transFat - +(safe(entry.transFat) * mult).toFixed(1),
      addedSugars: p.addedSugars - +(safe(entry.addedSugars) * mult).toFixed(1),
      sodium: p.sodium - Math.round(safe(entry.sodium) * mult),
      potassium: p.potassium - Math.round(safe(entry.potassium) * mult),
      cholesterol: p.cholesterol - Math.round(safe(entry.cholesterol) * mult),
      iron: p.iron - Math.round(safe(entry.iron) * mult),
      calcium: p.calcium - Math.round(safe(entry.calcium) * mult),
      vitaminA: p.vitaminA - Math.round(safe(entry.vitaminA) * mult),
      vitaminC: p.vitaminC - Math.round(safe(entry.vitaminC) * mult),
      vitaminD: p.vitaminD - Math.round(safe(entry.vitaminD) * mult),
    }));

    try {
      await api.deleteFoodLog(id);
    } catch {
      // Rollback
      setLogs(prev);
      setTotals(computeTotals(prev));
    }
  }, [logs]);

  // ── Optimistic meal type change ─────────────────────────────────────────

  const updateLogMeal = useCallback(async (id: string, mealType: MealType) => {
    const prev = logs;

    setLogs((p) =>
      p.map((l) => (l.id === id ? { ...l, mealType } : l)),
    );

    try {
      await api.updateFoodLog(id, { mealType });
    } catch {
      setLogs(prev);
    }
  }, [logs]);

  return (
    <FoodContext.Provider value={{ logs, totals, isLoaded, refresh: refreshWithDayCheck, logFood, deleteLog, updateLogMeal }}>
      {children}
    </FoodContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useFood(): FoodContextValue {
  const ctx = useContext(FoodContext);
  if (!ctx) throw new Error('useFood must be used within <FoodProvider>');
  return ctx;
}
