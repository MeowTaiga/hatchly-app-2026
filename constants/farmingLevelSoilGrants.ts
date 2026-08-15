/**
 * Client mirror of hatchly-server-2026/src/constants/farmingLevelSoilGrants.ts
 * Used for farming skill detail unlocks. Keep in sync when rebalancing.
 *
 * Levels avoid farming perk milestones (5 / 15 / 30 / 50).
 */

export const FARMING_SOIL_ITEM_TYPE = 'soil';

export const FARMING_SOIL_GRANT_LEVELS = [
  6, 12, 18, 24, 32, 38, 44, 52, 58, 64, 70, 76, 82, 88, 94,
] as const;

export type FarmingSoilGrantLevel = (typeof FARMING_SOIL_GRANT_LEVELS)[number];

export const FARMING_LEVEL_SOIL_QTY: Record<FarmingSoilGrantLevel, number> = {
  6: 1,
  12: 1,
  18: 1,
  24: 1,
  32: 1,
  38: 1,
  44: 2,
  52: 2,
  58: 2,
  64: 2,
  70: 2,
  76: 2,
  82: 2,
  88: 2,
  94: 2,
};

export interface FarmingSoilGrantTier {
  level: number;
  qty: number;
}

export function farmingSoilGrantTiers(): FarmingSoilGrantTier[] {
  return FARMING_SOIL_GRANT_LEVELS.map((level) => ({
    level,
    qty: FARMING_LEVEL_SOIL_QTY[level],
  })).filter((t) => t.qty > 0);
}
