import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedReaction, useAnimatedStyle } from 'react-native-reanimated';
import { BakedSceneryLayer } from './BakedSceneryLayer';
import { BalloonInstance, PetSprite, usePetAI, usePetBubble } from './creature';
import { getPoseForContext, useNeutralPoseCycle } from './creature/pet';
import { DayNightOverlay, useDarkness } from './DayNightOverlay';
import { WeatherOverlay } from './WeatherOverlay';
import { GameHUD } from './GameHUD';
import { useGame } from './GameProvider';
import { GridLines } from './GridLines';
import { HarvestEffectView } from './HarvestEffectView';
import { ItemActionBar } from './ItemActionBar';
import { LightGlow } from './LightGlow';
import { QuestCelebration } from './QuestCelebration';
import { QuestDialogOverlay } from './QuestDialogOverlay';
import { PetPoseWarmup } from './PetPoseWarmup';
import { SceneLoadingScreen } from './SceneLoadingScreen';
import { SceneTransition } from './SceneTransition';
import { useCamera } from './useCamera';

import { CircleRevealOverlay } from '@/components/transitions';
import { api } from '@/lib/api';
import { useAuth } from '@/store/AuthProvider';
import { useTheme } from '@/store/ThemeProvider';
import { FARM_GRASS_COLOR, HOUSE_FLOOR_COLOR, TILE_SIZE, WORLD_PADDING } from './constants';
import { getAllPlacedItems, getItemAt, getPlantableTiles, resolvePlacement } from './gridHelpers';
import { MPBottomBar, MultiplayerProvider, MultiplayerScene, TradeProvider } from './multiplayer';
import type { GridDimensions } from './screenToGrid';
import { GameDrawers, type GameDrawersHandle } from './world/GameDrawers';
import { MPTopBar } from './world/MPTopBar';
import { PaletteDragPreview } from './world/PaletteDragPreview';
import { BalloonPopModal, BugCatchModal, FossilDigModal } from './world/RewardModals';
import { useBugPositions } from './world/useBugPositions';
import { usePaletteDrag } from './world/usePaletteDrag';
import { useSceneReadiness } from './world/useSceneReadiness';
import { useTileTap } from './world/useTileTap';
import type { DragPreview, DropZoneLayout } from './world/WorldItem';
import { WorldItemsLayer } from './world/WorldItemsLayer';
import { invokeTileTap } from './tileTapRegistry';
import { isMultiplayerScene, type PlacedItem } from './types';


export function WorldRenderer() {
  const {
    // ── Scene / world ──
    activeScene, targetScene, activeGrid, isTransitioning, loading,
    sceneryUrl, sceneWorldCols, sceneWorldRows, scenePlacements,
    switchScene, applySceneChange, completeTransition, refreshGame,
    // ── Build & edit ──
    editMode, activeCategory, toolMode, selectedTile, selectedItemType, movingItemId,
    placeableSlots, displaySlots, inventory, pendingDropTarget, itemDefs,
    selectInventoryItem, setCategory, setToolMode, emitLearnRecipe,
    startMoveItem, cancelMove, storeSelectedItem, storeItemByAnchorId, destroySelectedItem,
    moveItem, placeItemAt, setPendingDropTarget,
    // ── Farm & player ──
    farm, farmLevel, gems, equipped, canUpgrade, foodDishQueues, backpackSlots,
    harvestEffects, dismissHarvestEffect,
    // ── Creatures & pet ──
    activeBugs, activeBalloons,
    petState, petBehaviorSync, clearPetBehaviorSync, decorationReactionRef,
    emitFeedPet, emitConsumeFromFoodDish, emitPetBehavior, emitPetActionComplete,
    // ── Results ──
    lastCatchResult, dismissCatchResult,
    lastBalloonPopResult, dismissBalloonPopResult,
    lastFossilDigResult, dismissFossilDigResult,
    shakingTreeAnchorId, shakeTrigger,
    // ── Quests & dialog ──
    quests, farmLevels, activeHighlight, currentDialog, questDialogIndex, advanceQuestDialog,
    questCompletions, dismissQuestCompletions, tryAutoAdvanceDialog,
  } = useGame();

  const { user } = useAuth();
  const darkness = useDarkness();
  const petName = user?.pet?.customName || user?.pet?.name || 'Buddy';
  const drawersRef = useRef<GameDrawersHandle>(null);
  const [buildPaletteLayout, setBuildPaletteLayout] = useState<DropZoneLayout | null>(null);
  const { theme } = useTheme();

  const bugs = useBugPositions(activeBugs);
  const snapshotReady = !loading && Object.keys(itemDefs).length > 0;
  const scene = useSceneReadiness(activeScene, snapshotReady);

  const isFarm = activeScene === 'farm';
  const isMP = isMultiplayerScene(activeScene);

  // Do not remount BakedSceneryLayer on farm re-entry: bumping a key after the
  // first onLoad can tear the image down mid-wipe-reveal and flash grass green.
  // Fresh mounts (leaving MP/house) already re-fire onLoad on their own.
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

  /** Pet depth for z-order; updates when crossing grid cells during movement. */
  const [effectivePetRow, setEffectivePetRow] = useState(position.row);
  /** Live visual tile for tap hit-tests (tracks the sprite, not walk-start pos). */
  const petVisualPosRef = useRef({ col: position.col, row: position.row });

  const syncPetVisualPos = useCallback((col: number, row: number) => {
    petVisualPosRef.current = { col, row };
    setEffectivePetRow(row);
  }, []);

  /** Sync when logical position jumps (walk complete, scene change). */
  useEffect(() => {
    syncPetVisualPos(position.col, position.row);
  }, [position.row, position.col, syncPetVisualPos]);

  /** Track animated sprite tile for z-order + petting hit-tests during walks. */
  useAnimatedReaction(
    () => ({
      col: Math.floor(petX.value / TILE_SIZE),
      row: Math.floor(petY.value / TILE_SIZE),
    }),
    (curr, prev) => {
      if (prev && curr.col === prev.col && curr.row === prev.row) return;
      runOnJS(syncPetVisualPos)(curr.col, curr.row);
    },
  );

  const screenH = Dimensions.get('window').height;
  const hudCutoff = editMode
    ? (buildPaletteLayout ? buildPaletteLayout.y : screenH * 0.75)
    : 0;

  const handlePetted = useCallback(() => {
    triggerJump();
    setShowHeart(true);
  }, [triggerJump]);

  const handleShowCropInfo = useCallback(
    (crop: PlacedItem) => drawersRef.current?.showCropInfo(crop),
    [],
  );

  useTileTap({
    isFarm,
    petPositionRef: petVisualPosRef,
    bugPositionsRef: bugs.ref,
    onPetted: handlePetted,
    onShowCropInfo: handleShowCropInfo,
  });

  const { camera, gesture } = useCamera({
    cols: activeGrid.cols,
    rows: activeGrid.rows,
    worldCols,
    worldRows,
    onTileTap: invokeTileTap,
    tapDeadZoneY: hudCutoff,
    initialFocusRow: isFarm ? 7 : undefined,
  });

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

  // Per axis: the vertical offset comes from the rows, not the columns. Using
  // the column difference for both put the farm above where every hit-test
  // expected it, so taps landed on a tile up and to the left of the target.
  const farmOffsetX = ((worldCols - activeGrid.cols) / 2) * TILE_SIZE;
  const farmOffsetY = ((worldRows - activeGrid.rows) / 2) * TILE_SIZE;

  const liveScenePlacements = useMemo(
    () => (isFarm ? scenePlacements?.filter((p) => p.live) : undefined),
    [isFarm, scenePlacements],
  );

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

  /** Set while an already-placed item is being dragged to a new tile. */
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);

  const handleDragMoveEnd = useCallback(
    (anchorId: string, col: number, row: number): boolean => {
      const accepted = moveItem(anchorId, col, row);
      if (accepted) {
        setPendingDropTarget({ anchorId, newCol: col, newRow: row });
      }
      return accepted;
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

  const treeShake = useMemo(
    () => ({ anchorId: shakingTreeAnchorId ?? null, trigger: shakeTrigger ?? 0 }),
    [shakingTreeAnchorId, shakeTrigger],
  );

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
      equippedHandToolOverlay={handToolDef?.equipOverlay}
      equippedChairImageUrl={chairDef?.imageUrl}
      equippedChairEmoji={chairDef?.emoji}
      equippedChairOverlay={chairDef?.equipOverlay}
    />
  ), [petX, petY, facingRight, bounceOffset, behaviorOffset, toolRotationDeg, jumpOffset, petImageUrl, bubbleVisible, bubbleMood, showHeart, handToolDef?.imageUrl, handToolDef?.emoji, handToolDef?.equipOverlay, chairDef?.imageUrl, chairDef?.emoji, chairDef?.equipOverlay]);

  const pendingDropAnchorId = pendingDropTarget?.anchorId ?? null;

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
  const handleSelectItem = useCallback(
    (t: string | null) => {
      if (
        t &&
        (itemDefs[t]?.subCategory === 'crafting_recipe' ||
          itemDefs[t]?.subCategory === 'cooking_recipe')
      ) {
        emitLearnRecipe(t);
        tryAutoAdvanceDialog('learn', t);
        return;
      }
      selectInventoryItem(t);
    },
    [itemDefs, emitLearnRecipe, selectInventoryItem, tryAutoAdvanceDialog],
  );
  const handleBuildPaletteLayout = useCallback((layout: DropZoneLayout | null) => {
    setBuildPaletteLayout(layout);
  }, []);

  const gridDims: GridDimensions = useMemo(
    () => ({ cols: activeGrid.cols, rows: activeGrid.rows, worldCols, worldRows }),
    [activeGrid.cols, activeGrid.rows, worldCols, worldRows],
  );

  const palette = usePaletteDrag({ camera, gridDims, grid: activeGrid, hudCutoff });

  const paletteDrag = useMemo(() => ({
    dragX: palette.ghostX,
    dragY: palette.ghostY,
    onDragStart: palette.onDragStart,
    onDragEnd: palette.onDragEnd,
    onDragCancel: palette.onDragCancel,
  }), [palette.ghostX, palette.ghostY, palette.onDragStart, palette.onDragEnd, palette.onDragCancel]);

  const activeSeedDef = useMemo(() => {
    // `inventory` from context is InventorySlot[] (qty > 0 only), not a map.
    const selectedQty = selectedItemType
      ? (inventory.find((s) => s.itemType === selectedItemType)?.qty ?? 0)
      : 0;
    if (selectedItemType && editMode && selectedQty > 0) {
      const selected = itemDefs[selectedItemType];
      if (selected?.category === 'seed') return selected;
    }
    if (palette.dragPreview?.def.category === 'seed') return palette.dragPreview.def;
    return null;
  }, [selectedItemType, itemDefs, editMode, inventory, palette.dragPreview]);

  const plantableTiles = useMemo(() => {
    if (!activeSeedDef) return [];
    return getPlantableTiles(activeGrid, itemDefs, activeSeedDef.cols, activeSeedDef.rows);
  }, [activeSeedDef, activeGrid, itemDefs]);

  /**
   * The footprint currently being aimed at, and whether dropping there works.
   *
   * Moving an existing item is checked here; a palette drag arrives already
   * checked because its target is resolved on the UI thread.
   */
  const dropFootprint = useMemo(() => {
    if (dragPreview) {
      const def = itemDefs[dragPreview.itemType];
      const valid = def
        ? resolvePlacement(activeGrid, itemDefs, def, dragPreview.col, dragPreview.row, dragPreview.anchorId).ok
        : true;
      return { ...dragPreview, valid };
    }
    return palette.dropPreview;
  }, [dragPreview, palette.dropPreview, activeGrid, itemDefs]);

  const handleOpenShop = useCallback(() => drawersRef.current?.openShop(), []);
  const handleOpenFarmInfo = useCallback(() => drawersRef.current?.openFarmInfo(), []);
  const handleOpenBestiary = useCallback(() => drawersRef.current?.openBestiary(), []);
  const handleOpenEquip = useCallback(() => drawersRef.current?.openEquip(), []);
  const handleOpenBackpack = useCallback(() => drawersRef.current?.openBackpack(), []);

  const handleHudAction = useCallback(
    (target: string) => tryAutoAdvanceDialog('hud_action', target),
    [tryAutoAdvanceDialog],
  );

  const rootBg = isMP ? '#5A9E5A' : bgColor;
  const playerName = user?.pet?.customName || user?.pet?.name || farm.name || 'Player';

  const dialogOverlay = (
    <QuestDialogOverlay
      dialog={currentDialog}
      stepIndex={questDialogIndex}
      petName={petName}
      petImageUrl={petImageUrl}
      playerName={playerName}
      itemDefs={itemDefs}
      onAdvance={advanceQuestDialog}
    />
  );

  // Rewards fire as soon as they're granted — Modal sits over dialogs and drawers.
  // Dialogs stay queued until the player dismisses the celebration (see reducer).
  const celebration =
    questCompletions.length > 0 ? (
      <QuestCelebration
        completions={questCompletions}
        itemDefs={itemDefs}
        farmLevels={farmLevels}
        onDone={dismissQuestCompletions}
      />
    ) : null;

  return (
    <View style={[styles.root, { backgroundColor: rootBg }]}>
      <PetPoseWarmup pet={user?.pet} />
      {isMP ? (
        <>
          <MultiplayerProvider sceneSlug={activeScene}>
            <TradeProvider>
              <MultiplayerScene
                key={activeScene}
                sceneSlug={activeScene}
                onAssetsReady={scene.onMPSceneReady}
              />
              <MPBottomBar
                onBackToFarm={handleBackToFarm}
                onOpenEquip={handleOpenEquip}
                onOpenBackpack={handleOpenBackpack}
              />
            </TradeProvider>
          </MultiplayerProvider>
          <MPTopBar
            sceneName={mpSceneName ?? activeScene}
            farmLevel={farmLevel}
            gems={gems}
            isAdmin={user?.role === 'admin' || user?.role === 'superadmin'}
          />
          {dialogOverlay}
          {celebration}
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
                    onReady={scene.onSceneryReady}
                    imageUrl={sceneryUrl}
                    snapshotLoaded={snapshotReady}
                  />
                )}

                {/* Farm content container — offset by padding so farm items stay in (0,0)-based coords. overflow: visible so buildings can extend and overlay scenery. */}
                <View style={{ position: 'absolute', left: farmOffsetX, top: farmOffsetY, overflow: 'visible' }}>
                  {editMode && (
                    <GridLines cols={activeGrid.cols} rows={activeGrid.rows} color={gridLineColor} />
                  )}
                  {dropFootprint && (
                    <View
                      style={[
                        dropFootprint.valid ? styles.dropPreview : styles.dropPreviewInvalid,
                        {
                          left: dropFootprint.col * TILE_SIZE,
                          top: dropFootprint.row * TILE_SIZE,
                          width: dropFootprint.tileCols * TILE_SIZE,
                          height: dropFootprint.tileRows * TILE_SIZE,
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
                  <WorldItemsLayer
                    activeGrid={activeGrid}
                    itemDefs={itemDefs}
                    foodDishQueues={foodDishQueues}
                    selectedAnchorId={selectedAnchorId}
                    movingItemId={movingItemId}
                    editMode={editMode}
                    activeHighlight={activeHighlight}
                    quests={quests}
                    soilWithCropsIds={soilWithCropsIds}
                    pendingDropAnchorId={pendingDropAnchorId}
                    dropZoneLayout={buildPaletteLayout}
                    cameraScale={camera.scale}
                    onMoveEnd={handleDragMoveEnd}
                    onStore={storeItemByAnchorId}
                    onDragPreview={setDragPreview}
                    treeShake={treeShake}
                    petElement={petElement}
                    petRow={effectivePetRow}
                    liveScenePlacements={liveScenePlacements}
                    farmOffsetX={farmOffsetX}
                    farmOffsetY={farmOffsetY}
                    activeBugs={activeBugs}
                    bugPositions={bugs.positions}
                    onBugPositionChange={bugs.onPositionChange}
                    darkness={darkness}
                  />

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

                  {selectedItemData && editMode && !movingItemId && !selectedItemType && !selectedItemData.growthMs && !(itemDefs[selectedItemData.itemType]?.category === 'soil' && soilWithCropsIds.has(selectedItemData.id)) && itemDefs[selectedItemData.itemType]?.category !== 'npc' && (
                    <ItemActionBar
                      col={selectedItemData.col}
                      row={selectedItemData.row}
                      tileCols={selectedItemData.tileCols}
                      itemType={selectedItemData.itemType}
                      immovable={
                        selectedItemData.itemType === 'fossil_hole' ||
                        itemDefs[selectedItemData.itemType]?.subCategory === 'dig_hole' ||
                        selectedItemData.itemType === 'stone' ||
                        selectedItemData.itemType === 'stick' ||
                        itemDefs[selectedItemData.itemType]?.subCategory === 'ground_pickup'
                      }
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
              <WeatherOverlay />
            </View>
          </GestureDetector>

          {palette.dragPreview && (
            <PaletteDragPreview
              preview={palette.dragPreview}
              camera={camera}
              x={palette.ghostX}
              y={palette.ghostY}
              scale={palette.ghostScale}
              opacity={palette.ghostOpacity}
              invalid={palette.dropPreview ? !palette.dropPreview.valid : false}
            />
          )}

          <GameHUD
            activeScene={activeScene}
            farmName={farm.name}
            editMode={editMode}
            toolMode={toolMode}
            placeableSlots={placeableSlots}
            displaySlots={displaySlots}
            inventorySlots={inventory}
            selectedItemType={selectedItemType}
            activeCategory={activeCategory}
            farmLevel={farmLevel}
            gems={gems}
            canUpgrade={canUpgrade}
            itemDefs={itemDefs}
            backpackSlots={backpackSlots}
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
            onOpenBestiary={handleOpenBestiary}
            onOpenEquip={handleOpenEquip}
            onHudAction={handleHudAction}
            onBuildPaletteLayout={handleBuildPaletteLayout}
            paletteDrag={paletteDrag}
            onRefreshGame={refreshGame}
          />

          {dialogOverlay}
          {celebration}

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

          {/* Loading overlay — pet tip screen, then circle reveal when ready */}
          {scene.loadOverlayVisible && (
            <View style={styles.loadOverlay} pointerEvents="auto">
              {scene.worldReady ? (
                <CircleRevealOverlay
                  variant="reveal"
                  backgroundColor={theme.colors.background}
                  onComplete={scene.onLoadOverlayComplete}
                />
              ) : (
                <SceneLoadingScreen pet={user?.pet} />
              )}
            </View>
          )}
        </>
      )}

      <GameDrawers ref={drawersRef} />

      <SceneTransition
        isTransitioning={isTransitioning}
        targetScene={targetScene ?? activeScene}
        onConcealComplete={applySceneChange}
        onComplete={completeTransition}
        waitForSceneAssets={scene.waitForSceneAssets}
      />
    </View>
  );
}

// ─── Palette Drag Preview (with reject animation) ───────────────────────────

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
    borderRadius: 8,
    zIndex: 1,
  },
  dropPreview: {
    position: 'absolute',
    backgroundColor: 'rgba(255,215,0,0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255,193,7,0.85)',
    borderRadius: 10,
    zIndex: 50,
  },
  dropPreviewInvalid: {
    position: 'absolute',
    backgroundColor: 'rgba(244,67,54,0.35)',
    borderWidth: 2,
    borderColor: 'rgba(244,67,54,0.9)',
    borderRadius: 10,
    zIndex: 50,
  },
  loadOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
