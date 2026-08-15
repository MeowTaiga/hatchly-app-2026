/** Mining stamina — keep in sync with hatchly-server-2026/src/constants/miningEnergy.ts */

export const BASE_MINING_ENERGY_CAP = 20;
export const MINING_ENERGY_REGEN_MS = 10 * 60 * 1000;
export const MINING_ENERGY_COST = 1;
export const MINING_ENERGY_CAP_BONUS = 5;

export const MINING_ENERGY_CAP_MILESTONES = [10, 25, 40, 55, 60, 65, 70, 80, 90, 99] as const;

export const MINING_ENERGY_EMPTY_MSG =
  "You're worn out — mining energy recharges 1 every 10 minutes.";

export function liveMiningEnergy(
  energy: number,
  cap: number,
  atMs: number,
  now = Date.now(),
): number {
  const safeCap = Number.isFinite(cap) && cap > 0 ? cap : BASE_MINING_ENERGY_CAP;
  const safeEnergy = Number.isFinite(energy) ? Math.max(0, energy) : 0;
  if (safeEnergy >= safeCap) return safeCap;
  if (!Number.isFinite(atMs) || atMs <= 0) return Math.min(safeCap, safeEnergy);
  const gained = Math.floor(Math.max(0, now - atMs) / MINING_ENERGY_REGEN_MS);
  return Math.min(safeCap, safeEnergy + gained);
}
