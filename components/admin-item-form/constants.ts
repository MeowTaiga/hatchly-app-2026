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
  { key: 'crafting_recipe', label: 'Crafting Recipe' },
  { key: 'cooking_recipe', label: 'Cooking Recipe' },
  { key: 'fruit', label: 'Fruit' },
  { key: 'floor_fill', label: 'Floor Fill' },
  { key: 'floor_border', label: 'Floor Border' },
  { key: 'strip_h', label: 'Horizontal Strip' },
  { key: 'strip_v', label: 'Vertical Strip' },
  { key: 'strip_end', label: 'End Cap' },
  { key: 'ground_overlay', label: 'Ground Overlay' },
];

/** Map of subcategory key to label for chip display in shops. */
export const SUB_CATEGORY_LABELS: Record<string, string> = {
  ...Object.fromEntries(SUB_CATEGORIES.filter((c) => c.key).map((c) => [c.key, c.label])),
  fishing_pole: 'Fishing Poles', // alias for singular
};

export const BUG_SPAWN_HABITATS: { key: string; label: string }[] = [
  { key: '', label: 'Any' },
  { key: 'flower', label: 'Flower' },
  { key: 'forest', label: 'Forest' },
  { key: 'grass', label: 'Grass' },
  { key: 'pond', label: 'Pond' },
  { key: 'rock', label: 'Rock' },
  { key: 'haunt', label: 'Haunt' },
  { key: 'open', label: 'Open farm' },
  // Legacy host keys still accepted by BugService
  { key: 'crop', label: 'Crops (legacy)' },
  { key: 'tree', label: 'Trees (legacy)' },
  { key: 'light_source', label: 'Lights (legacy)' },
];

export const FISH_SPOT_TYPES: { key: string; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'river', label: 'River' },
  { key: 'ocean', label: 'Ocean' },
  { key: 'pond', label: 'Pond' },
  { key: 'lake', label: 'Lake' },
  { key: 'reef', label: 'Reef' },
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

/**
 * Seamless fill + rotatable edge border — keep in sync with
 * hatchly-admin-web-2026/src/lib/imagePrompt.ts.
 */
export const STYLE_FRAGMENT_FLOORING =
  `This is a repeating GAME GROUND TEXTURE, not a prop or object sprite. ` +
  `Art style: cozy stylized 2D farming-game floor (Stardew Valley / Harvest Moon feel), ` +
  `flat hand-painted color with soft medium-scale surface variation — no thick black outlines, no cel-shade rim light. ` +
  `Perspective: strict orthographic top-down only — no angle, no isometric, no foreshortening. ` +
  `Lighting: perfectly flat, even, diffused overhead light — no directional light, no cast shadows, ` +
  `no soft vignette, no corner darkening, no specular hotspot. ` +
  `Canvas: square 1:1, 100% opaque paint edge-to-edge — zero transparent pixels, no margins, no padding, no empty border. ` +
  `CRITICAL — SEAMLESS WRAP: the left edge must continue perfectly into the right edge, and the top into the bottom, ` +
  `so a 3×3 grid of identical copies reads as one continuous floor with no seam, grid line, frame, or tile outline. ` +
  `Pattern rules: evenly distributed detail only; no unique centerpiece, logo, path that starts/ends mid-tile, ` +
  `furniture, characters, or strong one-way gradient. Avoid photo-realism, 3D bevels, text, and watermarks.`;

export const STYLE_FRAGMENT_FLOORING_BORDER =
  `This is a ROTATABLE FLOOR EDGE BORDER TILE for a top-down farming game — not a full fill texture and not a prop sprite. ` +
  `Art style: cozy stylized 2D farming-game floor trim (Stardew Valley / Harvest Moon feel), ` +
  `flat hand-painted color matching a seamless fill floor of the same material — no thick black outlines. ` +
  `Perspective: strict orthographic top-down only — no angle, no isometric, no foreshortening. ` +
  `Lighting: perfectly flat, even, diffused overhead light — no directional light, no cast shadows, no vignette. ` +
  `TRANSPARENCY (critical): Transparent PNG. Paint ONLY the decorative border / rim strip. ` +
  `Everything else in the square — including the ground/fill area above the rim — must be fully transparent pixels. ` +
  `Do NOT fill the tile with dirt, grass, stone, or any background ground; the fill will come from a separate seamless tile underneath. ` +
  `LAYOUT (critical): ` +
  `The OUTER decorative border / rim / trim runs ONLY along the BOTTOM edge of the image (canonical south edge), ` +
  `as a horizontal strip that reaches the left and right canvas edges. ` +
  `LEFT and RIGHT ends of that strip must wrap seamlessly so copies can tile along a straight side with no seam. ` +
  `The design must stay correct when the whole tile is rotated 90°, 180°, or 270° so one asset covers north, east, south, and west edges of a floor patch. ` +
  `Do NOT draw a full four-sided picture frame, corner piece, filled rectangle, or unique centerpiece. ` +
  `No furniture, characters, text, watermarks, photo-realism, or 3D bevels.`;

export const STYLE_FRAGMENT_STRIP_H =
  `This is a ONE-AXIS REPEATING STRIP TILE for a top-down farming game (e.g. a river, path, or stream segment) — not a full ground fill and not a prop sprite. ` +
  `Art style: cozy stylized 2D farming-game terrain (Stardew Valley / Harvest Moon feel), ` +
  `flat hand-painted color with soft medium-scale surface variation — no thick black outlines. ` +
  `Perspective: strict orthographic top-down only — no angle, no isometric, no foreshortening. ` +
  `Lighting: perfectly flat, even, diffused overhead light — no directional light, no cast shadows, no vignette. ` +
  `TRANSPARENCY (critical): Transparent PNG. Paint ONLY a horizontal band / corridor of the feature. ` +
  `All pixels above and below that band must be fully transparent so the strip can sit over other ground. ` +
  `Do NOT fill the whole square with opaque ground. ` +
  `LAYOUT (critical): ` +
  `The painted band spans the FULL width — left and right edges of the paint must meet the canvas edges. ` +
  `CRITICAL — HORIZONTAL SEAMLESS WRAP ONLY: the left edge must continue perfectly into the right edge ` +
  `so copies placed side-by-side form one continuous strip of any length with no seam. ` +
  `Do NOT require top↔bottom tiling; the top and bottom of the painted band are free edges (banks / margins), not wrap seams. ` +
  `Evenly distribute detail along the length; no unique centerpiece that would scream when repeated. ` +
  `Flow or grain may read left-to-right, but must still wrap cleanly. ` +
  `No furniture, characters, text, watermarks, photo-realism, or 3D bevels.`;

export const STYLE_FRAGMENT_STRIP_V =
  `This is a ONE-AXIS REPEATING STRIP TILE for a top-down farming game (e.g. a north–south river, path, or stream segment) — not a full ground fill and not a prop sprite. ` +
  `Art style: cozy stylized 2D farming-game terrain (Stardew Valley / Harvest Moon feel), ` +
  `flat hand-painted color with soft medium-scale surface variation — no thick black outlines. ` +
  `Perspective: strict orthographic top-down only — no angle, no isometric, no foreshortening. ` +
  `Lighting: perfectly flat, even, diffused overhead light — no directional light, no cast shadows, no vignette. ` +
  `TRANSPARENCY (critical): Transparent PNG. Paint ONLY a vertical band / corridor of the feature. ` +
  `All pixels left and right of that band must be fully transparent so the strip can sit over other ground. ` +
  `Do NOT fill the whole square with opaque ground. ` +
  `LAYOUT (critical): ` +
  `The painted band spans the FULL height — top and bottom edges of the paint must meet the canvas edges. ` +
  `CRITICAL — VERTICAL SEAMLESS WRAP ONLY: the top edge must continue perfectly into the bottom edge ` +
  `so copies stacked north–south form one continuous strip of any length with no seam. ` +
  `Do NOT require left↔right tiling; the left and right of the painted band are free edges (banks / margins), not wrap seams. ` +
  `Evenly distribute detail along the length; no unique centerpiece that would scream when repeated. ` +
  `Flow or grain may read top-to-bottom, but must still wrap cleanly. ` +
  `No furniture, characters, text, watermarks, photo-realism, or 3D bevels.`;

export const STYLE_FRAGMENT_STRIP_END =
  `This is an END CAP / TERMINUS TILE for a top-down farming-game strip (river mouth, path end, stream tip) — not a repeating mid-segment and not a full ground fill. ` +
  `Art style: cozy stylized 2D farming-game terrain (Stardew Valley / Harvest Moon feel), ` +
  `flat hand-painted color — no thick black outlines. ` +
  `Perspective: strict orthographic top-down only. Lighting: flat even overhead — no cast shadows, no vignette. ` +
  `TRANSPARENCY (critical): Transparent PNG. Paint ONLY the strip feature and its natural end; ` +
  `surrounding ground must be fully transparent pixels. ` +
  `REFERENCE MATCHING (critical when a reference image is attached): ` +
  `Preserve the reference strip's exact material, palette, band width, edge/bank style, and brush character. ` +
  `Do not restyle, recolor, or change scale. Only invent the finishing terminus. ` +
  `LAYOUT: One end of the painted band should be a clean join face that can butt against a repeating strip tile; ` +
  `the opposite end should be a finished terminus (tip, fade, mouth, or rounded end) — NOT seamless on that side. ` +
  `Square 1:1 canvas. No furniture, characters, text, watermarks, photo-realism, or 3D bevels.`;

export const STYLE_FRAGMENT_GROUND_OVERLAY =
  `This is a GROUND DECAL / OVERLAY STAMP for a top-down farming game — not a seamless fill tile and not a boxed prop sprite. ` +
  `Art style: cozy stylized 2D farming-game terrain (Stardew Valley / Harvest Moon feel), ` +
  `flat hand-painted color with soft medium-scale surface variation — no thick black outlines, no cel-shade rim light. ` +
  `Perspective: strict orthographic top-down only — no angle, no isometric, no foreshortening. ` +
  `Lighting: perfectly flat, even, diffused overhead light — no directional light, no drop shadow, no vignette. ` +
  `TRANSPARENCY (critical): Transparent PNG. The painted feature is an IRREGULAR organic patch, pile, carpet, or mist — never a filled rectangle. ` +
  `The canvas must stay mostly transparent. All four corners and a wide outer margin must be fully transparent pixels. ` +
  `SOFT BLEND (critical): Alpha-feather the silhouette. Edges fade gradually from the painted feature into fully transparent pixels ` +
  `so the stamp composites over grass/dirt underneath with no hard square, no white halo, and no opaque ground plane. ` +
  `Do NOT paint dirt, grass, soil, or any background terrain — those come from the floor tile under this overlay. ` +
  `Interior pixels should be partly see-through (especially fog, mist, moss, ash, and scattered leaves) so the ground shows through. ` +
  `Do NOT make a seamless wrap; this is a unique stamp, not a repeating texture. ` +
  `No furniture, characters, text, watermarks, photo-realism, or 3D bevels.`;

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
