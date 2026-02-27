/**
 * Helper functions for the Game Provider: grid creation, snapshot parsing, and ID generation.
 */

import type { GridData, PlacedItem, ItemDefinition } from '../types';
import type { GameSnapshot } from '../types';
import { createItemsMapFromSnapshot } from '../gridHelpers';

/**
 * Creates an empty grid with the given dimensions.
 *
 * @param cols - Number of columns.
 * @param rows - Number of rows.
 * @returns A new GridData with an empty items map.
 */
export function createEmptyGrid(cols: number, rows: number): GridData {
  return { cols, rows, items: new Map<string, PlacedItem[]>() };
}

/**
 * Converts a snapshot placed item to the client PlacedItem shape.
 *
 * @param si - Raw snapshot item from the server.
 * @param itemDefs - Current item definitions for resolving color, emoji, image.
 * @returns A fully-formed PlacedItem.
 */
export function snapshotItemToPlacedItem(
  si: GameSnapshot['placedItems'][number],
  itemDefs: Record<string, ItemDefinition>,
): PlacedItem {
  const def = itemDefs[si.itemType];
  const isAnchor = !si.anchorId;
  return {
    id: si.id,
    itemType: si.itemType,
    col: si.col,
    row: si.row,
    color: def?.color ?? '#888',
    emoji: isAnchor ? def?.emoji : undefined,
    imageUrl: isAnchor ? def?.imageUrl : undefined,
    tileCols: si.tileCols,
    tileRows: si.tileRows,
    anchorId: si.anchorId,
    plantedAt: si.plantedAt,
    growthMs: si.growthMs,
    watered: si.watered,
  };
}

/**
 * Builds a farm grid from a game snapshot.
 *
 * @param snapshot - Full game snapshot from the server.
 * @param itemDefs - Item definitions for resolving visuals.
 * @returns A populated farm GridData.
 */
export function createFarmGridFromSnapshot(
  snapshot: GameSnapshot,
  itemDefs: Record<string, ItemDefinition>,
): GridData {
  const grid = createEmptyGrid(snapshot.gridCols, snapshot.gridRows);
  grid.items = createItemsMapFromSnapshot(
    snapshot.placedItems,
    (si) => snapshotItemToPlacedItem(si as GameSnapshot['placedItems'][number], itemDefs),
  );
  return grid;
}

let nextItemId = 1;

/**
 * Generates a unique ID for optimistic client-side items.
 * Format: `opt_${sequence}_${timestamp}`.
 *
 * @returns A unique string ID.
 */
export function genItemId(): string {
  return `opt_${nextItemId++}_${Date.now()}`;
}
