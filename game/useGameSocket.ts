import { useSocket } from '@/lib/socket';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActiveBalloon, ActiveBug, BalloonPopResult, BugCatchResult, CookResult, CraftResult, DialogStep, FossilDigResult, GameSnapshot, ItemDefinition, StateUpdate } from './types';

// ─── WS Event Names (mirrors server) ────────────────────────────────────────

const EV = {
  LOAD: 'game:load',
  SNAPSHOT: 'game:snapshot',
  STATE_UPDATE: 'game:state_update',
  ERROR: 'game:error',
  PLACE_ITEM: 'game:place_item',
  REMOVE_ITEM: 'game:remove_item',
  HARVEST: 'game:harvest',
  RENAME_FARM: 'game:rename_farm',
  MOVE_ITEM: 'game:move_item',
  WATER_TILE: 'game:water_tile',
  CROP_BATCH: 'game:crop_batch',
  PURCHASE: 'game:purchase',
  SELL: 'game:sell',
  SELL_BATCH: 'game:sell_batch',
  SET_EQUIPPED: 'game:set_equipped',
  ITEM_DEFS_UPDATED: 'game:item_defs_updated',
  BUG_SPAWN: 'bug:spawn',
  BUG_CATCH: 'bug:catch',
  BUG_CAUGHT: 'bug:caught',
  BUG_DESPAWN: 'bug:despawn',
  BALLOON_SPAWN: 'balloon:spawn',
  BALLOON_POP: 'balloon:pop',
  BALLOON_POPPED: 'balloon:popped',
  BALLOON_DESPAWN: 'balloon:despawn',
  FOSSIL_DIG: 'fossil:dig',
  FOSSIL_DUG: 'fossil:dug',
  USER_SET_TIMEZONE: 'user:set_timezone',
  SCENERY_UPDATED: 'scenery:updated',
  QUEST_COMPLETE: 'quest:complete',
  QUEST_COMPLETED: 'quest:completed',
  QUEST_DIALOG: 'quest:dialog',
  QUEST_ACTIVATE_BY_NPC: 'quest:activate_by_npc',
  QUEST_ACTIVATE_BY_SCENE: 'quest:activate_by_scene',
  QUEST_ACTIVATED: 'quest:activated',
  QUEST_NPC_DIALOG_DISMISSED: 'quest:npc_dialog_dismissed',
  QUEST_MODAL_OPENED: 'quest:modal_opened',
  COOK: 'game:cook',
  COOK_RESULT: 'game:cook_result',
  CRAFT: 'game:craft',
  CRAFT_RESULT: 'game:craft_result',
  FEED_PET: 'game:feed_pet',
  ADD_TO_FOOD_DISH: 'game:add_to_food_dish',
  CONSUME_FROM_FOOD_DISH: 'game:consume_from_food_dish',
  PET_BEHAVIOR: 'pet:behavior',
  PET_BEHAVIOR_SYNC: 'pet:behavior_sync',
  PET_STATE_UPDATE: 'pet:state_update',
  PET_ACTION_COMPLETE: 'pet:action_complete',
  PET_UPDATED: 'pet:updated',
  COLLECT_WATER: 'game:collect_water',
  COLLECT_WATER_RESULT: 'game:collect_water_result',
} as const;

// ─── Return Type ────────────────────────────────────────────────────────────

export interface UseGameSocketReturn {
  connected: boolean;
  loading: boolean;
  /** Request a fresh game snapshot (e.g. after admin reset farm/quests). */
  emitLoad: () => void;
  emitPlaceItem: (itemType: string, col: number, row: number) => void;
  emitRemoveItem: (itemId: string) => void;
  emitHarvest: (itemId: string) => void;
  emitRenameFarm: (name: string) => void;
  emitMoveItem: (itemId: string, col: number, row: number) => void;
  emitWaterTile: (col: number, row: number) => void;
  emitCropBatch: (ops: Array<{ type: string; itemType?: string; col?: number; row?: number; anchorId?: string }>) => void;
  emitPurchase: (itemType: string) => void;
  emitSell: (itemType: string, qty?: number) => void;
  emitSellBatch: (items: Array<{ itemType: string; qty: number }>) => void;
  emitSetEquipped: (slot: 'handTool' | 'bobber' | 'bait' | 'chair', itemType: string | null) => void;
  emitCatchBug: (spawnId: string) => void;
  emitPopBalloon: (spawnId: string) => void;
  emitDigFossil: (anchorId: string) => void;
  emitCompleteQuest: (questId: string) => void;
  emitQuestActivateByNpc: (npcItemType: string) => void;
  emitQuestActivateByScene: (sceneSlug: string) => void;
  emitQuestNpcDialogDismissed: (npcItemType: string) => void;
  emitQuestModalOpened: (payload: string) => void;
  emitCook: (ingredients: { itemType: string; qty: number }[], minigamePassed: boolean) => void;
  emitCraft: (materials: { itemType: string; qty: number }[], minigamePassed: boolean) => void;
  emitFeedPet: (anchorId: string, foodItemType: string) => void;
  emitAddToFoodDish: (anchorId: string, items: Array<{ itemType: string; qty: number }>) => void;
  emitConsumeFromFoodDish: (anchorId: string) => void;
  emitPetBehavior: (state: string) => void;
  emitPetActionComplete: (targetCol: number, targetRow: number) => void;
  emitCollectWater: (wellSlug: string) => void;
}

interface UseGameSocketOptions {
  onSnapshot: (snap: GameSnapshot) => void;
  onStateUpdate: (update: StateUpdate) => void;
  onItemDefsUpdated: (defs: Record<string, ItemDefinition>) => void;
  onError: (msg: string, context?: { spawnId?: string }) => void;
  onBugSpawn: (bug: ActiveBug) => void;
  onBugCaught: (result: BugCatchResult) => void;
  onBugDespawn: (data: { spawnId: string }) => void;
  onBalloonSpawn: (balloon: ActiveBalloon) => void;
  onBalloonPopped: (result: BalloonPopResult) => void;
  onBalloonDespawn: (data: { spawnId: string }) => void;
  onFossilDug?: (result: FossilDigResult) => void;
  onSceneryUpdated: (data: { farmCols: number; farmRows: number; imageUrl: string }) => void;
  onQuestCompleted?: (data: {
    questId: string;
    newFarmLevel?: number;
    farmLevel?: number;
    endDialog?: DialogStep[];
    nextQuestId?: string;
    nextQuestStartDialog?: DialogStep[];
  }) => void;
  onQuestDialog?: (data: { questId: string; dialog: DialogStep[] }) => void;
  onQuestActivated?: (data: { activated: Array<{ questId: string; startDialog?: DialogStep[] }>; quests: import('./types').QuestProgress[] }) => void;
  onCookResult?: (result: CookResult) => void;
  onCraftResult?: (result: CraftResult) => void;
  onCollectWaterResult?: (result: { success: boolean; waterQty?: number; nextAvailableAt?: string; onCooldown?: boolean; message?: string }) => void;
  onPetBehaviorSync?: (data: { state: string }) => void;
  onPetStateUpdate?: (data: {
    col: number;
    row: number;
    behavior: string;
    targetCol?: number;
    targetRow?: number;
    interactionType?: string;
    interactionTarget?: string;
    interactionItemType?: string;
  }) => void;
  onPetUpdated?: (data: { pet: Record<string, unknown> }) => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Manages the Socket.IO connection for the game tab.
 *
 * - Connects on mount using the auth token
 * - Requests a full snapshot on connect
 * - Listens for snapshot and delta updates
 * - Exposes typed emitters for game actions
 * - Disconnects on unmount
 */
export function useGameSocket({
  onSnapshot,
  onStateUpdate,
  onItemDefsUpdated,
  onError,
  onBugSpawn,
  onBugCaught,
  onBugDespawn,
  onBalloonSpawn,
  onBalloonPopped,
  onBalloonDespawn,
  onFossilDug,
  onSceneryUpdated,
  onQuestCompleted,
  onQuestDialog,
  onQuestActivated,
  onCookResult,
  onCraftResult,
  onCollectWaterResult,
  onPetBehaviorSync,
  onPetStateUpdate,
  onPetUpdated,
}: UseGameSocketOptions): UseGameSocketReturn {
  const { socket: contextSocket, isConnected: contextConnected } = useSocket();
  const socketRef = useRef<typeof contextSocket>(null);
  const [loading, setLoading] = useState(true);

  // Single socket from SocketProvider — no fallback. Emits are no-ops when socket is null.
  socketRef.current = contextSocket;
  const connected = contextConnected;

  // Stable refs for callbacks (avoids reconnect on callback identity change)
  const onSnapshotRef = useRef(onSnapshot);
  const onStateUpdateRef = useRef(onStateUpdate);
  const onItemDefsUpdatedRef = useRef(onItemDefsUpdated);
  const onErrorRef = useRef(onError);
  const onBugSpawnRef = useRef(onBugSpawn);
  const onBugCaughtRef = useRef(onBugCaught);
  const onBugDespawnRef = useRef(onBugDespawn);
  const onBalloonSpawnRef = useRef(onBalloonSpawn);
  const onBalloonPoppedRef = useRef(onBalloonPopped);
  const onBalloonDespawnRef = useRef(onBalloonDespawn);
  const onFossilDugRef = useRef(onFossilDug);
  const onSceneryUpdatedRef = useRef(onSceneryUpdated);
  const onQuestCompletedRef = useRef(onQuestCompleted);
  const onQuestDialogRef = useRef(onQuestDialog);
  const onQuestActivatedRef = useRef(onQuestActivated);
  const onCookResultRef = useRef(onCookResult);
  const onCraftResultRef = useRef(onCraftResult);
  const onCollectWaterResultRef = useRef(onCollectWaterResult);
  const onPetBehaviorSyncRef = useRef(onPetBehaviorSync);
  const onPetStateUpdateRef = useRef(onPetStateUpdate);
  const onPetUpdatedRef = useRef(onPetUpdated);
  onSnapshotRef.current = onSnapshot;
  onStateUpdateRef.current = onStateUpdate;
  onItemDefsUpdatedRef.current = onItemDefsUpdated;
  onErrorRef.current = onError;
  onBugSpawnRef.current = onBugSpawn;
  onBugCaughtRef.current = onBugCaught;
  onBugDespawnRef.current = onBugDespawn;
  onFossilDugRef.current = onFossilDug;
  onSceneryUpdatedRef.current = onSceneryUpdated;
  onQuestCompletedRef.current = onQuestCompleted;
  onQuestDialogRef.current = onQuestDialog;
  onQuestActivatedRef.current = onQuestActivated;
  onCookResultRef.current = onCookResult;
  onCraftResultRef.current = onCraftResult;
  onCollectWaterResultRef.current = onCollectWaterResult;
  onPetBehaviorSyncRef.current = onPetBehaviorSync;
  onPetStateUpdateRef.current = onPetStateUpdate;
  onPetUpdatedRef.current = onPetUpdated;

  // Single socket from SocketProvider. No fallback — when null, we don't attach listeners.
  useEffect(() => {
    if (!contextSocket) return;

    if (contextConnected) {
      setLoading(true);
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz) contextSocket.emit(EV.USER_SET_TIMEZONE, { timezone: tz });
      } catch { /* timezone detection unsupported */ }
      contextSocket.emit(EV.LOAD);
    }

    const onSnapshot = (data: GameSnapshot) => {
      setLoading(false);
      onSnapshotRef.current(data);
    };

    contextSocket.on(EV.SNAPSHOT, onSnapshot);
    contextSocket.on(EV.STATE_UPDATE, (data: StateUpdate) => {
      if (__DEV__ && data.inventory) {
        console.log('[Sell] Socket received STATE_UPDATE with inventory', {
          hasInventory: !!data.inventory,
          inventoryKeys: Object.keys(data.inventory ?? {}),
        });
      }
      onStateUpdateRef.current(data);
    });
    contextSocket.on(EV.ITEM_DEFS_UPDATED, (data: Record<string, ItemDefinition>) => {
      onItemDefsUpdatedRef.current(data);
    });
    contextSocket.on(EV.ERROR, (data: { message: string; spawnId?: string }) => {
      onErrorRef.current(data.message, data.spawnId ? { spawnId: data.spawnId } : undefined);
    });
    contextSocket.on(EV.BUG_SPAWN, (data: ActiveBug) => onBugSpawnRef.current(data));
    contextSocket.on(EV.BUG_CAUGHT, (data: BugCatchResult) => onBugCaughtRef.current(data));
    contextSocket.on(EV.BUG_DESPAWN, (data: { spawnId: string }) => onBugDespawnRef.current(data));
    contextSocket.on(EV.BALLOON_SPAWN, (data: ActiveBalloon) => onBalloonSpawnRef.current(data));
    contextSocket.on(EV.BALLOON_POPPED, (data: BalloonPopResult) => onBalloonPoppedRef.current(data));
    contextSocket.on(EV.BALLOON_DESPAWN, (data: { spawnId: string }) => onBalloonDespawnRef.current(data));
    contextSocket.on(EV.FOSSIL_DUG, (data: FossilDigResult) => onFossilDugRef.current?.(data));
    contextSocket.on(EV.SCENERY_UPDATED, (data: { farmCols: number; farmRows: number; imageUrl: string }) => {
      onSceneryUpdatedRef.current(data);
    });
    contextSocket.on(EV.QUEST_COMPLETED, (data: {
      questId: string;
      newFarmLevel?: number;
      farmLevel?: number;
      endDialog?: DialogStep[];
      rewards?: import('./types').QuestReward;
      nextQuestId?: string;
      nextQuestStartDialog?: DialogStep[];
      inventory?: Record<string, number>;
      gems?: number;
      quests?: import('./types').QuestProgress[];
    }) => { onQuestCompletedRef.current?.(data); });
    contextSocket.on(EV.QUEST_DIALOG, (data: { questId: string; dialog: DialogStep[] }) => {
      onQuestDialogRef.current?.(data);
    });
    contextSocket.on(EV.QUEST_ACTIVATED, (data: { activated: Array<{ questId: string; startDialog?: DialogStep[] }>; quests: import('./types').QuestProgress[] }) => {
      onQuestActivatedRef.current?.(data);
    });
    contextSocket.on(EV.COOK_RESULT, (data: CookResult) => onCookResultRef.current?.(data));
    contextSocket.on(EV.CRAFT_RESULT, (data: CraftResult) => onCraftResultRef.current?.(data));
    contextSocket.on(EV.COLLECT_WATER_RESULT, (data: { success: boolean; waterQty?: number; nextAvailableAt?: string; onCooldown?: boolean; message?: string }) => {
      onCollectWaterResultRef.current?.(data);
    });
    contextSocket.on(EV.PET_BEHAVIOR_SYNC, (data: { state: string }) => onPetBehaviorSyncRef.current?.(data));
    contextSocket.on(EV.PET_STATE_UPDATE, (data: {
      col: number;
      row: number;
      behavior: string;
      targetCol?: number;
      targetRow?: number;
      interactionType?: string;
      interactionTarget?: string;
      interactionItemType?: string;
    }) => onPetStateUpdateRef.current?.(data));
    contextSocket.on(EV.PET_UPDATED, (data: { pet: Record<string, unknown> }) => onPetUpdatedRef.current?.(data));

    return () => {
      contextSocket.off(EV.SNAPSHOT).off(EV.STATE_UPDATE).off(EV.ITEM_DEFS_UPDATED).off(EV.ERROR)
        .off(EV.BUG_SPAWN).off(EV.BUG_CAUGHT).off(EV.BUG_DESPAWN)        .off(EV.BALLOON_SPAWN).off(EV.BALLOON_POPPED).off(EV.BALLOON_DESPAWN).off(EV.FOSSIL_DUG)
        .off(EV.SCENERY_UPDATED).off(EV.QUEST_COMPLETED).off(EV.QUEST_DIALOG).off(EV.QUEST_ACTIVATED)
        .off(EV.COOK_RESULT).off(EV.CRAFT_RESULT).off(EV.COLLECT_WATER_RESULT)
        .off(EV.PET_BEHAVIOR_SYNC).off(EV.PET_STATE_UPDATE).off(EV.PET_UPDATED);
    };
  }, [contextSocket, contextConnected]);

  const emitPlaceItem = useCallback((itemType: string, col: number, row: number) => {
    socketRef.current?.emit(EV.PLACE_ITEM, { itemType, col, row });
  }, []);

  const emitRemoveItem = useCallback((itemId: string) => {
    socketRef.current?.emit(EV.REMOVE_ITEM, { itemId });
  }, []);

  const emitHarvest = useCallback((itemId: string) => {
    socketRef.current?.emit(EV.HARVEST, { itemId });
  }, []);

  const emitRenameFarm = useCallback((name: string) => {
    socketRef.current?.emit(EV.RENAME_FARM, { name });
  }, []);

  const emitMoveItem = useCallback((itemId: string, col: number, row: number) => {
    socketRef.current?.emit(EV.MOVE_ITEM, { itemId, col, row });
  }, []);

  const emitWaterTile = useCallback((col: number, row: number) => {
    socketRef.current?.emit(EV.WATER_TILE, { col, row });
  }, []);

  const emitCropBatch = useCallback(
    (ops: Array<{ type: string; itemType?: string; col?: number; row?: number; anchorId?: string }>) => {
      socketRef.current?.emit(EV.CROP_BATCH, { ops });
    },
    [],
  );

  const emitPurchase = useCallback((itemType: string) => {
    socketRef.current?.emit(EV.PURCHASE, { itemType });
  }, []);

  const emitSell = useCallback((itemType: string, qty?: number) => {
    socketRef.current?.emit(EV.SELL, { itemType, qty: qty ?? 1 });
  }, []);

  const emitSellBatch = useCallback((items: Array<{ itemType: string; qty: number }>) => {
    if (items.length === 0) return;
    socketRef.current?.emit(EV.SELL_BATCH, { items });
  }, []);

  const emitSetEquipped = useCallback(
    (slot: 'handTool' | 'bobber' | 'bait' | 'chair', itemType: string | null) => {
      socketRef.current?.emit(EV.SET_EQUIPPED, { slot, itemType });
    },
    [],
  );

  const emitCatchBug = useCallback((spawnId: string) => {
    socketRef.current?.emit(EV.BUG_CATCH, { spawnId });
  }, []);

  const emitDigFossil = useCallback((anchorId: string) => {
    socketRef.current?.emit(EV.FOSSIL_DIG, { anchorId });
  }, []);

  const emitPopBalloon = useCallback((spawnId: string) => {
    socketRef.current?.emit(EV.BALLOON_POP, { spawnId });
  }, []);

  const emitCompleteQuest = useCallback((questId: string) => {
    socketRef.current?.emit(EV.QUEST_COMPLETE, { questId });
  }, []);

  const emitQuestActivateByNpc = useCallback((npcItemType: string) => {
    socketRef.current?.emit(EV.QUEST_ACTIVATE_BY_NPC, { npcItemType });
  }, []);

  const emitQuestActivateByScene = useCallback((sceneSlug: string) => {
    socketRef.current?.emit(EV.QUEST_ACTIVATE_BY_SCENE, { sceneSlug });
  }, []);

  const emitQuestNpcDialogDismissed = useCallback((npcItemType: string) => {
    socketRef.current?.emit(EV.QUEST_NPC_DIALOG_DISMISSED, { npcItemType });
  }, []);

  const emitQuestModalOpened = useCallback((payload: string) => {
    socketRef.current?.emit(EV.QUEST_MODAL_OPENED, { payload });
  }, []);

  const emitLoad = useCallback(() => {
    socketRef.current?.emit(EV.LOAD);
  }, []);

  const emitCook = useCallback((ingredients: { itemType: string; qty: number }[], minigamePassed: boolean) => {
    socketRef.current?.emit(EV.COOK, { ingredients, minigamePassed });
  }, []);

  const emitCraft = useCallback((materials: { itemType: string; qty: number }[], minigamePassed: boolean) => {
    socketRef.current?.emit(EV.CRAFT, { ingredients: materials, minigamePassed });
  }, []);

  const emitFeedPet = useCallback((anchorId: string, foodItemType: string) => {
    socketRef.current?.emit(EV.FEED_PET, { anchorId, foodItemType });
  }, []);

  const emitAddToFoodDish = useCallback((anchorId: string, items: Array<{ itemType: string; qty: number }>) => {
    if (items.length === 0) return;
    socketRef.current?.emit(EV.ADD_TO_FOOD_DISH, { anchorId, items });
  }, []);

  const emitConsumeFromFoodDish = useCallback((anchorId: string) => {
    socketRef.current?.emit(EV.CONSUME_FROM_FOOD_DISH, { anchorId });
  }, []);

  const emitPetBehavior = useCallback((state: string) => {
    socketRef.current?.emit(EV.PET_BEHAVIOR, { state });
  }, []);

  const emitPetActionComplete = useCallback((targetCol: number, targetRow: number) => {
    socketRef.current?.emit(EV.PET_ACTION_COMPLETE, { targetCol, targetRow });
  }, []);

  /** Emits game:collect_water to collect water from a well (well, well_2, etc.). */
  const emitCollectWater = useCallback((wellSlug: string) => {
    socketRef.current?.emit(EV.COLLECT_WATER, { wellSlug });
  }, []);

  return {
    connected,
    loading,
    emitLoad,
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
    emitSetEquipped,
    emitCatchBug,
    emitDigFossil,
    emitPopBalloon,
    emitCompleteQuest,
    emitQuestActivateByNpc,
    emitQuestActivateByScene,
    emitQuestNpcDialogDismissed,
    emitQuestModalOpened,
    emitCook,
    emitCraft,
    emitFeedPet,
    emitAddToFoodDish,
    emitConsumeFromFoodDish,
    emitPetBehavior,
    emitPetActionComplete,
    emitCollectWater,
  };
}
