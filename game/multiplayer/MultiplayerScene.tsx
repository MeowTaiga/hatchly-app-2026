import { CachedImage } from '@/components/ui/CachedImage';
import { api } from '@/lib/api';
import { useAuth } from '@/store/AuthProvider';
import { usePetHero } from '@/store/PetHeroProvider';
import { useTheme } from '@/store/ThemeProvider';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, InteractionManager, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { DayNightOverlay } from '../DayNightOverlay';
import { WeatherOverlay } from '../WeatherOverlay';
import { FishingMiniGame } from '../FishingMiniGame';
import { MiningMiniGame } from '../MiningMiniGame';
import { useGame } from '../GameProvider';
import { SceneLoadingScreen } from '../SceneLoadingScreen';
import { MAX_ZOOM, MIN_ZOOM, TILE_SIZE } from '../constants';
import {
  buildEquipEmojiStyle,
  buildEquipImageStyle,
  buildEquipWrapStyle,
  resolveEquipOverlay,
  type EquipOverlayConfig,
} from '../creature/pet/equipmentStyles';
import { tryInteractWithPlacedItem, type InteractCallbacks } from '../interactWithPlacedItem';
import { LivePlacementSprite, livePlacementZIndex } from '../LivePlacementSprite';
import {
  isInteractableDef,
  placementColorStyle,
  placementDepth,
  placementRect,
  pointHitsPlacement,
} from '../placementRect';
import { getNoToolMessage, hasRequiredTool } from '../toolRequiredUtils';
import { liveMiningEnergy, MINING_ENERGY_EMPTY_MSG } from '@/constants/miningEnergy';
import { BobberView } from './BobberView';
import type { FishResultBubble } from './MultiplayerProvider';
import { useMultiplayer } from './MultiplayerProvider';
import { getQuestStatusForNpc, QuestBubble } from './QuestBubble';
import { RemotePet } from './RemotePet';
import { FishStarRow, catchBubbleSubtitle, bubblePalette } from './fishBubbleUtils';
import { findPath, pathToWaypoints } from './pathfinding';
import type { SceneData, WalkableRect } from './types';
import { useWalkAnimation } from './useWalkAnimation';
const PET_SIZE = TILE_SIZE * 2;
const HALF_PET = PET_SIZE / 2;
const MAX_PATH_TILES = 35;

function isTileWalkable(
  col: number,
  row: number,
  rect: WalkableRect | null,
  unwalkableSet: Set<string>,
  worldCols: number,
  worldRows: number,
): boolean {
  if (col < 0 || row < 0 || col >= worldCols || row >= worldRows) return false;
  if (unwalkableSet.has(`${col},${row}`)) return false;
  if (rect) {
    const colMin = Math.floor(rect.x / TILE_SIZE);
    const rowMin = Math.floor(rect.y / TILE_SIZE);
    const colMax = Math.ceil((rect.x + rect.w) / TILE_SIZE) - 1;
    const rowMax = Math.ceil((rect.y + rect.h) / TILE_SIZE) - 1;
    if (col < colMin || row < rowMin || col > colMax || row > rowMax) return false;
  }
  return true;
}

function findNearestWalkable(
  col: number,
  row: number,
  rect: WalkableRect | null,
  unwalkableSet: Set<string>,
  worldCols: number,
  worldRows: number,
): { col: number; row: number } | null {
  if (isTileWalkable(col, row, rect, unwalkableSet, worldCols, worldRows)) {
    return { col, row };
  }
  const offsets = [
    [0, -1], [1, 0], [0, 1], [-1, 0],
    [-1, -1], [1, -1], [1, 1], [-1, 1],
    [0, -2], [1, -2], [2, -2], [2, -1], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [-1, 2], [-2, 2], [-2, 1], [-2, 0], [-2, -1], [-2, -2], [-1, -2],
  ];
  for (const [dc, dr] of offsets) {
    const nc = col + dc;
    const nr = row + dr;
    if (isTileWalkable(nc, nr, rect, unwalkableSet, worldCols, worldRows)) {
      return { col: nc, row: nr };
    }
  }
  for (let r = 3; r <= 8; r++) {
    for (let dc = -r; dc <= r; dc++) {
      for (const dr of [-r, r]) {
        const nc = col + dc;
        const nr = row + dr;
        if (isTileWalkable(nc, nr, rect, unwalkableSet, worldCols, worldRows)) {
          return { col: nc, row: nr };
        }
      }
    }
    for (let dr = -r + 1; dr <= r - 1; dr++) {
      for (const dc of [-r, r]) {
        const nc = col + dc;
        const nr = row + dr;
        if (isTileWalkable(nc, nr, rect, unwalkableSet, worldCols, worldRows)) {
          return { col: nc, row: nr };
        }
      }
    }
  }
  return null;
}

function clampToWalkable(
  x: number,
  y: number,
  rect: WalkableRect | null,
  unwalkableSet: Set<string>,
  worldW: number,
  worldH: number,
  prevX: number,
  prevY: number,
): { x: number; y: number } {
  let cx = x;
  let cy = y;
  if (rect) {
    cx = Math.max(rect.x, Math.min(x, rect.x + rect.w - 1));
    cy = Math.max(rect.y, Math.min(y, rect.y + rect.h - 1));
  } else {
    cx = Math.max(0, Math.min(x, worldW));
    cy = Math.max(0, Math.min(y, worldH));
  }
  const col = Math.floor(cx / TILE_SIZE);
  const row = Math.floor(cy / TILE_SIZE);
  if (unwalkableSet.has(`${col},${row}`)) return { x: prevX, y: prevY };
  return { x: cx, y: cy };
}

interface MultiplayerSceneProps {
  sceneSlug: string;
  onAssetsReady?: () => void;
}

export function MultiplayerScene({ sceneSlug, onAssetsReady }: MultiplayerSceneProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const {
    itemDefs, equipped, inventory, farmLevel, quests, showPetDialog, switchScene,
    setPendingInteraction, clearInteraction, talkToNpc, enterScene, emitQuestModalOpened,
    tryAutoAdvanceDialog,
    mineReady, emitMineBegin, emitMineComplete, emitMineCancel, clearMineReady,
    miningEnergy, miningEnergyCap, miningEnergyAt,
  } = useGame();

  const interactCallbacks = useMemo<InteractCallbacks>(
    () => ({
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
    }),
    [
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
      itemDefs,
      user?.totalLevel,
      user?.pet?.level,
    ],
  );
  const {
    isJoined,
    players,
    fishingByUser,
    reelingByUser,
    chatMessages,
    moveMyPet,
    myActivePose,
    fishCast,
    fishResult,
    fishCancel,
    showFishingModal,
    pendingFishData,
    fishResultByUser,
    fishFailedByUser,
    spawnPos,
  } = useMultiplayer();

  const [sceneData, setSceneData] = useState<SceneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [assetsReady, setAssetsReady] = useState(false);
  const [myPos, setMyPos] = useState<{ x: number; y: number }>(spawnPos);
  const [waypoint, setWaypoint] = useState<{ x: number; y: number; visibleForMs: number } | null>(null);
  const myPosRef = useRef(myPos);
  myPosRef.current = myPos;
  const spawnSyncRef = useRef(false);
  const pathQueueRef = useRef<Array<{ x: number; y: number; durationMs: number }>>([]);
  const pathTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pathInProgress, setPathInProgress] = useState<Array<{ x: number; y: number }> | null>(null);
  const petVisualPosRef = useRef<{ x: number; y: number }>({ x: myPos.x, y: myPos.y });

  // Sync myPos to spawnPos when we join (spawnPos arrives async from mp:joined)
  useEffect(() => {
    if (isJoined) {
      spawnSyncRef.current = true;
      setMyPos(spawnPos);
    }
  }, [isJoined, spawnPos.x, spawnPos.y]);

  // Clear spawn sync flag after we've rendered with the new position (so walk animation works for subsequent moves)
  useEffect(() => {
    if (spawnSyncRef.current && myPos.x === spawnPos.x && myPos.y === spawnPos.y) {
      spawnSyncRef.current = false;
    }
  }, [myPos.x, myPos.y, spawnPos.x, spawnPos.y]);

  useEffect(() => () => {
    if (pathTimeoutRef.current) clearTimeout(pathTimeoutRef.current);
  }, []);

  const lastChatByUser = useRef<Map<string, string>>(new Map());
  const { openPetProfileDrawer } = usePetHero();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setAssetsReady(false);
    api
      .getScene(sceneSlug)
      .then((data) => {
        if (!cancelled) {
          setSceneData(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sceneSlug]);

  // Report the arrival once per join, so scene-triggered quests can open.
  const sceneReported = useRef(false);
  useEffect(() => {
    if (isJoined && sceneSlug && !sceneReported.current) {
      sceneReported.current = true;
      enterScene(sceneSlug);
    }
    if (!isJoined) sceneReported.current = false;
  }, [isJoined, sceneSlug, enterScene]);


  for (const msg of chatMessages) {
    lastChatByUser.current.set(msg.userId, msg.text);
  }

  const { width: screenW, height: screenH } = Dimensions.get('window');
  const worldW = sceneData ? sceneData.cols * TILE_SIZE : screenW;
  const worldH = sceneData ? sceneData.rows * TILE_SIZE : screenH;

  const sceneZoom = useMemo(() => {
    if (worldW <= 0 || worldH <= 0) return MAX_ZOOM;
    const minZoom = Math.max(MIN_ZOOM, screenW / worldW, screenH / worldH);
    return Math.min(MAX_ZOOM, minZoom);
  }, [worldW, worldH, screenW, screenH]);

  const scale = useSharedValue(sceneZoom);
  const cameraTargetX = useSharedValue(myPos.x);
  const cameraTargetY = useSharedValue(myPos.y);
  const cameraFacing = useSharedValue(0);
  const smoothCamX = useSharedValue(myPos.x);
  const smoothCamY = useSharedValue(myPos.y);
  const cameraLagOffset = useSharedValue(0);

  const walkableRect = useMemo(() => {
    const wr = sceneData?.walkableRect;
    if (wr) return wr;
    if (!sceneData) return null;
    const offsetX = ((sceneData.cols - sceneData.farmCols) / 2) * TILE_SIZE;
    const offsetY = ((sceneData.rows - sceneData.farmRows) / 2) * TILE_SIZE;
    return {
      x: offsetX,
      y: offsetY,
      w: sceneData.farmCols * TILE_SIZE,
      h: sceneData.farmRows * TILE_SIZE,
    };
  }, [sceneData]);
  const unwalkableSet = useMemo(() => {
    const tiles = sceneData?.unwalkableTiles ?? [];
    return new Set(tiles.map((t) => `${t.col},${t.row}`));
  }, [sceneData?.unwalkableTiles]);
  const fishingTilesSet = useMemo(() => {
    const tiles = sceneData?.fishingTiles ?? [];
    return new Set(tiles.map((t) => `${t.col},${t.row}`));
  }, [sceneData?.fishingTiles]);
  const miningTilesSet = useMemo(() => {
    const tiles = sceneData?.miningTiles ?? [];
    return new Set(tiles.map((t) => `${t.col},${t.row}`));
  }, [sceneData?.miningTiles]);
  const cameraRef = useRef({ tx: 0, ty: 0, s: sceneZoom });

  const clampTransJS = useCallback(
    (tx: number, ty: number, s: number) => {
      const scaledW = worldW * s;
      const scaledH = worldH * s;
      const minX = screenW - scaledW;
      const minY = screenH - scaledH;
      return {
        tx: Math.min(Math.max(tx, Math.min(minX, 0)), Math.max(0, minX)),
        ty: Math.min(Math.max(ty, Math.min(minY, 0)), Math.max(0, minY)),
      };
    },
    [worldW, worldH, screenW, screenH],
  );

  const cameraInitDone = useRef(false);

  useEffect(() => {
    scale.value = sceneZoom;
    const target = clampTransJS(
      screenW / 2 - myPos.x * sceneZoom,
      screenH / 2 - myPos.y * sceneZoom,
      sceneZoom,
    );
    cameraTargetX.value = myPos.x;
    cameraTargetY.value = myPos.y;
    smoothCamX.value = myPos.x;
    smoothCamY.value = myPos.y;
    cameraRef.current = { tx: target.tx, ty: target.ty, s: sceneZoom };
    cameraInitDone.current = true;
  }, [sceneZoom, worldW, worldH, screenW, screenH]);

  useEffect(() => {
    if (!pathInProgress) {
      cameraTargetX.value = myPos.x;
      cameraTargetY.value = myPos.y;
    }
  }, [myPos.x, myPos.y, pathInProgress]);

  useEffect(() => {
    if (!pathInProgress) cameraFacing.value = 0;
  }, [pathInProgress]);

  const CAM_LAG_PX = 22;
  const CAM_LAG_DEAD_ZONE_PX = 45;
  const CAM_LERP = 0.08;
  const worldWForCam = worldW;
  const worldHForCam = worldH;
  useFrameCallback((frameInfo) => {
    'worklet';
    const dt = Math.min(frameInfo.timeSincePreviousFrame ?? 16, 50) / 16;
    const t = 1 - Math.pow(1 - CAM_LERP, dt);
    smoothCamX.value = smoothCamX.value + (cameraTargetX.value - smoothCamX.value) * t;
    smoothCamY.value = smoothCamY.value + (cameraTargetY.value - smoothCamY.value) * t;
  });

  useAnimatedReaction(
    () => cameraFacing.value,
    (facing) => {
      cameraLagOffset.value = withTiming(
        -facing * CAM_LAG_PX,
        { duration: facing === 0 ? 380 : 120, easing: Easing.out(Easing.quad) },
      );
    },
  );

  const worldCols = sceneData?.cols ?? 0;
  const worldRows = sceneData?.rows ?? 0;
  const myUserId = user?.id;

  const handleScreenTap = useCallback(
    (pageX: number, pageY: number) => {
      Keyboard.dismiss();
      const { tx, ty, s } = cameraRef.current;
      const wx = (pageX - tx) / s;
      const wy = (pageY - ty) / s;
      if (wx < 0 || wy < 0 || wx > worldW || wy > worldH) return;

      const clickedCol = Math.floor(wx / TILE_SIZE);
      const clickedRow = Math.floor(wy / TILE_SIZE);
      const petX = cameraTargetX.value;
      const petY = cameraTargetY.value;
      const startCol = Math.floor(petX / TILE_SIZE);
      const startRow = Math.floor(petY / TILE_SIZE);

      const tryMoveWithPath = (destCol: number, destRow: number, onPathComplete?: () => void) => {
        pathQueueRef.current = [];
        if (pathTimeoutRef.current) {
          clearTimeout(pathTimeoutRef.current);
          pathTimeoutRef.current = null;
        }
        const path = findPath(startCol, startRow, destCol, destRow, walkableRect, unwalkableSet, worldCols, worldRows);
        if (!path || path.length > MAX_PATH_TILES) return false;
        const waypoints = pathToWaypoints(path, undefined, {
          startX: petX,
          startY: petY,
          rect: walkableRect,
          unwalkableSet,
          worldCols,
          worldRows,
        });
        const first = { x: waypoints[0].x, y: waypoints[0].y };
        const final = waypoints[waypoints.length - 1];
        const totalDuration = waypoints.reduce((sum, w) => sum + w.durationMs, 0);
        pathQueueRef.current = waypoints.slice(1);
        setWaypoint({ x: final.x, y: final.y, visibleForMs: Math.max(0, totalDuration - 180) });
        moveMyPet(first.x, first.y);
        setMyPos(first);
        setPathInProgress(waypoints.length > 1 ? waypoints.map((w) => ({ x: w.x, y: w.y })) : null);
        const runOnArrival = () => {
          setPathInProgress(null);
          setMyPos({ x: final.x, y: final.y });
          onPathComplete?.();
        };
        const dispatchNext = () => {
          pathTimeoutRef.current = null;
          const queue = pathQueueRef.current;
          if (queue.length === 0) return;
          const next = queue.shift()!;
          moveMyPet(next.x, next.y);
          if (queue.length === 0) {
            runOnArrival();
          } else {
            pathTimeoutRef.current = setTimeout(dispatchNext, queue[0].durationMs);
          }
        };
        if (pathQueueRef.current.length > 0) {
          pathTimeoutRef.current = setTimeout(dispatchNext, pathQueueRef.current[0].durationMs);
        } else if (waypoints.length === 1) {
          runOnArrival();
        }
        return true;
      };

      // Check if tap hit a fishing tile — require fishing pole, then walk + cast
      if (fishingTilesSet.has(`${clickedCol},${clickedRow}`)) {
        if (!hasRequiredTool('fishing', equipped, itemDefs)) {
          showPetDialog(getNoToolMessage('fishing'));
          return;
        }
        if (fishingByUser.has(myUserId ?? '')) {
          fishCast(sceneSlug, clickedCol, clickedRow);
          return;
        }
        const nearest = findNearestWalkable(clickedCol, clickedRow, walkableRect, unwalkableSet, worldCols, worldRows);
        if (nearest && tryMoveWithPath(nearest.col, nearest.row)) {
          fishCast(sceneSlug, clickedCol, clickedRow);
        }
        return;
      }

      // Mining vein — pickaxe in hand, walk adjacent, then mash minigame
      if (miningTilesSet.has(`${clickedCol},${clickedRow}`)) {
        if (!hasRequiredTool('mining', equipped, itemDefs)) {
          showPetDialog(getNoToolMessage('mining'));
          return;
        }
        const energy = liveMiningEnergy(miningEnergy, miningEnergyCap, miningEnergyAt);
        if (energy < 1) {
          showPetDialog(MINING_ENERGY_EMPTY_MSG);
          return;
        }
        const nearest = findNearestWalkable(clickedCol, clickedRow, walkableRect, unwalkableSet, worldCols, worldRows);
        const startMine = () => emitMineBegin(sceneSlug, clickedCol, clickedRow);
        if (!nearest || !tryMoveWithPath(nearest.col, nearest.row, startMine)) startMine();
        return;
      }

      // Check if tap hit any remote player (exclude self)
      for (const p of Array.from(players.values())) {
        if (p.userId === myUserId) continue;
        const left = p.x - HALF_PET;
        const right = p.x + HALF_PET;
        const top = p.y - PET_SIZE - 40;
        const bottom = p.y + 10;
        if (wx >= left && wx <= right && wy >= top && wy <= bottom) {
          openPetProfileDrawer({
            mode: 'other',
            userId: p.userId,
            username: p.username,
            petName: p.petName,
            petImageUrl: p.petImageUrl,
            petPose: p.petPose,
            activePose: p.activePose,
          });
          return;
        }
      }

      // Hit-test interactable placements front-to-back. Skip scenery AABBs so
      // trees/bushes don't steal taps from buildings behind their transparent edges.
      // Must return after handling — falling through to tap-to-walk cancels the
      // walk-to-interact path (the old "works sometimes" bug).
      const placementsByDepth = [...(sceneData?.placements ?? [])].sort(
        (a, b) => placementDepth(b, itemDefs[b.itemType]) - placementDepth(a, itemDefs[a.itemType]),
      );
      for (const p of placementsByDepth) {
        const def = itemDefs[p.itemType];
        if (!isInteractableDef(def)) continue;
        if (!pointHitsPlacement(wx, wy, p, def)) continue;

        const { left, top, width: w, height: h } = placementRect(p, def);
        const placedItem = {
          id: p.id,
          itemType: p.itemType,
          col: 0,
          row: 0,
          color: '',
          tileCols: def?.cols ?? 1,
          tileRows: def?.rows ?? 1,
        };
        const centerX = left + w / 2;
        const centerY = top + h;
        const targetCol = Math.floor(centerX / TILE_SIZE);
        const targetRow = Math.floor(centerY / TILE_SIZE);
        const nearest = findNearestWalkable(targetCol, targetRow, walkableRect, unwalkableSet, worldCols, worldRows);
        // Walk over first when we can, but interact either way so a blocked
        // path never swallows the tap.
        const interact = () => tryInteractWithPlacedItem(placedItem, itemDefs, interactCallbacks);
        if (!nearest || !tryMoveWithPath(nearest.col, nearest.row, interact)) interact();
        return;
      }

      // General tap-to-walk with pathfinding
      let destCol: number;
      let destRow: number;
      if (isTileWalkable(clickedCol, clickedRow, walkableRect, unwalkableSet, worldCols, worldRows)) {
        destCol = clickedCol;
        destRow = clickedRow;
      } else {
        const nearest = findNearestWalkable(clickedCol, clickedRow, walkableRect, unwalkableSet, worldCols, worldRows);
        if (!nearest) return;
        destCol = nearest.col;
        destRow = nearest.row;
      }
      tryMoveWithPath(destCol, destRow);
    },
    [worldW, worldH, worldCols, worldRows, moveMyPet, walkableRect, unwalkableSet, fishingTilesSet, miningTilesSet, fishingByUser, sceneSlug, fishCast, emitMineBegin, sceneData?.placements, itemDefs, interactCallbacks, players, myUserId, equipped, showPetDialog, cameraTargetX, cameraTargetY, openPetProfileDrawer, miningEnergy, miningEnergyCap, miningEnergyAt],
  );

  const syncCamera = useCallback((tx: number, ty: number, s: number) => {
    cameraRef.current = { tx, ty, s };
  }, []);

  const clearWaypoint = useCallback(() => setWaypoint(null), []);

  const worldStyle = useAnimatedStyle(() => {
    'worklet';
    const x = smoothCamX.value;
    const y = smoothCamY.value;
    const petX = cameraTargetX.value;
    const petY = cameraTargetY.value;
    const distFromCenter = Math.sqrt((petX - x) ** 2 + (petY - y) ** 2);
    const effectiveLag = distFromCenter >= CAM_LAG_DEAD_ZONE_PX ? cameraLagOffset.value : 0;
    const tx = screenW / 2 - (x + effectiveLag) * scale.value;
    const ty = screenH / 2 - y * scale.value;
    const scaledW = worldWForCam * scale.value;
    const scaledH = worldHForCam * scale.value;
    const minX = screenW - scaledW;
    const minY = screenH - scaledH;
    const clampedTx = Math.min(Math.max(tx, Math.min(minX, 0)), Math.max(0, minX));
    const clampedTy = Math.min(Math.max(ty, Math.min(minY, 0)), Math.max(0, minY));
    return {
      transform: [
        { translateX: clampedTx },
        { translateY: clampedTy },
        { scale: scale.value },
      ],
    };
  }, [screenW, screenH, worldWForCam, worldHForCam, CAM_LAG_DEAD_ZONE_PX]);

  useAnimatedReaction(
    () => {
      'worklet';
      const x = smoothCamX.value;
      const y = smoothCamY.value;
      const petX = cameraTargetX.value;
      const petY = cameraTargetY.value;
      const distFromCenter = Math.sqrt((petX - x) ** 2 + (petY - y) ** 2);
      const effectiveLag = distFromCenter >= CAM_LAG_DEAD_ZONE_PX ? cameraLagOffset.value : 0;
      const tx = screenW / 2 - (x + effectiveLag) * scale.value;
      const ty = screenH / 2 - y * scale.value;
      const scaledW = worldWForCam * scale.value;
      const scaledH = worldHForCam * scale.value;
      const minX = screenW - scaledW;
      const minY = screenH - scaledH;
      return {
        tx: Math.min(Math.max(tx, Math.min(minX, 0)), Math.max(0, minX)),
        ty: Math.min(Math.max(ty, Math.min(minY, 0)), Math.max(0, minY)),
        s: scale.value,
      };
    },
    (curr) => { runOnJS(syncCamera)(curr.tx, curr.ty, curr.s); },
    [screenW, screenH, worldWForCam, worldHForCam, CAM_LAG_DEAD_ZONE_PX],
  );

  const basePetImageUrl = user?.pet?.imageUrl;
  const petPoseMap = user?.pet?.pose as Record<string, string> | undefined;
  const ownPetImageUrl = (myActivePose && petPoseMap?.[myActivePose]) || basePetImageUrl;
  const ownUsername = user?.username ?? 'You';
  const ownChatText = myUserId ? lastChatByUser.current.get(myUserId) ?? null : null;
  const bakedImageUrl = sceneData?.bakedImageUrl;

  const handleBakedImageLoad = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setAssetsReady(true);
            });
          });
        });
      });
    });
  }, []);

  const handleNonBakedAssetLoad = useCallback(() => {
    setAssetsReady(true);
  }, []);

  useEffect(() => {
    if (!sceneData || loading) return;
    if (bakedImageUrl) return;
    const hasTiledFlooring = Boolean(sceneData?.tiledFlooringItemType && itemDefs[sceneData.tiledFlooringItemType]?.imageUrl);
    if (!hasTiledFlooring) {
      const id = setTimeout(() => setAssetsReady(true), 150);
      return () => clearTimeout(id);
    }
    const task = InteractionManager.runAfterInteractions(() => {
      const id = setTimeout(() => setAssetsReady(true), 600);
      return () => clearTimeout(id);
    });
    return () => task.cancel();
  }, [sceneData, loading, bakedImageUrl, itemDefs]);

  // Signal to parent when assets are ready (used by scene transition)
  useEffect(() => {
    if (!loading && assetsReady) onAssetsReady?.();
  }, [loading, assetsReady, onAssetsReady]);

  if (loading) {
    return <SceneLoadingScreen pet={user?.pet} />;
  }

  const showAssetsOverlay = !assetsReady;

  return (
    <>
      {showAssetsOverlay && <SceneLoadingScreen pet={user?.pet} />}
      {showFishingModal && (
        <FishingMiniGame
          onComplete={(passed) => fishResult(passed)}
          onCancel={fishCancel}
          fishLabel={pendingFishData?.fishLabel}
          fishImageUrl={pendingFishData?.fishImageUrl}
          difficulty={pendingFishData?.difficulty}
          toolImageUrl={equipped?.handTool ? itemDefs[equipped.handTool]?.imageUrl : undefined}
        />
      )}
      {mineReady && (
        <MiningMiniGame
          label={mineReady.label}
          imageUrl={mineReady.imageUrl}
          emoji={mineReady.emoji}
          tapsRequired={mineReady.tapsRequired}
          timeLimitMs={mineReady.timeLimitMs}
          energy={mineReady.miningEnergy}
          energyCap={mineReady.miningEnergyCap}
          toolImageUrl={equipped?.handTool ? itemDefs[equipped.handTool]?.imageUrl : undefined}
          onComplete={(passed, taps, elapsedMs) => {
            emitMineComplete({
              sceneSlug: mineReady.sceneSlug,
              col: mineReady.col,
              row: mineReady.row,
              taps,
              elapsedMs,
              passed,
            });
          }}
          onCancel={() => {
            emitMineCancel();
            clearMineReady();
          }}
        />
      )}
      <Pressable
        style={[styles.root, { backgroundColor: sceneData?.bgColor ?? '#5A9E5A' }]}
        onPress={(e) => handleScreenTap(e.nativeEvent.pageX, e.nativeEvent.pageY)}
      >
        <View style={styles.gestureArea} collapsable={false}>
          <Animated.View
            style={[styles.world, { width: worldW, height: worldH }, worldStyle]}
          >
            {bakedImageUrl ? (
              <CachedImage
                source={{ uri: bakedImageUrl }}
                style={{ width: worldW, height: worldH }}
                resizeMode="cover"
                onLoad={handleBakedImageLoad}
              />
            ) : (
              <>
                {/* Color flooring always rendered first so transparent tiled flooring shows it beneath */}
                <View style={{ width: worldW, height: worldH, position: 'absolute', backgroundColor: sceneData?.bgColor ?? '#5A9E5A' }} />
                {sceneData?.tiledFlooringItemType && itemDefs[sceneData.tiledFlooringItemType]?.imageUrl ? (
                  <View
                    style={[
                      { width: worldW, height: worldH, position: 'absolute' },
                      placementColorStyle(sceneData.tiledFlooringStyle ?? {}),
                    ]}
                  >
                    {Array.from({ length: Math.ceil(worldRows / 5) * Math.ceil(worldCols / 5) }, (_, i) => {
                      const tileCols = Math.ceil(worldCols / 5);
                      const row = Math.floor(i / tileCols);
                      const col = i % tileCols;
                      return (
                        <CachedImage
                          key={`tile-${row}-${col}`}
                          source={{ uri: itemDefs[sceneData!.tiledFlooringItemType!]!.imageUrl! }}
                          style={{
                            position: 'absolute',
                            left: col * 5 * TILE_SIZE - 1,
                            top: row * 5 * TILE_SIZE - 1,
                            width: 5 * TILE_SIZE + 2,
                            height: 5 * TILE_SIZE + 2,
                          }}
                          resizeMode="fill"
                          onLoad={i === 0 ? handleNonBakedAssetLoad : undefined}
                        />
                      );
                    })}
                  </View>
                ) : null}
              </>
            )}

            {sceneData?.placements
              ?.filter((p) => p.live)
              .map((p) => {
                const def = itemDefs[p.itemType];
                if (!def?.imageUrl && !def?.emoji) return null;
                return (
                  <LivePlacementSprite
                    key={`live-${p.id}`}
                    placement={p}
                    def={def}
                    zIndex={livePlacementZIndex(p, def)}
                  />
                );
              })}

            {sceneData?.placements
              ?.filter((p) => {
                const def = itemDefs[p.itemType];
                return def?.category === 'npc' && def?.npcDialog?.length;
              })
              .map((p) => {
                const def = itemDefs[p.itemType];
                const baseW = (def?.cols ?? 1) * TILE_SIZE;
                const baseH = (def?.rows ?? 1) * TILE_SIZE;
                const questStatus = getQuestStatusForNpc(
                  p.itemType,
                  quests,
                );
                if (!questStatus) return null;
                return (
                  <QuestBubble
                    key={`quest-bubble-${p.id}`}
                    status={questStatus}
                    itemDefs={itemDefs}
                    centerX={p.x + baseW / 2}
                    topY={p.y}
                  />
                );
              })}

            {Array.from(fishingByUser.entries()).map(([userId, pos]) => {
              const isMe = userId === myUserId;
              const bobberDef =
                isMe && equipped?.bobber
                  ? itemDefs[equipped.bobber]
                  : (players.get(userId) as { equippedBobber?: string } | undefined)?.equippedBobber
                    ? itemDefs[(players.get(userId) as { equippedBobber?: string }).equippedBobber!]
                    : null;
              const displayName = isMe ? ownUsername : players.get(userId)?.username ?? 'Fisher';
              const isReeling = isMe ? showFishingModal : reelingByUser.has(userId);
              return (
                <BobberView
                  key={`bobber-${userId}`}
                  col={pos.col}
                  row={pos.row}
                  imageUrl={bobberDef?.imageUrl}
                  emoji={bobberDef?.emoji}
                  username={displayName}
                  isReeling={isReeling}
                />
              );
            })}
            {Array.from(players.values()).map((player) => (
              <RemotePet
                key={player.userId}
                player={player}
                chatText={lastChatByUser.current.get(player.userId) ?? null}
                fishResult={fishResultByUser.get(player.userId)}
                fishFailed={fishFailedByUser.has(player.userId)}
                isReeling={reelingByUser.has(player.userId)}
                itemDefs={itemDefs}
              />
            ))}

            <OwnPet
              x={myPos.x}
              y={myPos.y}
              path={pathInProgress}
              petVisualPosRef={petVisualPosRef}
              cameraTargetX={cameraTargetX}
              cameraTargetY={cameraTargetY}
              cameraFacing={cameraFacing}
              snapToTarget={spawnSyncRef.current}
              imageUrl={ownPetImageUrl}
              username={ownUsername}
              chatText={ownChatText}
              fishResult={myUserId ? fishResultByUser.get(myUserId) : undefined}
              fishFailed={myUserId ? fishFailedByUser.has(myUserId) : false}
              isReeling={showFishingModal}
              itemDefs={itemDefs}
              equippedHandToolImageUrl={equipped?.handTool ? itemDefs[equipped.handTool]?.imageUrl : undefined}
              equippedHandToolEmoji={equipped?.handTool ? itemDefs[equipped.handTool]?.emoji : undefined}
              equippedHandToolOverlay={equipped?.handTool ? itemDefs[equipped.handTool]?.equipOverlay : undefined}
              equippedChairImageUrl={equipped?.chair ? itemDefs[equipped.chair]?.imageUrl : undefined}
              equippedChairEmoji={equipped?.chair ? itemDefs[equipped.chair]?.emoji : undefined}
              equippedChairOverlay={equipped?.chair ? itemDefs[equipped.chair]?.equipOverlay : undefined}
            />

            {waypoint && (
              <WaypointMarker
                x={waypoint.x}
                y={waypoint.y}
                visibleForMs={waypoint.visibleForMs}
                onClear={clearWaypoint}
              />
            )}
          </Animated.View>

          {/* Screen-space tint (like farm) so live props / pets aren't above it via footprint zIndex. */}
          <DayNightOverlay />
          <WeatherOverlay />
        </View>
      </Pressable>
    </>
  );
}

const BUBBLE_DISMISS_MS = 5000;

const WAYPOINT_WIDTH = 56;
const WAYPOINT_HEIGHT = 48;
const WAYPOINT_IMAGE_URL = 'https://images.hatchly.me/game-items/waypoint/d9406eb3-2b5c-4b2e-abde-58a6e1d4e67a.png';
const WAYPOINT_DROP_OFFSET = 40;
const WAYPOINT_ENTER_MS = 200;
const WAYPOINT_EXIT_MS = 200;
const WAYPOINT_MOVE_MS = 350;

interface WaypointMarkerProps {
  x: number;
  y: number;
  visibleForMs: number;
  onClear: () => void;
}

function WaypointMarker({ x, y, visibleForMs, onClear }: WaypointMarkerProps) {
  const posX = useSharedValue(x);
  const posY = useSharedValue(y);
  const dropTranslateY = useSharedValue(-WAYPOINT_DROP_OFFSET);
  const opacity = useSharedValue(0);
  const isFirstPosition = useRef(true);

  useEffect(() => {
    if (isFirstPosition.current) {
      isFirstPosition.current = false;
      posX.value = x;
      posY.value = y;
      dropTranslateY.value = -WAYPOINT_DROP_OFFSET;
      opacity.value = 0;
      dropTranslateY.value = withTiming(0, { duration: WAYPOINT_ENTER_MS, easing: Easing.out(Easing.cubic) });
      opacity.value = withTiming(1, { duration: WAYPOINT_ENTER_MS, easing: Easing.out(Easing.cubic) });
    } else {
      posX.value = withTiming(x, { duration: WAYPOINT_MOVE_MS, easing: Easing.out(Easing.cubic) });
      posY.value = withTiming(y, { duration: WAYPOINT_MOVE_MS, easing: Easing.out(Easing.cubic) });
    }
  }, [x, y]);

  useEffect(() => {
    const timer = setTimeout(() => {
      dropTranslateY.value = withTiming(-WAYPOINT_DROP_OFFSET, { duration: WAYPOINT_EXIT_MS, easing: Easing.in(Easing.cubic) });
      opacity.value = withTiming(0, { duration: WAYPOINT_EXIT_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onClear)();
      });
    }, visibleForMs);
    return () => clearTimeout(timer);
  }, [visibleForMs, onClear]);

  const animatedStyle = useAnimatedStyle(() => ({
    left: posX.value - WAYPOINT_WIDTH / 2,
    top: posY.value - WAYPOINT_HEIGHT / 2,
    opacity: opacity.value,
    transform: [{ translateY: dropTranslateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.waypointMarker,
        {
          width: WAYPOINT_WIDTH,
          height: WAYPOINT_HEIGHT,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <CachedImage
        source={{ uri: WAYPOINT_IMAGE_URL }}
        style={{ width: WAYPOINT_WIDTH, height: WAYPOINT_HEIGHT }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

interface OwnPetProps {
  x: number;
  y: number;
  path?: Array<{ x: number; y: number }> | null;
  petVisualPosRef?: React.MutableRefObject<{ x: number; y: number }>;
  cameraTargetX?: SharedValue<number>;
  cameraTargetY?: SharedValue<number>;
  cameraFacing?: SharedValue<number>;
  snapToTarget?: boolean;
  imageUrl?: string | null;
  username: string;
  chatText?: string | null;
  fishResult?: FishResultBubble | null;
  fishFailed?: boolean;
  isReeling?: boolean;
  itemDefs?: Record<string, { imageUrl?: string; emoji?: string; equipOverlay?: EquipOverlayConfig }>;
  equippedHandToolImageUrl?: string | null;
  equippedHandToolEmoji?: string;
  equippedHandToolOverlay?: EquipOverlayConfig | null;
  equippedChairImageUrl?: string | null;
  equippedChairEmoji?: string;
  equippedChairOverlay?: EquipOverlayConfig | null;
}

const POLE_WADDLE_DEG = 2;
const POLE_REEL_DEG = 8;

function OwnPet({ x, y, path, petVisualPosRef, cameraTargetX, cameraTargetY, cameraFacing, imageUrl, username, chatText, fishResult, fishFailed, isReeling = false, itemDefs, equippedHandToolImageUrl, equippedHandToolEmoji, equippedHandToolOverlay, equippedChairImageUrl, equippedChairEmoji, equippedChairOverlay, snapToTarget }: OwnPetProps) {
  const { theme } = useTheme();
  const { animX, animY, facingRight, bounceOffset } = useWalkAnimation(x, y, { snapToTarget, path: path ?? undefined });
  const updateVisualPos = useCallback(
    (px: number, py: number) => {
      if (petVisualPosRef) petVisualPosRef.current = { x: px, y: py };
    },
    [petVisualPosRef],
  );
  useAnimatedReaction(
    () => ({ x: animX.value, y: animY.value, facing: facingRight.value }),
    (pos) => {
      if (cameraTargetX) cameraTargetX.value = pos.x;
      if (cameraTargetY) cameraTargetY.value = pos.y;
      if (cameraFacing) cameraFacing.value = -pos.facing;
      runOnJS(updateVisualPos)(pos.x, pos.y);
    },
  );
  const reelRotation = useSharedValue(0);
  const isReelingSv = useSharedValue(isReeling ? 1 : 0);
  const [visibleBubble, setVisibleBubble] = useState<string | null>(null);

  useEffect(() => {
    isReelingSv.value = isReeling ? 1 : 0;
  }, [isReeling]);

  useEffect(() => {
    if (isReeling) {
      reelRotation.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 150, easing: Easing.inOut(Easing.ease) }),
          withTiming(-1, { duration: 150, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(reelRotation);
      reelRotation.value = 0;
    }
    return () => cancelAnimation(reelRotation);
  }, [isReeling]);
  const [visibleFishResult, setVisibleFishResult] = useState<FishResultBubble | null>(null);
  const [visibleFishFailed, setVisibleFishFailed] = useState(false);

  useEffect(() => {
    if (!chatText) return;
    setVisibleBubble(chatText);
    const timer = setTimeout(() => setVisibleBubble(null), BUBBLE_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [chatText]);

  useEffect(() => {
    if (fishResult) {
      const withImage = fishResult.imageUrl
        ? fishResult
        : { ...fishResult, imageUrl: itemDefs?.[fishResult.itemType]?.imageUrl };
      setVisibleFishResult(withImage);
      const timer = setTimeout(() => setVisibleFishResult(null), BUBBLE_DISMISS_MS);
      return () => clearTimeout(timer);
    } else {
      setVisibleFishResult(null);
    }
  }, [fishResult, itemDefs]);

  useEffect(() => {
    if (fishFailed) {
      setVisibleFishFailed(true);
      const timer = setTimeout(() => setVisibleFishFailed(false), BUBBLE_DISMISS_MS);
      return () => clearTimeout(timer);
    } else {
      setVisibleFishFailed(false);
    }
  }, [fishFailed]);

  const style = useAnimatedStyle(() => ({
    // Feet Y as zIndex so live scene props (trees, etc.) can occlude the pet.
    zIndex: Math.round(animY.value),
    transform: [
      { translateX: animX.value - HALF_PET },
      { translateY: animY.value - PET_SIZE - bounceOffset.value },
      { scaleX: facingRight.value },
    ],
  }));

  const unflipStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: facingRight.value }],
  }));

  const handResolved = useMemo(
    () => resolveEquipOverlay('handTool', equippedHandToolOverlay),
    [equippedHandToolOverlay],
  );
  const chairResolved = useMemo(
    () => resolveEquipOverlay('chair', equippedChairOverlay),
    [equippedChairOverlay],
  );
  const handWrapStyle = useMemo(() => buildEquipWrapStyle('handTool', handResolved), [handResolved]);
  const handImageStyle = useMemo(() => buildEquipImageStyle('handTool', handResolved), [handResolved]);
  const handEmojiStyle = useMemo(() => buildEquipEmojiStyle('handTool', handResolved), [handResolved]);
  const chairWrapStyle = useMemo(() => buildEquipWrapStyle('chair', chairResolved), [chairResolved]);
  const chairImageStyle = useMemo(() => buildEquipImageStyle('chair', chairResolved), [chairResolved]);
  const chairEmojiStyle = useMemo(() => buildEquipEmojiStyle('chair', chairResolved), [chairResolved]);
  const chairRotStyle = useMemo(
    () => ({ transform: [{ rotate: `${chairResolved.rotationDeg}deg` }] }),
    [chairResolved.rotationDeg],
  );
  const handBaseRotation = handResolved.rotationDeg;

  const poleAnimatedStyle = useAnimatedStyle(() => {
    const rot = isReelingSv.value ? reelRotation.value * POLE_REEL_DEG : bounceOffset.value * POLE_WADDLE_DEG;
    return {
      transform: [{ rotate: `${handBaseRotation + rot}deg` }],
    };
  });

  return (
    <Animated.View style={[styles.ownPet, style]}>
      {/* Equipment rendered behind pet */}
      {(equippedChairImageUrl || equippedChairEmoji) && (
        <View style={[chairWrapStyle, chairRotStyle]} pointerEvents="none">
          {equippedChairImageUrl ? (
            <CachedImage source={{ uri: equippedChairImageUrl }} style={chairImageStyle} resizeMode="contain" />
          ) : (
            <Text style={chairEmojiStyle}>{equippedChairEmoji ?? '🪑'}</Text>
          )}
        </View>
      )}
      {(equippedHandToolImageUrl || equippedHandToolEmoji) && (
        <Animated.View style={[handWrapStyle, poleAnimatedStyle]}>
          {equippedHandToolImageUrl ? (
            <CachedImage source={{ uri: equippedHandToolImageUrl }} style={handImageStyle} resizeMode="contain" />
          ) : (
            <Text style={handEmojiStyle}>{equippedHandToolEmoji ?? '🔧'}</Text>
          )}
        </Animated.View>
      )}
      {imageUrl ? (
        <CachedImage source={{ uri: imageUrl }} style={styles.petImage} resizeMode="contain" />
      ) : (
        <Text style={styles.ownPetFallback}>🐾</Text>
      )}
      <Animated.View style={[styles.nametagWrap, unflipStyle]}>
        <View style={styles.nametagBg}>
          <Text style={styles.nametagText} numberOfLines={1}>
            {username}
          </Text>
        </View>
      </Animated.View>
      {visibleBubble && (
        <Animated.View style={[styles.bubbleAbsolute, unflipStyle]}>
          <View style={[styles.chatBubble, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.chatText, { color: theme.colors.text }]} numberOfLines={3}>
              {visibleBubble}
            </Text>
            <View style={[styles.chatTail, { backgroundColor: theme.colors.surface }]} />
          </View>
        </Animated.View>
      )}
      {visibleFishResult && (() => {
        const c = bubblePalette(visibleFishResult.rarity);
        const isOre = visibleFishResult.kind === 'ore';
        return (
          <Animated.View style={[styles.bubbleAbsolute, styles.fishBalloonHigher, unflipStyle]}>
            <View style={[styles.fishBalloon, { backgroundColor: c.bg }]}>
              <View style={styles.fishBalloonImageWrap}>
                {visibleFishResult.imageUrl ? (
                  <CachedImage
                    source={{ uri: visibleFishResult.imageUrl }}
                    style={[styles.fishBalloonImage, { backgroundColor: 'transparent' }]}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.fishBalloonEmoji}>{isOre ? '🪨' : '🐟'}</Text>
                )}
              </View>
              <Text style={[styles.fishBalloonLabel, { color: c.text }]} numberOfLines={1}>
                {visibleFishResult.label}
              </Text>
              {!isOre && (
                <FishStarRow
                  sizeLabel={visibleFishResult.sizeLabel}
                  filledColor={c.text}
                  dimColor="rgba(255,255,255,0.4)"
                />
              )}
              <Text style={[styles.fishBalloonSize, { color: c.textMuted }]}>
                {catchBubbleSubtitle(visibleFishResult)}
              </Text>
              <View style={[styles.chatTail, { backgroundColor: c.bg }]} />
            </View>
          </Animated.View>
        );
      })()}
      {visibleFishFailed && (
        <Animated.View style={[styles.bubbleAbsolute, styles.fishBalloonHigher, unflipStyle]}>
          <View style={[styles.fishBalloon, styles.fishFailedBalloon, { backgroundColor: theme.colors.surface }]}>
            <Text style={styles.fishFailedEmoji}>😢</Text>
            <Text style={[styles.fishFailedText, { color: theme.colors.text }]}>Got away...</Text>
            <View style={[styles.chatTail, { backgroundColor: theme.colors.surface }]} />
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const NAMETAG_WIDTH = 120;

const styles = StyleSheet.create({
  root: { flex: 1 },
  gestureArea: { flex: 1, overflow: 'visible' },
  world: { position: 'absolute', transformOrigin: 'left top', overflow: 'visible' },
  waypointMarker: {
    position: 'absolute',
    zIndex: 15,
    overflow: 'visible',
  },
  ownPet: {
    position: 'absolute',
    width: PET_SIZE,
    height: PET_SIZE,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  petImage: {
    width: PET_SIZE,
    height: PET_SIZE,
  },
  ownPetFallback: {
    fontSize: 36,
  },
  nametagWrap: {
    position: 'absolute',
    bottom: -14,
    width: NAMETAG_WIDTH,
    left: (PET_SIZE - NAMETAG_WIDTH) / 2,
    alignItems: 'center',
  },
  nametagBg: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nametagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  bubbleAbsolute: {
    position: 'absolute',
    bottom: PET_SIZE + 18,
  },
  fishBalloonHigher: {
    bottom: PET_SIZE + 48,
  },
  fishBalloon: {
    minWidth: 100,
    maxWidth: 140,
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fishBalloonImageWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  fishBalloonImage: {
    width: 56,
    height: 56,
  },
  fishBalloonEmoji: {
    fontSize: 40,
  },
  fishBalloonLabel: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  fishBalloonSize: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  fishFailedBalloon: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  fishFailedEmoji: {
    fontSize: 48,
    marginBottom: 4,
  },
  fishFailedText: {
    fontSize: 13,
    fontWeight: '700',
  },
  chatBubble: {
    maxWidth: 140,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  chatText: {
    fontSize: 11,
    lineHeight: 14,
  },
  chatTail: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    width: 8,
    height: 8,
    transform: [{ rotate: '45deg' }],
  },
});
