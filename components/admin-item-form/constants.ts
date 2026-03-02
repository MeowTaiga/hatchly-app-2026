/**
 * Constants for the admin item form.
 */

export type ActionType = 'open_scene' | 'open_modal' | 'start_dialog' | 'none';

export interface DropdownOptionLike {
  key: string;
  label: string;
}

export const CATEGORY_OPTIONS: DropdownOptionLike[] = [
  { key: 'soil', label: 'Soil' },
  { key: 'seed', label: 'Seed' },
  { key: 'decoration', label: 'Decoration' },
  { key: 'ingredient', label: 'Ingredient' },
  { key: 'material', label: 'Material' },
  { key: 'building', label: 'Building' },
  { key: 'scenery', label: 'Scenery' },
  { key: 'flooring', label: 'Flooring' },
  { key: 'tiled_flooring', label: 'Tiled Floor' },
  { key: 'fish', label: 'Fish' },
  { key: 'bug', label: 'Bug' },
  { key: 'discoverables', label: 'Discoverables' },
  { key: 'equip', label: 'Equip' },
  { key: 'food', label: 'Food' },
  { key: 'asset', label: 'Asset' },
  { key: 'npc', label: 'NPC' },
  { key: 'tree', label: 'Tree' },
];

export const ACTION_TYPES: { key: ActionType; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'open_scene', label: 'Open Scene' },
  { key: 'open_modal', label: 'Open Modal' },
  { key: 'start_dialog', label: 'Start Dialog' },
];

export const SUB_CATEGORIES: { key: string; label: string }[] = [
  { key: '', label: 'None' },
  { key: 'pet_bed', label: 'Pet Bed' },
  { key: 'crop', label: 'Crop' },
  { key: 'flower', label: 'Flower' },
  { key: 'rock', label: 'Rock' },
  { key: 'tree', label: 'Tree' },
  { key: 'light_source', label: 'Light Source' },
  { key: 'food', label: 'Food' },
  { key: 'fishing_poles', label: 'Fishing Poles' },
  { key: 'fishing_bobber', label: 'Fishing Bobber' },
  { key: 'bait', label: 'Bait' },
  { key: 'chairs', label: 'Chairs' },
  { key: 'bug_net', label: 'Bug Net' },
  { key: 'bug_nets', label: 'Bug Nets' },
  { key: 'pickaxe', label: 'Pickaxe' },
  { key: 'pickaxes', label: 'Pickaxes' },
  { key: 'shovel', label: 'Shovel' },
  { key: 'shovels', label: 'Shovels' },
  { key: 'dig_hole', label: 'Dig Hole' },
  { key: 'discoverables', label: 'Discoverables' },
  { key: 'pond', label: 'Pond' },
  { key: 'table', label: 'Table' },
  { key: 'fence', label: 'Fence' },
  { key: 'fruit', label: 'Fruit' },
];

/** Map of subcategory key to label for chip display in shops. */
export const SUB_CATEGORY_LABELS: Record<string, string> = {
  ...Object.fromEntries(SUB_CATEGORIES.filter((c) => c.key).map((c) => [c.key, c.label])),
  fishing_pole: 'Fishing Poles', // alias for singular
};

export const BUG_SPAWN_HABITATS: { key: string; label: string }[] = [
  { key: '', label: 'Any' },
  { key: 'crop', label: 'Crops' },
  { key: 'flower', label: 'Flowers' },
  { key: 'rock', label: 'Rocks' },
  { key: 'tree', label: 'Trees' },
  { key: 'light_source', label: 'Light Sources' },
];

export const FISH_SPOT_TYPES: { key: string; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'river', label: 'River' },
  { key: 'ocean', label: 'Ocean' },
  { key: 'pond', label: 'Pond' },
];

export const STYLE_FRAGMENT =
  `Art style: flat vector illustration with thick uniform black outlines, ` +
  `soft cel-shaded coloring with one highlight and one shadow tone per surface, no gradients. ` +
  `Perspective: front-facing view, similar to stardew valley, centered in frame. ` +
  `Proportions: slightly chunky and rounded for a friendly, cute aesthetic. ` +
  `Lighting: soft diffused light from the upper left, no drop shadow. ` +
  `Transparent PNG background, no ground plane, no extra props or decorations. ` +
  `The asset should fill roughly 95% of the image.`;

export const STYLE_FRAGMENT_FISH =
  `Art style: flat vector illustration with thick uniform black outlines, ` +
  `soft cel-shaded coloring with one highlight and one shadow tone per surface, no gradients. ` +
  `Perspective: side-facing view, swimming left, similar to stardew valley, centered in frame. ` +
  `Proportions: slightly chunky and rounded for a friendly, cute aesthetic. ` +
  `Lighting: soft diffused light from the upper left, no drop shadow. ` +
  `Transparent PNG background, no ground plane, no extra props or decorations. ` +
  `The asset should fill roughly 95% of the image.`;

export const STYLE_FRAGMENT_CHAIRS =
  `Art style: flat vector illustration with thick uniform black outlines, ` +
  `soft cel-shaded coloring with one highlight and one shadow tone per surface, no gradients. ` +
  `Perspective: facing right, similar to stardew valley, centered in frame. ` +
  `Proportions: slightly chunky and rounded for a friendly, cute aesthetic. ` +
  `Lighting: soft diffused light from the upper left, no drop shadow. ` +
  `Transparent PNG background, no ground plane, no extra props or decorations. ` +
  `The asset should fill roughly 95% of the image.`;

export const STYLE_FRAGMENT_FLOORING =
  `Art style: flat solid color base with subtle detail or texture. ` +
  `No gradients, no shadows, no tones, absolutely no black outlines. ` +
  `Flat top-down view, centered in frame. ` +
  `CRITICAL — SEAMLESS TILE: No borders, no frame, no drop shadow, no edge shadows. ` +
  `The pattern or texture must extend to all four edges of the image with no visible seam so tiles can be placed side by side. ` +
  `Transparent PNG background. The asset must fill the entire image area edge-to-edge for seamless tiling.`;

export const RARITY_OPTIONS: DropdownOptionLike[] = [
  { key: 'common', label: 'Common' },
  { key: 'rare', label: 'Rare' },
  { key: 'epic', label: 'Epic' },
  { key: 'unique', label: 'Unique' },
  { key: 'legendary', label: 'Legendary' },
  { key: 'mythic', label: 'Mythic' },
];

/** Spawn/loot weight per rarity — lower = rarer. Must match server RARITY_WEIGHTS. */
export const RARITY_WEIGHTS: Record<string, number> = {
  common: 100,
  rare: 40,
  epic: 15,
  unique: 5,
  legendary: 2,
  mythic: 0.5,
};

export const TIME_OF_DAY_OPTIONS: DropdownOptionLike[] = [
  { key: 'all_day', label: 'All Day' },
  { key: 'morning', label: 'Morning' },
  { key: 'afternoon', label: 'Afternoon' },
  { key: 'night', label: 'Night' },
];

export const DIRECTIONAL_VARIANT_KEYS = ['post', 'end', 'straight', 'corner', 'tJunction', 'cross'] as const;
export type DirectionalVariantKey = (typeof DIRECTIONAL_VARIANT_KEYS)[number];
