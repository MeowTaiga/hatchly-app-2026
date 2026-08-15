/**
 * Client mirror of hatchly-server-2026/src/constants/cookingLevelRecipeUnlocks.ts
 * Used for cooking skill detail unlocks. Keep in sync when rebalancing.
 *
 * Every 2 cooking levels unlock a small batch of recipes.
 */

export const COOKING_RECIPE_UNLOCK_LEVELS = Array.from(
  { length: 49 },
  (_, i) => (i + 1) * 2,
) as unknown as readonly number[];

export const COOKING_LEVEL_RECIPE_UNLOCKS: Record<number, readonly string[]> = {
  2: ['flour', 'bread_dough', 'bread'],
  4: ['flatbread', 'toast', 'sliced_carrots'],
  6: ['sugar', 'cornmeal', 'popcorn'],
  8: ['butter', 'cheese', 'yogurt'],
  10: ['tomato_sauce', 'mashed_potato', 'vegetable_stock'],
  12: ['pickles', 'sliced_cucumber', 'sliced_watermelon'],
  14: ['garden_salad', 'fresh_salad', 'tomato_soup'],
  16: ['potato_soup', 'pumpkin_soup', 'garden_sandwich'],
  18: ['tomato_sandwich', 'cheese_sandwich', 'farmer_salad'],
  20: ['summer_salad', 'apple_sandwich', 'cucumber_sandwich'],
  22: ['egg_sandwich', 'pumpkin_sandwich', 'herb_salad'],
  24: ['potato_salad', 'fruit_salad', 'berry_bowl'],
  26: ['onion_soup', 'mushroom_soup', 'vegetable_soup'],
  28: ['broccoli_soup', 'corn_chowder', 'herb_soup'],
  30: ['cream_soup', 'apple_bread', 'pumpkin_bread'],
  32: ['blueberry_bread', 'banana_bread', 'garlic_bread'],
  34: ['herb_bread', 'honey_bread', 'lemon_bread'],
  36: ['strawberry_bread', 'cinnamon_bread', 'pie_crust'],
  38: ['cake_batter', 'sweet_bread', 'bread_roll'],
  40: ['apple_jam', 'strawberry_jam', 'blueberry_jam'],
  42: ['peach_jam', 'raspberry_jam', 'blackberry_jam'],
  44: ['apple_pie', 'pumpkin_pie', 'strawberry_pie'],
  46: ['blueberry_pie', 'peach_pie', 'cherry_pie'],
  48: ['apple_crumble', 'jam_cookies', 'honey_cookies'],
  50: ['berry_tart', 'lemon_tart', 'carrot_cake'],
  52: ['fruit_cake', 'cheesecake', 'berry_cheesecake'],
  54: ['apple_juice', 'orange_juice', 'lemonade'],
  56: ['herbal_tea', 'mint_tea', 'chamomile_tea'],
  58: ['lavender_tea', 'strawberry_smoothie', 'peach_smoothie'],
  60: ['berry_smoothie', 'fruit_punch', 'mushroom_tea'],
  62: ['cooked_trout', 'dried_basil', 'dried_mint'],
  64: ['dried_rosemary', 'dried_thyme', 'dried_parsley'],
  66: ['dried_oregano', 'dried_sage', 'dried_dill'],
  68: ['dried_lavender', 'dried_chamomile', 'dried_cilantro'],
  70: ['dried_chive', 'dried_bay', 'dried_fennel'],
  72: ['dried_tarragon', 'orange_jam', 'lemon_jam'],
  74: ['lime_jam', 'banana_jam', 'grapes_jam'],
  76: ['cherries_jam', 'watermelon_jam', 'melon_jam'],
  78: ['pear_jam', 'avacado_jam', 'dragon_fruit_jam'],
  80: ['crystal_berry_jam', 'aurora_berry_jam', 'frost_berry_jam'],
  82: ['starfruit_jam', 'sunfruit_jam', 'spirit_melon_jam'],
  84: ['dream_fruit_jam'],
  86: [],
  88: [],
  90: [],
  92: [],
  94: [],
  96: [],
  98: [],
};

export interface CookingRecipeUnlockTier {
  level: number;
  recipeIds: readonly string[];
}

export function cookingRecipeUnlockTiers(): CookingRecipeUnlockTier[] {
  return COOKING_RECIPE_UNLOCK_LEVELS.filter(
    (level) => (COOKING_LEVEL_RECIPE_UNLOCKS[level]?.length ?? 0) > 0,
  ).map((level) => ({
    level,
    recipeIds: COOKING_LEVEL_RECIPE_UNLOCKS[level],
  }));
}

export function labelFromCookingRecipeId(recipeId: string): string {
  return recipeId
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
