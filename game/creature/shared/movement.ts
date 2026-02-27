/**
 * Shared creature movement: tile ↔ pixel, walk targets.
 */
import type { PlacedItem } from '../../types';
import { getItemVisualCenterPx, getItemCenter } from '../../gridHelpers';
import { TILE_SIZE } from '../../constants';

export function tileToPx(tile: number): number {
  return tile * TILE_SIZE + TILE_SIZE / 2;
}

/**
 * Target (x,y) in pixels for walking.
 * - pet_bed: exact visual center of the bed's grid cells (no offset)
 * - food: target tile (pet stands behind food)
 * - other walkable: item visual center with alignment offset
 */
export function getWalkTargetPx(
  target: { col: number; row: number },
  interactionItem: PlacedItem | null,
  itemDefs: Record<string, import('../../types').ItemDefinition>,
  walkableSubCategories: readonly string[],
): { x: number; y: number } {
  const subCat = interactionItem && itemDefs[interactionItem.itemType]?.subCategory;
  if (subCat === 'food') {
    return { x: tileToPx(target.col), y: tileToPx(target.row) };
  }
  if (subCat === 'pet_bed' && walkableSubCategories.includes(subCat)) {
    const { col: cc, row: cr } = getItemCenter(interactionItem!);
    return { x: tileToPx(cc), y: tileToPx(cr) };
  }
  if (subCat && walkableSubCategories.includes(subCat)) {
    const center = getItemVisualCenterPx(interactionItem!, TILE_SIZE);
    return { x: center.x - 15, y: center.y - 20 };
  }
  return {
    x: tileToPx(target.col),
    y: tileToPx(target.row),
  };
}
