import { CachedImage } from '@/components/ui/CachedImage';
import { GemIcon } from '@/components/ui/GemIcon';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { BakedSceneryLayer } from './BakedSceneryLayer';
import { BestiaryDrawer, type BestiaryDrawerRef } from './BestiaryDrawer';
import { CookingDrawer, type CookingDrawerRef } from './CookingDrawer';
import { CraftingDrawer, type CraftingDrawerRef } from './CraftingDrawer';
import { BalloonInstance, BugInstance, PetDialog, PetSprite, usePetAI, usePetBubble } from './creature';
import { getPoseForContext, useNeutralPoseCycle } from './creature/pet';
import { CropInfoDrawer, type CropInfoDrawerRef } from './CropInfoDrawer';
import { DayNightOverlay, useDarkness } from './DayNightOverlay';
import type { DropZoneLayout } from './DraggablePlacedItem';
import { EquipDrawer, type EquipDrawerRef } from './EquipDrawer';
import { hasRequiredTool, getNoToolMessage } from './toolRequiredUtils';
import { FarmInfoDrawer, type FarmInfoDrawerRef } from './FarmInfoDrawer';
import { FishingShopDrawer, type FishingShopDrawerRef } from './FishingShopDrawer';
import { MailBoxDrawer, type MailBoxDrawerRef } from './MailBoxDrawer';
import { SellBoxDrawer, type SellBoxDrawerRef } from './SellBoxDrawer';
import { FoodDishDrawer, type FoodDishDrawerRef } from './FoodDishDrawer';
import { GameHUD } from './GameHUD';
import { useGame } from './GameProvider';
import { GridLines } from './GridLines';
import { HarvestEffectView } from './HarvestEffectView';
import { ItemRewardModal } from './ItemRewardModal';
import { ItemActionBar } from './ItemActionBar';
import { LightGlow } from './LightGlow';
import { PlacedItemView } from './PlacedItemView';
import { QuestDialogOverlay } from './QuestDialogOverlay';
import { SceneTransition } from './SceneTransition';
import { Shop, type ShopRef } from './Shop';
import { useCamera } from './useCamera';
import { WellDrawer, type WellDrawerRef } from './WellDrawer';

import { CircleRevealOverlay } from '@/components/transitions';
import { api } from '@/lib/api';
import { useAuth } from '@/store/AuthProvider';
import { usePetHero } from '@/store/PetHeroProvider';
import { useTheme } from '@/store/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { executeAction, registerAction } from './actionRegistry';
import { FARM_GRASS_COLOR, HOUSE_FLOOR_COLOR, TILE_SIZE, WORLD_PADDING } from './constants';
import { DraggablePlacedItem } from './DraggablePlacedItem';
import { findNearbyInteractable, getAllPlacedItems, getFishingTileKeys, getItemAt, getPlantableTiles, getSoilInvalidTileKeys, isTileActionable, resolveAnchor, resolveSoilAction } from './gridHelpers';
import { MPBottomBar, MultiplayerProvider, MultiplayerScene } from './multiplayer';
import { QuestBubble, getQuestStatusForNpc } from './multiplayer/QuestBubble';
import { screenToGrid, type CameraSnapshot, type GridDimensions } from './screenToGrid';
import { invokeTileTap, setTileTapHandler } from './tileTapRegistry';
import type { BalloonPopResult, BugCatchResult, FossilDigResult } from './types';
import { isMultiplayerScene } from './types';
let _sceneryLoadedOnce = false;


export function WorldRenderer() {
  const {
    activeScene, targetScene, activeGrid, selectedTile, isTransitioning,
    editMode, activeCategory, toolMode,
    inventory, placeableSlots, displaySlots, selectedItemType, harvestEffects, farm, equipped, foodDishQueues,
    farmLevel, farmLevels, itemDefs, pendingInteraction, movingItemId,
    selectTile, selectInventoryItem, switchScene, applySceneChange, completeTransition,
    setCategory, dismissHarvestEffect, setFarmName,
    clearInteraction, startMoveItem, cancelMove, storeSelectedItem,
    destroySelectedItem, setToolMode, petDialog, dismissPetDialog, showPetDialog,
    harvestCrop, gems, purchaseItem, sellItem, sellItemsBatch, addToFoodDish, equipItem, moveItem, setPendingDropTarget, pendingDropTarget,
    storeItemByAnchorId, placeItemAt,
    waterTile,
    loading, sceneryUrl, sceneWorldCols, sceneWorldRows,
    activeBugs, catchBug,
    lastCatchResult, dismissCatchResult,
    activeBalloons, popBalloon,
    lastBalloonPopResult, dismissBalloonPopResult,
    lastFossilDigResult, dismissFossilDigResult, digFossil,
    canUpgrade, quests, completeQuest,
    currentQuestDialog, questDialogIndex, activeHighlight, currentDialogSpeaker, currentDialogRewards, currentDialogBlocking, advanceQuestDialog,
    refreshGame, setShopOpen, setSellBoxOpen, setCookingOpen, setFoodDishOpen, setEquipOpen, onShopCategorySelect, tryAutoAdvanceDialog,
    cookResult, emitCook, craftResult, emitCraft, emitFeedPet, emitConsumeFromFoodDish, emitPetBehavior, emitPetActionComplete,
    emitCollectWater, collectWaterResult, clearCollectWaterResult,
    petBehaviorSync, petState, clearPetBehaviorSync, decorationReactionRef, clearCookResult, clearCraftResult,
  } = useGame();

  const { user, refreshUser } = useAuth();
  const { triggerXpGain } = usePetHero();
  const darkness = useDarkness();
  const petName = user?.pet?.customName || user?.pet?.name || 'Buddy';
  const shopRef = useRef<ShopRef>(null);
  /** Live tile positions for each active bug (updated by BugInstance callbacks). */
  const bugPositionsRef = useRef<Map<string, { col: number; row: number }>>(new Map());
  const [buildPaletteLayout, setBuildPaletteLayout] = useState<DropZoneLayout | null>(null);
  const [cameraSnap, setCameraSnap] = useState<CameraSnapshot>({ translateX: 0, translateY: 0, scale: 1 });
  const isPaletteDragging = useSharedValue(0);
  const [paletteDragPreview, setPaletteDragPreview] = useState<{
    itemType: string; def: import('./types').ItemDefinition; x: number; y: number;
  } | null>(null);
  const [paletteDropPreview, setPaletteDropPreview] = useState<{
    col: number; row: number; tileCols: number; tileRows: number;
  } | null>(null);
  const farmInfoRef = useRef<FarmInfoDrawerRef>(null);
  const bestiaryRef = useRef<BestiaryDrawerRef>(null);
  const cookingRef = useRef<CookingDrawerRef>(null);
  const craftingRef = useRef<CraftingDrawerRef>(null);
  const wellRef = useRef<WellDrawerRef>(null);
  const fishingShopRef = useRef<FishingShopDrawerRef>(null);
  const mailBoxRef = useRef<MailBoxDrawerRef>(null);
  const sellBoxRef = useRef<SellBoxDrawerRef>(null);
  const foodDishRef = useRef<FoodDishDrawerRef>(null);
  const equipRef = useRef<EquipDrawerRef>(null);
  const cropInfoRef = useRef<CropInfoDrawerRef>(null);
  const [cropInfoTarget, setCropInfoTarget] = useState<import('./types').PlacedItem | null>(null);

  useEffect(() => {
    if (cropInfoTarget) cropInfoRef.current?.open();
    else cropInfoRef.current?.close();
  }, [cropInfoTarget]);

  const snapshotReady = !loading && Object.keys(itemDefs).length > 0;
  const [sceneryReady, setSceneryReady] = useState(_sceneryLoadedOnce);
  const worldReady = snapshotReady && (activeScene !== 'farm' || sceneryReady);
  const [loadOverlayVisible, setLoadOverlayVisible] = useState(true);
  const loadOverlayRevealing = worldReady;
  const { theme } = useTheme();
  const handleLoadOverlayComplete = useCallback(() => setLoadOverlayVisible(false), []);

  useEffect(() => {
    registerAction('cooking', ({ clearInteraction: clear }) => { cookingRef.current?.open(); clear(); });
    registerAction('crafting', ({ clearInteraction: clear }) => { craftingRef.current?.open(); clear(); });
    registerAction('fishing_shop', ({ clearInteraction: clear }) => { fishingShopRef.current?.open(); clear(); });
    registerAction('sell_box', ({ clearInteraction: clear }) => { sellBoxRef.current?.open(); clear(); });
    registerAction('mail_box', ({ clearInteraction: clear }) => { mailBoxRef.current?.open(); clear(); });
    registerAction('food_dish', ({ action, clearInteraction }) => {
      const anchorId = action.anchorId;
      if (anchorId) foodDishRef.current?.open(anchorId);
      clearInteraction();
    });
  }, []);

  useEffect(() => {
    if (!pendingInteraction || pendingInteraction.type === 'none') return;
    if (pendingInteraction.type === 'open_modal' && typeof pendingInteraction.payload === 'string' && pendingInteraction.payload.startsWith('well')) {
      wellRef.current?.open(pendingInteraction.payload);
      clearInteraction();
      return;
    }
    if (executeAction(pendingInteraction, clearInteraction)) return;
  }, [pendingInteraction, clearInteraction]);

  const handleSceneryReady = useCallback(() => {
    _sceneryLoadedOnce = true;
    setSceneryReady(true);
  }, []);

  /** Keeps bugPositionsRef in sync as each BugInstance reports movement. */
  const handleBugPositionChange = useCallback((spawnId: string, col: number, row: number) => {
    bugPositionsRef.current.set(spawnId, { col, row });
  }, []);

  // Prune stale entries when activeBugs changes
  useEffect(() => {
    const liveIds = new Set(activeBugs.map((b) => b.spawnId));
    for (const key of bugPositionsRef.current.keys()) {
      if (!liveIds.has(key)) bugPositionsRef.current.delete(key);
    }
  }, [activeBugs]);

  const isFarm = activeScene === 'farm';
  const isMP = isMultiplayerScene(activeScene);
  const [mpSceneName, setMpSceneName] = useState<string | null>(null);
  useEffect(() => {
    if (!isMP) {
      setMpSceneName(null);
      return;
    }
    let cancelled = false;
    api
      .getScene(activeScene)
      .then((data) => { if (!cancelled) setMpSceneName(data.name); })
      .catch(() => { if (!cancelled) setMpSceneName(activeScene); });
    return () => { cancelled = true; };
  }, [isMP, activeScene]);
  const bgColor = isFarm ? '#5A9E5A' : '#D4C4A8';
  const worldBgColor = isFarm ? FARM_GRASS_COLOR : HOUSE_FLOOR_COLOR;
  const gridLineColor = isFarm ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.06)';
  // farmLevel comes from backend (accounts for quest completion)

  const padding = isFarm ? WORLD_PADDING : 0;
  const worldCols =
    isFarm && sceneWorldCols != null && sceneWorldRows != null
      ? sceneWorldCols
      : activeGrid.cols + 2 * padding;
  const worldRows =
    isFarm && sceneWorldCols != null && sceneWorldRows != null
      ? sceneWorldRows
      : activeGrid.rows + 2 * padding;

  const { petX, petY, facingRight, bounceOffset, behaviorOffset, toolRotationDeg, jumpOffset, behavior, position, triggerJump, reactToDecorationPlacement } = usePetAI({
    cols: activeGrid.cols,
    rows: activeGrid.rows,
    activeGrid,
    itemDefs,
    active: !isTransitioning,
    onFeedPet: emitFeedPet,
    onFeedFromDish: emitConsumeFromFoodDish,
    foodDishQueues,
    petState,
    emitBehavior: emitPetBehavior,
    emitActionComplete: emitPetActionComplete,
    petBehaviorSync,
    clearPetBehaviorSync,
  });

  useEffect(() => {
    decorationReactionRef.current = reactToDecorationPlacement;
    return () => {
      decorationReactionRef.current = null;
    };
  }, [reactToDecorationPlacement]);

  const { bubbleVisible, bubbleMood } = usePetBubble({
    behavior,
    hunger: user?.pet?.hunger ?? 100,
    happy: user?.pet?.happy ?? 100,
    mood: user?.pet?.mood ?? 100,
    active: !isTransitioning,
  });

  const neutralPoseOverride = useNeutralPoseCycle(!isTransitioning);
  const [showHeart, setShowHeart] = useState(false);
  const isPettingRef = useRef(false);

  /** Pet depth for z-order; updates when crossing grid cells during movement. */
  const [effectivePetRow, setEffectivePetRow] = useState(position.row);

  /** Sync effectivePetRow when position changes (e.g. walk complete, scene change). */
  useEffect(() => {
    setEffectivePetRow(position.row);
  }, [position.row, position.col]);

  /** Derive effective row from petY for z-order during movement. runOnJS only on cell boundary cross. */
  useAnimatedReaction(
    () => Math.floor(petY.value / TILE_SIZE),
    (curr, prev) => {
      if (curr !== prev) runOnJS(setEffectivePetRow)(curr);
    },
  );

  const screenH = Dimensions.get('window').height;
  const hudCutoff = editMode
    ? (buildPaletteLayout ? buildPaletteLayout.y : screenH * 0.75)
    : 0;

  const TAP_THROTTLE_MS = 50;
  const lastTapRef = useRef<{ col: number; row: number; ts: number }>({ col: -1, row: -1, ts: 0 });

  const executeTileTap = useCallback(
    async (col: number, row: number) => {
      const pet = user?.pet;
      const onPet =
        toolMode === 'none' &&
        pet &&
        isFarm &&
        !isPettingRef.current &&
        Math.abs(col - position.col) <= 1 &&
        Math.abs(row - position.row) <= 1;

      if (onPet) {
        isPettingRef.current = true;
        try {
          const { xpGained } = await api.petPet();
          await refreshUser();
          triggerJump();
          setShowHeart(true);
          if (xpGained > 0) triggerXpGain?.(xpGained);
        } catch {
          // Ignore — user stays with cached data
        } finally {
          isPettingRef.current = false;
        }
        return;
      }

      // Tap near bug → catch (any tool mode)
      const hitBug = activeBugs.find((b) => {
        const pos = bugPositionsRef.current.get(b.spawnId) ?? b;
        return Math.abs(pos.col - col) <= 1 && Math.abs(pos.row - row) <= 1;
      });
      if (hitBug) {
        catchBug(hitBug.spawnId);
        return;
      }

      // Tap near balloon → pop (any tool mode)
      const hitBalloon = activeBalloons.find((b) =>
        Math.abs(b.col - col) <= 1 && Math.abs(b.row - row) <= 1,
      );
      if (hitBalloon) {
        popBalloon(hitBalloon.spawnId);
        return;
      }

      // Tap on fishing tile (farm): require pole, else show dialog. With pole, go to fishing scene.
      if (isFarm) {
        const fishingTiles = getFishingTileKeys(activeGrid, itemDefs);
        if (fishingTiles.has(`${col}:${row}`)) {
          if (!hasRequiredTool('fishing', equipped, itemDefs)) {
            showPetDialog(getNoToolMessage('fishing'));
            return;
          }
          switchScene('fishing_1');
          return;
        }
      }

      // Tap on soil/crop (toolMode none): prioritize water > harvest > info drawer.
      if (toolMode === 'none') {
        const action = resolveSoilAction(activeGrid, itemDefs, col, row, 'auto');
        if (action) {
          if (action.type === 'water') { waterTile(action.col, action.row); return; }
          if (action.type === 'harvest') { selectTile(action.col, action.row); return; }
        }
        // No water/harvest action → check if tapping a growing crop to show info drawer
        const tappedItem = getItemAt(activeGrid, col, row);
        if (tappedItem && tappedItem.growthMs && tappedItem.plantedAt) {
          setCropInfoTarget(tappedItem);
          return;
        }
      }

      // Tap on fossil hole (farm): dig with shovel
      if (isFarm) {
        const fossilItem = getItemAt(activeGrid, col, row);
        if (fossilItem) {
          const def = itemDefs[fossilItem.itemType];
          const isDiggable =
            fossilItem.itemType === 'fossil_hole' ||
            def?.subCategory === 'dig_hole';
          if (isDiggable) {
            const anchorId = fossilItem.anchorId ?? fossilItem.id;
            digFossil(anchorId);
            return;
          }
        }
      }

      // If tapped tile has nothing actionable, resolve to nearest actionable neighbor
      let tc = col, tr = row;
      if (!isTileActionable(activeGrid, col, row, itemDefs)) {
        const nearby = findNearbyInteractable(activeGrid, col, row, itemDefs);
        if (nearby) { tc = nearby.col; tr = nearby.row; }
      }
      selectTile(tc, tr);
    },
    [user?.pet, toolMode, activeGrid, itemDefs, isFarm, position, selectTile, waterTile, refreshUser, triggerJump, triggerXpGain, activeBugs, catchBug, activeBalloons, popBalloon, equipped, showPetDialog, switchScene, digFossil],
  );

  const handleTileTap = useCallback(
    (col: number, row: number) => {
      const now = Date.now();
      const last = lastTapRef.current;
      const sameTile = last.col === col && last.row === row;
      if (sameTile && now - last.ts < TAP_THROTTLE_MS) return;
      lastTapRef.current = { col, row, ts: now };
      executeTileTap(col, row);
    },
    [executeTileTap],
  );

  useEffect(() => {
    setTileTapHandler(handleTileTap);
    return () => setTileTapHandler(null);
  }, [handleTileTap]);

  const { camera, gesture } = useCamera({
    cols: activeGrid.cols,
    rows: activeGrid.rows,
    worldCols,
    worldRows,
    onTileTap: invokeTileTap,
    tapDeadZoneY: hudCutoff,
    initialFocusRow: isFarm ? 7 : undefined,
  });

  /** Sync camera to state only during palette drag (avoids lag from updating every frame when panning). */
  useAnimatedReaction(
    () => ({
      tx: camera.translateX.value,
      ty: camera.translateY.value,
      scale: camera.scale.value,
      dragging: isPaletteDragging.value,
    }),
    (curr) => {
      if (curr.dragging) {
        runOnJS(setCameraSnap)({
          translateX: curr.tx,
          translateY: curr.ty,
          scale: curr.scale,
        });
      }
    },
  );

  const petImageUrl = useMemo(() => {
    const base = user?.pet?.imageUrl ?? null;
    if (!base) return base;
    const poses = user?.pet?.pose;
    const hunger = user?.pet?.hunger ?? 100;
    const happy = user?.pet?.happy ?? 100;
    const mood = user?.pet?.mood ?? 100;
    const poseKey = getPoseForContext(behavior, hunger, happy, mood, 'world', poses, {
      neutralPoseOverride,
    });
    return (poseKey && poses?.[poseKey]) ?? base;
  }, [user?.pet?.imageUrl, user?.pet?.pose, user?.pet?.hunger, user?.pet?.happy, user?.pet?.mood, behavior, neutralPoseOverride]);

  const worldStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: camera.translateX.value },
      { translateY: camera.translateY.value },
      { scale: camera.scale.value },
    ],
  }));

  const worldSize = useMemo(
    () => ({ width: worldCols * TILE_SIZE, height: worldRows * TILE_SIZE }),
    [worldCols, worldRows],
  );

  const farmOffset = ((worldCols - activeGrid.cols) / 2) * TILE_SIZE;

  // Resolve which anchor IDs are selected or moving
  const selectedAnchorId = useMemo<string | null>(() => {
    if (!selectedTile || !editMode) return null;
    const [col, row] = selectedTile.split(':').map(Number);
    const item = getItemAt(activeGrid, col, row);
    if (!item) return null;
    return item.anchorId ?? item.id;
  }, [selectedTile, editMode, activeGrid]);

  const selectedItemData = useMemo(() => {
    if (!selectedAnchorId) return null;
    for (const v of getAllPlacedItems(activeGrid)) {
      if (v.id === selectedAnchorId) return v;
    }
    return null;
  }, [selectedAnchorId, activeGrid]);

  const [dragPreview, setDragPreview] = useState<{
    col: number; row: number; tileCols: number; tileRows: number; itemType?: string; anchorId?: string;
  } | null>(null);

  const handleDragMoveEnd = useCallback(
    (anchorId: string, col: number, row: number) => {
      setPendingDropTarget({ anchorId, newCol: col, newRow: row });
      moveItem(anchorId, col, row);
    },
    [moveItem, setPendingDropTarget],
  );

  /** Pre-compute which soil items have crops planted on them.
   *  Single O(n) pass over items instead of O(soil × tileArea) nested loops. */
  const soilWithCropsIds = useMemo(() => {
    const cropOccupied = new Set<string>(); // "col:row" keys covered by crops
    const soilItems: import('./types').PlacedItem[] = [];
    for (const item of getAllPlacedItems(activeGrid)) {
      if (item.anchorId) continue;
      if (item.growthMs) {
        // Mark all tiles this crop covers
        for (let dr = 0; dr < item.tileRows; dr++) {
          for (let dc = 0; dc < item.tileCols; dc++) {
            cropOccupied.add(`${item.col + dc}:${item.row + dr}`);
          }
        }
      } else if (itemDefs[item.itemType]?.category === 'soil') {
        soilItems.push(item);
      }
    }
    const ids = new Set<string>();
    for (const soil of soilItems) {
      let found = false;
      for (let dr = 0; !found && dr < soil.tileRows; dr++) {
        for (let dc = 0; !found && dc < soil.tileCols; dc++) {
          if (cropOccupied.has(`${soil.col + dc}:${soil.row + dr}`)) found = true;
        }
      }
      if (found) ids.add(soil.id);
    }
    return ids;
  }, [activeGrid, itemDefs]);

  /** Depth-sorted item renderables (no pet — pet is rendered separately). */
  const sortedItems = useMemo(() => {
    type Renderable = { depth: number; element: React.ReactElement };
    const list: Renderable[] = [];

    for (const item of getAllPlacedItems(activeGrid)) {
      if (item.anchorId) continue;
      const anchId = item.id;
      const queue = foodDishQueues?.[anchId];
      const nextFoodType = queue?.[0];
      const def = itemDefs[item.itemType];
      const anchor = resolveAnchor(activeGrid, item) ?? item;
      const baseDepth = anchor.row + anchor.tileRows - 1;
      const isSoil = def?.category === 'soil';
      const isTable = def?.subCategory === 'table';
      const depth = (def?.category === 'flooring' || def?.category === 'tiled_flooring') ? -1e6 + baseDepth
        : isSoil ? -5e5 + baseDepth
          : isTable ? baseDepth - 1000
            : baseDepth;

      let fenceMask: number | undefined;
      if (def?.autoConnect) {
        fenceMask = 0;
        const n = getItemAt(activeGrid, item.col, item.row - 1);
        if (n && n.itemType === item.itemType) fenceMask |= 1;
        const e = getItemAt(activeGrid, item.col + 1, item.row);
        if (e && e.itemType === item.itemType) fenceMask |= 2;
        const s = getItemAt(activeGrid, item.col, item.row + 1);
        if (s && s.itemType === item.itemType) fenceMask |= 4;
        const w = getItemAt(activeGrid, item.col - 1, item.row);
        if (w && w.itemType === item.itemType) fenceMask |= 8;
      }

      const isWorldHighlighted =
        activeHighlight?.type === 'world_item' &&
        (activeHighlight.target === item.itemType ||
          (['sell_box', 'cooking_pot', 'food_dish'].includes(activeHighlight.target) &&
            def?.interactAction?.payload ===
              (activeHighlight.target === 'cooking_pot' ? 'cooking' : activeHighlight.target)));
      const stableKey = item.clientId ?? item.id;
      const isCrop = !!item.growthMs;


      const view = (
        <PlacedItemView
          key={stableKey}
          item={item}
          itemDefs={itemDefs}
          isSelected={anchId === selectedAnchorId && !movingItemId}
          isMoving={anchId === movingItemId}
          fenceConnectionMask={fenceMask}
          highlighted={isWorldHighlighted}
        />
      );

      // Skip the expensive DraggablePlacedItem gesture handler wrapper for
      // crops — they can never be dragged anyway.
      // NOTE: Soil always gets the wrapper so its tree stays stable when
      // crops are planted or harvested (avoids unmount/remount flicker).
      const hasCrops = isSoil && soilWithCropsIds.has(item.id);
      const isDigHole = item.itemType === 'fossil_hole' || def?.subCategory === 'dig_hole';
      const isDraggable = editMode && !isCrop && !hasCrops && !isDigHole;

      const element = isCrop ? view : (
        <DraggablePlacedItem
          key={stableKey}
          col={item.col}
          row={item.row}
          tileCols={item.tileCols}
          tileRows={item.tileRows}
          anchorId={anchId}
          itemType={item.itemType}
          gridCols={activeGrid.cols}
          gridRows={activeGrid.rows}
          onMoveEnd={handleDragMoveEnd}
          onStore={storeItemByAnchorId}
          dropZoneLayout={buildPaletteLayout}
          onDragPreview={setDragPreview}
          pendingDropTarget={pendingDropTarget}
          enabled={isDraggable}
        >
          <PlacedItemView
            item={{ ...item, col: 0, row: 0 }}
            itemDefs={itemDefs}
            isSelected={anchId === selectedAnchorId && !movingItemId}
            isMoving={anchId === movingItemId}
            fenceConnectionMask={fenceMask}
            highlighted={isWorldHighlighted}
          />
        </DraggablePlacedItem>
      );

      list.push({ depth, element });

      // Quest bubble for NPCs with quests
      if (def?.category === 'npc' && def?.npcDialog?.length) {
        const questStatus = getQuestStatusForNpc(
          item.itemType,
          quests,
          user?.pet?.level ?? 1,
          farmLevel,
        );
        if (questStatus) {
          const centerX = (item.col + item.tileCols / 2) * TILE_SIZE;
          const topY = item.row * TILE_SIZE;
          const bubbleEl = (
            <QuestBubble
              key={`quest-bubble-${anchId}`}
              status={questStatus}
              itemDefs={itemDefs}
              centerX={centerX}
              topY={topY}
            />
          );
          list.push({ depth: baseDepth + 1, element: bubbleEl });
        }
      }

      if (def?.interactAction?.payload === 'food_dish' && nextFoodType) {
        const foodDef = itemDefs[nextFoodType];
        if (foodDef) {
          const centerCol = item.col + item.tileCols / 2;
          const centerRow = item.row + item.tileRows / 2;
          const overlayDepth = baseDepth + 1;
          const overlaySize = Math.round(TILE_SIZE * 0.75); // ~36px — proportional to tile
          const overlayX = centerCol * TILE_SIZE - overlaySize / 2;
          const overlayY = centerRow * TILE_SIZE - overlaySize / 2 - 20;
          const overlayEl = (
            <View
              key={`food-overlay-${anchId}`}
              style={{
                position: 'absolute',
                left: overlayX,
                top: overlayY,
                width: overlaySize,
                height: overlaySize,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              pointerEvents="none"
            >
              {foodDef.imageUrl ? (
                <CachedImage
                  source={{ uri: foodDef.imageUrl }}
                  style={{ width: overlaySize, height: overlaySize }}
                  resizeMode="contain"
                  recyclingKey={`food-overlay-${anchId}-${nextFoodType}`}
                />
              ) : (
                <Text style={{ fontSize: overlaySize * 0.8 }}>{foodDef.emoji ?? '🍽'}</Text>
              )}
            </View>
          );
          list.push({ depth: overlayDepth, element: overlayEl });
        }
      }
    }

    list.sort((a, b) => a.depth - b.depth);
    return list;
  }, [
    activeGrid,
    foodDishQueues,
    selectedAnchorId,
    movingItemId,
    itemDefs,
    editMode,
    handleDragMoveEnd,
    storeItemByAnchorId,
    buildPaletteLayout,
    pendingDropTarget,
    activeHighlight,
    quests,
    farmLevel,
    user?.pet?.level,
  ]);

  const handToolDef = equipped?.handTool ? itemDefs[equipped.handTool] : null;
  const chairDef = equipped?.chair ? itemDefs[equipped.chair] : null;
  const petElement = useMemo(() => (
    <PetSprite
      key="pet"
      petX={petX}
      petY={petY}
      facingRight={facingRight}
      bounceOffset={bounceOffset}
      behaviorOffset={behaviorOffset}
      toolRotationDeg={toolRotationDeg}
      jumpOffset={jumpOffset}
      imageUrl={petImageUrl}
      bubbleVisible={bubbleVisible}
      bubbleMood={bubbleMood}
      showHeart={showHeart}
      onHeartDone={() => setShowHeart(false)}
      equippedHandToolImageUrl={handToolDef?.imageUrl}
      equippedHandToolEmoji={handToolDef?.emoji}
      equippedChairImageUrl={chairDef?.imageUrl}
      equippedChairEmoji={chairDef?.emoji}
    />
  ), [petX, petY, facingRight, bounceOffset, behaviorOffset, toolRotationDeg, jumpOffset, petImageUrl, bubbleVisible, bubbleMood, showHeart, handToolDef?.imageUrl, handToolDef?.emoji, chairDef?.imageUrl, chairDef?.emoji]);

  /** Interleave pet sprite into sorted items at the correct depth. */
  const sortedRenderables = useMemo(() => {
    const result: React.ReactElement[] = [];
    let petInserted = false;
    for (const { depth, element } of sortedItems) {
      if (!petInserted && depth > effectivePetRow) {
        result.push(petElement);
        petInserted = true;
      }
      result.push(element);
    }
    if (!petInserted) result.push(petElement);
    return result;
  }, [sortedItems, petElement, effectivePetRow]);

  const itemLightSources = useMemo(() => {
    const sources: {
      key: string; x: number; y: number; radius: number; color: string; intensity: number;
      imageUrl?: string; itemWidth: number; itemHeight: number;
    }[] = [];
    for (const item of getAllPlacedItems(activeGrid)) {
      if (item.anchorId) continue;
      const def = itemDefs[item.itemType];
      if (!def?.lightRadius || def.lightRadius <= 0) continue;
      const cols = def.cols ?? item.tileCols;
      const rows = def.rows ?? item.tileRows;
      const cx = (item.col + cols / 2) * TILE_SIZE;
      const cy = (item.row + rows / 2) * TILE_SIZE;
      sources.push({
        key: item.id,
        x: cx,
        y: cy,
        radius: def.lightRadius,
        color: def.lightColor ?? '#FFDD88',
        intensity: def.lightIntensity ?? 0.5,
        imageUrl: def.imageUrl,
        itemWidth: cols * TILE_SIZE,
        itemHeight: rows * TILE_SIZE,
      });
    }
    return sources;
  }, [activeGrid, itemDefs]);

  const handleBackToFarm = useCallback(() => switchScene('farm'), [switchScene]);
  const handleGoFishing = useCallback(() => switchScene('fishing_1'), [switchScene]);
  const handleSelectItem = useCallback(
    (t: string | null) => selectInventoryItem(t),
    [selectInventoryItem],
  );
  const handleBuildPaletteLayout = useCallback((layout: DropZoneLayout | null) => {
    setBuildPaletteLayout(layout);
  }, []);

  const gridDims: GridDimensions = useMemo(
    () => ({ cols: activeGrid.cols, rows: activeGrid.rows, worldCols, worldRows }),
    [activeGrid.cols, activeGrid.rows, worldCols, worldRows],
  );

  const activeSeedDef = useMemo(() => {
    const selDef = selectedItemType ? itemDefs[selectedItemType] : null;
    if (selDef?.category === 'seed' && editMode) return selDef;
    if (paletteDragPreview?.def?.category === 'seed') return paletteDragPreview.def;
    return null;
  }, [selectedItemType, itemDefs, editMode, paletteDragPreview]);

  const plantableTiles = useMemo(() => {
    if (!activeSeedDef) return [];
    return getPlantableTiles(activeGrid, itemDefs, activeSeedDef.cols, activeSeedDef.rows);
  }, [activeSeedDef, activeGrid, itemDefs]);

  const soilInvalidTileKeys = useMemo(() => {
    const preview = paletteDropPreview ?? dragPreview;
    const isSoilPalette = paletteDragPreview?.def?.category === 'soil';
    const isSoilDrag = dragPreview?.itemType && itemDefs[dragPreview.itemType]?.category === 'soil';
    if (!preview || (!isSoilPalette && !isSoilDrag)) return new Set<string>();
    const excludeAnchorId = dragPreview?.anchorId;
    return getSoilInvalidTileKeys(
      activeGrid,
      itemDefs,
      preview.col,
      preview.row,
      preview.tileCols,
      preview.tileRows,
      excludeAnchorId,
    );
  }, [paletteDropPreview, paletteDragPreview?.def?.category, dragPreview, activeGrid, itemDefs]);

  const handlePaletteDragStart = useCallback((itemType: string, def: import('./types').ItemDefinition) => {
    isPaletteDragging.value = 1;
    setPaletteDragPreview({ itemType, def, x: 0, y: 0 });
    setPaletteDropPreview(null);
  }, [isPaletteDragging]);
  const handlePaletteDragUpdate = useCallback(
    (x: number, y: number, def: import('./types').ItemDefinition) => {
      setPaletteDragPreview((prev) => (prev ? { ...prev, x, y } : null));
      const coord = screenToGrid(x, y, cameraSnap, gridDims);
      if (coord) {
        // Offset the preview tile to match the centered drag (tap is at center)
        const dropCol = Math.max(0, Math.min(activeGrid.cols - def.cols, coord.col - Math.floor(def.cols / 2)));
        const dropRow = Math.max(0, Math.min(activeGrid.rows - def.rows, coord.row - Math.floor(def.rows / 2)));
        setPaletteDropPreview({
          col: dropCol,
          row: dropRow,
          tileCols: def.cols,
          tileRows: def.rows,
        });
      } else {
        setPaletteDropPreview(null);
      }
    },
    [cameraSnap, gridDims, activeGrid.cols, activeGrid.rows],
  );
  const handlePaletteDragEnd = useCallback(
    (itemType: string, screenX: number, screenY: number) => {
      isPaletteDragging.value = 0;
      const def = itemDefs[itemType];
      setPaletteDragPreview(null);
      setPaletteDropPreview(null);
      if (screenY > hudCutoff) return;
      const coord = screenToGrid(screenX, screenY, cameraSnap, gridDims);
      if (coord && def) {
        // Offset the placement to match the centered drag
        const dropCol = Math.max(0, Math.min(activeGrid.cols - def.cols, coord.col - Math.floor(def.cols / 2)));
        const dropRow = Math.max(0, Math.min(activeGrid.rows - def.rows, coord.row - Math.floor(def.rows / 2)));
        placeItemAt(itemType, dropCol, dropRow);
      }
    },
    [cameraSnap, gridDims, placeItemAt, isPaletteDragging, hudCutoff, itemDefs, activeGrid.cols, activeGrid.rows],
  );

  const handleOpenShop = useCallback(() => {
    setShopOpen(true);
    shopRef.current?.open();
  }, [setShopOpen]);
  const handleOpenFarmInfo = useCallback(() => farmInfoRef.current?.open(), []);

  const rootBg = isMP ? '#5A9E5A' : bgColor;

  /** Per-step speaker override: use step.speaker if set, else dialog-level (currentDialogSpeaker ? npc : pet). */
  const currentStepSpeaker =
    (currentQuestDialog?.[questDialogIndex]?.speaker ?? (currentDialogSpeaker ? 'npc' : 'pet')) as 'pet' | 'npc';
  const questOverlaySpeakerName = currentStepSpeaker === 'npc' && currentDialogSpeaker ? currentDialogSpeaker.name : undefined;
  const questOverlaySpeakerImageUrl = currentStepSpeaker === 'npc' && currentDialogSpeaker ? currentDialogSpeaker.imageUrl : undefined;

  return (
    <View style={[styles.root, { backgroundColor: rootBg }]}>
      {isMP ? (
        <>
          <MultiplayerProvider sceneSlug={activeScene}>
            <MultiplayerScene sceneSlug={activeScene} />
            <MPBottomBar onBackToFarm={handleBackToFarm} onOpenEquip={() => equipRef.current?.open()} />
          </MultiplayerProvider>
          <MPTopBar
            sceneName={mpSceneName ?? activeScene}
            farmLevel={farmLevel}
            gems={gems}
          />
          <PetDialog
            message={petDialog}
            petName={petName}
            petImageUrl={petImageUrl}
            onDismiss={dismissPetDialog}
          />
          <QuestDialogOverlay
            steps={currentQuestDialog}
            stepIndex={questDialogIndex}
            blocking={currentDialogBlocking}
            petName={petName}
            petImageUrl={petImageUrl}
            playerName={user?.pet?.customName || user?.pet?.name || farm.name || 'Player'}
            speakerName={questOverlaySpeakerName}
            speakerImageUrl={questOverlaySpeakerImageUrl}
            rewards={currentDialogRewards}
            itemDefs={itemDefs}
            onAdvance={advanceQuestDialog}
          />
        </>
      ) : (
        <>
          <GestureDetector gesture={gesture}>
            <View style={styles.gestureArea} collapsable={false}>
              <Animated.View
                style={[styles.world, worldSize, { backgroundColor: worldBgColor }, worldStyle]}
              >
                {/* Baked scenery — single image for all users, falls back to procedural on 404 */}
                {isFarm && (
                  <BakedSceneryLayer
                    farmCols={activeGrid.cols}
                    farmRows={activeGrid.rows}
                    worldCols={worldCols}
                    worldRows={worldRows}
                    itemDefs={itemDefs}
                    onReady={handleSceneryReady}
                    imageUrl={sceneryUrl}
                    snapshotLoaded={snapshotReady}
                  />
                )}

                {/* Farm content container — offset by padding so farm items stay in (0,0)-based coords. overflow: visible so buildings can extend and overlay scenery. */}
                <View style={{ position: 'absolute', left: farmOffset, top: farmOffset, overflow: 'visible' }}>
                  {editMode && (
                    <GridLines cols={activeGrid.cols} rows={activeGrid.rows} color={gridLineColor} />
                  )}
                  {(dragPreview || paletteDropPreview) && (
                    <View
                      style={[
                        styles.dropPreview,
                        {
                          left: (dragPreview ?? paletteDropPreview)!.col * TILE_SIZE,
                          top: (dragPreview ?? paletteDropPreview)!.row * TILE_SIZE,
                          width: (dragPreview ?? paletteDropPreview)!.tileCols * TILE_SIZE,
                          height: (dragPreview ?? paletteDropPreview)!.tileRows * TILE_SIZE,
                        },
                      ]}
                      pointerEvents="none"
                    />
                  )}
                  {plantableTiles.length > 0 && activeSeedDef && plantableTiles.map((t) => (
                    <View
                      key={`plant_${t.col}_${t.row}`}
                      style={[
                        styles.plantableHighlight,
                        {
                          left: t.col * TILE_SIZE,
                          top: t.row * TILE_SIZE,
                          width: activeSeedDef.cols * TILE_SIZE,
                          height: activeSeedDef.rows * TILE_SIZE,
                        },
                      ]}
                      pointerEvents="none"
                    />
                  ))}
                  {Array.from(soilInvalidTileKeys).map((key) => {
                    const [c, r] = key.split(':').map(Number);
                    return (
                      <View
                        key={`invalid_${key}`}
                        style={[
                          styles.invalidSoilHighlight,
                          {
                            left: c * TILE_SIZE,
                            top: r * TILE_SIZE,
                            width: TILE_SIZE,
                            height: TILE_SIZE,
                          },
                        ]}
                        pointerEvents="none"
                      />
                    );
                  })}
                  {sortedRenderables}

                  {activeBugs.map((bug) => {
                    const bugDef = itemDefs[bug.itemType];
                    return (
                      <BugInstance
                        key={bug.spawnId}
                        bug={bug}
                        cols={activeGrid.cols}
                        rows={activeGrid.rows}
                        imageUrl={bugDef?.imageUrl}
                        onPositionChange={handleBugPositionChange}
                        lightRadius={bugDef?.lightRadius}
                        lightColor={bugDef?.lightColor}
                        lightIntensity={bugDef?.lightIntensity}
                        darkness={darkness}
                        activeGrid={activeGrid}
                        itemDefs={itemDefs}
                      />
                    );
                  })}

                  {activeBalloons.map((balloon) => {
                    const balloonDef = itemDefs[balloon.itemType];
                    return (
                      <BalloonInstance
                        key={balloon.spawnId}
                        balloon={balloon}
                        imageUrl={balloonDef?.imageUrl}
                      />
                    );
                  })}

                  {itemLightSources.map((src) => (
                    <LightGlow
                      key={`light-${src.key}`}
                      x={src.x}
                      y={src.y}
                      radius={src.radius}
                      color={src.color}
                      intensity={src.intensity}
                      darkness={darkness}
                      imageUrl={src.imageUrl}
                      itemWidth={src.itemWidth}
                      itemHeight={src.itemHeight}
                    />
                  ))}

                  {selectedItemData && editMode && !movingItemId && !selectedItemType && !selectedItemData.growthMs && !(itemDefs[selectedItemData.itemType]?.category === 'soil' && soilWithCropsIds.has(selectedItemData.id)) && (
                    <ItemActionBar
                      col={selectedItemData.col}
                      row={selectedItemData.row}
                      tileCols={selectedItemData.tileCols}
                      itemType={selectedItemData.itemType}
                      immovable={selectedItemData.itemType === 'fossil_hole' || itemDefs[selectedItemData.itemType]?.subCategory === 'dig_hole'}
                      onMove={startMoveItem}
                      onStore={storeSelectedItem}
                      onDestroy={destroySelectedItem}
                    />
                  )}

                  {harvestEffects.map((fx) => (
                    <HarvestEffectView key={fx.id} effect={fx} itemDefs={itemDefs} />
                  ))}
                </View>
              </Animated.View>

              {/* Day/night tint — darkens the world based on local time + season */}
              <DayNightOverlay />
            </View>
          </GestureDetector>

          {paletteDragPreview && (
            <View
              style={[
                styles.paletteDragPreview,
                {
                  width: paletteDragPreview.def.cols * TILE_SIZE * cameraSnap.scale,
                  height: paletteDragPreview.def.rows * TILE_SIZE * cameraSnap.scale,
                  left: paletteDragPreview.x - (paletteDragPreview.def.cols * TILE_SIZE * cameraSnap.scale) / 2,
                  top: paletteDragPreview.y - (paletteDragPreview.def.rows * TILE_SIZE * cameraSnap.scale) / 2,
                },
              ]}
              pointerEvents="none"
            >
              {paletteDragPreview.def.imageUrl ? (
                <CachedImage
                  source={{ uri: paletteDragPreview.def.imageUrl }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              ) : (
                <Text style={[styles.paletteDragPreviewEmoji, { fontSize: 28 * cameraSnap.scale }]}>
                  {paletteDragPreview.def.emoji}
                </Text>
              )}
            </View>
          )}

          <GameHUD
            activeScene={activeScene}
            farmName={farm.name}
            editMode={editMode}
            toolMode={toolMode}
            placeableSlots={placeableSlots}
            displaySlots={displaySlots}
            selectedItemType={selectedItemType}
            activeCategory={activeCategory}
            farmLevel={farmLevel}
            gems={gems}
            canUpgrade={canUpgrade}
            itemDefs={itemDefs}
            movingItemId={movingItemId}
            activeHighlight={activeHighlight}
            harvestEffects={harvestEffects}
            onDismissHarvestEffect={dismissHarvestEffect}
            onBackToFarm={handleBackToFarm}
            onSelectItem={handleSelectItem}
            onOpenShop={handleOpenShop}
            onOpenFarmInfo={handleOpenFarmInfo}
            onSetCategory={setCategory}
            onCancelMove={cancelMove}
            onSetToolMode={setToolMode}
            onOpenBestiary={() => bestiaryRef.current?.open()}
            onOpenEquip={() => equipRef.current?.open()}
            onGoFishing={handleGoFishing}
            onBuildPaletteLayout={handleBuildPaletteLayout}
            onPaletteDragStart={handlePaletteDragStart}
            onPaletteDragUpdate={handlePaletteDragUpdate}
            onPaletteDragEnd={handlePaletteDragEnd}
            onRefreshGame={refreshGame}
          />

          <PetDialog
            message={petDialog}
            petName={petName}
            petImageUrl={petImageUrl}
            onDismiss={dismissPetDialog}
          />

          <QuestDialogOverlay
            steps={currentQuestDialog}
            stepIndex={questDialogIndex}
            blocking={currentDialogBlocking}
            petName={petName}
            petImageUrl={petImageUrl}
            playerName={user?.pet?.customName || user?.pet?.name || farm.name || 'Player'}
            speakerName={questOverlaySpeakerName}
            speakerImageUrl={questOverlaySpeakerImageUrl}
            rewards={currentDialogRewards}
            itemDefs={itemDefs}
            onAdvance={advanceQuestDialog}
          />

          <Shop
            ref={shopRef}
            gems={gems}
            itemDefs={itemDefs}
            inventory={inventory}
            onPurchase={purchaseItem}
            activeHighlight={activeHighlight}
            onOpenChange={setShopOpen}
            onCategorySelect={onShopCategorySelect}
          />

          <FarmInfoDrawer
            ref={farmInfoRef}
            farm={farm}
            farmLevel={farmLevel}
            farmLevels={farmLevels}
            quests={quests}
            canUpgrade={canUpgrade}
            itemDefs={itemDefs}
            equipped={equipped}
            onRename={setFarmName}
            onCompleteQuest={completeQuest}
          />

          <BestiaryDrawer ref={bestiaryRef} itemDefs={itemDefs} />

          {/* Bug catch result modal */}
          {lastCatchResult && (
            <BugCatchModal
              result={lastCatchResult}
              imageUrl={itemDefs[lastCatchResult.itemType]?.imageUrl}
              onDismiss={dismissCatchResult}
            />
          )}

          {/* Balloon pop result modal */}
          {lastBalloonPopResult && (
            <BalloonPopModal
              result={lastBalloonPopResult}
              imageUrl={itemDefs[lastBalloonPopResult.itemType]?.imageUrl}
              onDismiss={dismissBalloonPopResult}
            />
          )}
          {lastFossilDigResult && (
            <FossilDigModal
              result={lastFossilDigResult}
              imageUrl={itemDefs[lastFossilDigResult.itemType]?.imageUrl}
              onDismiss={dismissFossilDigResult}
            />
          )}

          {/* Loading overlay — theme-aware, circle reveal when ready */}
          {loadOverlayVisible && (
            <View style={styles.loadOverlay} pointerEvents="auto">
              {loadOverlayRevealing ? (
                <CircleRevealOverlay
                  variant="reveal"
                  backgroundColor={theme.colors.background}
                  onComplete={handleLoadOverlayComplete}
                />
              ) : (
                <View style={[styles.loadOverlayBg, { backgroundColor: theme.colors.background }]}>
                  <View style={styles.loadContent}>
                    <Text style={styles.loadEmoji}>🌿</Text>
                    <Text style={[styles.loadTitle, { color: theme.colors.text }]}>Growing your world…</Text>
                    <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 12 }} />
                  </View>
                </View>
              )}
            </View>
          )}
        </>
      )}

      <Shop
        ref={shopRef}
        gems={gems}
        itemDefs={itemDefs}
        inventory={inventory}
        onPurchase={purchaseItem}
        activeHighlight={activeHighlight}
        onOpenChange={setShopOpen}
        onCategorySelect={onShopCategorySelect}
      />

      <CookingDrawer
        ref={cookingRef}
        itemDefs={itemDefs}
        inventory={inventory}
        onCook={emitCook}
        cookResult={cookResult}
        onResultDismiss={clearCookResult}
        activeHighlight={activeHighlight}
        onOpenChange={setCookingOpen}
        tryAutoAdvanceDialog={tryAutoAdvanceDialog}
      />

      <MailBoxDrawer
        ref={mailBoxRef}
        itemDefs={itemDefs}
        inventory={inventory}
        onRefreshGame={refreshGame}
      />

      <SellBoxDrawer
        ref={sellBoxRef}
        itemDefs={itemDefs}
        inventory={inventory}
        onSellBatch={sellItemsBatch}
        onSellError={showPetDialog}
        activeHighlight={activeHighlight}
        onOpenChange={setSellBoxOpen}
        tryAutoAdvanceDialog={tryAutoAdvanceDialog}
      />

      <FoodDishDrawer
        ref={foodDishRef}
        itemDefs={itemDefs}
        inventory={inventory}
        foodDishQueues={foodDishQueues}
        onAddToDish={addToFoodDish}
        onError={showPetDialog}
        activeHighlight={activeHighlight}
        onOpenChange={setFoodDishOpen}
        tryAutoAdvanceDialog={tryAutoAdvanceDialog}
      />

      <CraftingDrawer
        ref={craftingRef}
        itemDefs={itemDefs}
        inventory={inventory}
        onCraft={emitCraft}
        craftResult={craftResult}
        onResultDismiss={clearCraftResult}
      />

      <WellDrawer
        ref={wellRef}
        onCollect={emitCollectWater}
        result={collectWaterResult}
        onResultDismiss={clearCollectWaterResult}
      />

      <FishingShopDrawer
        ref={fishingShopRef}
        gems={gems}
        itemDefs={itemDefs}
        inventory={inventory}
        onPurchase={purchaseItem}
      />

      <EquipDrawer
        ref={equipRef}
        equipped={equipped}
        inventory={inventory}
        itemDefs={itemDefs}
        onEquip={equipItem}
        activeHighlight={activeHighlight}
        onOpenChange={setEquipOpen}
        tryAutoAdvanceDialog={tryAutoAdvanceDialog}
      />

      <CropInfoDrawer
        ref={cropInfoRef}
        crop={cropInfoTarget}
        itemDefs={itemDefs}
        onHarvest={(col, row) => { selectTile(col, row); }}
        onDismiss={() => setCropInfoTarget(null)}
      />

      {pendingInteraction && pendingInteraction.type === 'open_modal' && pendingInteraction.payload && (
        <InteractionModal
          payload={pendingInteraction.payload}
          onClose={clearInteraction}
        />
      )}

      <SceneTransition
        isTransitioning={isTransitioning}
        targetScene={targetScene ?? activeScene}
        onConcealComplete={applySceneChange}
        onComplete={completeTransition}
      />
    </View>
  );
}

// ─── Interaction Modal ──────────────────────────────────────────────────────

function InteractionModal({ payload, onClose }: { payload: string; onClose: () => void }) {
  const { theme } = useTheme();
  const title = MODAL_TITLES[payload] ?? payload;
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose}>
        <View style={modalStyles.card}>
          <Text style={modalStyles.title}>{title}</Text>
          <Text style={modalStyles.body}>Coming soon!</Text>
          <Pressable style={[modalStyles.closeBtn, { backgroundColor: theme.colors.primary }]} onPress={onClose}>
            <Text style={modalStyles.closeBtnText}>Close</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const MODAL_TITLES: Record<string, string> = {
  cooking: 'Cooking Pot',
  house: 'House',
};

// ─── Multiplayer Top Bar ────────────────────────────────────────────────────

function MPTopBar({ sceneName, farmLevel, gems }: { sceneName: string; farmLevel: number; gems: number }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const colors = theme.colors;

  return (
    <View style={[mpTopStyles.root, { top: insets.top + 8 }]} pointerEvents="box-none">
      <View style={[mpTopStyles.pill, { backgroundColor: colors.surface }]}>
        <Text style={[mpTopStyles.pillText, { color: colors.text }]}>{sceneName}</Text>
        <View style={[mpTopStyles.sep, { backgroundColor: colors.border }]} />
        <GemIcon size={14} />
        <Text style={[mpTopStyles.gemCount, { color: colors.gemColor ?? colors.accent }]}>{gems.toLocaleString()}</Text>
        <View style={[mpTopStyles.lvlBadge, { backgroundColor: colors.primary }]}>
          <Text style={[mpTopStyles.lvlText, { color: colors.onPrimary ?? '#fff' }]}>Lv.{farmLevel}</Text>
        </View>
      </View>
    </View>
  );
}

const mpTopStyles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  pillText: { fontSize: 13, fontWeight: '700' },
  sep: { width: 1, height: 14, marginHorizontal: 2 },
  gemEmoji: { fontSize: 14 },
  gemCount: { fontSize: 13, fontWeight: '700' },
  lvlBadge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lvlText: { fontSize: 10, fontWeight: '800' },
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  gestureArea: { flex: 1 },
  world: { position: 'absolute', transformOrigin: 'left top' },
  plantableHighlight: {
    position: 'absolute',
    backgroundColor: 'rgba(76,175,80,0.35)',
    borderWidth: 2,
    borderColor: 'rgba(56,142,60,0.75)',
    borderRadius: 4,
    zIndex: 1,
  },
  invalidSoilHighlight: {
    position: 'absolute',
    backgroundColor: 'rgba(244,67,54,0.5)',
    borderWidth: 2,
    borderColor: 'rgba(244,67,54,0.8)',
    borderRadius: 4,
    zIndex: 2,
  },
  dropPreview: {
    position: 'absolute',
    backgroundColor: 'rgba(255,215,0,0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255,193,7,0.8)',
    borderRadius: 6,
    zIndex: 50,
  },
  paletteDragPreview: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 500,
    backgroundColor: 'transparent',
  },
  paletteDragPreviewEmoji: { fontWeight: 'bold' },
  loadOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadOverlayBg: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadContent: {
    alignItems: 'center',
  },
  loadEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  loadTitle: {
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

// ─── Bug Catch Modal ────────────────────────────────────────────────────────

const RARITY_TIERS: { label: string; stars: number; color: string }[] = [
  { label: 'Tiny', stars: 1, color: '#90CAF9' },
  { label: 'Small', stars: 2, color: '#67E8F9' },
  { label: 'Average', stars: 3, color: '#A5D6A7' },
  { label: 'Large', stars: 4, color: '#FFD54F' },
  { label: 'Huge', stars: 5, color: '#FF8A65' },
];

function getRarity(sizeLabel: string) {
  return RARITY_TIERS.find((t) => t.label === sizeLabel) ?? RARITY_TIERS[2];
}

function StarRow({ filled, total, color, dimColor }: { filled: number; total: number; color: string; dimColor: string }) {
  const stars = [];
  for (let i = 0; i < total; i++) {
    stars.push(
      <Text key={i} style={{ fontSize: 16, color: i < filled ? color : dimColor, marginHorizontal: 0.5 }}>★</Text>,
    );
  }
  return <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>{stars}</View>;
}

function BugCatchModal({
  result,
  imageUrl,
  onDismiss,
}: {
  result: BugCatchResult;
  imageUrl?: string | null;
  onDismiss: () => void;
}) {
  const { themeMode } = useTheme();
  const dark = themeMode === 'dark';
  const rarity = getRarity(result.sizeLabel);
  return (
    <ItemRewardModal
      title="Caught!"
      label={result.label}
      imageUrl={imageUrl}
      emoji="🐛"
      accentColor={rarity.color}
      extraContent={
        <>
          <StarRow filled={rarity.stars} total={5} color={rarity.color} dimColor={dark ? '#48484A' : '#E0E0E0'} />
          <View style={[cmStyles.sizePill, { backgroundColor: rarity.color }]}>
            <Text style={cmStyles.sizePillText}>{result.sizeLabel} · {result.size.toFixed(2)}x</Text>
          </View>
        </>
      }
      onDismiss={onDismiss}
    />
  );
}

// ─── Balloon Pop Modal ───────────────────────────────────────────────────────

function BalloonPopModal({
  result,
  imageUrl,
  onDismiss,
}: {
  result: BalloonPopResult;
  imageUrl?: string | null;
  onDismiss: () => void;
}) {
  const isGemsOnly = result.itemType === 'gems';
  return (
    <ItemRewardModal
      title="Popped!"
      label={isGemsOnly ? `+${result.gemsAwarded ?? 0} Gems` : `You got ${result.label}!`}
      imageUrl={isGemsOnly ? undefined : imageUrl}
      emoji="🎈"
      qty={isGemsOnly ? undefined : result.qty}
      gemsAwarded={result.gemsAwarded}
      accentColor="#A855F7"
      onDismiss={onDismiss}
    />
  );
}

// ─── Fossil Dig Modal ───────────────────────────────────────────────────────

function FossilDigModal({
  result,
  imageUrl,
  onDismiss,
}: {
  result: FossilDigResult;
  imageUrl?: string | null;
  onDismiss: () => void;
}) {
  return (
    <ItemRewardModal
      title="Dug up!"
      label={`You got ${result.label}!`}
      imageUrl={imageUrl}
      emoji="🦴"
      qty={result.qty}
      accentColor="#D97706"
      onDismiss={onDismiss}
    />
  );
}

const cmStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 22,
    padding: 18,
    width: '88%',
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  imageWrap: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bugImage: {
    width: 56,
    height: 56,
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
  caughtLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  bugName: {
    fontSize: 20,
    fontWeight: '800',
  },
  sizePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  sizePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  gemBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  gemAmount: {
    fontSize: 20,
    fontWeight: '900',
  },
  gemLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  dismissBtn: {
    marginTop: 14,
    alignSelf: 'stretch',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  dismissBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '80%',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  body: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  closeBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
