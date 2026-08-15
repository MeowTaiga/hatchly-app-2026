import { useEffect, useMemo } from 'react';
import { Dimensions } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  useSharedValue,
  withDecay,
  cancelAnimation,
  clamp,
  runOnJS,
} from 'react-native-reanimated';
import { farmOriginX, farmOriginY, type GridDimensions } from './screenToGrid';
import type { CameraState } from './types';
import { TILE_SIZE, MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM, WORLD_PADDING } from './constants';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UseCameraOptions {
  /** Farm grid columns (placeable area). */
  cols: number;
  /** Farm grid rows (placeable area). */
  rows: number;
  /** Total world columns (farm + padding). Defaults to cols + 2*WORLD_PADDING. */
  worldCols?: number;
  /** Total world rows (farm + padding). Defaults to rows + 2*WORLD_PADDING. */
  worldRows?: number;
  onTileTap?: (col: number, row: number, worldX: number, worldY: number) => void;
  /** Screen-Y below which taps are ignored (HUD zone). Checked on the UI thread before runOnJS. */
  tapDeadZoneY?: number;
  /** Row offset from the top of the farm to center the camera on initially. Defaults to center. */
  initialFocusRow?: number;
}

export interface UseCameraReturn {
  camera: CameraState;
  gesture: ReturnType<typeof Gesture.Race>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Pan + pinch + tap camera running entirely on the UI thread.
 *
 * Uses a single Simultaneous(Pan, Pinch) so both gestures share
 * the same saved origin, preventing teleport when combining pan & zoom.
 */
export function useCamera({ cols, rows, worldCols, worldRows, onTileTap, tapDeadZoneY, initialFocusRow }: UseCameraOptions): UseCameraReturn {
  const { width: screenW, height: screenH } = Dimensions.get('window');
  const wCols = worldCols ?? cols + 2 * WORLD_PADDING;
  const wRows = worldRows ?? rows + 2 * WORLD_PADDING;
  const worldW = wCols * TILE_SIZE;
  const worldH = wRows * TILE_SIZE;

  const minZoom = Math.max(MIN_ZOOM, screenW / worldW, screenH / worldH);
  const initScale = Math.max(DEFAULT_ZOOM, minZoom);

  // Center the camera on the playable farm area within the larger world
  const gridDims: GridDimensions = { cols, rows, worldCols: wCols, worldRows: wRows };
  const originX = farmOriginX(gridDims);
  const originY = farmOriginY(gridDims);
  const farmCX = originX + (cols * TILE_SIZE) / 2;
  const farmCY = initialFocusRow != null
    ? originY + initialFocusRow * TILE_SIZE
    : originY + (rows * TILE_SIZE) / 2;
  const rawTX = screenW / 2 - farmCX * initScale;
  const rawTY = screenH / 2 - farmCY * initScale;
  const ws = worldW * initScale;
  const hs = worldH * initScale;
  const initTX = ws <= screenW ? (screenW - ws) / 2 : Math.max(screenW - ws, Math.min(0, rawTX));
  const initTY = hs <= screenH ? (screenH - hs) / 2 : Math.max(screenH - hs, Math.min(0, rawTY));

  const translateX = useSharedValue(initTX);
  const translateY = useSharedValue(initTY);
  const scale = useSharedValue(initScale);

  // Saved at gesture start
  const startTX = useSharedValue(initTX);
  const startTY = useSharedValue(initTY);
  const startScale = useSharedValue(initScale);

  // Track whether pinch is active to apply focal-point math
  const isPinching = useSharedValue(false);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  // Held in a shared value so toggling edit mode doesn't rebuild the gestures.
  const deadZoneY = useSharedValue(tapDeadZoneY ?? 0);
  useEffect(() => {
    deadZoneY.value = tapDeadZoneY ?? 0;
  }, [tapDeadZoneY, deadZoneY]);

  const camera: CameraState = useMemo(
    () => ({ translateX, translateY, scale }),
    [translateX, translateY, scale],
  );

  // Reset camera when dimensions change (e.g. snapshot loads with dynamic farm cols/rows)
  useEffect(() => {
    translateX.value = initTX;
    translateY.value = initTY;
    scale.value = initScale;
    startTX.value = initTX;
    startTY.value = initTY;
    startScale.value = initScale;
  }, [cols, rows, wCols, wRows, initialFocusRow, initTX, initTY, initScale]);

  /**
   * Built once per world size. Handing GestureDetector a fresh gesture on every
   * render makes it reconfigure the native handlers, which visibly stutters an
   * in-progress pan whenever anything else in the world re-renders.
   */
  const gesture = useMemo(() => {
    const clampTx = (tx: number, s: number): number => {
      'worklet';
      const scaled = worldW * s;
      if (scaled <= screenW) return (screenW - scaled) / 2;
      return clamp(tx, screenW - scaled, 0);
    };

    const clampTy = (ty: number, s: number): number => {
      'worklet';
      const scaled = worldH * s;
      if (scaled <= screenH) return (screenH - scaled) / 2;
      return clamp(ty, screenH - scaled, 0);
    };

    const pan = Gesture.Pan()
      .minPointers(1)
      .maxPointers(2)
      // Tiny finger jitter must not win the Race against Tap, or world taps
      // feel delayed / dropped and the camera nudges instead.
      .minDistance(10)
      .onStart(() => {
        'worklet';
        cancelAnimation(translateX);
        cancelAnimation(translateY);
        startTX.value = translateX.value;
        startTY.value = translateY.value;
        startScale.value = scale.value;
      })
      .onUpdate((e) => {
        'worklet';
        if (isPinching.value) return; // pinch handles all movement during zoom
        const s = scale.value;
        translateX.value = clampTx(startTX.value + e.translationX, s);
        translateY.value = clampTy(startTY.value + e.translationY, s);
      })
      .onEnd((e) => {
        'worklet';
        if (isPinching.value) return;
        const s = scale.value;
        const wW = worldW * s;
        const wH = worldH * s;
        if (wW > screenW) {
          translateX.value = withDecay({ velocity: e.velocityX, clamp: [screenW - wW, 0] });
        }
        if (wH > screenH) {
          translateY.value = withDecay({ velocity: e.velocityY, clamp: [screenH - wH, 0] });
        }
      });

    const pinch = Gesture.Pinch()
      .onStart((e) => {
        'worklet';
        cancelAnimation(translateX);
        cancelAnimation(translateY);
        isPinching.value = true;
        startScale.value = scale.value;
        startTX.value = translateX.value;
        startTY.value = translateY.value;
        focalX.value = e.focalX;
        focalY.value = e.focalY;
      })
      .onUpdate((e) => {
        'worklet';
        const newScale = clamp(startScale.value * e.scale, minZoom, MAX_ZOOM);
        const ratio = newScale / startScale.value;

        // Zoom around the original focal point
        const newTX = focalX.value - ratio * (focalX.value - startTX.value);
        const newTY = focalY.value - ratio * (focalY.value - startTY.value);

        scale.value = newScale;
        translateX.value = clampTx(newTX, newScale);
        translateY.value = clampTy(newTY, newScale);
      })
      .onEnd(() => {
        'worklet';
        isPinching.value = false;
        // Re-save so pan picks up the new position
        startTX.value = translateX.value;
        startTY.value = translateY.value;
      });

    const tap = Gesture.Tap()
      .maxDuration(250)
      .onEnd((e) => {
        'worklet';
        if (!onTileTap) return;
        if (deadZoneY.value > 0 && e.absoluteY > deadZoneY.value) return;
        const wx = (e.x - translateX.value) / scale.value;
        const wy = (e.y - translateY.value) / scale.value;

        // Taps anywhere in the world fire, not just the farm grid, so baked
        // scene placements outside the farm stay clickable.
        const worldCol = Math.floor(wx / TILE_SIZE);
        const worldRow = Math.floor(wy / TILE_SIZE);
        if (worldCol < 0 || worldCol >= wCols || worldRow < 0 || worldRow >= wRows) return;

        runOnJS(onTileTap)(
          Math.floor((wx - originX) / TILE_SIZE),
          Math.floor((wy - originY) / TILE_SIZE),
          wx,
          wy,
        );
      });

    return Gesture.Race(Gesture.Simultaneous(pan, pinch), tap);
  }, [
    worldW, worldH, screenW, screenH, minZoom, wCols, wRows, originX, originY, onTileTap,
    translateX, translateY, scale, startTX, startTY, startScale, isPinching, focalX, focalY,
    deadZoneY,
  ]);

  return { camera, gesture };
}
