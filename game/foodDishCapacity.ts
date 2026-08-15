/**
 * Food dish queue capacity — mirrors server getMaxFoodDishQueueSize.
 * Base 5 + 2 per farm level, hard-capped at 25.
 */
export function getMaxFoodDishQueueSize(farmLevel: number): number {
  const level = Math.max(1, Math.floor(farmLevel) || 1);
  return Math.min(25, 5 + level * 2);
}
