import { api } from '@/lib/api';
import { useAuth } from '@/store/AuthProvider';
import { usePetHero } from '@/store/PetHeroProvider';
import { useCallback, useEffect, useRef, type RefObject } from 'react';

import { useGame } from '../GameProvider';
import {
  findDiggableAtTap,
  findGroundPickupAtTap,
  getFishingTileKeys,
  getItemAt,
  isGroundPickupItem,
  resolveSoilAction,
} from '../gridHelpers';
import { tryInteractWithPlacedItem } from '../interactWithPlacedItem';
import { pickOpaqueItemAt, pickOpaquePlacementAt } from '../itemPixelHit';
import { farmOriginX, farmOriginY } from '../screenToGrid';
import { setTileTapHandler } from '../tileTapRegistry';
import { isAxe } from '../equipConfig';
import { getNoToolMessage, hasRequiredTool } from '../toolRequiredUtils';
import type { PlacedItem, ScenePlacement } from '../types';

/** Ignores repeat taps on the same tile, which the camera can emit in bursts. */
const TAP_THROTTLE_MS = 50;
/** How far from a tap a creature can be and still count as tapped. */
const CREATURE_TAP_RADIUS = 1;

interface TileCoord {
  col: number;
  row: number;
}

interface UseTileTapOptions {
  isFarm: boolean;
  /** Live pet tile from the animated sprite (not the walk-start logical tile). */
  petPositionRef: RefObject<TileCoord>;
  /** Live bug positions, which move between renders. */
  bugPositionsRef: RefObject<Map<string, TileCoord>>;
  /** Called after a successful pet, to play the jump and heart. */
  onPetted: () => void;
  onShowCropInfo: (crop: PlacedItem) => void;
}

function isDiggableItem(
  item: PlacedItem,
  itemDefs: Record<string, import('../types').ItemDefinition>,
): boolean {
  const def = itemDefs[item.itemType];
  return item.itemType === 'fossil_hole' || def?.subCategory === 'dig_hole';
}

function isWithinTapRadius(a: TileCoord, col: number, row: number): boolean {
  return Math.abs(a.col - col) <= CREATURE_TAP_RADIUS && Math.abs(a.row - row) <= CREATURE_TAP_RADIUS;
}

/**
 * Resolves what a tap on the world means and performs it.
 *
 * Opaque item pixels win over bounding boxes: tapping a transparent corner
 * of a tree/NPC falls through to whatever is actually under the finger.
 * Creatures still use a small tile radius. The handler registers itself
 * with the tile-tap registry, which the camera gesture calls.
 */
export function useTileTap({
  isFarm,
  petPositionRef,
  bugPositionsRef,
  onPetted,
  onShowCropInfo,
}: UseTileTapOptions): void {
  const {
    activeGrid, itemDefs, toolMode, equipped, inventory, farmLevel,
    scenePlacements, sceneWorldCols, sceneWorldRows,
    activeBugs, catchBug, activeBalloons, popBalloon,
    selectTile, waterTile, switchScene, showPetDialog, digFossil, pickupGroundItem, shakeTree, chopTree,
    talkToNpc, emitQuestModalOpened, setPendingInteraction, clearInteraction,
    tryAutoAdvanceDialog,
  } = useGame();
  const { user, refreshUser } = useAuth();
  const { triggerXpGain } = usePetHero();

  const isPettingRef = useRef(false);
  const lastTapRef = useRef({ col: -1, row: -1, ts: 0 });
  const petLevel = user?.totalLevel ?? user?.pet?.level ?? 0;
  const hasPet = !!user?.pet;

  const petThePet = useCallback(async () => {
    isPettingRef.current = true;
    try {
      const { xpGained } = await api.petPet();
      await refreshUser();
      onPetted();
      if (xpGained > 0) triggerXpGain?.(xpGained);
    } catch {
      // Non-critical: the pet just doesn't react, cached stats stay.
    } finally {
      isPettingRef.current = false;
    }
  }, [refreshUser, onPetted, triggerXpGain]);

  const interactWithItem = useCallback(
    (item: PlacedItem) => {
      tryInteractWithPlacedItem(item, itemDefs, {
        talkToNpc,
        switchScene,
        setPendingInteraction,
        clearInteraction,
        emitQuestModalOpened,
        showPetDialog,
        onInteract: (itemType, modalPayload) => {
          tryAutoAdvanceDialog('interact', itemType);
          if (modalPayload) tryAutoAdvanceDialog('open_modal', modalPayload);
        },
        gateContext: {
          inventory,
          farmLevel,
          petLevel: user?.totalLevel ?? user?.pet?.level,
          equipped,
          itemDefs,
        },
      });
    },
    [
      itemDefs,
      talkToNpc,
      switchScene,
      setPendingInteraction,
      clearInteraction,
      emitQuestModalOpened,
      showPetDialog,
      tryAutoAdvanceDialog,
      inventory,
      farmLevel,
      equipped,
      user?.totalLevel,
      user?.pet?.level,
    ],
  );

  const interactWithPlacement = useCallback(
    (placement: ScenePlacement) => {
      const def = itemDefs[placement.itemType];
      const asPlacedItem: PlacedItem = {
        id: placement.id,
        itemType: placement.itemType,
        col: 0,
        row: 0,
        color: '',
        tileCols: def?.cols ?? 1,
        tileRows: def?.rows ?? 1,
      };
      interactWithItem(asPlacedItem);
    },
    [itemDefs, interactWithItem],
  );

  const executeTileTap = useCallback(
    async (col: number, row: number, worldX: number, worldY: number) => {
      const idle = toolMode === 'none';
      const dims = {
        cols: activeGrid.cols,
        rows: activeGrid.rows,
        worldCols: sceneWorldCols ?? activeGrid.cols,
        worldRows: sceneWorldRows ?? activeGrid.rows,
      };
      const localX = worldX - farmOriginX(dims);
      const localY = worldY - farmOriginY(dims);
      let pixelHit: PlacedItem | null = null;
      try {
        pixelHit = pickOpaqueItemAt(activeGrid, itemDefs, localX, localY);
      } catch {
        pixelHit = null;
      }
      const pixelDef = pixelHit ? itemDefs[pixelHit.itemType] : undefined;
      const solidPixel =
        !!pixelHit &&
        pixelDef?.category !== 'flooring' &&
        pixelDef?.category !== 'tiled_flooring' &&
        pixelDef?.category !== 'soil';

      // NPCs only win when the tap actually lands on their pixels.
      if (isFarm && pixelHit && pixelDef?.category === 'npc') {
        interactWithItem(pixelHit);
        return;
      }

      const petPos = petPositionRef.current;
      if (
        !solidPixel &&
        idle &&
        hasPet &&
        isFarm &&
        !isPettingRef.current &&
        petPos &&
        isWithinTapRadius(petPos, col, row)
      ) {
        await petThePet();
        return;
      }

      const bug = !solidPixel
        ? activeBugs.find((b) =>
            isWithinTapRadius(bugPositionsRef.current?.get(b.spawnId) ?? b, col, row),
          )
        : undefined;
      if (bug) {
        catchBug(bug.spawnId);
        return;
      }

      const balloon = !solidPixel
        ? activeBalloons.find((b) => isWithinTapRadius(b, col, row))
        : undefined;
      if (balloon) {
        popBalloon(balloon.spawnId);
        return;
      }

      if (isFarm && getFishingTileKeys(activeGrid, itemDefs).has(`${col}:${row}`)) {
        if (!hasRequiredTool('fishing', equipped, itemDefs)) {
          showPetDialog(getNoToolMessage('fishing'));
          return;
        }
        switchScene('fishing_1');
        return;
      }

      if (idle && isFarm && pixelHit && pixelDef?.category === 'tree') {
        const anchorId = pixelHit.anchorId ?? pixelHit.id;
        if (isAxe(equipped?.handTool, itemDefs)) {
          chopTree(anchorId);
        } else {
          shakeTree(anchorId);
        }
        return;
      }

      if (idle && pixelHit?.growthMs) {
        const action = resolveSoilAction(activeGrid, itemDefs, pixelHit.col, pixelHit.row, 'auto');
        if (action?.type === 'water') {
          waterTile(action.col, action.row);
          return;
        }
        if (action?.type === 'harvest') {
          selectTile(action.col, action.row);
          return;
        }
        if (pixelHit.plantedAt) {
          onShowCropInfo(pixelHit);
          return;
        }
      }

      if (idle && !pixelHit) {
        const action = resolveSoilAction(activeGrid, itemDefs, col, row, 'auto');
        if (action?.type === 'water') {
          waterTile(action.col, action.row);
          return;
        }
        if (action?.type === 'harvest') {
          selectTile(action.col, action.row);
          return;
        }
        const tapped = getItemAt(activeGrid, col, row);
        if (tapped?.growthMs && tapped.plantedAt) {
          onShowCropInfo(tapped);
          return;
        }
      }

      if (isFarm && pixelHit && isGroundPickupItem(pixelHit.itemType, itemDefs)) {
        pickupGroundItem(pixelHit.anchorId ?? pixelHit.id);
        return;
      }

      if (isFarm && pixelHit && isDiggableItem(pixelHit, itemDefs)) {
        digFossil(pixelHit.anchorId ?? pixelHit.id);
        return;
      }

      if (isFarm && !pixelHit) {
        const groundPickup = findGroundPickupAtTap(activeGrid, col, row, itemDefs);
        if (groundPickup) {
          pickupGroundItem(groundPickup.anchorId ?? groundPickup.id);
          return;
        }
        const fossil = findDiggableAtTap(activeGrid, col, row, itemDefs);
        if (fossil) {
          digFossil(fossil.anchorId ?? fossil.id);
          return;
        }
      }

      // Edit/build mode selects items so they can be moved. Opening the house
      // (or any other interactable) would steal that tap.
      if (idle && pixelHit && pixelDef?.interactAction && pixelDef.interactAction.type !== 'none') {
        interactWithItem(pixelHit);
        return;
      }

      const inFarm = col >= 0 && col < activeGrid.cols && row >= 0 && row < activeGrid.rows;

      if (isFarm && !inFarm && scenePlacements?.length && sceneWorldCols != null && sceneWorldRows != null) {
        let placement = null;
        try {
          placement = pickOpaquePlacementAt(scenePlacements, itemDefs, worldX, worldY);
        } catch {
          placement = null;
        }
        if (placement) {
          interactWithPlacement(placement);
          return;
        }
      }

      // Buildings (the house especially) overflow above the farm. A tap on the
      // roof still belongs to that item even when the tile is out of bounds.
      if (pixelHit && pixelDef?.category !== 'flooring' && pixelDef?.category !== 'tiled_flooring' && pixelDef?.category !== 'soil') {
        selectTile(pixelHit.col, pixelHit.row);
        return;
      }

      if (!inFarm) return;

      selectTile(col, row);
    },
    [toolMode, hasPet, isFarm, petPositionRef, petThePet, activeBugs, bugPositionsRef, catchBug,
      activeBalloons, popBalloon, activeGrid, itemDefs, equipped, showPetDialog, switchScene,
      shakeTree, chopTree, waterTile, selectTile, onShowCropInfo, digFossil, pickupGroundItem, scenePlacements,
      sceneWorldCols, sceneWorldRows, interactWithPlacement, interactWithItem],
  );

  const handleTileTap = useCallback(
    (col: number, row: number, worldX: number, worldY: number) => {
      const now = Date.now();
      const last = lastTapRef.current;
      if (last.col === col && last.row === row && now - last.ts < TAP_THROTTLE_MS) return;
      lastTapRef.current = { col, row, ts: now };
      void executeTileTap(col, row, worldX, worldY);
    },
    [executeTileTap],
  );

  useEffect(() => {
    setTileTapHandler(handleTileTap);
    return () => setTileTapHandler(null);
  }, [handleTileTap]);
}
