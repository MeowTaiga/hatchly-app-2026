/**
 * Game action callbacks: placement, removal, harvest, tile selection, and more.
 * All actions perform optimistic updates and emit to the server where needed.
 */

import { useCallback, useRef } from 'react';
import { BUG_CATCH_BUFFER_MS, BUG_LIFESPAN_MS } from '../constants';
import {
  canPlaceSoil,
  canPlaceTree,
  findNearbyInteractable,
  findSeedPlacement,
  getAllPlacedItems,
  getItemAt,
  getItemsAt,
  isTileActionable,
  NEIGHBOR_OFFSETS,
  resolveAnchor as resolveAnchorFromGrid,
  resolveSoilAction,
} from '../gridHelpers';
import type {
  GridData,
  HarvestEffect,
  ItemCategory,
  PlacedItem,
  Scene,
  ToolMode,
} from '../types';
import { tileKey } from '../types';
import { hasRequiredTool, getNoToolMessage } from '../toolRequiredUtils';
import { tryInteractWithPlacedItem } from '../interactWithPlacedItem';
import { genItemId } from './helpers';
import { optIdMap } from './reducer';
import type { GameContextValue, GameState } from './types';

/** Socket emissions and helpers needed by actions. */
export interface GameActionsDeps {
  decorationReactionRef: React.MutableRefObject<((col: number, row: number, itemType: string) => void) | null>;
  emitPlaceItem: (itemType: string, col: number, row: number) => void;
  emitRemoveItem: (anchorId: string) => void;
  emitHarvest: (anchorId: string) => void;
  emitRenameFarm: (name: string) => void;
  emitMoveItem: (itemId: string, col: number, row: number) => void;
  emitWaterTile: (col: number, row: number) => void;
  emitCropBatch: (ops: Array<{ type: string; itemType?: string; col?: number; row?: number; anchorId?: string }>) => void;
  emitPurchase: (itemType: string) => void;
  emitSell: (itemType: string, qty?: number) => void;
  emitSellBatch: (items: Array<{ itemType: string; qty: number }>) => void;
  emitAddToFoodDish: (anchorId: string, items: Array<{ itemType: string; qty: number }>) => void;
  emitSetEquipped: (slot: 'handTool' | 'bobber' | 'bait' | 'chair', itemType: string | null) => void;
  emitCatchBug: (spawnId: string) => void;
  emitDigFossil: (anchorId: string) => void;
  emitShakeTree: (anchorId: string) => void;
  emitCompleteQuest: (questId: string) => void;
  emitQuestActivateByNpc: (npcItemType: string) => void;
  emitQuestActivateByScene: (sceneSlug: string) => void;
  emitQuestModalOpened: (payload: string) => void;
  tryAutoAdvanceDialog: (action: string, itemType?: string) => void;
  showPetDialog: (text: string) => void;
  setPendingNpcDialog: (info: { steps: import('../types').DialogStep[]; speaker?: import('../types').DialogSpeaker; npcItemType: string } | null) => void;
  /** Optimistically mark a locked quest as active (for immediate icon update). */
  optimisticallyActivateQuest?: (questId: string) => void;
  /** Pet level for quest activation checks (default 1 if not provided). */
  petLevel?: number;
}

/** Debounce delay before flushing the crop batch queue to the server. */
const CROP_BATCH_DEBOUNCE_MS = 300;

/** Debounce delay before flushing the shake tree batch to the server. */
const SHAKE_BATCH_DEBOUNCE_MS = 300;

type Dispatch = React.Dispatch<import('./types').GameAction>;

/**
 * Builds all game action callbacks.
 *
 * @param state - Current game state.
 * @param dispatch - Reducer dispatch.
 * @param activeGrid - The grid for the current scene.
 * @param deps - Socket emissions and helpers.
 * @returns All action functions for the context value.
 */
export function useGameActions(
  state: GameState,
  dispatch: Dispatch,
  activeGrid: GridData,
  deps: GameActionsDeps,
): Pick<
  GameContextValue,
  | 'placeItem'
  | 'placeItemAt'
  | 'removeItem'
  | 'moveItem'
  | 'setPendingDropTarget'
  | 'harvestCrop'
  | 'dismissHarvestEffect'
  | 'waterTile'
  | 'purchaseItem'
  | 'sellItem'
  | 'sellItemsBatch'
  | 'addToFoodDish'
  | 'equipItem'
  | 'catchBug'
  | 'dismissCatchResult'
  | 'digFossil'
  | 'shakeTree'
  | 'completeQuest'
  | 'selectTile'
  | 'startMoveItem'
  | 'cancelMove'
  | 'storeSelectedItem'
  | 'storeItemByAnchorId'
  | 'destroySelectedItem'
  | 'selectInventoryItem'
  | 'switchScene'
  | 'applySceneChange'
  | 'completeTransition'
  | 'toggleEditMode'
  | 'setToolMode'
  | 'setCategory'
  | 'setFarmName'
  | 'clearInteraction'
  | 'setPendingInteraction'
> {
  const {
    decorationReactionRef,
    emitPlaceItem,
    emitRemoveItem,
    emitHarvest,
    emitRenameFarm,
    emitMoveItem,
    emitWaterTile,
    emitCropBatch,
    emitPurchase,
    emitSell,
    emitSellBatch,
    emitAddToFoodDish,
    emitSetEquipped,
    emitCatchBug,
    emitDigFossil,
    emitShakeTree,
    emitCompleteQuest,
    emitQuestActivateByNpc,
    emitQuestActivateByScene,
    emitQuestModalOpened,
    tryAutoAdvanceDialog,
    showPetDialog,
    setPendingNpcDialog,
  } = deps;

  // ── Crop batch queue: accumulate ops, flush after debounce ──────────────
  const cropBatchQueueRef = useRef<Array<{ type: string; itemType?: string; col?: number; row?: number; anchorId?: string }>>([]);
  const cropBatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushCropBatch = useCallback(() => {
    const ops = cropBatchQueueRef.current;
    if (ops.length === 0) return;
    cropBatchQueueRef.current = [];
    emitCropBatch(ops);
  }, [emitCropBatch]);

  const enqueueCropOp = useCallback(
    (op: { type: string; itemType?: string; col?: number; row?: number; anchorId?: string }) => {
      cropBatchQueueRef.current.push(op);
      if (cropBatchTimerRef.current) clearTimeout(cropBatchTimerRef.current);
      cropBatchTimerRef.current = setTimeout(flushCropBatch, CROP_BATCH_DEBOUNCE_MS);
    },
    [flushCropBatch],
  );

  // ── Shake tree batch: accumulate anchorIds, flush after debounce ─────────
  const shakeBatchQueueRef = useRef<Set<string>>(new Set());
  const shakeBatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushShakeBatch = useCallback(() => {
    const ids = shakeBatchQueueRef.current;
    if (ids.size === 0) return;
    const toSend = [...ids];
    shakeBatchQueueRef.current = new Set();
    for (const anchorId of toSend) {
      emitShakeTree(anchorId);
    }
  }, [emitShakeTree]);

  const enqueueShake = useCallback(
    (anchorId: string) => {
      shakeBatchQueueRef.current.add(anchorId);
      if (shakeBatchTimerRef.current) clearTimeout(shakeBatchTimerRef.current);
      shakeBatchTimerRef.current = setTimeout(flushShakeBatch, SHAKE_BATCH_DEBOUNCE_MS);
    },
    [flushShakeBatch],
  );

  const resolveAnchor = resolveAnchorFromGrid;

  const SEED_ERROR_MSGS: Record<string, string> = {
    no_soil: "Seeds need to be planted on soil! Place some soil first 🪴",
    has_crop: "There's already a crop growing here! 🌱",
    too_small: "This soil patch isn't big enough for this seed!",
  };

  const pendingPlacementKeysRef = useRef<Set<string>>(new Set());
  const PENDING_PLACEMENT_MS = 400;

  const placeItemCore = useCallback(
    (itemType: string, col: number, row: number): boolean => {
      if (!state.editMode) return false;
      const def = state.itemDefs[itemType];
      if (!def?.placeable) return false;
      if (def.category === 'food') {
        showPetDialog("Food can't be placed on the farm. Use a food dish to feed your pet!");
        return false;
      }
      if ((state.inventory[itemType] ?? 0) <= 0) return false;

      // Ensure base placement is within grid bounds
      const clampedCol = Math.max(0, Math.min(activeGrid.cols - (def.cols ?? 1), col));
      const clampedRow = Math.max(0, Math.min(activeGrid.rows - (def.rows ?? 1), row));

      let plantCol = clampedCol;
      let plantRow = clampedRow;

      if (def.category === 'soil') {
        const soilResult = canPlaceSoil(activeGrid, state.itemDefs, col, row, def.cols, def.rows);
        if (!soilResult.ok) {
          showPetDialog(
            "Oops! Soil can't be placed on top of the plantable area of another soil patch. Try placing it alongside instead! 🌱",
          );
          return false;
        }
      }

      if (def.category === 'seed') {
        let result = findSeedPlacement(activeGrid, state.itemDefs, col, row, def.cols, def.rows);
        if (!result.ok) {
          for (const [dc, dr] of NEIGHBOR_OFFSETS) {
            const retry = findSeedPlacement(activeGrid, state.itemDefs, col + dc, row + dr, def.cols, def.rows);
            if (retry.ok) { result = retry; break; }
          }
        }
        if (!result.ok) {
          showPetDialog(SEED_ERROR_MSGS[result.reason] ?? 'Cannot place here.');
          return false;
        }
        plantCol = result.col;
        plantRow = result.row;
      }

      if (def.category === 'tree') {
        const treeCols = 2;
        const treeRows = 2;
        const treeResult = canPlaceTree(activeGrid, col, row, treeCols, treeRows);
        if (!treeResult.ok) {
          showPetDialog(
            treeResult.reason === 'out_of_bounds'
              ? "That spot is out of bounds! 🌳"
              : "Trees need a clear area. Try another spot! 🌳",
          );
          return false;
        }
        plantCol = col;
        plantRow = row;
      }

      const isTree = def.category === 'tree';
      const blockCols = isTree ? 2 : (def.cols ?? 1);
      const blockRows = isTree ? 2 : (def.rows ?? 1);
      const keysToBlock: string[] = [];
      for (let dr = 0; dr < blockRows; dr++) {
        for (let dc = 0; dc < blockCols; dc++) {
          keysToBlock.push(tileKey(plantCol + dc, plantRow + dr));
        }
      }
      // For seeds (crops), skip the pending placement lockout so spam-planting
      // is instant. Non-seed items still use the lockout to prevent double-tap.
      if (def.category !== 'seed') {
        const pending = pendingPlacementKeysRef.current;
        if (keysToBlock.some((k) => pending.has(k))) return false;
        for (const k of keysToBlock) pending.add(k);
        const toRemove = [...keysToBlock];
        setTimeout(() => {
          for (const k of toRemove) pending.delete(k);
        }, PENDING_PLACEMENT_MS);
      }

      const anchorId = genItemId();
      const items: PlacedItem[] = [];
      const keys: string[] = [];
      const today = new Date().toISOString().slice(0, 10);
      const itemRows = blockRows;
      const itemCols = blockCols;
      for (let dr = 0; dr < itemRows; dr++) {
        for (let dc = 0; dc < itemCols; dc++) {
          const isAnchor = dr === 0 && dc === 0;
          const id = isAnchor ? anchorId : genItemId();
          const item: PlacedItem = {
            id,
            clientId: id,
            itemType: def.itemType,
            col: plantCol + dc,
            row: plantRow + dr,
            color: def.color,
            emoji: isAnchor ? def.emoji : undefined,
            imageUrl: isAnchor ? def.imageUrl : undefined,
            tileCols: itemCols,
            tileRows: itemRows,
            anchorId: isAnchor ? undefined : anchorId,
            plantedAt: undefined,
            growthMs: def.growthMs,
            watered: def.growthMs ? false : undefined,
          };
          if (def.category === 'tree') {
            item.treePlantedDate = today;
          }
          items.push(item);
          keys.push(tileKey(plantCol + dc, plantRow + dr));
        }
      }
      dispatch({ type: 'OPTIMISTIC_PLACE', items, keys, itemType: def.itemType });
      // Seeds go through the batch queue; everything else calls the server directly
      if (def.category === 'seed') {
        enqueueCropOp({ type: 'plant', itemType: def.itemType, col: plantCol, row: plantRow });
      } else {
        emitPlaceItem(def.itemType, plantCol, plantRow);
      }
      tryAutoAdvanceDialog('place', def.itemType);
      if (def.category === 'decoration') {
        decorationReactionRef.current?.(plantCol, plantRow, def.itemType);
      }
      return true;
    },
    [state.editMode, state.inventory, state.itemDefs, activeGrid, decorationReactionRef, emitPlaceItem, enqueueCropOp, showPetDialog, tryAutoAdvanceDialog, dispatch],
  );

  const placeItem = useCallback(
    (col: number, row: number) => {
      if (!state.selectedItemType) return;
      placeItemCore(state.selectedItemType, col, row);
    },
    [state.selectedItemType, placeItemCore],
  );

  const placeItemAt = useCallback(
    (itemType: string, col: number, row: number): boolean => {
      return placeItemCore(itemType, col, row) ?? false;
    },
    [placeItemCore],
  );

  const removeItem = useCallback(
    (col: number, row: number) => {
      const item = getItemAt(activeGrid, col, row);
      if (!item) return;
      let anchId = item.anchorId ?? item.id;
      if (anchId.startsWith('opt_')) {
        const mapped = optIdMap.get(anchId);
        if (mapped) {
          anchId = mapped;
        } else {
          const atTile = getItemsAt(activeGrid, col, row);
          const serverItem = atTile.find((it) => !it.id.startsWith('opt_'));
          if (serverItem) anchId = serverItem.anchorId ?? serverItem.id;
          else {
            dispatch({ type: 'OPTIMISTIC_REMOVE', anchorId: anchId, itemType: item.itemType });
            return;
          }
        }
      }
      dispatch({ type: 'OPTIMISTIC_REMOVE', anchorId: anchId, itemType: item.itemType });
      emitRemoveItem(anchId);
    },
    [activeGrid, emitRemoveItem, dispatch],
  );

  const moveItem = useCallback(
    (itemId: string, col: number, row: number): boolean => {
      if (!itemId || isNaN(col) || isNaN(row)) return false;
      let resolvedId = itemId;
      let movingItem: PlacedItem | undefined;
      if (itemId.startsWith('opt_')) {
        const mapped = optIdMap.get(itemId);
        if (mapped) {
          resolvedId = mapped;
        } else {
          for (const it of getAllPlacedItems(activeGrid)) {
            if (it.id === itemId || it.anchorId === itemId) {
              const anchor = resolveAnchor(activeGrid, it) ?? it;
              movingItem = anchor;
              const atTile = getItemsAt(activeGrid, it.col, it.row);
              const server = atTile.find((s) => !s.id.startsWith('opt_') && s.itemType === it.itemType);
              if (server) { resolvedId = server.anchorId ?? server.id; break; }
            }
          }
        }
        if (resolvedId.startsWith('opt_')) {
          dispatch({ type: 'CANCEL_MOVE' });
          return false;
        }
      }
      if (!movingItem) {
        const found = getAllPlacedItems(activeGrid).find(
          (it) => it.id === resolvedId || it.anchorId === resolvedId,
        );
        movingItem = found ? (resolveAnchor(activeGrid, found) ?? found) : undefined;
      }
      const def = movingItem ? state.itemDefs[movingItem.itemType] : null;
      if (def?.category === 'soil') {
        const soilResult = canPlaceSoil(
          activeGrid,
          state.itemDefs,
          col,
          row,
          def.cols,
          def.rows,
          movingItem?.id,
        );
        if (!soilResult.ok) {
          showPetDialog(
            "Oops! Soil can't be placed on top of the plantable area of another soil patch. Try moving it alongside instead! 🌱",
          );
          dispatch({ type: 'CANCEL_MOVE' });
          return false;
        }
      }
      if (def?.category === 'tree') {
        const treeCols = movingItem?.tileCols ?? def.cols ?? 2;
        const treeRows = movingItem?.tileRows ?? def.rows ?? 2;
        const treeResult = canPlaceTree(activeGrid, col, row, treeCols, treeRows, movingItem?.id);
        if (!treeResult.ok) {
          showPetDialog(
            treeResult.reason === 'out_of_bounds'
              ? "That spot is out of bounds! 🌳"
              : "Trees need a clear area. Try another spot! 🌳",
          );
          dispatch({ type: 'CANCEL_MOVE' });
          return false;
        }
      }
      emitMoveItem(resolvedId, col, row);
      // Do NOT dispatch CANCEL_MOVE — pending stays until server confirms via APPLY_GRID
      return true;
    },
    [activeGrid, state.itemDefs, emitMoveItem, showPetDialog, dispatch],
  );

  const shakeTree = useCallback(
    (anchorId: string) => {
      dispatch({ type: 'TREE_SHAKE', anchorId, trigger: Date.now() });
      enqueueShake(anchorId);
    },
    [enqueueShake, dispatch],
  );

  const setPendingDropTarget = useCallback(
    (target: { anchorId: string; newCol: number; newRow: number } | null) => {
      dispatch({ type: 'SET_PENDING_DROP', target });
    },
    [dispatch],
  );

  const harvestCrop = useCallback(
    (col: number, row: number): HarvestEffect | null => {
      const items = getItemsAt(activeGrid, col, row);
      const item = items.find((it) => !!it.growthMs);
      if (!item?.plantedAt || !item?.growthMs || !item?.watered) return null;
      if (Date.now() - item.plantedAt < item.growthMs) return null;

      const def = state.itemDefs[item.itemType];
      if (!def?.harvestYield?.length) return null;

      const anchId = item.anchorId ?? item.id;
      const anchor = resolveAnchor(activeGrid, item) ?? item;
      const grownDef = def.harvestYield.find((d) => d.itemType !== item.itemType);
      const grownItemDef = grownDef ? state.itemDefs[grownDef.itemType] : null;

      const effect: HarvestEffect = {
        id: `harvest_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        col: anchor.col,
        row: anchor.row,
        drops: def.harvestYield,
        cropEmoji: grownItemDef?.emoji ?? item.emoji,
        cropImageUrl: grownItemDef?.imageUrl ?? item.imageUrl,
        cropColor: item.color,
        tileCols: anchor.tileCols,
        tileRows: anchor.tileRows,
      };

      dispatch({ type: 'OPTIMISTIC_HARVEST', anchorId: anchId, effect });
      // Use resolvedId for harvest: prefer server ID via optIdMap
      let resolvedAnchor = anchId;
      if (anchId.startsWith('opt_')) {
        const mapped = optIdMap.get(anchId);
        if (mapped) resolvedAnchor = mapped;
      }
      enqueueCropOp({ type: 'harvest', anchorId: resolvedAnchor });
      tryAutoAdvanceDialog('harvest', item.itemType);
      for (const drop of def.harvestYield) {
        if (drop.itemType !== item.itemType) {
          tryAutoAdvanceDialog('harvest', drop.itemType);
        }
      }
      return effect;
    },
    [state.itemDefs, activeGrid, enqueueCropOp, tryAutoAdvanceDialog, dispatch],
  );

  const dismissHarvestEffect = useCallback((id: string) => {
    dispatch({ type: 'DISMISS_EFFECT', id });
  }, [dispatch]);

  const waterTile = useCallback(
    (col: number, row: number) => {
      const items = getItemsAt(activeGrid, col, row);
      const crop = items.find((it) => !!it.growthMs);
      if (!crop) return;
      dispatch({ type: 'OPTIMISTIC_WATER', col, row });
      if (!crop.watered) {
        enqueueCropOp({ type: 'water', col, row });
      }
      tryAutoAdvanceDialog('water', crop.itemType);
    },
    [activeGrid, enqueueCropOp, tryAutoAdvanceDialog, dispatch],
  );

  const purchaseItem = useCallback(
    (itemType: string) => {
      const def = state.itemDefs[itemType];
      if (!def?.buyable || !def.gemPrice || def.gemPrice <= 0) return;
      if (state.gems < def.gemPrice) return;
      emitPurchase(itemType);
      tryAutoAdvanceDialog('purchase', itemType);
    },
    [state.itemDefs, state.gems, emitPurchase, tryAutoAdvanceDialog],
  );

  const sellItem = useCallback(
    (itemType: string, qty?: number) => {
      const def = state.itemDefs[itemType];
      if (!def) return;
      const price = typeof def.sellPrice === 'number' ? def.sellPrice : 0;
      const current = state.inventory[itemType] ?? 0;
      if (current <= 0) return;
      const sellQty = Math.min(qty ?? 1, current);
      emitSell(itemType, sellQty);
    },
    [state.itemDefs, state.inventory, emitSell],
  );

  const sellItemsBatch = useCallback(
    (items: Array<{ itemType: string; qty: number }>) => {
      const valid = items.filter(({ itemType, qty }) => {
        if (qty <= 0) return false;
        const current = state.inventory[itemType] ?? 0;
        return current > 0;
      }).map(({ itemType, qty }) => ({
        itemType,
        qty: Math.min(qty, state.inventory[itemType] ?? 0),
      }));
      if (valid.length > 0) {
        if (__DEV__) {
          console.log('[Sell] sellItemsBatch: dispatching OPTIMISTIC_SELL', {
            valid,
            inventoryBefore: { ...state.inventory },
          });
        }
        dispatch({ type: 'OPTIMISTIC_SELL', items: valid });
        emitSellBatch(valid);
      }
    },
    [state.inventory, dispatch, emitSellBatch],
  );

  const addToFoodDish = useCallback(
    (anchorId: string, items: Array<{ itemType: string; qty: number }>) => {
      const valid = items.filter(({ itemType, qty }) => {
        if (qty <= 0) return false;
        const current = state.inventory[itemType] ?? 0;
        return current > 0;
      }).map(({ itemType, qty }) => ({
        itemType,
        qty: Math.min(qty, state.inventory[itemType] ?? 0),
      }));
      if (valid.length > 0) {
        dispatch({ type: 'OPTIMISTIC_ADD_TO_FOOD_DISH', items: valid });
        emitAddToFoodDish(anchorId, valid);
      }
    },
    [state.inventory, dispatch, emitAddToFoodDish],
  );

  const equipItem = useCallback(
    (slot: 'handTool' | 'bobber' | 'bait' | 'chair', itemType: string | null) => {
      emitSetEquipped(slot, itemType);
    },
    [emitSetEquipped],
  );

  const catchBug = useCallback(
    (spawnId: string) => {
      const bug = state.activeBugs.find((b) => b.spawnId === spawnId);
      if (!bug) return;
      const now = Date.now();
      if (bug.spawnedAt != null && now - bug.spawnedAt >= BUG_LIFESPAN_MS - BUG_CATCH_BUFFER_MS) {
        dispatch({ type: 'REMOVE_BUG', spawnId });
        showPetDialog('The bug flew away! 🦋');
        return;
      }
      emitCatchBug(spawnId);
      tryAutoAdvanceDialog('catch', undefined);
    },
    [state.activeBugs, emitCatchBug, tryAutoAdvanceDialog, dispatch, showPetDialog],
  );

  const dismissCatchResult = useCallback(() => {
    dispatch({ type: 'SET_CATCH_RESULT', result: null });
  }, [dispatch]);

  const digFossil = useCallback(
    (anchorId: string) => {
      if (!hasRequiredTool('digging', state.equipped, state.itemDefs)) {
        showPetDialog(getNoToolMessage('digging'));
        return;
      }
      emitDigFossil(anchorId);
    },
    [state.equipped, state.itemDefs, emitDigFossil, showPetDialog],
  );

  const completeQuest = useCallback(
    (questId: string) => {
      emitCompleteQuest(questId);
    },
    [emitCompleteQuest],
  );

  const selectTile = useCallback(
    (inCol: number, inRow: number) => {
      let col = inCol, row = inRow;
      if (!isTileActionable(activeGrid, col, row, state.itemDefs)) {
        const nearby = findNearbyInteractable(activeGrid, col, row, state.itemDefs);
        if (nearby) { col = nearby.col; row = nearby.row; }
      }
      const key = tileKey(col, row);
      const existing = getItemAt(activeGrid, col, row);

      if (state.movingItemId) {
        moveItem(state.movingItemId, col, row);
        return;
      }

      if (state.toolMode === 'trash') {
        if (existing) {
          const anchor = resolveAnchor(activeGrid, existing);
          if (anchor) removeItem(anchor.col, anchor.row);
        }
        return;
      }

      if (state.toolMode === 'none') {
        const soilActionNone = resolveSoilAction(activeGrid, state.itemDefs, col, row, 'harvest');
        if (soilActionNone && soilActionNone.type === 'harvest') {
          harvestCrop(soilActionNone.col, soilActionNone.row);
          return;
        }
        if (existing) {
          const handled = tryInteractWithPlacedItem(
            existing,
            state.itemDefs,
            state.quests,
            state.farmLevel,
            deps.petLevel ?? 1,
            {
              setPendingNpcDialog,
              queueNpcDialog: (steps, speaker, npcItemType, _blocking, questIdToComplete) =>
                dispatch({
                  type: 'QUEUE_NPC_DIALOG',
                  steps,
                  speaker,
                  npcItemType,
                  questIdToComplete,
                }),
              optimisticallyActivateQuest: deps.optimisticallyActivateQuest,
              emitQuestActivateByNpc,
              switchScene: (target) => dispatch({ type: 'SWITCH_SCENE', target }),
              dispatch,
              clearInteraction: () => dispatch({ type: 'SET_INTERACTION', action: null }),
              emitQuestModalOpened,
            },
          );
          if (handled) return;
        }
        return;
      }

      if (state.toolMode === 'build') {
        const hasSeedSelected = state.selectedItemType
          && state.itemDefs[state.selectedItemType]?.category === 'seed';

        if (!hasSeedSelected) {
          const soilAction = resolveSoilAction(activeGrid, state.itemDefs, col, row, 'auto');
          if (soilAction) {
            if (soilAction.type === 'water') { waterTile(soilAction.col, soilAction.row); return; }
            if (soilAction.type === 'harvest') { harvestCrop(soilAction.col, soilAction.row); return; }
          }
        }

        if (state.selectedItemType) {
          placeItem(col, row);
          return;
        }
        if (existing) {
          const def = state.itemDefs[existing.itemType];
          const canInteract = def?.category === 'npc' || (def?.interactAction && def.interactAction.type !== 'none');
          if (canInteract) {
            const handled = tryInteractWithPlacedItem(
              existing,
              state.itemDefs,
              state.quests,
              state.farmLevel,
              deps.petLevel ?? 1,
              {
                setPendingNpcDialog,
                queueNpcDialog: (steps, speaker, npcItemType, _blocking, questIdToComplete) =>
                  dispatch({
                    type: 'QUEUE_NPC_DIALOG',
                    steps,
                    speaker,
                    npcItemType,
                    questIdToComplete,
                  }),
                optimisticallyActivateQuest: deps.optimisticallyActivateQuest,
                emitQuestActivateByNpc,
                switchScene: (target) => dispatch({ type: 'SWITCH_SCENE', target }),
                dispatch,
                clearInteraction: () => dispatch({ type: 'SET_INTERACTION', action: null }),
                emitQuestModalOpened,
              },
            );
            if (handled) return;
          }
          const anchor = resolveAnchor(activeGrid, existing);
          if (anchor && !anchor.growthMs) {
            const anchorKey = tileKey(anchor.col, anchor.row);
            const newKey = state.selectedTile === anchorKey ? null : anchorKey;
            dispatch({ type: 'SELECT_TILE', key: newKey });
            return;
          }
        }
        dispatch({ type: 'SELECT_TILE', key: null });
      }
    },
    [
      state.selectedItemType,
      state.selectedTile,
      state.itemDefs,
      state.quests,
      state.farmLevel,
      state.movingItemId,
      state.toolMode,
      activeGrid,
      placeItem,
      harvestCrop,
      moveItem,
      waterTile,
      removeItem,
      showPetDialog,
      emitQuestActivateByNpc,
      setPendingNpcDialog,
      deps.petLevel,
      deps.optimisticallyActivateQuest,
      dispatch,
    ],
  );

  const startMoveItem = useCallback(() => {
    if (!state.selectedTile) return;
    const [col, row] = state.selectedTile.split(':').map(Number);
    const item = getItemAt(activeGrid, col, row);
    if (!item) return;
    const anchId = item.anchorId ?? item.id;
    dispatch({ type: 'START_MOVE', anchorId: anchId });
  }, [state.selectedTile, activeGrid, dispatch]);

  const cancelMove = useCallback(() => {
    dispatch({ type: 'CANCEL_MOVE' });
  }, [dispatch]);

  const storeSelectedItem = useCallback(() => {
    if (!state.selectedTile) return;
    const [col, row] = state.selectedTile.split(':').map(Number);
    const item = getItemAt(activeGrid, col, row);
    if (!item) return;
    const anchor = resolveAnchor(activeGrid, item);
    if (!anchor) return;
    removeItem(anchor.col, anchor.row);
  }, [state.selectedTile, activeGrid, removeItem]);

  const storeItemByAnchorId = useCallback(
    (anchorId: string) => {
      const items = getAllPlacedItems(activeGrid);
      const anchor = items.find((it) => it.id === anchorId);
      if (!anchor) return;
      removeItem(anchor.col, anchor.row);
    },
    [activeGrid, removeItem],
  );

  const destroySelectedItem = useCallback(() => {
    if (!state.selectedTile) return;
    const [col, row] = state.selectedTile.split(':').map(Number);
    const item = getItemAt(activeGrid, col, row);
    if (!item) return;
    const anchor = resolveAnchor(activeGrid, item);
    if (!anchor) return;
    removeItem(anchor.col, anchor.row);
  }, [state.selectedTile, activeGrid, removeItem]);

  const selectInventoryItem = useCallback(
    (itemType: string | null) => {
      dispatch({ type: 'SELECT_ITEM', itemType });
    },
    [dispatch],
  );

  const switchScene = useCallback(
    (target: Scene) => {
      dispatch({ type: 'SWITCH_SCENE', target });
    },
    [dispatch],
  );

  const applySceneChange = useCallback(() => {
    if (state.targetScene) {
      emitQuestActivateByScene(state.targetScene);
    }
    dispatch({ type: 'APPLY_SCENE' });
  }, [dispatch, state.targetScene, emitQuestActivateByScene]);

  const completeTransition = useCallback(() => {
    dispatch({ type: 'COMPLETE_TRANSITION' });
  }, [dispatch]);

  const toggleEditMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_EDIT' });
  }, [dispatch]);

  const setToolMode = useCallback(
    (mode: ToolMode) => {
      dispatch({ type: 'SET_TOOL_MODE', mode });
    },
    [dispatch],
  );

  const setCategory = useCallback(
    (cat: ItemCategory | 'all') => {
      dispatch({ type: 'SET_CATEGORY', cat });
      tryAutoAdvanceDialog('select_category', cat);
    },
    [dispatch, tryAutoAdvanceDialog],
  );

  const setFarmName = useCallback(
    (name: string) => {
      dispatch({ type: 'SET_FARM_NAME', name });
      emitRenameFarm(name);
    },
    [emitRenameFarm, dispatch],
  );

  const clearInteraction = useCallback(() => {
    dispatch({ type: 'SET_INTERACTION', action: null });
  }, [dispatch]);

  const setPendingInteraction = useCallback(
    (action: import('../types').InteractAction | null) => {
      if (action?.type === 'open_modal' && typeof action.payload === 'string') {
        emitQuestModalOpened(action.payload);
      }
      dispatch({ type: 'SET_INTERACTION', action });
    },
    [dispatch, emitQuestModalOpened],
  );

  return {
    placeItem,
    placeItemAt,
    removeItem,
    moveItem,
    setPendingDropTarget,
    harvestCrop,
    dismissHarvestEffect,
    waterTile,
    purchaseItem,
    sellItem,
    sellItemsBatch,
    addToFoodDish,
    equipItem,
    catchBug,
    dismissCatchResult,
    digFossil,
    shakeTree,
    completeQuest,
    selectTile,
    startMoveItem,
    cancelMove,
    storeSelectedItem,
    storeItemByAnchorId,
    destroySelectedItem,
    selectInventoryItem,
    switchScene,
    applySceneChange,
    completeTransition,
    toggleEditMode,
    setToolMode,
    setCategory,
    setFarmName,
    clearInteraction,
    setPendingInteraction,
  };
}
