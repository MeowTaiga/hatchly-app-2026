import type { ItemDefinition } from '../types';

/**
 * Paint-order offsets. Lower paints first.
 *
 * Whole categories are pushed far below the row-based range so that, for
 * example, no amount of row difference can put a floor tile over a fence.
 */
const FLOOR_DEPTH = -1e6;
const SOIL_DEPTH = -5e5;
/** Tables sit under the items placed on top of them. */
const TABLE_DEPTH_OFFSET = -1000;

/**
 * Adjusts a row-based depth for the item's category.
 *
 * @param baseDepth - Usually the item's bottom row, so taller things in front
 *   overlap what's behind them.
 */
export function applyCategoryDepth(baseDepth: number, def: ItemDefinition | undefined): number {
  const category = def?.category;
  if (category === 'flooring' || category === 'tiled_flooring') return FLOOR_DEPTH + baseDepth;
  if (category === 'soil') return SOIL_DEPTH + baseDepth;
  if (def?.subCategory === 'table') return baseDepth + TABLE_DEPTH_OFFSET;
  return baseDepth;
}
