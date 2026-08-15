/**
 * Client mirror of hatchly-server-2026/src/constants/farmingLevelSeedShopUnlocks.ts
 * Used for farming skill detail unlocks + level-up toast shop previews.
 * Keep in sync when rebalancing.
 *
 * Unlocking a seed here means the player can BUY it in the shop — not an
 * inventory grant. Rare/event seeds are omitted on purpose.
 */

export const FARMING_SEED_SHOP_UNLOCK_LEVELS = [
  2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42,
  44, 46, 48, 50, 52, 54, 56, 58,
] as const;

export type FarmingSeedShopUnlockLevel = (typeof FARMING_SEED_SHOP_UNLOCK_LEVELS)[number];

export const FARMING_LEVEL_SEED_SHOP_UNLOCKS: Record<
  FarmingSeedShopUnlockLevel,
  readonly string[]
> = {
  2: ['grass_seed', 'clover_seed'],
  4: ['carrot_seed', 'radish_seed'],
  6: ['lettuce_seed', 'spinach_seed'],
  8: ['green_onion_seed', 'potato_seed'],
  10: ['turnip_seed'],
  12: ['tomato_seeds', 'corn_seed'],
  14: ['cucumber_seed', 'pumpkin_seed'],
  16: ['bell_pepper_seed', 'chili_pepper_seed'],
  18: ['eggplant_seed', 'cabbage_seed'],
  20: ['broccoli_seed', 'cauliflower_seed'],
  22: ['onion_seed', 'garlic_seed'],
  24: ['celery_seed', 'pea_seed'],
  26: ['bean_seed', 'sugar_cane_seed'],
  28: ['strawberry_seed', 'blueberry_seed'],
  30: ['raspberry_seed', 'blackberry_seed'],
  32: ['watermelon_seeds', 'melon_seed'],
  34: ['basil_seed', 'mint_seed'],
  36: ['rosemary_seed', 'thyme_seed'],
  38: ['oregano_seed', 'sage_seed'],
  40: ['parsley_seed', 'dill_seed'],
  42: ['chive_seed', 'lavender_seed'],
  44: ['chamomile_seed', 'cilantro_seed'],
  46: ['tarragon_seed', 'bay_seed'],
  48: ['fennel_seed'],
  50: ['sunflower_seed', 'daisy_seed'],
  52: ['rose_seed', 'tulip_bulb'],
  54: ['marigold_seed', 'cosmos_seed'],
  56: ['poppy_seed', 'lily_bulb'],
  58: ['hibiscus_seed', 'iris_bulb'],
};

export const FARMING_STARTER_SHOP_SEEDS = ['wheat_seed'] as const;

export const FARMING_RESERVED_EVENT_SEEDS = [
  'orchid_seed',
  'lotus_seed',
  'lavender_flower_seed',
  'peony_bulb',
  'hydrangea_seed',
  'brown_mushroom_spores',
  'red_mushroom_spores',
  'shiitake_spores',
  'oyster_mushroom_spores',
  'morel_spores',
  'glow_mushroom_spores',
  'moss_mushroom_spores',
  'fairy_mushroom_spores',
  'truffle_spores',
  'mooncap_spores',
  'crystal_berry_seed',
  'moon_blossom_seed',
  'sunfruit_seed',
  'starfruit_seed',
  'dragonfruit_seed',
  'spirit_melon_seed',
  'aurora_berry_seed',
  'honey_blossom_seed',
  'rainbow_flower_seed',
  'frost_berry_seed',
  'ember_pepper_seed',
  'dream_fruit_seed',
  'celestial_herb_seed',
  'okra_seed',
] as const;

export interface FarmingSeedShopUnlockTier {
  level: number;
  seedItemTypes: readonly string[];
}

export function farmingSeedShopUnlockTiers(): FarmingSeedShopUnlockTier[] {
  return FARMING_SEED_SHOP_UNLOCK_LEVELS.filter(
    (level) => (FARMING_LEVEL_SEED_SHOP_UNLOCKS[level]?.length ?? 0) > 0,
  ).map((level) => ({
    level,
    seedItemTypes: FARMING_LEVEL_SEED_SHOP_UNLOCKS[level],
  }));
}

export function seedItemTypesUnlockedAtLevel(level: number): readonly string[] {
  if (!Number.isFinite(level)) return [];
  const key = Math.floor(level) as FarmingSeedShopUnlockLevel;
  return FARMING_LEVEL_SEED_SHOP_UNLOCKS[key] ?? [];
}

export function seedItemTypesUnlockedBetween(
  fromLevel: number,
  toLevel: number,
): string[] {
  const from = Math.max(0, Math.floor(fromLevel));
  const to = Math.max(0, Math.floor(toLevel));
  if (to <= from) return [];

  const out: string[] = [];
  for (let level = from + 1; level <= to; level++) {
    out.push(...seedItemTypesUnlockedAtLevel(level));
  }
  return out;
}
