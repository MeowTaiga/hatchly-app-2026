/**
 * Health aggregation utilities — compute summaries from daily/range data.
 * Used by health cards for weekly/monthly views. Single source of truth for aggregate logic.
 */

import type { HealthPeriod } from './healthPeriod';
import { getDateRange } from './healthPeriod';
import type { WeightLogEntry } from '@/lib/api';
import type { FoodLogRangeDaily, WaterLogRangeDaily } from '@/lib/api';

export interface WeightAggregate {
  points: Array<{ date: string; weight: number }>;
  min: number;
  max: number;
  avg: number;
  trend: number | null;
  latest: WeightLogEntry | null;
}

/**
 * Filter weight logs to period range and compute chart points + summary stats.
 */
export function aggregateWeightByPeriod(
  logs: WeightLogEntry[],
  period: HealthPeriod,
): WeightAggregate {
  const { start, end } = getDateRange(period);
  const filtered = logs
    .filter((l) => l.date >= start && l.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (filtered.length === 0) {
    return { points: [], min: 0, max: 200, avg: 0, trend: null, latest: null };
  }

  const weights = filtered.map((l) => l.weight);
  const min = Math.min(...weights) - 2;
  const max = Math.max(...weights) + 2;
  const avg = weights.reduce((s, w) => s + w, 0) / weights.length;
  const latest = filtered[filtered.length - 1];
  let trend: number | null = null;
  if (filtered.length >= 2) {
    trend = +(latest.weight - filtered[0].weight).toFixed(1);
  }

  const points = filtered.map((l) => ({ date: l.date, weight: l.weight }));
  return { points, min, max, avg, trend, latest };
}

export interface NutritionAggregate {
  avgCalories: number;
  avgProtein: number;
  avgFat: number;
  avgCarbs: number;
  daysWithData: number;
  totalDays: number;
}

/**
 * Compute average macros over the period from daily food totals.
 */
export function aggregateNutritionByPeriod(
  daily: FoodLogRangeDaily[],
  period: HealthPeriod,
): NutritionAggregate {
  const { start, end } = getDateRange(period);
  const inRange = daily.filter((d) => d.date >= start && d.date <= end);
  const withData = inRange.filter((d) => (d.totals?.calories ?? 0) > 0);

  if (withData.length === 0) {
    return { avgCalories: 0, avgProtein: 0, avgFat: 0, avgCarbs: 0, daysWithData: 0, totalDays: inRange.length || 1 };
  }

  const sum = withData.reduce(
    (acc, d) => ({
      calories: acc.calories + (d.totals?.calories ?? 0),
      protein: acc.protein + (d.totals?.protein ?? 0),
      fat: acc.fat + (d.totals?.fat ?? 0),
      carbs: acc.carbs + (d.totals?.carbs ?? 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 },
  );

  const n = withData.length;
  return {
    avgCalories: Math.round(sum.calories / n),
    avgProtein: Math.round((sum.protein / n) * 10) / 10,
    avgFat: Math.round((sum.fat / n) * 10) / 10,
    avgCarbs: Math.round((sum.carbs / n) * 10) / 10,
    daysWithData: n,
    totalDays: inRange.length,
  };
}

export interface WaterAggregate {
  avgOz: number;
  daysMetGoal: number;
  totalDays: number;
  goalOz: number;
}

/**
 * Compute water stats over the period.
 */
export function aggregateWaterByPeriod(
  daily: WaterLogRangeDaily[],
  goalOz: number,
  period: HealthPeriod,
): WaterAggregate {
  const { start, end } = getDateRange(period);
  const inRange = daily.filter((d) => d.date >= start && d.date <= end);
  const daysMetGoal = inRange.filter((d) => d.totalOz >= goalOz).length;
  const totalOz = inRange.reduce((s, d) => s + d.totalOz, 0);
  const n = inRange.length || 1;

  return {
    avgOz: Math.round((totalOz / n) * 10) / 10,
    daysMetGoal,
    totalDays: inRange.length,
    goalOz,
  };
}

export interface StepsAggregate {
  total: number;
  avgPerDay: number;
  daysMetGoal: number;
  totalDays: number;
}

const STEP_GOAL = 10000;

/**
 * Compute step stats over the period.
 */
export function aggregateStepsByPeriod(
  dailySteps: Array<{ date: string; steps: number }>,
  period: HealthPeriod,
): StepsAggregate {
  const { start, end } = getDateRange(period);
  const inRange = dailySteps.filter((d) => d.date >= start && d.date <= end);
  const total = inRange.reduce((s, d) => s + d.steps, 0);
  const n = inRange.length || 1;
  const daysMetGoal = inRange.filter((d) => d.steps >= STEP_GOAL).length;

  return {
    total,
    avgPerDay: Math.round(total / n),
    daysMetGoal,
    totalDays: inRange.length,
  };
}

export { STEP_GOAL };
