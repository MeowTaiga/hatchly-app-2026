/**
 * Game Provider — Root context for game state and actions.
 *
 * Composes the reducer, quest highlights, socket connection, and action callbacks.
 * Provides the full game state and all mutating actions to the tree via useGame().
 */

import { labelFromRecipeId } from '@/constants/craftingLevelRecipeUnlocks';
import { seedItemTypesUnlockedBetween } from '@/constants/farmingLevelSeedShopUnlocks';
import { SKILL_META, type SkillId } from '@/constants/skills';
import { useAuth } from '@/store/AuthProvider';
import { usePetHero } from '@/store/PetHeroProvider';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { ActiveBalloon, ActiveBug, ActiveWeather, BalloonPopResult, BugCatchResult, CookResult, CraftResult, DialogEntry, FarmMeta, FossilDigResult, GameSnapshot, GridData, GroundPickupResult, InventorySlot, ItemDefinition, MineOreResult, MineReadyPayload, SpiritSnatchResult, SpiritSnatchRound, SpiritSnatchStartResult, StateUpdate, WeatherType } from '../types';
import { useGameSocket } from '../useGameSocket';

import { CropTickProvider } from '../useCropTick';
import { pushItemGains } from '../itemGainStore';
import {
  ingestItemPreviews,
  peekItemPreview,
} from '@/lib/itemPreviewCache';
import { initialState } from './initialState';
import { gameReducer } from './reducer';
import type { GameContextValue } from './types';
import { useGameActions } from './useGameActions';
import { useQuestHighlight } from './useQuestHighlight';

/** @internal */
const GameContext = createContext<GameContextValue | null>(null);

/**
 * How long a locally-drawn placement waits for the server before being taken back.
 *
 * Generous enough that a slow round trip is never mistaken for a refusal, short
 * enough that a phantom item does not linger long enough to be tapped.
 */
const PLACEMENT_CONFIRM_TIMEOUT_MS = 6000;

/**
 * Game provider component. Wraps the app (or game subtree) to provide game state and actions.
 *
 * @param props - Must include `children` to render.
 */
export function GameProvider({ children }: { children: React.ReactNode }) {
  const { refreshUser, user, applySkillProgress } = useAuth();
  const { triggerXpGain } = usePetHero();
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const activeGrid: GridData = state.activeScene === 'farm' ? state.farmGrid : state.houseGrid;

  const handleSnapshot = useCallback((snap: GameSnapshot) => {
    if (snap.sceneryUrl) {
      console.log(`[Scenery] Server sent baked URL for ${snap.gridCols}x${snap.gridRows}:`, snap.sceneryUrl);
    } else {
      console.log(`[Scenery] No baked scenery for ${snap.gridCols}x${snap.gridRows} — will use procedural fallback`);
    }
    if (snap.itemDefs) ingestItemPreviews(snap.itemDefs);
    dispatch({ type: 'SNAPSHOT', payload: snap });
  }, []);

  const handleStateUpdate = useCallback(
    (update: StateUpdate) => {
      dispatch({ type: 'STATE_UPDATE', payload: update });
      const skillXp = update.skillXp;
      if (skillXp?.skills && skillXp.amount > 0) {
        void applySkillProgress(skillXp.skills, skillXp.totalLevel);
        const meta = SKILL_META[skillXp.skill as SkillId];
        triggerXpGain?.(skillXp.amount, meta?.label);
      }

      const leveled = (skillXp?.levelsGained ?? 0) > 0;
      const unlocked = skillXp?.unlockedRecipes ?? [];
      const items = skillXp?.itemRewards ?? [];

      if (leveled || unlocked.length || items.length) {
        const meta = SKILL_META[skillXp!.skill as SkillId];
        const rewardLines: {
          itemType: string;
          qty: number;
          label: string;
          imageUrl?: string;
          emoji?: string;
        }[] = [];

        for (const recipeId of unlocked) {
          const scrollType = `recipe_${recipeId}`;
          const scrollDef = state.itemDefs[scrollType];
          const resultDef = state.itemDefs[recipeId];
          const preview = peekItemPreview(recipeId) || peekItemPreview(scrollType);
          rewardLines.push({
            itemType: `unlock:${recipeId}`,
            qty: 1,
            label: labelFromRecipeId(recipeId),
            imageUrl: scrollDef?.imageUrl || resultDef?.imageUrl || preview?.imageUrl,
            emoji: scrollDef?.emoji || resultDef?.emoji || preview?.emoji || '📜',
          });
        }

        for (const reward of items) {
          const def = state.itemDefs[reward.itemType];
          const preview = peekItemPreview(reward.itemType);
          const name =
            reward.itemType === 'soil'
              ? 'Soil'
              : def?.label || preview?.label || labelFromRecipeId(reward.itemType);
          rewardLines.push({
            itemType: reward.itemType,
            qty: reward.qty,
            label: name,
            imageUrl: def?.imageUrl || preview?.imageUrl,
            emoji: def?.emoji || preview?.emoji || (reward.itemType === 'soil' ? '🟫' : '🎁'),
          });
        }

        // Farming shop seed unlocks (buy access — not inventory).
        let unlockedShopSeeds: string[] = [];
        if (leveled && skillXp!.skill === 'farming') {
          const fromLevel = skillXp!.level - (skillXp!.levelsGained ?? 0);
          unlockedShopSeeds = seedItemTypesUnlockedBetween(fromLevel, skillXp!.level);
          for (const seedType of unlockedShopSeeds) {
            const def = state.itemDefs[seedType];
            const preview = peekItemPreview(seedType);
            rewardLines.push({
              itemType: `shop:${seedType}`,
              qty: 1,
              label: def?.label || preview?.label || labelFromRecipeId(seedType),
              imageUrl: def?.imageUrl || preview?.imageUrl,
              emoji: def?.emoji || preview?.emoji || '🌱',
            });
          }
        }

        const learnedOnly =
          (unlocked.length > 0 || unlockedShopSeeds.length > 0) && items.length === 0;
        const tone = learnedOnly ? 'learned' : 'got';

        if (leveled && meta) {
          pushItemGains(rewardLines, {
            tone,
            levelUp: {
              skillLabel: meta.label,
              level: skillXp!.level,
              color: meta.color,
            },
          });
        } else if (rewardLines.length) {
          pushItemGains(rewardLines, {
            tone,
          });
        }
      }
    },
    [applySkillProgress, triggerXpGain, state.itemDefs],
  );

  const handleItemDefsUpdated = useCallback((defs: Record<string, ItemDefinition>) => {
    ingestItemPreviews(defs);
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

  const handleGroundPickedUp = useCallback((result: GroundPickupResult) => {
    const def = state.itemDefs[result.itemType];
    pushItemGains(
      [{
        itemType: result.itemType,
        qty: result.qty,
        label: result.label,
        imageUrl: def?.imageUrl,
        emoji: def?.emoji || (result.itemType === 'stick' ? '🪵' : '🪨'),
      }],
      'got',
    );
  }, [state.itemDefs]);

  const handleSceneryUpdated = useCallback((data: { farmCols: number; farmRows: number; imageUrl: string }) => {
    dispatch({ type: 'SET_SCENERY_URL', url: data.imageUrl, farmCols: data.farmCols, farmRows: data.farmRows });
  }, []);

  const [cookResult, setCookResult] = useState<CookResult | null>(null);
  const [craftResult, setCraftResult] = useState<CraftResult | null>(null);
  const [smeltResult, setSmeltResult] = useState<CraftResult | null>(null);
  const [mineReady, setMineReady] = useState<MineReadyPayload | null>(null);
  const [learnRecipeResult, setLearnRecipeResult] = useState<{
    recipeId: string;
    recipeLabel: string;
    recipeItemType: string;
  } | null>(null);
  const [collectWaterResult, setCollectWaterResult] = useState<{ success: boolean; waterQty?: number; nextAvailableAt?: string; onCooldown?: boolean; message?: string } | null>(null);

  const handleCookResult = useCallback((result: CookResult) => {
    setCookResult(result);
  }, []);

  const handleCraftResult = useCallback((result: CraftResult) => {
    setCraftResult(result);
  }, []);

  const handleSmeltResult = useCallback((result: CraftResult) => {
    setSmeltResult(result);
  }, []);

  const handleMineReady = useCallback((payload: MineReadyPayload) => {
    setMineReady(payload);
  }, []);

  const handleMineResult = useCallback((result: MineOreResult) => {
    mineBusyRef.current = false;
    setMineReady(null);
    if (result.passed && result.itemType) {
      const def = state.itemDefs[result.itemType];
      const label = result.label ?? def?.label ?? 'ore';
      pushItemGains(
        [{
          itemType: result.itemType,
          qty: result.qty ?? 1,
          label,
          imageUrl: def?.imageUrl,
          emoji: def?.emoji || '⛏️',
        }],
        'got',
      );
    } else {
      dispatch({ type: 'SHOW_PET_DIALOG', text: 'The vein held. Try again with a stronger swing!' });
    }
  }, [state.itemDefs]);

  const handleLearnRecipeResult = useCallback((result: {
    recipeId: string;
    recipeLabel: string;
    recipeItemType: string;
  }) => {
    setLearnRecipeResult(result);
    const scrollDef = state.itemDefs[result.recipeItemType];
    const resultDef = state.itemDefs[result.recipeId];
    pushItemGains(
      [{
        itemType: result.recipeItemType,
        qty: 1,
        label: result.recipeLabel,
        imageUrl: scrollDef?.imageUrl || resultDef?.imageUrl,
        emoji: scrollDef?.emoji || resultDef?.emoji || '📜',
      }],
      'learned',
    );
  }, [state.itemDefs]);

  const clearCookResult = useCallback(() => {
    setCookResult(null);
  }, []);

  const clearCraftResult = useCallback(() => {
    setCraftResult(null);
  }, []);

  const clearSmeltResult = useCallback(() => {
    setSmeltResult(null);
  }, []);

  const clearMineReady = useCallback(() => {
    mineBusyRef.current = false;
    setMineReady(null);
  }, []);

  const clearLearnRecipeResult = useCallback(() => {
    setLearnRecipeResult(null);
  }, []);

  const handleCollectWaterResult = useCallback((result: { success: boolean; waterQty?: number; nextAvailableAt?: string; onCooldown?: boolean; message?: string }) => {
    setCollectWaterResult(result);
  }, []);

  const [spiritSnatchRound, setSpiritSnatchRound] = useState<SpiritSnatchRound | null>(null);

  const handleSpiritSnatchStart = useCallback((result: SpiritSnatchStartResult) => {
    if (result.ok) {
      setSpiritSnatchRound(result.round);
      return;
    }
    dispatch({ type: 'SHOW_PET_DIALOG', text: result.message });
  }, []);

  const handleSpiritSnatchResult = useCallback((result: SpiritSnatchResult) => {
    setSpiritSnatchRound(null);
    if (result.candyAwarded > 0) {
      dispatch({
        type: 'SHOW_PET_DIALOG',
        text: `The kettle coughed up ${result.candyAwarded} candy corn.`,
      });
    }
  }, []);

  const clearCollectWaterResult = useCallback(() => {
    setCollectWaterResult(null);
  }, []);

  const lastErrorRef = useRef<{ msg: string; ts: number }>({ msg: '', ts: 0 });
  const mineBusyRef = useRef(false);
  const emitLoadRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (state.shakingTreeAnchorId) {
      const t = setTimeout(() => dispatch({ type: 'CLEAR_TREE_SHAKE' }), 400);
      return () => clearTimeout(t);
    }
  }, [state.shakingTreeAnchorId, dispatch]);

  /**
   * Take back any placement the server never answered for.
   *
   * Refusals are recognised by their message text, so an unlisted one used to
   * leave a phantom item sitting on the farm. This runs while anything is
   * outstanding and gives up on it after a grace period.
   */
  useEffect(() => {
    if (state.pendingPlacements.length === 0) return;
    const oldest = state.pendingPlacements[0].at;
    const wait = Math.max(0, PLACEMENT_CONFIRM_TIMEOUT_MS - (Date.now() - oldest));
    const timer = setTimeout(() => {
      dispatch({ type: 'SWEEP_STALE_PLACEMENTS', before: Date.now() - PLACEMENT_CONFIRM_TIMEOUT_MS });
    }, wait + 50);
    return () => clearTimeout(timer);
  }, [state.pendingPlacements, dispatch]);

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

    mineBusyRef.current = false;

    if (
      msg.includes('That snatch already finished') ||
      msg.includes('the spirits got away')
    ) {
      setSpiritSnatchRound(null);
    }

    // Dedup: suppress duplicate messages within 2 seconds
    const now = Date.now();
    const isDuplicate = msg === lastErrorRef.current.msg && now - lastErrorRef.current.ts < 2000;
    lastErrorRef.current = { msg, ts: now };

    if (!isDuplicate) {
      dispatch({ type: 'SHOW_PET_DIALOG', text: msg });
    }

    if (msg.includes('Bug already gone') && context?.spawnId) {
      dispatch({ type: 'REMOVE_BUG', spawnId: context.spawnId });
      return;
    }

    // Backpack-full on store/remove: optimistic remove already mutated grid+inv — resync.
    if (msg.includes('Backpack full')) {
      emitLoadRef.current?.();
      return;
    }

    // Anything else takes back the oldest unconfirmed placement, if there is
    // one. This used to check the message against a list of known refusals,
    // which meant a new one on the server stranded a phantom item on the grid.
    // Reverting a placement the server actually accepted is self-correcting:
    // its confirmation carries both the item and the authoritative inventory.
    dispatch({ type: 'REVERT_PLACEMENT' });
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
    emitPickupGround,
    emitShakeTree,
    emitChopTree,
    emitPopBalloon,
    emitSpiritSnatchStart,
    emitSpiritSnatchSubmit,
    emitCompleteQuest,
    emitTalkToNpc,
    emitEnterScene,
    emitQuestModalOpened,
    emitCook,
    emitCraft,
    emitSmelt,
    emitMineBegin,
    emitMineComplete,
    emitMineCancel,
    emitLearnRecipe,
    emitFeedPet,
    emitAddToFoodDish,
    emitConsumeFromFoodDish,
    emitPetBehavior,
    emitPetActionComplete,
    emitCollectWater,
    emitStorageDeposit,
    emitStorageWithdraw,
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
    onGroundPickedUp: handleGroundPickedUp,
    onSceneryUpdated: handleSceneryUpdated,
    onCookResult: handleCookResult,
    onCraftResult: handleCraftResult,
    onSmeltResult: handleSmeltResult,
    onMineReady: handleMineReady,
    onMineResult: handleMineResult,
    onLearnRecipeResult: handleLearnRecipeResult,
    onCollectWaterResult: handleCollectWaterResult,
    onSpiritSnatchStart: handleSpiritSnatchStart,
    onSpiritSnatchResult: handleSpiritSnatchResult,
    onPetBehaviorSync: handlePetBehaviorSync,
    onPetStateUpdate: handlePetStateUpdate,
    onPetUpdated: handlePetUpdated,
  });

  emitLoadRef.current = emitLoad;

  const requestMineBegin = useCallback((sceneSlug: string, col: number, row: number) => {
    if (mineBusyRef.current) return;
    mineBusyRef.current = true;
    emitMineBegin(sceneSlug, col, row);
  }, [emitMineBegin]);

  /**
   * Advances unconditionally. Whether a tap is allowed at all is the overlay's
   * call — it owns the blocking rule and the escape hatch that goes with it.
   * This used to re-derive the rule and silently drop the advance, so a step
   * the overlay had decided was skippable could never actually be skipped.
   */
  const advanceQuestDialog = useCallback(() => {
    dispatch({ type: 'ADVANCE_QUEST_DIALOG' });
  }, []);

  const queueDialog = useCallback((entries: DialogEntry[]) => {
    dispatch({ type: 'QUEUE_DIALOG', entries });
  }, []);

  const showPetDialog = useCallback((text: string) => {
    dispatch({ type: 'SHOW_PET_DIALOG', text });
  }, []);

  const dismissQuestCompletions = useCallback(() => {
    dispatch({ type: 'DISMISS_QUEST_COMPLETIONS' });
  }, []);

  const {
    activeHighlight,
    tryAutoAdvanceDialog,
    setShopOpen,
    setSellBoxOpen,
    setCookingOpen,
    setCraftingOpen,
    setFoodDishOpen,
    setEquipOpen,
    onShopCategorySelect,
  } = useQuestHighlight({ state, dispatch });

  // Quest inventory highlights must be visible: if the backpack filter hides the
  // target item (e.g. storage under Buildings while Seeds is selected), switch
  // to that item's category so the glow and drag target appear.
  useEffect(() => {
    if (!state.editMode) return;
    const hl = activeHighlight;
    if (!hl || hl.type !== 'inventory_item') return;
    const def = state.itemDefs[hl.target];
    if (!def?.category) return;
    if (state.activeCategory === 'all' || state.activeCategory === def.category) return;
    dispatch({ type: 'SET_CATEGORY', cat: def.category });
  }, [
    state.editMode,
    activeHighlight,
    state.itemDefs,
    state.activeCategory,
    dispatch,
  ]);

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
    emitPickupGround,
    emitShakeTree,
    emitChopTree,
    emitCompleteQuest,
    emitTalkToNpc,
    emitEnterScene,
    emitQuestModalOpened,
    tryAutoAdvanceDialog,
    showPetDialog,
    emitSetEquipped,
  });

  const digFossil = actions.digFossil;
  const pickupGroundItem = actions.pickupGroundItem;
  const shakeTree = actions.shakeTree;
  const chopTree = actions.chopTree;

  const setWeather = useCallback((weather: ActiveWeather) => {
    dispatch({ type: 'SET_WEATHER', weather });
  }, []);

  const setWeatherOverride = useCallback((weatherOverride: WeatherType | null) => {
    dispatch({ type: 'SET_WEATHER_OVERRIDE', weatherOverride });
  }, []);

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
      storage: state.storage,
      backpackSlots: state.backpackSlots,
      miningEnergy: state.miningEnergy,
      miningEnergyCap: state.miningEnergyCap,
      miningEnergyAt: state.miningEnergyAt,
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
      currentDialog: state.currentDialog,
      questDialogIndex: state.questDialogIndex,
      activeHighlight,
      questCompletions: state.questCompletions,
      dismissQuestCompletions,
      weather: state.weather,
      setWeather,
      weatherOverride: state.weatherOverride,
      setWeatherOverride,
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
      depositToStorage: emitStorageDeposit,
      withdrawFromStorage: emitStorageWithdraw,
      addToFoodDish: actions.addToFoodDish,
      equipItem: actions.equipItem,
      catchBug: actions.catchBug,
      dismissCatchResult: actions.dismissCatchResult,
      popBalloon,
      spiritSnatchRound,
      emitSpiritSnatchStart,
      emitSpiritSnatchSubmit,
      dismissBalloonPopResult,
      digFossil,
      pickupGroundItem,
      shakeTree,
      chopTree,
      dismissFossilDigResult,
      completeQuest: actions.completeQuest,
      talkToNpc: emitTalkToNpc,
      enterScene: emitEnterScene,
      emitQuestModalOpened,
      advanceQuestDialog,
      queueDialog,
      tryAutoAdvanceDialog,
      refreshGame: emitLoad,
      setShopOpen,
      setSellBoxOpen,
      setCookingOpen,
      setCraftingOpen,
      setFoodDishOpen,
      setEquipOpen,
      onShopCategorySelect,
      cookResult,
      emitCook,
      craftResult,
      emitCraft,
      emitSmelt,
      emitMineBegin: requestMineBegin,
      emitMineComplete,
      emitMineCancel,
      mineReady,
      clearMineReady,
      smeltResult,
      clearSmeltResult,
      emitLearnRecipe,
      learnRecipeResult,
      clearLearnRecipeResult,
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
      state.storage,
      state.backpackSlots,
      state.miningEnergy,
      state.miningEnergyCap,
      state.miningEnergyAt,
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
      state.currentDialog,
      state.questDialogIndex,
      state.questCompletions,
      state.petBehaviorSync,
      state.petState,
      state.weather,
      state.weatherOverride,
      // ── Derived / composed values ──
      activeGrid,
      inventorySlots,
      placeableSlots,
      displaySlots,
      farmMeta,
      connected,
      loading,
      activeHighlight,
      emitStorageDeposit,
      emitStorageWithdraw,
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
      spiritSnatchRound,
      emitSpiritSnatchStart,
      emitSpiritSnatchSubmit,
      dismissBalloonPopResult,
      digFossil,
      pickupGroundItem,
      shakeTree,
      chopTree,
      dismissFossilDigResult,
      advanceQuestDialog,
      queueDialog,
      dismissQuestCompletions,
      setWeather,
      setWeatherOverride,
      emitTalkToNpc,
      emitEnterScene,
      emitQuestModalOpened,
      tryAutoAdvanceDialog,
      emitLoad,
      setShopOpen,
      setSellBoxOpen,
      setCookingOpen,
      setCraftingOpen,
      setFoodDishOpen,
      setEquipOpen,
      onShopCategorySelect,
      cookResult,
      emitCook,
      craftResult,
      emitCraft,
      emitSmelt,
      requestMineBegin,
      emitMineComplete,
      emitMineCancel,
      mineReady,
      clearMineReady,
      smeltResult,
      clearSmeltResult,
      emitLearnRecipe,
      learnRecipeResult,
      clearLearnRecipeResult,
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
