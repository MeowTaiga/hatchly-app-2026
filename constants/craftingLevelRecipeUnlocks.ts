/**
 * Client mirror of hatchly-server-2026/src/constants/craftingLevelRecipeUnlocks.ts
 * Used for crafting skill detail unlocks. Keep in sync when rebalancing.
 *
 * Recipe levels intentionally avoid crafting perk milestones
 * (backpack: 5/10/20/50/75/99, ease: 15/30/45).
 */

export const CRAFTING_RECIPE_UNLOCK_LEVELS = [
  3, 8, 13, 18, 23, 28, 33, 38, 43, 48, 53, 58, 63, 68, 73, 78, 83, 88, 93, 98,
] as const;

export type CraftingRecipeUnlockLevel = (typeof CRAFTING_RECIPE_UNLOCK_LEVELS)[number];

export const CRAFTING_LEVEL_RECIPE_UNLOCKS: Record<
  CraftingRecipeUnlockLevel,
  readonly string[]
> = {
  3: ['stick_axe', 'stick_pickaxe', 'stick_shovel', 'stick_fishing_pole', 'signpost'],
  8: ['stick_net', 'stone_axe', 'stick_stool', 'stick_chair', 'camp_seat'],
  13: ['stone_pickaxe', 'stone_shovel', 'stone_fishing_pole', 'stick_bench', 'stick_table'],
  18: ['small_side_table', 'coat_rack', 'plant_stand', 'bird_perch', 'mail_post'],
  23: ['branch_fence', 'fence_gate', 'tool_rack', 'fishing_rod_rack', 'drying_rack'],
  28: ['wood_plank', 'primitive_shelf', 'storage_rack', 'display_rack', 'camp_clothesline'],
  33: ['stick_divider', 'tall_shelf', 'garden_trellis', 'camp_table', 'primitive_ladder'],
  38: ['storage', 'primitive_bed_frame', 'simple_archway', 'primitive_bridge_section', 'dock_section'],
  43: ['dock_corner', 'stone_path_tile', 'stone_garden_border', 'stone_marker', 'campfire_ring'],
  48: ['stone_stool', 'stone_wall', 'stone_torch', 'stone_fence', 'stone_chair'],
  53: ['stone_bench', 'stone_pedestal', 'stone_fire_pit', 'stone_lantern', 'stone_shelf'],
  58: ['stone_table', 'stone_pillar', 'stone_bird_bath', 'primitive_chair', 'primitive_bench'],
  63: ['primitive_table', 'primitive_gate', 'rocking_chair', 'camp_notice_board', 'primitive_lamp_post'],
  68: [
    'primitive_workbench',
    'display_pedestal',
    'garden_rock_display',
    'stone_bridge_tile',
    'primitive_clock_post',
  ],
  73: [
    'fishing_station',
    'camp_kitchen',
    'primitive_sundial',
    'stone_totem',
    'primitive_crafting_table',
  ],
  78: [
    'stone_fountain',
    'stone_arch',
    'primitive_shrine',
    'primitive_market_stall',
    'camp_shelter_frame',
  ],
  83: ['stone_well', 'stone_statue'],
  88: [],
  93: [],
  98: [],
};

export interface CraftingRecipeUnlockTier {
  level: number;
  recipeIds: readonly string[];
}

export function craftingRecipeUnlockTiers(): CraftingRecipeUnlockTier[] {
  return CRAFTING_RECIPE_UNLOCK_LEVELS.filter(
    (level) => (CRAFTING_LEVEL_RECIPE_UNLOCKS[level]?.length ?? 0) > 0,
  ).map((level) => ({
    level,
    recipeIds: CRAFTING_LEVEL_RECIPE_UNLOCKS[level],
  }));
}

export function labelFromRecipeId(recipeId: string): string {
  return recipeId
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
