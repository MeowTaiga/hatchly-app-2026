import type { GridData, ItemDefinition, PlacedItem } from './types';
import { tileKey } from './types';

/** Grid stores multiple items per tile (overlap supported). */
export type GridItemsMap = Map<string, PlacedItem[]>;

/** Iterate all placed items without allocating an array. Preferred for loops. */
export function* iterAllPlacedItems(grid: GridData): Generator<PlacedItem> {
  for (const arr of grid.items.values()) {
    for (let i = 0; i < arr.length; i++) yield arr[i];
  }
}

/**
 * Returns a flat array of all placed items. Uses a WeakMap cache so
 * repeated calls with the same grid.items reference don't re-allocate.
 */
const _allItemsCache = new WeakMap<Map<string, PlacedItem[]>, PlacedItem[]>();
export function getAllPlacedItems(grid: GridData): PlacedItem[] {
  let cached = _allItemsCache.get(grid.items);
  if (cached) return cached;
  const out: PlacedItem[] = [];
  for (const arr of grid.items.values()) {
    for (let i = 0; i < arr.length; i++) out.push(arr[i]);
  }
  _allItemsCache.set(grid.items, out);
  return out;
}

/**
 * Returns a Set of tile keys (col:row) occupied by any placed item.
 * Used for pet pathfinding to avoid walking on buildings, crops, etc.
 */
export function getBlockedTileKeys(grid: GridData): Set<string> {
  const blocked = new Set<string>();
  for (const item of getAllPlacedItems(grid)) {
    if (item.anchorId) continue;
    for (let dr = 0; dr < item.tileRows; dr++) {
      for (let dc = 0; dc < item.tileCols; dc++) {
        blocked.add(tileKey(item.col + dc, item.row + dr));
      }
    }
  }
  return blocked;
}

/**
 * Blocked tiles for PET pathfinding — excludes items whose subCategory
 * is in walkableSubCategories (e.g. pet_bed so the pet can stand on it).
 */
export function getBlockedTileKeysForPet(
  grid: GridData,
  itemDefs: Record<string, ItemDefinition>,
  walkableSubCategories: readonly string[],
): Set<string> {
  const blocked = new Set<string>();
  for (const item of getAllPlacedItems(grid)) {
    if (item.anchorId) continue;
    const def = itemDefs[item.itemType];
    const isWalkable = def?.subCategory && walkableSubCategories.includes(def.subCategory);
    if (isWalkable) continue;

    for (let dr = 0; dr < item.tileRows; dr++) {
      for (let dc = 0; dc < item.tileCols; dc++) {
        blocked.add(tileKey(item.col + dc, item.row + dr));
      }
    }
  }
  return blocked;
}

/**
 * Returns placed items whose itemDef has the given subCategory.
 * Pet AI uses this to find interaction targets (e.g. pet_bed).
 */
export function getPlacedItemsBySubCategory(
  grid: GridData,
  itemDefs: Record<string, ItemDefinition>,
  subCategory: string,
): PlacedItem[] {
  const out: PlacedItem[] = [];
  for (const item of getAllPlacedItems(grid)) {
    const def = itemDefs[item.itemType];
    if (def?.subCategory === subCategory) out.push(item);
  }
  return out;
}

/** Returns tile keys (col:row) that are fishing spots (e.g. from pond items). */
export function getFishingTileKeys(
  grid: GridData,
  itemDefs: Record<string, ItemDefinition>,
  fishingSubCategories: readonly string[] = ['pond'],
): Set<string> {
  const keys = new Set<string>();
  for (const item of getAllPlacedItems(grid)) {
    const def = itemDefs[item.itemType];
    if (!def?.subCategory || !fishingSubCategories.includes(def.subCategory)) continue;
    for (let dr = 0; dr < item.tileRows; dr++) {
      for (let dc = 0; dc < item.tileCols; dc++) {
        keys.add(tileKey(item.col + dc, item.row + dr));
      }
    }
  }
  return keys;
}

/** Find the anchor placed item by id (for multi-tile items, use anchor id). */
export function findPlacedItemById(grid: GridData, id: string): PlacedItem | undefined {
  return getAllPlacedItems(grid).find((item) => item.id === id);
}

/** Center tile of item (may be blocked — use for approach calc). */
export function getItemCenter(item: PlacedItem): { col: number; row: number } {
  return {
    col: item.col + Math.floor(item.tileCols / 2),
    row: item.row + Math.floor(item.tileRows / 2),
  };
}

/**
 * Visual center of item in pixels (for pet standing ON a walkable item).
 * Use this instead of tile center when the pet should appear on top of the item.
 */
export function getItemVisualCenterPx(
  item: PlacedItem,
  tileSize: number,
): { x: number; y: number } {
  return {
    x: (item.col + item.tileCols / 2) * tileSize,
    y: (item.row + item.tileRows / 2) * tileSize,
  };
}

/**
 * Returns the destination tile for pet interaction.
 * - If item is "pet walkable" (e.g. pet_bed): center tile ON the item.
 * - Otherwise: adjacent tile next to the item.
 */
export function getInteractionDestination(
  item: PlacedItem,
  itemDefs: Record<string, ItemDefinition>,
  walkableSubCategories: readonly string[],
  blocked: Set<string>,
  cols: number,
  rows: number,
): { col: number; row: number } | null {
  const def = itemDefs[item.itemType];
  const canStandOn = def?.subCategory && walkableSubCategories.includes(def.subCategory);

  if (canStandOn) {
    const center = getItemCenter(item);
    if (center.col >= 0 && center.col < cols && center.row >= 0 && center.row < rows && !blocked.has(tileKey(center.col, center.row))) {
      return center;
    }
  }

  const { col: cc, row: cr } = getItemCenter(item);
  const candidates: { col: number; row: number }[] = [
    { col: cc, row: cr + 1 },
    { col: cc, row: cr - 1 },
    { col: cc + 1, row: cr },
    { col: cc - 1, row: cr },
  ];
  for (const t of candidates) {
    if (t.col >= 0 && t.col < cols && t.row >= 0 && t.row < rows && !blocked.has(tileKey(t.col, t.row))) {
      return t;
    }
  }
  return null;
}

/** Returns the topmost item at (col, row), or undefined. */
export function getItemAt(grid: GridData, col: number, row: number): PlacedItem | undefined {
  const arr = grid.items.get(tileKey(col, row));
  return arr?.length ? arr[arr.length - 1] : undefined;
}

export function getItemsAt(grid: GridData, col: number, row: number): PlacedItem[] {
  return grid.items.get(tileKey(col, row)) ?? [];
}

export function hasItemAt(grid: GridData, col: number, row: number): boolean {
  const arr = grid.items.get(tileKey(col, row));
  return !!arr?.length;
}

/** Remove all items whose id is in the set; returns new Map. */
export function removeItemsByIds(
  items: GridItemsMap,
  ids: Set<string>,
): GridItemsMap {
  const next = new Map<string, PlacedItem[]>();
  for (const [k, arr] of items) {
    const filtered = arr.filter((item) => !ids.has(item.id));
    if (filtered.length) next.set(k, filtered);
  }
  return next;
}

/** Remove all tiles that contain any item with this anchor id; returns new Map. */
export function removeItemsByAnchorId(
  items: GridItemsMap,
  anchorId: string,
): GridItemsMap {
  const ids = new Set<string>();
  for (const arr of items.values()) {
    for (const item of arr) {
      if (item.id === anchorId || item.anchorId === anchorId) ids.add(item.id);
    }
  }
  return removeItemsByIds(items, ids);
}

/** Add one item at the given key; returns new Map. */
export function addItemAtKey(
  items: GridItemsMap,
  key: string,
  item: PlacedItem,
): GridItemsMap {
  const next = new Map(items);
  const arr = next.get(key) ?? [];
  next.set(key, [...arr, item]);
  return next;
}

/** Set a full snapshot of items (key -> single item per tile from server). */
export function setCellItems(
  items: GridItemsMap,
  key: string,
  cellItems: PlacedItem[],
): GridItemsMap {
  const next = new Map(items);
  if (cellItems.length) next.set(key, cellItems);
  else next.delete(key);
  return next;
}

/** Delete a key entirely (used by OPTIMISTIC_REMOVE_KEYS, OPTIMISTIC_HARVEST). */
export function deleteKeys(items: GridItemsMap, keys: string[]): GridItemsMap {
  const next = new Map(items);
  for (const k of keys) next.delete(k);
  return next;
}

/** Build map from snapshot: each tile gets one entry (server sends one item per tile). */
export function createItemsMapFromSnapshot(
  placedItems: { col: number; row: number; id: string; anchorId?: string;[k: string]: unknown }[],
  toPlacedItem: (si: (typeof placedItems)[number]) => PlacedItem,
): GridItemsMap {
  const map = new Map<string, PlacedItem[]>();
  for (const si of placedItems) {
    const key = tileKey(si.col, si.row);
    const arr = map.get(key) ?? [];
    arr.push(toPlacedItem(si));
    map.set(key, arr);
  }
  return map;
}

/** Resolve anchor item from grid (search all items). */
export function resolveAnchor(grid: GridData, item: PlacedItem): PlacedItem | null {
  if (!item.anchorId) return item;
  for (const p of getAllPlacedItems(grid)) {
    if (p.id === item.anchorId) return p;
  }
  return null;
}

/**
 * Find a valid 2x2 placement position for a seed on soil.
 * Seeds always occupy seedCols x seedRows (typically 2x2) and must sit on soil-category tiles.
 * The seed overlaps on top of the soil (soil is NOT removed).
 *
 * For a 2x2 soil: only one seed fits (at the soil anchor).
 * For a 4x2 soil: two seeds fit side by side, etc.
 *
 * Returns the top-left col/row for the seed, or null if invalid.
 */
export type SeedPlacementResult =
  | { ok: true; col: number; row: number }
  | { ok: false; reason: 'no_soil' | 'has_crop' | 'too_small' };

function manhattan(c: number, r: number, tc: number, tr: number): number {
  return Math.abs(c - tc) + Math.abs(r - tr);
}

export function findSeedPlacement(
  grid: GridData,
  itemDefs: Record<string, ItemDefinition>,
  tapCol: number,
  tapRow: number,
  seedCols: number,
  seedRows: number,
): SeedPlacementResult {
  const allItems = getItemsAt(grid, tapCol, tapRow);
  const soilItem = allItems.find((it) => itemDefs[it.itemType]?.category === 'soil');
  if (!soilItem) return { ok: false, reason: 'no_soil' };

  const soilAnchor = resolveAnchor(grid, soilItem) ?? soilItem;
  const slots = getPlantableSlotsOnSoil(grid, soilAnchor, seedCols, seedRows);
  if (slots.length === 0) {
    const inset = 1;
    const innerCols = soilAnchor.tileCols - 2 * inset;
    const innerRows = soilAnchor.tileRows - 2 * inset;
    return innerCols < seedCols || innerRows < seedRows
      ? { ok: false, reason: 'too_small' }
      : { ok: false, reason: 'has_crop' };
  }

  let best = slots[0];
  let bestD = manhattan(best.col, best.row, tapCol, tapRow);
  for (let i = 1; i < slots.length; i++) {
    const s = slots[i];
    const d = manhattan(s.col, s.row, tapCol, tapRow);
    if (d < bestD) {
      best = s;
      bestD = d;
    }
  }
  return { ok: true, col: best.col, row: best.row };
}

export const NEIGHBOR_OFFSETS: [number, number][] = [
  [0, -1], [0, 1], [-1, 0], [1, 0],
  [-1, -1], [1, -1], [-1, 1], [1, 1],
];

/**
 * Returns true when the tile holds something the player can meaningfully
 * interact with (waterable crop, harvestable crop, item with interactAction).
 * Bare soil and growing-but-watered crops are NOT actionable.
 */
export function isTileActionable(
  grid: GridData,
  col: number,
  row: number,
  itemDefs: Record<string, ItemDefinition>,
): boolean {
  const items = getItemsAt(grid, col, row);
  for (const it of items) {
    if (it.growthMs) {
      if (!it.watered) return true;
      if (it.plantedAt && it.watered && Date.now() - it.plantedAt >= it.growthMs) return true;
      continue;
    }
    const def = itemDefs[it.itemType];
    if (def?.category === 'soil') continue;
    if (def?.interactAction && def.interactAction.type !== 'none') return true;
    if (def && def.category !== 'flooring' && def.category !== 'tiled_flooring') return true;
  }
  return false;
}

function isNpcItem(
  item: PlacedItem,
  grid: GridData,
  itemDefs: Record<string, ItemDefinition>,
): PlacedItem | null {
  const target = item.anchorId ? resolveAnchor(grid, item) ?? item : item;
  return itemDefs[target.itemType]?.category === 'npc' ? target : null;
}

/**
 * Check 8 neighbors for a tile with an actionable item.
 * NPCs win over other interactables so dig spots / crops don't steal talk taps.
 */
export function findNearbyInteractable(
  grid: GridData,
  col: number,
  row: number,
  itemDefs: Record<string, ItemDefinition>,
): { col: number; row: number } | null {
  let fallback: { col: number; row: number } | null = null;
  for (const [dc, dr] of NEIGHBOR_OFFSETS) {
    const nc = col + dc;
    const nr = row + dr;
    if (nc < 0 || nc >= grid.cols || nr < 0 || nr >= grid.rows) continue;
    if (!isTileActionable(grid, nc, nr, itemDefs)) continue;
    const hasNpc = getItemsAt(grid, nc, nr).some((it) => isNpcItem(it, grid, itemDefs));
    if (hasNpc) return { col: nc, row: nr };
    if (!fallback) fallback = { col: nc, row: nr };
  }
  return fallback;
}

/**
 * Match diggable radius so NPCs near dig holes still win the tap.
 * Footprint hits take priority; near-misses use the same generous radius.
 */
const NPC_TAP_RADIUS = 2;

/** Find an NPC under the tap (footprint) or within radius. Prefer closest. */
export function findNpcAtTap(
  grid: GridData,
  col: number,
  row: number,
  itemDefs: Record<string, ItemDefinition>,
): PlacedItem | null {
  for (const item of getAllPlacedItems(grid)) {
    if (item.anchorId) continue;
    if (itemDefs[item.itemType]?.category !== 'npc') continue;
    if (
      col >= item.col &&
      col < item.col + item.tileCols &&
      row >= item.row &&
      row < item.row + item.tileRows
    ) {
      return item;
    }
  }

  let closest: PlacedItem | null = null;
  let closestDist = Infinity;
  for (let dr = -NPC_TAP_RADIUS; dr <= NPC_TAP_RADIUS; dr++) {
    for (let dc = -NPC_TAP_RADIUS; dc <= NPC_TAP_RADIUS; dc++) {
      const tc = col + dc;
      const tr = row + dr;
      if (tc < 0 || tc >= grid.cols || tr < 0 || tr >= grid.rows) continue;
      for (const item of getItemsAt(grid, tc, tr)) {
        const npc = isNpcItem(item, grid, itemDefs);
        if (!npc) continue;
        const dist = Math.abs(dc) + Math.abs(dr);
        if (dist < closestDist) {
          closestDist = dist;
          closest = npc;
        }
      }
    }
  }
  return closest;
}

/** Radius (tiles) for fossil/dig hole hit detection. 2 = 5x5 area so fossils are always tappable. */
const DIGGABLE_TAP_RADIUS = 2;

/** Find a diggable item (fossil_hole or dig_hole) at tap or within radius. Ensures fossils are always diggable. */
export function findDiggableAtTap(
  grid: GridData,
  col: number,
  row: number,
  itemDefs: Record<string, ItemDefinition>,
): PlacedItem | null {
  let closest: PlacedItem | null = null;
  let closestDist = Infinity;
  for (let dr = -DIGGABLE_TAP_RADIUS; dr <= DIGGABLE_TAP_RADIUS; dr++) {
    for (let dc = -DIGGABLE_TAP_RADIUS; dc <= DIGGABLE_TAP_RADIUS; dc++) {
      const tc = col + dc;
      const tr = row + dr;
      if (tc < 0 || tc >= grid.cols || tr < 0 || tr >= grid.rows) continue;
      const items = getItemsAt(grid, tc, tr);
      for (const item of items) {
        const def = itemDefs[item.itemType];
        const isDiggable =
          item.itemType === 'fossil_hole' || def?.subCategory === 'dig_hole';
        if (!isDiggable) continue;
        const dist = Math.abs(dc) + Math.abs(dr);
        if (dist < closestDist) {
          closestDist = dist;
          closest = item;
        }
      }
    }
  }
  return closest;
}

const GROUND_PICKUP_TAP_RADIUS = 1;

export function isGroundPickupItem(
  itemType: string,
  itemDefs: Record<string, ItemDefinition>,
): boolean {
  if (itemType === 'stone' || itemType === 'stick') return true;
  return itemDefs[itemType]?.subCategory === 'ground_pickup';
}

/** Find a daily ground pickup (stone/stick) at tap or within a small radius. */
export function findGroundPickupAtTap(
  grid: GridData,
  col: number,
  row: number,
  itemDefs: Record<string, ItemDefinition>,
): PlacedItem | null {
  let closest: PlacedItem | null = null;
  let closestDist = Infinity;
  for (let dr = -GROUND_PICKUP_TAP_RADIUS; dr <= GROUND_PICKUP_TAP_RADIUS; dr++) {
    for (let dc = -GROUND_PICKUP_TAP_RADIUS; dc <= GROUND_PICKUP_TAP_RADIUS; dc++) {
      const tc = col + dc;
      const tr = row + dr;
      if (tc < 0 || tc >= grid.cols || tr < 0 || tr >= grid.rows) continue;
      const items = getItemsAt(grid, tc, tr);
      for (const item of items) {
        if (!isGroundPickupItem(item.itemType, itemDefs)) continue;
        const dist = Math.abs(dc) + Math.abs(dr);
        if (dist < closestDist) {
          closestDist = dist;
          closest = item;
        }
      }
    }
  }
  return closest;
}

/** Fully grown trees use a 4x4 image over 2x2 footprint — visual extends 1 left, 2 up, 1 right. Hit area = 4x4. */
const FULLY_GROWN_TREE_HIT_COLS = 4;
const FULLY_GROWN_TREE_HIT_ROWS = 4;
const FULLY_GROWN_TREE_HIT_OFFSET_COL = -1;
const FULLY_GROWN_TREE_HIT_OFFSET_ROW = -2;

/** Find a tree at tap. Fully grown: 4x4 hit area (matches visual). Others: tap + 8 neighbors. */
export function findTreeAtTap(
  grid: GridData,
  tapCol: number,
  tapRow: number,
  itemDefs: Record<string, ItemDefinition>,
): PlacedItem | null {
  for (const item of getAllPlacedItems(grid)) {
    if (item.anchorId) continue;
    const def = itemDefs[item.itemType];
    if (def?.category !== 'tree') continue;
    const col = item.col;
    const row = item.row;
    if (item.itemType.startsWith('tree_fully_grown_')) {
      const hitCol = col + FULLY_GROWN_TREE_HIT_OFFSET_COL;
      const hitRow = row + FULLY_GROWN_TREE_HIT_OFFSET_ROW;
      if (
        tapCol >= hitCol &&
        tapCol < hitCol + FULLY_GROWN_TREE_HIT_COLS &&
        tapRow >= hitRow &&
        tapRow < hitRow + FULLY_GROWN_TREE_HIT_ROWS
      ) {
        return item;
      }
    }
  }
  for (const [dc, dr] of TAP_NEIGHBOR_OFFSETS) {
    const tc = tapCol + dc;
    const tr = tapRow + dr;
    if (tc < 0 || tc >= grid.cols || tr < 0 || tr >= grid.rows) continue;
    const item = getItemAt(grid, tc, tr);
    if (!item) continue;
    const def = itemDefs[item.itemType];
    if (def?.category === 'tree') return item;
  }
  return null;
}

/**
 * Returns all valid seed-placement positions across every soil patch on the grid.
 * Each position is the top-left anchor of a seedCols x seedRows quadrant within
 * the soil's 1-tile inset area that has no existing crop.
 */
/** Inset from soil edges: inner placable area excludes this many tiles on each side. */
export const SOIL_INNER_INSET = 1;

/**
 * Check if placing soil at (col, row) with size (cols, rows) would overlap the inner
 * placable area of any existing soil. Soil can overlap the outer "exception" perimeter
 * (the 1-tile border) of existing soil, but must NOT overlap the inner plantable zone.
 * E.g. on a 6x6 soil only the center 4x4 is plantable; new soil cannot cover that.
 */
export type SoilPlacementResult =
  | { ok: true }
  | { ok: false; reason: 'soil_overlap' };

/** Tile keys covering the inner plantable area of every soil patch on the grid. */
function getSoilInnerKeys(
  grid: GridData,
  itemDefs: Record<string, ItemDefinition>,
  excludeAnchorId?: string,
): Set<string> {
  const innerKeys = new Set<string>();
  for (const item of getAllPlacedItems(grid)) {
    const aid = item.anchorId ?? item.id;
    if (excludeAnchorId && aid === excludeAnchorId) continue;
    if (item.anchorId) continue;
    const def = itemDefs[item.itemType];
    if (def?.category !== 'soil') continue;

    const innerCols = Math.max(0, item.tileCols - 2 * SOIL_INNER_INSET);
    const innerRows = Math.max(0, item.tileRows - 2 * SOIL_INNER_INSET);
    if (innerCols === 0 || innerRows === 0) continue;

    for (let dr = 0; dr < innerRows; dr++) {
      for (let dc = 0; dc < innerCols; dc++) {
        innerKeys.add(tileKey(item.col + SOIL_INNER_INSET + dc, item.row + SOIL_INNER_INSET + dr));
      }
    }
  }
  return innerKeys;
}

/**
 * Tiles a tree may not cover: other trees' footprints and soil plantable areas.
 * Trees overlap every other category freely.
 */
function getTreeBlockedKeys(
  grid: GridData,
  itemDefs: Record<string, ItemDefinition>,
  excludeAnchorId?: string,
): Set<string> {
  const blocked = getSoilInnerKeys(grid, itemDefs, excludeAnchorId);
  for (const item of getAllPlacedItems(grid)) {
    if (item.anchorId) continue;
    if (excludeAnchorId && item.id === excludeAnchorId) continue;
    if (itemDefs[item.itemType]?.category !== 'tree') continue;
    for (let dr = 0; dr < item.tileRows; dr++) {
      for (let dc = 0; dc < item.tileCols; dc++) {
        blocked.add(tileKey(item.col + dc, item.row + dr));
      }
    }
  }
  return blocked;
}

export function canPlaceSoil(
  grid: GridData,
  itemDefs: Record<string, ItemDefinition>,
  col: number,
  row: number,
  cols: number,
  rows: number,
  /** When moving, exclude this anchor id so we don't block the item's current position. */
  excludeAnchorId?: string,
): SoilPlacementResult {
  const innerKeys = getSoilInnerKeys(grid, itemDefs, excludeAnchorId);

  for (let dr = 0; dr < rows; dr++) {
    for (let dc = 0; dc < cols; dc++) {
      const key = tileKey(col + dc, row + dr);
      if (innerKeys.has(key)) return { ok: false, reason: 'soil_overlap' };
    }
  }
  return { ok: true };
}

/**
 * Returns the set of tile keys that would be invalid when placing soil at (col, row)
 * with size (cols, rows) — i.e. tiles overlapping existing soil's inner plantable area.
 * Used for grid highlights during drag.
 */
export type TreePlacementResult =
  | { ok: true }
  | { ok: false; reason: 'collision' | 'out_of_bounds' };

/**
 * Checks if a tree can be placed at (col, row) with the given footprint.
 * Sapling: 1x1, in_growth/fully_grown: 2x2.
 *
 * Trees may sit on top of any other item — only other trees and soil's
 * plantable area block them.
 *
 * @param cols - Footprint width (1 for sapling, 2 for in_growth/fully_grown).
 * @param rows - Footprint height.
 * @param excludeAnchorId - When moving, exclude this anchor so we don't block the item's current position.
 */
export function canPlaceTree(
  grid: GridData,
  itemDefs: Record<string, ItemDefinition>,
  col: number,
  row: number,
  cols: number,
  rows: number,
  excludeAnchorId?: string,
): TreePlacementResult {
  if (col + cols > grid.cols || row + rows > grid.rows || col < 0 || row < 0) {
    return { ok: false, reason: 'out_of_bounds' };
  }
  const blocked = getTreeBlockedKeys(grid, itemDefs, excludeAnchorId);
  for (let dr = 0; dr < rows; dr++) {
    for (let dc = 0; dc < cols; dc++) {
      if (blocked.has(tileKey(col + dc, row + dr))) {
        return { ok: false, reason: 'collision' };
      }
    }
  }
  return { ok: true };
}

/**
 * Returns tile keys that would be invalid for tree placement.
 * Used for drag preview highlights (red squares).
 * Only marks tiles that actually overlap existing items (or are out of bounds),
 * not the entire preview footprint — matching soil behavior.
 */
export function getTreeInvalidTileKeys(
  grid: GridData,
  itemDefs: Record<string, ItemDefinition>,
  col: number,
  row: number,
  cols: number,
  rows: number,
  excludeAnchorId?: string,
): Set<string> {
  const invalid = new Set<string>();
  const blocked = getTreeBlockedKeys(grid, itemDefs, excludeAnchorId);
  for (let dr = 0; dr < rows; dr++) {
    for (let dc = 0; dc < cols; dc++) {
      const nc = col + dc;
      const nr = row + dr;
      const key = tileKey(nc, nr);
      const outOfBounds = nc < 0 || nc >= grid.cols || nr < 0 || nr >= grid.rows;
      if (outOfBounds || blocked.has(key)) {
        invalid.add(key);
      }
    }
  }
  return invalid;
}

export function getSoilInvalidTileKeys(
  grid: GridData,
  itemDefs: Record<string, ItemDefinition>,
  col: number,
  row: number,
  cols: number,
  rows: number,
  excludeAnchorId?: string,
): Set<string> {
  const innerKeys = new Set<string>();
  for (const item of getAllPlacedItems(grid)) {
    const aid = item.anchorId ?? item.id;
    if (excludeAnchorId && aid === excludeAnchorId) continue;
    if (item.anchorId) continue;
    const def = itemDefs[item.itemType];
    if (def?.category !== 'soil') continue;

    const innerCols = Math.max(0, item.tileCols - 2 * SOIL_INNER_INSET);
    const innerRows = Math.max(0, item.tileRows - 2 * SOIL_INNER_INSET);
    if (innerCols === 0 || innerRows === 0) continue;

    for (let dr = 0; dr < innerRows; dr++) {
      for (let dc = 0; dc < innerCols; dc++) {
        innerKeys.add(tileKey(item.col + SOIL_INNER_INSET + dc, item.row + SOIL_INNER_INSET + dr));
      }
    }
  }

  const invalid = new Set<string>();
  for (let dr = 0; dr < rows; dr++) {
    for (let dc = 0; dc < cols; dc++) {
      const key = tileKey(col + dc, row + dr);
      if (innerKeys.has(key)) invalid.add(key);
    }
  }
  return invalid;
}

/** Trees occupy 2x2 whatever their art size. */
export const TREE_FOOTPRINT = 2;

export type PlacementReason =
  | 'not_placeable'
  | 'food'
  | 'out_of_bounds'
  | 'soil_overlap'
  | 'collision'
  | 'no_soil'
  | 'has_crop'
  | 'too_small';

export type PlacementCheck =
  | { ok: true; col: number; row: number }
  | { ok: false; reason: PlacementReason };

/**
 * Whether an item can go at (col, row), and where it would actually land.
 *
 * Seeds snap to the nearest free slot on the soil under the finger, so the
 * answer is a position rather than a yes/no. Both the drop highlight and the
 * placement itself go through here: they used to carry separate copies of these
 * rules, and the highlight's copy only knew about soil and trees, so dragging
 * anything else showed a green footprint right up until the drop was refused.
 */
export function resolvePlacement(
  grid: GridData,
  itemDefs: Record<string, ItemDefinition>,
  def: ItemDefinition,
  col: number,
  row: number,
  /** When moving an existing item, its own tiles must not block it. */
  excludeAnchorId?: string,
): PlacementCheck {
  if (!def.placeable) return { ok: false, reason: 'not_placeable' };
  if (def.category === 'food') return { ok: false, reason: 'food' };

  if (def.category === 'seed') {
    let result = findSeedPlacement(grid, itemDefs, col, row, def.cols, def.rows);
    if (!result.ok) {
      for (const [dc, dr] of NEIGHBOR_OFFSETS) {
        const retry = findSeedPlacement(grid, itemDefs, col + dc, row + dr, def.cols, def.rows);
        if (retry.ok) { result = retry; break; }
      }
    }
    return result.ok
      ? { ok: true, col: result.col, row: result.row }
      : { ok: false, reason: result.reason };
  }

  if (def.category === 'tree') {
    const tree = canPlaceTree(grid, itemDefs, col, row, TREE_FOOTPRINT, TREE_FOOTPRINT, excludeAnchorId);
    return tree.ok ? { ok: true, col, row } : { ok: false, reason: tree.reason };
  }

  const cols = def.cols ?? 1;
  const rows = def.rows ?? 1;
  if (col < 0 || row < 0 || col + cols > grid.cols || row + rows > grid.rows) {
    return { ok: false, reason: 'out_of_bounds' };
  }

  if (def.category === 'soil') {
    const soil = canPlaceSoil(grid, itemDefs, col, row, cols, rows, excludeAnchorId);
    if (!soil.ok) return { ok: false, reason: soil.reason };
  }

  return { ok: true, col, row };
}

const TAP_NEIGHBOR_OFFSETS: [number, number][] = [
  [0, 0], [0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/** Find the soil anchor item near a tap coordinate (tap + 8 neighbors). */
export function findSoilAtTap(
  grid: GridData,
  itemDefs: Record<string, ItemDefinition>,
  tapCol: number,
  tapRow: number,
): PlacedItem | null {
  for (const [dc, dr] of TAP_NEIGHBOR_OFFSETS) {
    const tc = tapCol + dc;
    const tr = tapRow + dr;
    if (tc < 0 || tc >= grid.cols || tr < 0 || tr >= grid.rows) continue;
    const soilItem = getItemsAt(grid, tc, tr).find((it) => itemDefs[it.itemType]?.category === 'soil');
    if (!soilItem) continue;
    return resolveAnchor(grid, soilItem) ?? soilItem;
  }
  return null;
}

interface CropInfo {
  anchor: PlacedItem;
  needsWater: boolean;
  isReady: boolean;
}

/** Collect unique crops on a soil patch's inner plantable area. */
function getCropsOnSoil(grid: GridData, soilAnchor: PlacedItem): CropInfo[] {
  const seen = new Set<string>();
  const crops: CropInfo[] = [];
  const innerCols = Math.max(0, soilAnchor.tileCols - 2 * SOIL_INNER_INSET);
  const innerRows = Math.max(0, soilAnchor.tileRows - 2 * SOIL_INNER_INSET);

  for (let rr = 0; rr < innerRows; rr++) {
    for (let cc = 0; cc < innerCols; cc++) {
      const ic = soilAnchor.col + SOIL_INNER_INSET + cc;
      const ir = soilAnchor.row + SOIL_INNER_INSET + rr;
      const cropItem = getItemsAt(grid, ic, ir).find((it) => !!it.growthMs);
      if (!cropItem) continue;
      const anchor = resolveAnchor(grid, cropItem) ?? cropItem;
      if (seen.has(anchor.id)) continue;
      seen.add(anchor.id);
      const gMs = anchor.growthMs ?? cropItem.growthMs!;
      const isReady = !!anchor.plantedAt && !!anchor.watered && gMs > 0 && Date.now() - anchor.plantedAt >= gMs;
      crops.push({ anchor, needsWater: !anchor.watered, isReady });
    }
  }
  return crops;
}

export type SoilAction =
  | { type: 'water'; col: number; row: number }
  | { type: 'harvest'; col: number; row: number }
  | { type: 'plant'; col: number; row: number }
  | null;

/**
 * Consolidated soil-aware action resolver.
 * Finds the soil patch at tap, inspects crops, returns the best action.
 *
 * intent:
 *  - 'plant'   → closest empty slot on the soil
 *  - 'water'   → closest crop needing water
 *  - 'harvest' → closest ready crop
 *  - 'auto'    → priority: water > harvest
 */
export function resolveSoilAction(
  grid: GridData,
  itemDefs: Record<string, ItemDefinition>,
  tapCol: number,
  tapRow: number,
  intent: 'water' | 'harvest' | 'plant' | 'auto',
  seedDef?: { cols: number; rows: number },
): SoilAction {
  const soilAnchor = findSoilAtTap(grid, itemDefs, tapCol, tapRow);
  if (!soilAnchor) return null;

  if (intent === 'plant') {
    if (!seedDef) return null;
    const slots = getPlantableSlotsOnSoil(grid, soilAnchor, seedDef.cols, seedDef.rows);
    if (slots.length === 0) return null;
    const best = closestTo(slots, tapCol, tapRow);
    return { type: 'plant', col: best.col, row: best.row };
  }

  const crops = getCropsOnSoil(grid, soilAnchor);
  if (crops.length === 0) return null;

  const pickClosest = (list: CropInfo[]): CropInfo =>
    list.reduce((a, b) =>
      manhattan(a.anchor.col, a.anchor.row, tapCol, tapRow) <= manhattan(b.anchor.col, b.anchor.row, tapCol, tapRow) ? a : b,
    );

  if (intent === 'water' || intent === 'auto') {
    const needsWater = crops.filter((c) => c.needsWater);
    if (needsWater.length > 0) {
      const c = pickClosest(needsWater);
      return { type: 'water', col: c.anchor.col, row: c.anchor.row };
    }
    if (intent === 'water') return null;
  }

  if (intent === 'harvest' || intent === 'auto') {
    const ready = crops.filter((c) => c.isReady);
    if (ready.length > 0) {
      const c = pickClosest(ready);
      return { type: 'harvest', col: c.anchor.col, row: c.anchor.row };
    }
    if (intent === 'harvest') return null;
  }

  return null;
}

function closestTo<T extends { col: number; row: number }>(list: T[], tc: number, tr: number): T {
  return list.reduce((a, b) => manhattan(a.col, a.row, tc, tr) <= manhattan(b.col, b.row, tc, tr) ? a : b);
}

/**
 * Returns all valid seed-placement slots for a single soil patch.
 * Each slot is the top-left of a seedCols x seedRows quadrant with no existing crop.
 */
export function getPlantableSlotsOnSoil(
  grid: GridData,
  soilAnchor: PlacedItem,
  seedCols: number,
  seedRows: number,
): { col: number; row: number }[] {
  const inset = 1;
  const innerCols = soilAnchor.tileCols - 2 * inset;
  const innerRows = soilAnchor.tileRows - 2 * inset;
  if (innerCols < seedCols || innerRows < seedRows) return [];

  const results: { col: number; row: number }[] = [];
  for (let qr = 0; qr + seedRows <= innerRows; qr += seedRows) {
    for (let qc = 0; qc + seedCols <= innerCols; qc += seedCols) {
      const pc = soilAnchor.col + inset + qc;
      const pr = soilAnchor.row + inset + qr;
      let valid = true;
      for (let dr = 0; dr < seedRows && valid; dr++) {
        for (let dc = 0; dc < seedCols; dc++) {
          if (getItemsAt(grid, pc + dc, pr + dr).some((it) => !!it.growthMs)) {
            valid = false;
            break;
          }
        }
      }
      if (valid) results.push({ col: pc, row: pr });
    }
  }
  return results;
}

export function getPlantableTiles(
  grid: GridData,
  itemDefs: Record<string, ItemDefinition>,
  seedCols: number,
  seedRows: number,
): { col: number; row: number }[] {
  const results: { col: number; row: number }[] = [];
  const seen = new Set<string>();

  for (const item of getAllPlacedItems(grid)) {
    if (item.anchorId) continue;
    const def = itemDefs[item.itemType];
    if (def?.category !== 'soil') continue;

    const inset = 1;
    const innerCols = item.tileCols - 2 * inset;
    const innerRows = item.tileRows - 2 * inset;
    if (innerCols < seedCols || innerRows < seedRows) continue;

    for (let qr = 0; qr + seedRows <= innerRows; qr += seedRows) {
      for (let qc = 0; qc + seedCols <= innerCols; qc += seedCols) {
        const pc = item.col + inset + qc;
        const pr = item.row + inset + qr;
        const key = `${pc}:${pr}`;
        if (seen.has(key)) continue;

        let valid = true;
        outer:
        for (let dr = 0; dr < seedRows; dr++) {
          for (let dc = 0; dc < seedCols; dc++) {
            const tileItems = getItemsAt(grid, pc + dc, pr + dr);
            if (tileItems.some((it) => !!it.growthMs)) { valid = false; break outer; }
          }
        }
        if (valid) {
          seen.add(key);
          results.push({ col: pc, row: pr });
        }
      }
    }
  }
  return results;
}
