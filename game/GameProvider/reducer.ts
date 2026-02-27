/**
 * Game state reducer. Handles all dispatchable actions for the game context.
 */

import {
  addItemAtKey,
  deleteKeys,
  removeItemsByAnchorId,
  removeItemsByIds,
} from '../gridHelpers';
import type { DialogSpeaker, DialogStep, GridData, PlacedItem } from '../types';
import { tileKey } from '../types';
import {
  DEFAULT_HOUSE_COLS,
  DEFAULT_HOUSE_ROWS,
} from './constants';
import {
  createEmptyGrid,
  createFarmGridFromSnapshot,
  snapshotItemToPlacedItem,
} from './helpers';
import type { GameAction, GameState } from './types';

/** Maps optimistic anchor IDs to their server-assigned IDs after reconciliation. */
export const optIdMap = new Map<string, string>();

/**
 * Main game reducer. Processes actions and returns the next state.
 *
 * @param state - Current game state.
 * @param action - The action to apply.
 * @returns The new state after applying the action.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SNAPSHOT': {
      optIdMap.clear();
      const defs = action.payload.itemDefs;
      const houseDef = defs['house'];
      const houseCols = houseDef?.cols ?? DEFAULT_HOUSE_COLS;
      const houseRows = houseDef?.rows ?? DEFAULT_HOUSE_ROWS;

      const snapshotDialogs: Array<{ steps: DialogStep[]; speaker?: DialogSpeaker }> = [];
      // Don't merge pendingDialogs when transitioning — avoids dialog reopening after scene change
      if (!state.isTransitioning && action.payload.pendingDialogs?.length) {
        for (const pd of action.payload.pendingDialogs) {
          if (pd.dialog?.length) snapshotDialogs.push({ steps: pd.dialog, speaker: undefined });
        }
      }
      const allQueued = [...state.questDialogQueue, ...snapshotDialogs];
      let currentDialog = state.currentQuestDialog;
      let dialogIdx = state.questDialogIndex;
      let currentSpeaker = state.currentDialogSpeaker;
      let currentNpcItemType = state.currentNpcItemType;
      let currentQuestIdToComplete = state.currentQuestIdToComplete;
      let currentDialogRewards = state.currentDialogRewards;
      let currentDialogBlocking = state.currentDialogBlocking;
      let dialogQueue = allQueued;
      if (!currentDialog && allQueued.length > 0) {
        const [first, ...rest] = allQueued;
        currentDialog = first.steps;
        currentSpeaker = first.speaker ?? null;
        currentNpcItemType = (first as { npcItemType?: string }).npcItemType ?? null;
        currentQuestIdToComplete = (first as { questIdToComplete?: string }).questIdToComplete ?? null;
        currentDialogRewards = (first as { rewards?: import('../types').QuestReward }).rewards ?? null;
        currentDialogBlocking = (first as { blocking?: boolean }).blocking !== false;
        dialogQueue = rest;
        dialogIdx = 0;
      }

      return {
        ...state,
        farmName: action.payload.farmName,
        farmXp: action.payload.farmXp,
        farmLevel: action.payload.farmLevel,
        gems: action.payload.gems ?? 0,
        farmLevels: action.payload.farmLevels,
        inventory: { ...action.payload.inventory },
        equipped: action.payload.equipped,
        itemDefs: defs,
        sceneryUrl: action.payload.sceneryUrl ?? '',
        sceneWorldCols: action.payload.sceneWorldCols,
        sceneWorldRows: action.payload.sceneWorldRows,
        farmGrid: createFarmGridFromSnapshot(action.payload, defs),
        houseGrid: createEmptyGrid(houseCols, houseRows),
        movingItemId: null,
        selectedTile: null,
        pendingDropTarget: null,
        lastOptimisticPlace: null,
        pendingSellItems: null,
        pendingSellAt: null,
        foodDishQueues: action.payload.foodDishQueues,
        quests: action.payload.quests ?? [],
        canUpgrade: action.payload.canUpgrade ?? false,
        currentQuestDialog: currentDialog,
        questDialogIndex: dialogIdx,
        questDialogQueue: dialogQueue,
        currentDialogSpeaker: currentSpeaker,
        currentNpcItemType,
        currentQuestIdToComplete,
        currentDialogRewards,
        currentDialogBlocking,
        petState: action.payload.petState
          ? {
              col: action.payload.petState.col,
              row: action.payload.petState.row,
              behavior: action.payload.petState.behavior,
            }
          : null,
      };
    }

    case 'STATE_UPDATE': {
      const { payload } = action;
      let newState = { ...state };

      if (payload.farmXp != null) newState.farmXp = payload.farmXp;
      if (payload.farmLevel != null) {
        newState.farmLevel = payload.farmLevel;
        // Resize farm grid when level changes (e.g. quest completion before SNAPSHOT)
        const levelDef = newState.farmLevels.find((l) => l.level === payload.farmLevel);
        if (levelDef && (newState.farmGrid.cols !== levelDef.cols || newState.farmGrid.rows !== levelDef.rows)) {
          const newGrid = createEmptyGrid(levelDef.cols, levelDef.rows);
          newGrid.items = new Map(newState.farmGrid.items);
          newState.farmGrid = newGrid;
        }
      }
      if (payload.gems != null) newState.gems = payload.gems;
      if (payload.farmName != null) newState.farmName = payload.farmName;
      if (payload.inventory) {
        let mergedInventory = { ...payload.inventory };
        let hadStaleMerge = false;
        // If we have a pending sell, don't let a stale STATE_UPDATE revert it.
        // Stale = incoming has MORE of an item we sold than our current state.
        // Only block when ours > 0: if we sold everything (ours=0), incoming > 0 means we bought it back — accept it.
        if (state.pendingSellItems?.length) {
          for (const { itemType } of state.pendingSellItems) {
            const ours = state.inventory[itemType] ?? 0;
            const incoming = payload.inventory[itemType] ?? 0;
            if (incoming > ours && ours > 0) {
              hadStaleMerge = true;
              if (__DEV__) {
                console.log('[Sell] STATE_UPDATE: ignoring stale inventory for', itemType, {
                  ours,
                  incoming,
                  reason: 'incoming > ours (likely stale)',
                });
              }
              mergedInventory[itemType] = ours;
            }
          }
        }
        if (__DEV__) {
          console.log('[Sell] STATE_UPDATE replacing inventory', {
            inventoryBefore: { ...state.inventory },
            inventoryIncoming: { ...payload.inventory },
            pendingSellItems: state.pendingSellItems,
            hadStaleMerge,
            merged: { ...mergedInventory },
          });
        }
        newState.inventory = mergedInventory;
        // Keep protection for 3s after sell. A stale STATE_UPDATE can arrive AFTER
        // our correct one (e.g. delayed crop tick). Only clear when both:
        // (a) this update didn't need merge protection, AND
        // (b) 3 seconds have passed since we sold.
        const elapsed = state.pendingSellAt != null ? Date.now() - state.pendingSellAt : 0;
        const keepProtection = hadStaleMerge || elapsed < 3000;
        newState.pendingSellItems = keepProtection ? state.pendingSellItems : null;
        newState.pendingSellAt = keepProtection ? state.pendingSellAt : null;
      }
      if ('equipped' in payload) newState.equipped = payload.equipped;
      if (payload.foodDishQueues !== undefined) newState.foodDishQueues = payload.foodDishQueues;
      if (payload.quests) newState.quests = payload.quests;
      if (payload.canUpgrade != null) newState.canUpgrade = payload.canUpgrade;

      if (payload.removedItemIds?.length || payload.addedItems?.length) {
        const gridKey = state.activeScene === 'farm' ? 'farmGrid' : 'houseGrid';
        const grid = newState[gridKey];
        let newItems = new Map(grid.items);
        let reconciledOpt = false;

        // Detect IDs that appear in BOTH removedItemIds AND addedItems — these are
        // IN-PLACE UPDATES (e.g., watering), not true remove+add. We skip removing
        // these so the React key stays stable and the component never unmounts.
        const addedIdSet = new Set<string>();
        const addedItemMap = new Map<string, PlacedItem>();
        if (payload.addedItems?.length) {
          for (const si of payload.addedItems) {
            addedIdSet.add(si.id);
            addedItemMap.set(si.id, si);
          }
        }

        const existingClientIds = new Map<string, string>();

        if (payload.removedItemIds?.length) {
          const idsToRemove = new Set<string>();
          for (const rmId of payload.removedItemIds) {
            if (!addedIdSet.has(rmId)) {
              idsToRemove.add(rmId);
            } else {
              // It's in both. Is it a move? Check if coordinates changed.
              const incoming = addedItemMap.get(rmId)!;
              let isMove = false;
              for (const [tk, arr] of grid.items.entries()) {
                const existing = arr.find((i) => i.id === rmId);
                if (existing) {
                  existingClientIds.set(rmId, existing.clientId ?? existing.id);
                  if (existing.col !== incoming.col || existing.row !== incoming.row) {
                    isMove = true;
                  }
                  break;
                }
              }
              if (isMove) {
                idsToRemove.add(rmId); // Moved, so scrub the old footprint
              }
            }
          }

          if (idsToRemove.size > 0) {
            newItems = removeItemsByIds(newItems, idsToRemove);
          }
        }

        if (payload.addedItems?.length) {
          // Track consumed optimistic indices per tile to avoid matching the
          // same opt_ item to multiple server items (prevents duplicate keys).
          const consumedOpt = new Map<string, Set<number>>();

          for (const si of payload.addedItems) {
            const key = tileKey(si.col, si.row);
            const arr = newItems.get(key) ?? [];
            const serverItem = snapshotItemToPlacedItem(si, state.itemDefs);

            // In-place update: if this server ID already exists in this precise tile,
            // merge the new data into the existing entry.
            const existingIdx = arr.findIndex((it) => it.id === serverItem.id);
            if (existingIdx >= 0) {
              const existing = arr[existingIdx];
              const updated = [...arr];
              updated[existingIdx] = { ...serverItem, clientId: existing.clientId ?? existing.id };
              newItems.set(key, updated);
              continue;
            }

            const consumed = consumedOpt.get(key) ?? new Set<number>();
            const optIdx = arr.findIndex(
              (it, idx) => it.id.startsWith('opt_') && it.itemType === si.itemType && !consumed.has(idx),
            );
            if (optIdx >= 0) {
              reconciledOpt = true;
              const optItem = arr[optIdx];
              consumed.add(optIdx);
              consumedOpt.set(key, consumed);
              const optAnchor = optItem.anchorId ?? optItem.id;
              const serverAnchor = serverItem.anchorId ?? serverItem.id;
              optIdMap.set(optAnchor, serverAnchor);
              const updated = [...arr];
              updated[optIdx] = { ...serverItem, clientId: optItem.clientId ?? optItem.id };
              newItems.set(key, updated);
            } else {
              const withoutOpt = arr.filter((it, idx) => !it.id.startsWith('opt_') || consumed.has(idx));
              if (withoutOpt.length < arr.length) reconciledOpt = true;
              // Preserve clientId from any matched opt item, OR from the pre-move state
              const matchedOpt = arr.find((it, idx) => it.id.startsWith('opt_') && it.itemType === si.itemType && !consumed.has(idx));
              const fallbackClientId = existingClientIds.get(serverItem.id) ?? serverItem.id;
              const reconciledItem = matchedOpt
                ? { ...serverItem, clientId: matchedOpt.clientId ?? matchedOpt.id }
                : { ...serverItem, clientId: fallbackClientId };
              newItems.set(key, [...withoutOpt, reconciledItem]);
            }
          }
        }

        newState[gridKey] = { ...grid, items: newItems };
        if (payload.removedItemIds?.length || reconciledOpt) {
          newState.pendingDropTarget = null;
        }
        if (payload.addedItems?.length) {
          newState.lastOptimisticPlace = null;
        }
      }

      return newState;
    }

    case 'OPTIMISTIC_PLACE': {
      const gridKey = state.activeScene === 'farm' ? 'farmGrid' : 'houseGrid';
      const grid = state[gridKey];
      let newItems = new Map(grid.items);
      for (let i = 0; i < action.items.length; i++) {
        newItems = addItemAtKey(newItems, action.keys[i], action.items[i]);
      }
      const anchorId = action.items[0]?.id;
      const lastOptimisticPlace = !action.skipInventory && anchorId
        ? { anchorId, itemType: action.itemType }
        : state.lastOptimisticPlace;
      if (action.skipInventory) {
        return { ...state, [gridKey]: { ...grid, items: newItems } };
      }
      const inv = { ...state.inventory };
      inv[action.itemType] = Math.max(0, (inv[action.itemType] ?? 0) - 1);
      return { ...state, [gridKey]: { ...grid, items: newItems }, inventory: inv, lastOptimisticPlace };
    }

    case 'REVERT_PLACEMENT': {
      const { lastOptimisticPlace } = state;
      if (!lastOptimisticPlace) return state;
      const gridKey = state.activeScene === 'farm' ? 'farmGrid' : 'houseGrid';
      const grid = state[gridKey];
      const newItems = removeItemsByAnchorId(grid.items, lastOptimisticPlace.anchorId);
      const inv = { ...state.inventory };
      inv[lastOptimisticPlace.itemType] = (inv[lastOptimisticPlace.itemType] ?? 0) + 1;
      return {
        ...state,
        [gridKey]: { ...grid, items: newItems },
        inventory: inv,
        lastOptimisticPlace: null,
        pendingDropTarget: null,
        selectedTile: null,
      };
    }

    case 'OPTIMISTIC_REMOVE': {
      const gridKey = state.activeScene === 'farm' ? 'farmGrid' : 'houseGrid';
      const grid = state[gridKey];
      const newItems = removeItemsByAnchorId(grid.items, action.anchorId);
      const inv = { ...state.inventory };
      inv[action.itemType] = (inv[action.itemType] ?? 0) + 1;
      return {
        ...state,
        [gridKey]: { ...grid, items: newItems },
        inventory: inv,
        selectedTile: null,
        movingItemId: null,
      };
    }

    case 'OPTIMISTIC_REMOVE_KEYS': {
      const gk = state.activeScene === 'farm' ? 'farmGrid' : 'houseGrid';
      const g = state[gk];
      const ni = deleteKeys(g.items, action.keys);
      return { ...state, [gk]: { ...g, items: ni } };
    }

    case 'OPTIMISTIC_WATER': {
      const gridKey = state.activeScene === 'farm' ? 'farmGrid' : 'houseGrid';
      const grid = state[gridKey];
      const key = tileKey(action.col, action.row);
      const arr = grid.items.get(key);
      if (!arr) return state;
      const idx = arr.findIndex((it) => !!it.growthMs && !it.watered);
      if (idx < 0) return state;
      const now = Date.now();
      const crop = arr[idx];
      const plantedAt = crop.plantedAt ?? now;
      const anchId = crop.anchorId ?? crop.id;

      // Update ALL tiles sharing this anchor (multi-tile crops like 2x2 watermelon)
      const newItems = new Map(grid.items);
      for (const [tKey, tArr] of newItems) {
        let changed = false;
        const updArr = tArr.map((it) => {
          const itAnchor = it.anchorId ?? it.id;
          if (itAnchor === anchId && !!it.growthMs && !it.watered) {
            changed = true;
            return { ...it, watered: true, plantedAt: it.plantedAt ?? plantedAt };
          }
          return it;
        });
        if (changed) newItems.set(tKey, updArr);
      }
      return { ...state, [gridKey]: { ...grid, items: newItems } };
    }

    case 'OPTIMISTIC_HARVEST': {
      const gridKey = state.activeScene === 'farm' ? 'farmGrid' : 'houseGrid';
      const grid = state[gridKey];
      const newItems = removeItemsByAnchorId(grid.items, action.anchorId);
      return {
        ...state,
        [gridKey]: { ...grid, items: newItems },
        harvestEffects: [...state.harvestEffects, action.effect],
      };
    }

    case 'OPTIMISTIC_SELL': {
      const inv = { ...state.inventory };
      for (const { itemType, qty } of action.items) {
        const current = inv[itemType] ?? 0;
        const next = current - qty;
        if (next <= 0) delete inv[itemType];
        else inv[itemType] = next;
      }
      if (__DEV__) {
        console.log('[Sell] OPTIMISTIC_SELL applied', { items: action.items, inventoryAfter: { ...inv } });
      }
      return { ...state, inventory: inv, pendingSellItems: action.items, pendingSellAt: Date.now() };
    }

    case 'OPTIMISTIC_ADD_TO_FOOD_DISH': {
      const inv = { ...state.inventory };
      for (const { itemType, qty } of action.items) {
        const current = inv[itemType] ?? 0;
        const next = current - qty;
        if (next <= 0) delete inv[itemType];
        else inv[itemType] = next;
      }
      return { ...state, inventory: inv };
    }

    case 'DISMISS_EFFECT':
      return { ...state, harvestEffects: state.harvestEffects.filter((e) => e.id !== action.id) };

    case 'SELECT_TILE':
      return { ...state, selectedTile: action.key };

    case 'SELECT_ITEM':
      return { ...state, selectedItemType: action.itemType, selectedTile: null, movingItemId: null };

    case 'SWITCH_SCENE':
      return {
        ...state,
        targetScene: action.target,
        isTransitioning: true,
        selectedTile: null,
        movingItemId: null,
        // Clear quest dialog so it doesn't persist/reopen when changing scenes
        questDialogQueue: [],
        currentQuestDialog: null,
        questDialogIndex: 0,
        currentDialogSpeaker: null,
        currentNpcItemType: null,
        currentQuestIdToComplete: null,
        currentDialogRewards: null,
        currentDialogBlocking: true,
      };

    case 'APPLY_SCENE':
      return state.targetScene != null
        ? {
          ...state,
          activeScene: state.targetScene,
          targetScene: undefined,
        }
        : state;

    case 'COMPLETE_TRANSITION':
      return { ...state, isTransitioning: false, targetScene: undefined };

    case 'TOGGLE_EDIT': {
      const entering = !state.editMode;
      return {
        ...state,
        editMode: entering,
        toolMode: entering ? 'build' : 'none',
        selectedItemType: entering ? state.selectedItemType : null,
        selectedTile: null,
        movingItemId: null,
      };
    }

    case 'SET_CATEGORY':
      return { ...state, activeCategory: action.cat, selectedItemType: null };

    case 'SET_TOOL_MODE':
      return {
        ...state,
        toolMode: action.mode,
        editMode: action.mode === 'build' || action.mode === 'trash',
        selectedItemType: action.mode !== 'build' ? null : state.selectedItemType,
        selectedTile: null,
        movingItemId: null,
      };

    case 'SET_FARM_NAME':
      return { ...state, farmName: action.name };

    case 'SET_INTERACTION':
      return { ...state, pendingInteraction: action.action };

    case 'START_MOVE':
      return { ...state, movingItemId: action.anchorId, selectedItemType: null };

    case 'CANCEL_MOVE':
      return { ...state, movingItemId: null, selectedTile: null };

    case 'SET_PENDING_DROP':
      return { ...state, pendingDropTarget: action.target };

    case 'PET_DIALOG':
      return { ...state, petDialog: action.message };

    case 'UPDATE_ITEM_DEFS': {
      const defs = action.defs;
      const remap = (grid: GridData): GridData => {
        const newItems = new Map<string, PlacedItem[]>();
        for (const [k, arr] of grid.items) {
          newItems.set(k, arr.map((v) => {
            const def = defs[v.itemType];
            const isAnchor = !v.anchorId;
            return {
              ...v,
              color: def?.color ?? v.color,
              emoji: isAnchor ? (def?.emoji ?? v.emoji) : v.emoji,
              imageUrl: isAnchor ? def?.imageUrl : undefined,
            };
          }));
        }
        return { ...grid, items: newItems };
      };
      const houseDef = defs['house'];
      const houseCols = houseDef?.cols ?? state.houseGrid.cols;
      const houseRows = houseDef?.rows ?? state.houseGrid.rows;
      const houseNeedsResize =
        houseCols !== state.houseGrid.cols || houseRows !== state.houseGrid.rows;
      const newHouseGrid = houseNeedsResize
        ? createEmptyGrid(houseCols, houseRows)
        : remap(state.houseGrid);
      return {
        ...state,
        itemDefs: defs,
        farmGrid: remap(state.farmGrid),
        houseGrid: newHouseGrid,
      };
    }

    case 'ADD_BUG':
      return { ...state, activeBugs: [...state.activeBugs, action.bug] };
    case 'REMOVE_BUG':
      return { ...state, activeBugs: state.activeBugs.filter((b) => b.spawnId !== action.spawnId) };
    case 'CLEAR_BUGS':
      return { ...state, activeBugs: [], lastCatchResult: null };
    case 'SET_CATCH_RESULT':
      return { ...state, lastCatchResult: action.result };
    case 'ADD_BALLOON':
      return { ...state, activeBalloons: [...state.activeBalloons, action.balloon] };
    case 'REMOVE_BALLOON':
      return { ...state, activeBalloons: state.activeBalloons.filter((b) => b.spawnId !== action.spawnId) };
    case 'SET_BALLOON_POP_RESULT':
      return { ...state, lastBalloonPopResult: action.result };
    case 'SET_FOSSIL_DIG_RESULT':
      return { ...state, lastFossilDigResult: action.result };

    case 'SET_SCENERY_URL': {
      const { cols: curCols, rows: curRows } = state.farmGrid;
      if (action.farmCols === curCols && action.farmRows === curRows) {
        return { ...state, sceneryUrl: action.url };
      }
      return state;
    }

    case 'SET_QUESTS':
      return { ...state, quests: action.quests, canUpgrade: action.canUpgrade };

    case 'OPTIMISTIC_QUEST_ACTIVATE': {
      const quests = (state.quests ?? []).map((q) =>
        q.questId === action.questId && q.status === 'locked' ? { ...q, status: 'active' as const } : q,
      );
      return { ...state, quests };
    }

    case 'QUEUE_QUEST_DIALOG': {
      const wrapped = action.dialogs.map((d) =>
        typeof d === 'object' && 'steps' in d ? d : { steps: d as DialogStep[], speaker: undefined as DialogSpeaker | undefined },
      );
      const queue = [...state.questDialogQueue, ...wrapped];
      if (!state.currentQuestDialog && queue.length > 0) {
        const [first, ...rest] = queue;
        return {
          ...state,
          questDialogQueue: rest,
          currentQuestDialog: first.steps,
          questDialogIndex: 0,
          currentDialogSpeaker: first.speaker ?? null,
          currentNpcItemType: null,
          currentDialogRewards: (first as { rewards?: import('../types').QuestReward }).rewards ?? null,
          currentDialogBlocking: true,
        };
      }
      return { ...state, questDialogQueue: queue };
    }

    case 'QUEUE_NPC_DIALOG': {
      const entry = { steps: action.steps, speaker: action.speaker, npcItemType: action.npcItemType, blocking: action.blocking, questIdToComplete: action.questIdToComplete };
      const queue = [...state.questDialogQueue, entry];
      if (!state.currentQuestDialog && queue.length > 0) {
        const [first, ...rest] = queue;
        return {
          ...state,
          questDialogQueue: rest,
          currentQuestDialog: first.steps,
          questDialogIndex: 0,
          currentDialogSpeaker: first.speaker ?? null,
          currentNpcItemType: first.npcItemType ?? null,
          currentQuestIdToComplete: first.questIdToComplete ?? null,
          currentDialogRewards: null,
          currentDialogBlocking: (first as { blocking?: boolean }).blocking !== false,
        };
      }
      return { ...state, questDialogQueue: queue };
    }

    case 'SET_SHOP_OPEN':
      return { ...state, shopOpen: action.open };

    case 'SET_SELL_BOX_OPEN':
      return { ...state, sellBoxOpen: action.open };

    case 'SET_COOKING_OPEN':
      return { ...state, cookingOpen: action.open };

    case 'SET_FOOD_DISH_OPEN':
      return { ...state, foodDishOpen: action.open };

    case 'SET_EQUIP_OPEN':
      return { ...state, equipOpen: action.open };

    case 'SET_PET_BEHAVIOR_SYNC':
      return { ...state, petBehaviorSync: action.state };

    case 'CLEAR_PET_BEHAVIOR_SYNC':
      return { ...state, petBehaviorSync: null };

    case 'SET_PET_STATE':
      return { ...state, petState: action.payload };

    case 'ADVANCE_QUEST_DIALOG': {
      if (!state.currentQuestDialog) return state;
      const nextIdx = state.questDialogIndex + 1;
      if (nextIdx < state.currentQuestDialog.length) {
        return { ...state, questDialogIndex: nextIdx };
      }
      if (state.questDialogQueue.length > 0) {
        const [next, ...rest] = state.questDialogQueue;
        return {
          ...state,
          questDialogQueue: rest,
          currentQuestDialog: next.steps,
          questDialogIndex: 0,
          currentDialogSpeaker: next.speaker ?? null,
          currentNpcItemType: (next as { npcItemType?: string }).npcItemType ?? null,
          currentQuestIdToComplete: (next as { questIdToComplete?: string }).questIdToComplete ?? null,
          currentDialogRewards: (next as { rewards?: import('../types').QuestReward }).rewards ?? null,
          currentDialogBlocking: (next as { blocking?: boolean }).blocking !== false,
        };
      }
      return { ...state, currentQuestDialog: null, questDialogIndex: 0, currentDialogSpeaker: null, currentNpcItemType: null, currentQuestIdToComplete: null, currentDialogRewards: null, currentDialogBlocking: true };
    }

    default:
      return state;
  }
}
