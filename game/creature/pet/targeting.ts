/**
 * Pet targeting: wander tiles and interaction targets (beds).
 */
import type { TileCoord } from '../../types';
import type { GridData, PlacedItem, ItemDefinition } from '../../types';
import {
  getBlockedTileKeysForPet,
  getPlacedItemsBySubCategory,
  getInteractionDestination,
  getItemCenter,
  getAllPlacedItems,
} from '../../gridHelpers';
import { randInt } from '../shared/utils';
import { PET_WALKABLE_SUBCATEGORIES, SUB_CATEGORY } from './stateConfig';

export function isTileWalkable(
  col: number,
  row: number,
  cols: number,
  rows: number,
  blocked: Set<string>,
): boolean {
  if (col < 0 || col >= cols || row < 0 || row >= rows) return false;
  return !blocked.has(`${col}:${row}`);
}

/** Pick a random wander target within radius of current position. */
export function pickRandomTarget(
  cur: TileCoord,
  activeGrid: GridData,
  itemDefs: Record<string, ItemDefinition>,
  cols: number,
  rows: number,
  radius: number,
): TileCoord | null {
  const blocked = getBlockedTileKeysForPet(activeGrid, itemDefs, PET_WALKABLE_SUBCATEGORIES);
  const minCol = Math.max(0, cur.col - radius);
  const maxCol = Math.min(cols - 1, cur.col + radius);
  const minRow = Math.max(0, cur.row - radius);
  const maxRow = Math.min(rows - 1, cur.row + radius);

  const candidates: TileCoord[] = [];
  for (let c = minCol; c <= maxCol; c++) {
    for (let r = minRow; r <= maxRow; r++) {
      if (isTileWalkable(c, r, cols, rows, blocked) && (c !== cur.col || r !== cur.row)) {
        candidates.push({ col: c, row: r });
      }
    }
  }
  return candidates.length === 0 ? null : candidates[randInt(0, candidates.length - 1)];
}

/**
 * Tile behind the food (one row up, same col) — pet stands there facing the food.
 * Falls back to getInteractionDestination if behind is blocked.
 */
function getFoodInteractionTile(
  item: PlacedItem,
  itemDefs: Record<string, ItemDefinition>,
  blocked: Set<string>,
  cols: number,
  rows: number,
): { col: number; row: number } | null {
  const { col: cc, row: cr } = getItemCenter(item);
  const behind = { col: cc, row: cr - 1 };
  if (behind.row >= 0 && behind.col >= 0 && behind.col < cols && !blocked.has(`${behind.col}:${behind.row}`)) {
    return behind;
  }
  return getInteractionDestination(item, itemDefs, PET_WALKABLE_SUBCATEGORIES, blocked, cols, rows);
}

/** Pick a food item to walk to. Returns tile behind food + item. Pet stands there facing left toward food. */
export function pickFoodTarget(
  activeGrid: GridData,
  itemDefs: Record<string, ItemDefinition>,
  cols: number,
  rows: number,
): { tile: TileCoord; item: PlacedItem } | null {
  let foods = getPlacedItemsBySubCategory(activeGrid, itemDefs, SUB_CATEGORY.FOOD);
  if (foods.length === 0) {
    foods = getAllPlacedItems(activeGrid).filter((item) => {
      const def = itemDefs[item.itemType];
      return def?.category === 'food' && !item.anchorId;
    });
  }
  if (foods.length === 0) return null;

  const blocked = getBlockedTileKeysForPet(activeGrid, itemDefs, PET_WALKABLE_SUBCATEGORIES);
  const item = foods[randInt(0, foods.length - 1)];
  const tile = getFoodInteractionTile(item, itemDefs, blocked, cols, rows);
  return tile ? { tile, item } : null;
}

/** Pick a food dish with food in its queue. Pet walks there to eat. */
export function pickFoodDishTarget(
  activeGrid: GridData,
  itemDefs: Record<string, ItemDefinition>,
  foodDishQueues: Record<string, string[]> | undefined,
  cols: number,
  rows: number,
): { tile: TileCoord; item: PlacedItem } | null {
  if (!foodDishQueues || Object.keys(foodDishQueues).length === 0) return null;

  const dishes = getAllPlacedItems(activeGrid).filter((item) => {
    if (item.anchorId) return false;
    const def = itemDefs[item.itemType];
    const anchorId = item.anchorId ?? item.id;
    return def?.interactAction?.payload === 'food_dish' && (foodDishQueues[anchorId]?.length ?? 0) > 0;
  });
  if (dishes.length === 0) return null;

  const blocked = getBlockedTileKeysForPet(activeGrid, itemDefs, PET_WALKABLE_SUBCATEGORIES);
  const item = dishes[randInt(0, dishes.length - 1)];
  const tile = getFoodInteractionTile(item, itemDefs, blocked, cols, rows);
  return tile ? { tile, item } : null;
}

/** Pick a pet bed to walk to. Returns tile + item for walkable destinations. */
export function pickPetBedTarget(
  activeGrid: GridData,
  itemDefs: Record<string, ItemDefinition>,
  cols: number,
  rows: number,
): { tile: TileCoord; item: PlacedItem } | null {
  const beds = getPlacedItemsBySubCategory(activeGrid, itemDefs, SUB_CATEGORY.PET_BED);
  if (beds.length === 0) return null;

  const blocked = getBlockedTileKeysForPet(activeGrid, itemDefs, PET_WALKABLE_SUBCATEGORIES);
  const item = beds[randInt(0, beds.length - 1)];
  const tile = getInteractionDestination(
    item,
    itemDefs,
    PET_WALKABLE_SUBCATEGORIES,
    blocked,
    cols,
    rows,
  );
  return tile ? { tile, item } : null;
}

/** Pick an adjacent walkable tile to a bug. Pet will walk there and admire (wow). */
export function pickBugTarget(
  bugs: { col: number; row: number }[],
  activeGrid: GridData,
  itemDefs: Record<string, ItemDefinition>,
  cols: number,
  rows: number,
): TileCoord | null {
  if (bugs.length === 0) return null;
  const blocked = getBlockedTileKeysForPet(activeGrid, itemDefs, PET_WALKABLE_SUBCATEGORIES);
  const shuffled = [...bugs].sort(() => Math.random() - 0.5);
  for (const bug of shuffled) {
    const adj: TileCoord[] = [
      { col: bug.col - 1, row: bug.row },
      { col: bug.col + 1, row: bug.row },
      { col: bug.col, row: bug.row - 1 },
      { col: bug.col, row: bug.row + 1 },
    ];
    const valid = adj.filter((a) => isTileWalkable(a.col, a.row, cols, rows, blocked));
    if (valid.length > 0) return valid[randInt(0, valid.length - 1)];
  }
  return null;
}
