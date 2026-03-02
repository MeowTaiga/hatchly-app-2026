/**
 * Game Provider — Root context for game state and actions.
 *
 * Composes the reducer, quest highlights, socket connection, and action callbacks.
 * Provides the full game state and all mutating actions to the tree via useGame().
 */

import { useAuth } from '@/store/AuthProvider';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { ActiveBalloon, ActiveBug, BalloonPopResult, BugCatchResult, CookResult, CraftResult, DialogSpeaker, DialogStep, FarmMeta, FossilDigResult, GameSnapshot, GridData, InventorySlot, ItemDefinition, StateUpdate } from '../types';
import { useGameSocket } from '../useGameSocket';

import { CropTickProvider } from '../useCropTick';
import { initialState } from './initialState';
import { gameReducer } from './reducer';
import type { GameContextValue } from './types';
import { useGameActions } from './useGameActions';
import { useQuestHighlight } from './useQuestHighlight';

/** @internal */
const GameContext = createContext<GameContextValue | null>(null);

/**
 * Game provider component. Wraps the app (or game subtree) to provide game state and actions.
 *
 * @param props - Must include `children` to render.
 */
export function GameProvider({ children }: { children: React.ReactNode }) {
  const { refreshUser, user } = useAuth();
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const activeGrid: GridData = state.activeScene === 'farm' ? state.farmGrid : state.houseGrid;

  const handleSnapshot = useCallback((snap: GameSnapshot) => {
    if (snap.sceneryUrl) {
      console.log(`[Scenery] Server sent baked URL for ${snap.gridCols}x${snap.gridRows}:`, snap.sceneryUrl);
    } else {
      console.log(`[Scenery] No baked scenery for ${snap.gridCols}x${snap.gridRows} — will use procedural fallback`);
    }
    dispatch({ type: 'SNAPSHOT', payload: snap });
  }, []);

  const handleStateUpdate = useCallback((update: StateUpdate) => {
    dispatch({ type: 'STATE_UPDATE', payload: update });
  }, []);

  const handleItemDefsUpdated = useCallback((defs: Record<string, ItemDefinition>) => {
    dispatch({ type: 'UPDATE_ITEM_DEFS', defs });
  }, []);

  const handleBugSpawn = useCallback((bug: ActiveBug) => {
    dispatch({ type: 'ADD_BUG', bug });
  }, []);

  const handleBugCaught = useCallback((result: BugCatchResult) => {
    dispatch({ type: 'REMOVE_BUG', spawnId: result.spawnId });
    dispatch({ type: 'SET_CATCH_RESULT', result });
  }, []);

  const handleBugDespawn = useCallback((data: { spawnId: string }) => {
    dispatch({ type: 'REMOVE_BUG', spawnId: data.spawnId });
  }, []);

  const handleBalloonSpawn = useCallback((balloon: ActiveBalloon) => {
    dispatch({ type: 'ADD_BALLOON', balloon });
  }, []);

  const handleBalloonPopped = useCallback((result: BalloonPopResult) => {
    dispatch({ type: 'REMOVE_BALLOON', spawnId: result.spawnId });
    dispatch({ type: 'SET_BALLOON_POP_RESULT', result });
  }, []);

  const handleBalloonDespawn = useCallback((data: { spawnId: string }) => {
    dispatch({ type: 'REMOVE_BALLOON', spawnId: data.spawnId });
  }, []);

  const handleFossilDug = useCallback((result: FossilDigResult) => {
    dispatch({ type: 'SET_FOSSIL_DIG_RESULT', result });
  }, []);

  const handleSceneryUpdated = useCallback((data: { farmCols: number; farmRows: number; imageUrl: string }) => {
    dispatch({ type: 'SET_SCENERY_URL', url: data.imageUrl, farmCols: data.farmCols, farmRows: data.farmRows });
  }, []);

  const pendingNpcDialogRef = useRef<{ steps: DialogStep[]; speaker?: DialogSpeaker; npcItemType: string } | null>(null);
  const itemDefsRef = useRef<Record<string, ItemDefinition>>({});
  const isTransitioningRef = useRef(false);
  itemDefsRef.current = state.itemDefs;
  isTransitioningRef.current = state.isTransitioning;

  const handleQuestCompleted = useCallback((data: {
    questId: string;
    newFarmLevel?: number;
    farmLevel?: number;
    endDialog?: DialogStep[];
    rewards?: import('../types').QuestReward;
    nextQuestId?: string;
    nextQuestStartDialog?: DialogStep[];
    inventory?: Record<string, number>;
    gems?: number;
    quests?: import('../types').QuestProgress[];
  }) => {
    const level = data.newFarmLevel ?? data.farmLevel;
    dispatch({
      type: 'STATE_UPDATE',
      payload: {
        ...(level != null && { farmLevel: level }),
        ...(data.inventory && { inventory: data.inventory }),
        ...(data.gems != null && { gems: data.gems }),
        ...(data.quests && { quests: data.quests }),
      },
    });
    const dialogs: Array<{ steps: DialogStep[]; rewards?: import('../types').QuestReward }> = [];
    if (data.endDialog?.length) dialogs.push({ steps: data.endDialog, rewards: data.rewards });
    if (data.nextQuestStartDialog?.length) dialogs.push({ steps: data.nextQuestStartDialog });
    if (dialogs.length > 0 && !isTransitioningRef.current) {
      dispatch({ type: 'QUEUE_QUEST_DIALOG', dialogs });
    }
  }, []);

  const handleQuestDialog = useCallback((data: { questId: string; dialog: DialogStep[] }) => {
    if (data.dialog?.length && !isTransitioningRef.current) {
      dispatch({ type: 'QUEUE_QUEST_DIALOG', dialogs: [{ steps: data.dialog }] });
    }
  }, []);

  const setPendingNpcDialog = useCallback((info: { steps: DialogStep[]; speaker?: DialogSpeaker; npcItemType: string } | null) => {
    pendingNpcDialogRef.current = info;
  }, []);

  const handleQuestActivated = useCallback((data: {
    activated: Array<{ questId: string; startDialog?: DialogStep[]; npcItemType?: string }>;
    quests: import('../types').QuestProgress[];
  }) => {
    dispatch({ type: 'STATE_UPDATE', payload: { quests: data.quests } });
    // Don't queue dialogs if we've switched scenes — avoids dialog reopening after scene change
    if (isTransitioningRef.current) return;
    const dialogs: Array<{ steps: DialogStep[]; speaker?: DialogSpeaker; npcItemType?: string }> = [];
    const itemDefs = itemDefsRef.current;
    for (const a of data.activated) {
      if (a.startDialog?.length) {
        const speaker =
          a.npcItemType && itemDefs[a.npcItemType]
            ? { name: itemDefs[a.npcItemType].label, imageUrl: itemDefs[a.npcItemType].imageUrl ?? null }
            : undefined;
        dialogs.push({ steps: a.startDialog, speaker, npcItemType: a.npcItemType });
      }
    }
    if (dialogs.length > 0) {
      const hadPending = pendingNpcDialogRef.current != null;
      pendingNpcDialogRef.current = null;
      // If we already showed from client (locked-but-available), skip duplicate to avoid showing dialog twice
      if (!hadPending) {
        dispatch({ type: 'QUEUE_QUEST_DIALOG', dialogs });
      }
    } else if (pendingNpcDialogRef.current) {
      const pending = pendingNpcDialogRef.current;
      pendingNpcDialogRef.current = null;
      dispatch({
        type: 'QUEUE_NPC_DIALOG',
        steps: pending.steps,
        speaker: pending.speaker,
        npcItemType: pending.npcItemType,
      });
    }
  }, []);

  const [cookResult, setCookResult] = useState<CookResult | null>(null);
  const [craftResult, setCraftResult] = useState<CraftResult | null>(null);
  const [collectWaterResult, setCollectWaterResult] = useState<{ success: boolean; waterQty?: number; nextAvailableAt?: string; onCooldown?: boolean; message?: string } | null>(null);

  const handleCookResult = useCallback((result: CookResult) => {
    setCookResult(result);
  }, []);

  const handleCraftResult = useCallback((result: CraftResult) => {
    setCraftResult(result);
  }, []);

  const clearCookResult = useCallback(() => {
    setCookResult(null);
  }, []);

  const clearCraftResult = useCallback(() => {
    setCraftResult(null);
  }, []);

  const handleCollectWaterResult = useCallback((result: { success: boolean; waterQty?: number; nextAvailableAt?: string; onCooldown?: boolean; message?: string }) => {
    setCollectWaterResult(result);
  }, []);

  const clearCollectWaterResult = useCallback(() => {
    setCollectWaterResult(null);
  }, []);

  const lastErrorRef = useRef<{ msg: string; ts: number }>({ msg: '', ts: 0 });

  useEffect(() => {
    if (state.shakingTreeAnchorId) {
      const t = setTimeout(() => dispatch({ type: 'CLEAR_TREE_SHAKE' }), 400);
      return () => clearTimeout(t);
    }
  }, [state.shakingTreeAnchorId, dispatch]);

  const handleError = useCallback((msg: string, context?: { spawnId?: string }) => {
    // State-sync errors: server says we're already in that state; treat as success, no error UI
    const isStateSyncError =
      msg === 'Already watered' ||
      msg.includes('There is already a crop planted here') ||
      msg.includes('No crop at this tile') ||
      msg.includes('Item not found on grid');
    if (isStateSyncError) {
      if (msg.includes('already a crop planted')) {
        dispatch({ type: 'REVERT_PLACEMENT' });
      }
      return;
    }

    console.warn('[GameWS Error]', msg);

    // Dedup: suppress duplicate messages within 2 seconds
    const now = Date.now();
    const isDuplicate = msg === lastErrorRef.current.msg && now - lastErrorRef.current.ts < 2000;
    lastErrorRef.current = { msg, ts: now };

    if (!isDuplicate) {
      dispatch({ type: 'PET_DIALOG', message: { id: `pd_${now}`, text: msg } });
    }

    const isPlacementError =
      msg.includes('Placement out of bounds') ||
      msg === 'Failed to place item' ||
      msg.includes('Seeds can only be planted') ||
      msg.includes('already a crop planted') ||
      msg.includes('Soil cannot be placed') ||
      msg.includes('Unknown item type') ||
      msg.includes('is not placeable') ||
      msg.startsWith('No ') && msg.includes('in inventory');
    if (isPlacementError) {
      dispatch({ type: 'REVERT_PLACEMENT' });
    }
    if (msg.includes('Bug already gone') && context?.spawnId) {
      dispatch({ type: 'REMOVE_BUG', spawnId: context.spawnId });
    }
  }, [dispatch]);

  const handlePetBehaviorSync = useCallback((data: { state: string }) => {
    dispatch({ type: 'SET_PET_BEHAVIOR_SYNC', state: data.state });
  }, []);

  const handlePetStateUpdate = useCallback((data: {
    col: number;
    row: number;
    behavior: string;
    targetCol?: number;
    targetRow?: number;
    interactionType?: string;
    interactionTarget?: string;
    interactionItemType?: string;
  }) => {
    dispatch({ type: 'SET_PET_STATE', payload: data });
  }, []);

  const clearPetBehaviorSync = useCallback(() => {
    dispatch({ type: 'CLEAR_PET_BEHAVIOR_SYNC' });
  }, []);

  const decorationReactionRef = useRef<((col: number, row: number, itemType: string) => void) | null>(null);

  const handlePetUpdated = useCallback(() => {
    refreshUser();
  }, [refreshUser]);

  const {
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
    emitShakeTree,
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
  } = useGameSocket({
    onSnapshot: handleSnapshot,
    onStateUpdate: handleStateUpdate,
    onItemDefsUpdated: handleItemDefsUpdated,
    onError: handleError,
    onBugSpawn: handleBugSpawn,
    onBugCaught: handleBugCaught,
    onBugDespawn: handleBugDespawn,
    onBalloonSpawn: handleBalloonSpawn,
    onBalloonPopped: handleBalloonPopped,
    onBalloonDespawn: handleBalloonDespawn,
    onFossilDug: handleFossilDug,
    onSceneryUpdated: handleSceneryUpdated,
    onQuestCompleted: handleQuestCompleted,
    onQuestDialog: handleQuestDialog,
    onQuestActivated: handleQuestActivated,
    onCookResult: handleCookResult,
    onCollectWaterResult: handleCollectWaterResult,
    onPetBehaviorSync: handlePetBehaviorSync,
    onPetStateUpdate: handlePetStateUpdate,
    onPetUpdated: handlePetUpdated,
  });

  const advanceQuestDialog = useCallback(() => {
    const step = state.currentQuestDialog?.[state.questDialogIndex];
    if (step?.highlight) return;
    const isLastStep = state.currentQuestDialog && state.questDialogIndex >= state.currentQuestDialog.length - 1;
    if (isLastStep && state.currentNpcItemType) {
      emitQuestNpcDialogDismissed(state.currentNpcItemType);
    }
    if (isLastStep && state.currentQuestIdToComplete) {
      emitCompleteQuest(state.currentQuestIdToComplete);
    }
    dispatch({ type: 'ADVANCE_QUEST_DIALOG' });
  }, [state.currentQuestDialog, state.questDialogIndex, state.currentNpcItemType, state.currentQuestIdToComplete, emitQuestNpcDialogDismissed, emitCompleteQuest]);

  const queueNpcDialog = useCallback((steps: DialogStep[], speaker?: DialogSpeaker, npcItemType?: string, blocking?: boolean, questIdToComplete?: string) => {
    dispatch({ type: 'QUEUE_NPC_DIALOG', steps, speaker, npcItemType, blocking, questIdToComplete });
  }, []);

  const showPetDialog = useCallback((text: string) => {
    dispatch({ type: 'SHOW_PET_DIALOG', text });
  }, []);

  const optimisticallyActivateQuest = useCallback((questId: string) => {
    dispatch({ type: 'OPTIMISTIC_QUEST_ACTIVATE', questId });
  }, []);

  const {
    activeHighlight,
    tryAutoAdvanceDialog,
    setShopOpen,
    setSellBoxOpen,
    setCookingOpen,
    setFoodDishOpen,
    setEquipOpen,
    onShopCategorySelect,
  } = useQuestHighlight({ state, dispatch });

  const popBalloon = useCallback((spawnId: string) => {
    emitPopBalloon(spawnId);
  }, [emitPopBalloon]);

  const dismissBalloonPopResult = useCallback(() => {
    dispatch({ type: 'SET_BALLOON_POP_RESULT', result: null });
  }, []);

  const dismissFossilDigResult = useCallback(() => {
    dispatch({ type: 'SET_FOSSIL_DIG_RESULT', result: null });
  }, []);

  const actions = useGameActions(state, dispatch, activeGrid, {
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
    emitCatchBug,
    emitDigFossil,
    emitShakeTree,
    emitCompleteQuest,
    emitQuestActivateByNpc,
    emitQuestActivateByScene,
    emitQuestModalOpened,
    tryAutoAdvanceDialog,
    showPetDialog,
    emitSetEquipped,
    setPendingNpcDialog,
    optimisticallyActivateQuest,
    petLevel: user?.pet?.level ?? 1,
  });

  const digFossil = actions.digFossil;
  const shakeTree = actions.shakeTree;

  const inventorySlots = useMemo<InventorySlot[]>(() => {
    return Object.entries(state.inventory)
      .filter(([, qty]) => qty > 0)
      .map(([itemType, qty]) => ({ itemType, qty }));
  }, [state.inventory]);

  const placeableSlots = useMemo<InventorySlot[]>(() => {
    return inventorySlots.filter((s) => {
      const def = state.itemDefs[s.itemType];
      if (!def?.placeable) return false;
      if (def.category === 'food') return false; // Food goes in food dishes, not placed
      if (state.activeCategory === 'all') return true;
      return def.category === state.activeCategory;
    });
  }, [inventorySlots, state.activeCategory, state.itemDefs]);

  const displaySlots = useMemo<InventorySlot[]>(() => {
    return inventorySlots.filter((s) => {
      const def = state.itemDefs[s.itemType];
      if (!def) return false;
      if (state.activeCategory === 'all') return true;
      return def.category === state.activeCategory;
    });
  }, [inventorySlots, state.activeCategory, state.itemDefs]);

  const farmMeta = useMemo<FarmMeta>(
    () => ({ name: state.farmName, xp: state.farmXp }),
    [state.farmName, state.farmXp],
  );

  const value = useMemo<GameContextValue>(
    () => ({
      activeScene: state.activeScene,
      targetScene: state.targetScene,
      activeGrid,
      farmGrid: state.farmGrid,
      houseGrid: state.houseGrid,
      selectedTile: state.selectedTile,
      isTransitioning: state.isTransitioning,
      editMode: state.editMode,
      activeCategory: state.activeCategory,
      inventory: inventorySlots,
      placeableSlots,
      displaySlots,
      selectedItemType: state.selectedItemType,
      harvestEffects: state.harvestEffects,
      farm: farmMeta,
      farmLevel: state.farmLevel,
      farmLevels: state.farmLevels,
      equipped: state.equipped,
      foodDishQueues: state.foodDishQueues,
      itemDefs: state.itemDefs,
      sceneryUrl: state.sceneryUrl,
      sceneWorldCols: state.sceneWorldCols,
      sceneWorldRows: state.sceneWorldRows,
      scenePlacements: state.scenePlacements,
      connected,
      loading,
      pendingInteraction: state.pendingInteraction,
      movingItemId: state.movingItemId,
      pendingDropTarget: state.pendingDropTarget,
      shakingTreeAnchorId: state.shakingTreeAnchorId,
      shakeTrigger: state.shakeTrigger,
      toolMode: state.toolMode,
      gems: state.gems,
      activeBugs: state.activeBugs,
      lastCatchResult: state.lastCatchResult,
      activeBalloons: state.activeBalloons,
      lastBalloonPopResult: state.lastBalloonPopResult,
      lastFossilDigResult: state.lastFossilDigResult,
      quests: state.quests,
      canUpgrade: state.canUpgrade,
      currentQuestDialog: state.currentQuestDialog,
      questDialogIndex: state.questDialogIndex,
      currentDialogBlocking: state.currentDialogBlocking,
      activeHighlight,
      currentDialogSpeaker: state.currentDialogSpeaker,
      currentDialogRewards: state.currentDialogRewards,
      placeItem: actions.placeItem,
      placeItemAt: actions.placeItemAt,
      removeItem: actions.removeItem,
      moveItem: actions.moveItem,
      setPendingDropTarget: actions.setPendingDropTarget,
      selectTile: actions.selectTile,
      selectInventoryItem: actions.selectInventoryItem,
      switchScene: actions.switchScene,
      applySceneChange: actions.applySceneChange,
      completeTransition: actions.completeTransition,
      toggleEditMode: actions.toggleEditMode,
      setCategory: actions.setCategory,
      harvestCrop: actions.harvestCrop,
      dismissHarvestEffect: actions.dismissHarvestEffect,
      setFarmName: actions.setFarmName,
      clearInteraction: actions.clearInteraction,
      setPendingInteraction: actions.setPendingInteraction,
      startMoveItem: actions.startMoveItem,
      cancelMove: actions.cancelMove,
      storeSelectedItem: actions.storeSelectedItem,
      storeItemByAnchorId: actions.storeItemByAnchorId,
      destroySelectedItem: actions.destroySelectedItem,
      setToolMode: actions.setToolMode,
      waterTile: actions.waterTile,
      showPetDialog,
      purchaseItem: actions.purchaseItem,
      sellItem: actions.sellItem,
      sellItemsBatch: actions.sellItemsBatch,
      addToFoodDish: actions.addToFoodDish,
      equipItem: actions.equipItem,
      catchBug: actions.catchBug,
      dismissCatchResult: actions.dismissCatchResult,
      popBalloon,
      dismissBalloonPopResult,
      digFossil,
      shakeTree,
      dismissFossilDigResult,
      completeQuest: actions.completeQuest,
      emitQuestActivateByNpc,
      emitQuestActivateByScene,
      emitQuestModalOpened,
      advanceQuestDialog,
      queueNpcDialog,
      setPendingNpcDialog,
      optimisticallyActivateQuest,
      tryAutoAdvanceDialog,
      refreshGame: emitLoad,
      setShopOpen,
      setSellBoxOpen,
      setCookingOpen,
      setFoodDishOpen,
      setEquipOpen,
      onShopCategorySelect,
      cookResult,
      emitCook,
      craftResult,
      emitCraft,
      emitFeedPet,
      emitConsumeFromFoodDish,
      emitPetBehavior,
      emitPetActionComplete,
      emitCollectWater,
      collectWaterResult,
      clearCollectWaterResult,
      petBehaviorSync: state.petBehaviorSync,
      petState: state.petState,
      clearPetBehaviorSync,
      decorationReactionRef,
      clearCookResult,
      clearCraftResult,
    }),
    [
      // ── State fields (granular, not the entire `state` object) ──
      state.activeScene,
      state.targetScene,
      state.farmGrid,
      state.houseGrid,
      state.selectedTile,
      state.isTransitioning,
      state.editMode,
      state.activeCategory,
      state.selectedItemType,
      state.harvestEffects,
      state.farmLevel,
      state.farmLevels,
      state.equipped,
      state.itemDefs,
      state.sceneryUrl,
      state.pendingInteraction,
      state.movingItemId,
      state.pendingDropTarget,
      state.shakingTreeAnchorId,
      state.shakeTrigger,
      state.toolMode,
      state.gems,
      state.activeBugs,
      state.lastCatchResult,
      state.activeBalloons,
      state.lastBalloonPopResult,
      state.lastFossilDigResult,
      state.quests,
      state.canUpgrade,
      state.currentQuestDialog,
      state.questDialogIndex,
      state.currentDialogBlocking,
      state.petBehaviorSync,
      state.petState,
      // ── Derived / composed values ──
      activeGrid,
      inventorySlots,
      placeableSlots,
      displaySlots,
      farmMeta,
      connected,
      loading,
      activeHighlight,
      // ── Action callbacks ──
      actions.placeItem,
      actions.placeItemAt,
      actions.removeItem,
      actions.moveItem,
      actions.setPendingDropTarget,
      actions.selectTile,
      actions.selectInventoryItem,
      actions.switchScene,
      actions.applySceneChange,
      actions.completeTransition,
      actions.toggleEditMode,
      actions.setCategory,
      actions.harvestCrop,
      actions.dismissHarvestEffect,
      actions.setFarmName,
      actions.clearInteraction,
      actions.setPendingInteraction,
      actions.startMoveItem,
      actions.cancelMove,
      actions.storeSelectedItem,
      actions.storeItemByAnchorId,
      actions.destroySelectedItem,
      actions.setToolMode,
      actions.waterTile,
      actions.purchaseItem,
      actions.sellItem,
      actions.sellItemsBatch,
      actions.equipItem,
      actions.catchBug,
      actions.dismissCatchResult,
      actions.completeQuest,
      showPetDialog,
      popBalloon,
      dismissBalloonPopResult,
      digFossil,
      shakeTree,
      dismissFossilDigResult,
      advanceQuestDialog,
      queueNpcDialog,
      setPendingNpcDialog,
      optimisticallyActivateQuest,
      tryAutoAdvanceDialog,
      emitLoad,
      setShopOpen,
      setSellBoxOpen,
      setCookingOpen,
      setFoodDishOpen,
      setEquipOpen,
      onShopCategorySelect,
      cookResult,
      emitCook,
      craftResult,
      emitCraft,
      emitFeedPet,
      emitConsumeFromFoodDish,
      emitPetBehavior,
      emitPetActionComplete,
      emitCollectWater,
      collectWaterResult,
      clearCollectWaterResult,
      clearPetBehaviorSync,
      decorationReactionRef,
      clearCookResult,
      clearCraftResult,
    ],
  );

  return (
    <GameContext.Provider value={value}>
      <CropTickProvider>{children}</CropTickProvider>
    </GameContext.Provider>
  );
}

/**
 * Hook to access the game context. Must be used within a GameProvider.
 *
 * @returns The full game context value.
 * @throws If used outside GameProvider.
 */
export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within <GameProvider>');
  return ctx;
}
