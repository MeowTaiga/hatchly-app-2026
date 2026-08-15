/**
 * useHealthRangeData — fetches and aggregates food, water, steps for the given period.
 * Single hook for all period-dependent health data. Used by health cards.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '@/lib/api';
import { useWeight } from '@/store/WeightProvider';
import { getDateRange } from '@/lib/healthPeriod';
import {
  aggregateWeightByPeriod,
  aggregateNutritionByPeriod,
  aggregateWaterByPeriod,
  aggregateStepsByPeriod,
  type WeightAggregate,
  type NutritionAggregate,
  type WaterAggregate,
  type StepsAggregate,
} from '@/lib/healthAggregates';
import type { HealthPeriod } from '@/lib/healthPeriod';
import type { FoodLogRangeDaily, WaterLogRangeDaily } from '@/lib/api';
import { getStepCountRange } from '@/lib/healthkit';

export interface HealthRangeData {
  weightData: WeightAggregate;
  foodData: NutritionAggregate | null;
  waterData: WaterAggregate | null;
  stepsData: StepsAggregate | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useHealthRangeData(period: HealthPeriod): HealthRangeData {
  const { logs: weightLogs } = useWeight();
  const [foodDaily, setFoodDaily] = useState<FoodLogRangeDaily[]>([]);
  const [waterDaily, setWaterDaily] = useState<WaterLogRangeDaily[]>([]);
  const [waterGoalOz, setWaterGoalOz] = useState(64);
  const [stepsDaily, setStepsDaily] = useState<Array<{ date: string; steps: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { start, end } = useMemo(() => {
    // Food/water/steps APIs expect a bounded range; for "all" use a year window.
    if (period === 'all') {
      const now = new Date();
      const endDate = now.toISOString().slice(0, 10);
      const startDate = new Date(now);
      startDate.setFullYear(startDate.getFullYear() - 1);
      return { start: startDate.toISOString().slice(0, 10), end: endDate };
    }
    return getDateRange(period);
  }, [period]);

  const fetchRange = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [foodRes, waterRes] = await Promise.all([
        api.getFoodLogRange(start, end),
        api.getWaterLogRange(start, end),
      ]);
      setFoodDaily(foodRes.daily);
      setWaterDaily(waterRes.daily);
      setWaterGoalOz(waterRes.goalOz);

      const startDate = new Date(start);
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
      const steps = await getStepCountRange(startDate, endDate);
      setStepsDaily(steps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load health data');
      setFoodDaily([]);
      setWaterDaily([]);
      setStepsDaily([]);
    } finally {
      setIsLoading(false);
    }
  }, [start, end]);

  useEffect(() => {
    fetchRange();
  }, [fetchRange]);

  const weightData = useMemo(
    () => aggregateWeightByPeriod(weightLogs, period),
    [weightLogs, period],
  );

  const foodData = useMemo(
    () => aggregateNutritionByPeriod(foodDaily, period),
    [foodDaily, period],
  );

  const waterData = useMemo(
    () => aggregateWaterByPeriod(waterDaily, waterGoalOz, period),
    [waterDaily, waterGoalOz, period],
  );

  const stepsData = useMemo(
    () => aggregateStepsByPeriod(stepsDaily, period),
    [stepsDaily, period],
  );

  return {
    weightData,
    foodData,
    waterData,
    stepsData,
    isLoading,
    error,
    refresh: fetchRange,
  };
}
