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
  onTileTap?: (col: number, row: number) => void;
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
  const padPx = ((wCols - cols) / 2) * TILE_SIZE;
  const farmCX = padPx + (cols * TILE_SIZE) / 2;
  const farmCY = initialFocusRow != null
    ? padPx + initialFocusRow * TILE_SIZE
    : padPx + (rows * TILE_SIZE) / 2;
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

  // ── Boundary helper (worklet) ──────────────────────────────────────────

  const clampTx = (tx: number, s: number): number => {
    'worklet';
    const ws = worldW * s;
    if (ws <= screenW) return (screenW - ws) / 2;
    return clamp(tx, screenW - ws, 0);
  };

  const clampTy = (ty: number, s: number): number => {
    'worklet';
    const ws = worldH * s;
    if (ws <= screenH) return (screenH - ws) / 2;
    return clamp(ty, screenH - ws, 0);
  };

  // ── Pan gesture ─────────────────────────────────────────────────────────

  const pan = Gesture.Pan()
    .minPointers(1)
    .maxPointers(2)
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

  // ── Pinch gesture ───────────────────────────────────────────────────────

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

  // ── Tap gesture ─────────────────────────────────────────────────────────

  const padCols = Math.floor((wCols - cols) / 2);
  const padRows = Math.floor((wRows - rows) / 2);

  const deadZone = tapDeadZoneY ?? 0;

  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd((e) => {
      'worklet';
      if (!onTileTap) return;
      if (deadZone > 0 && e.absoluteY > deadZone) return;
      const wx = (e.x - translateX.value) / scale.value;
      const wy = (e.y - translateY.value) / scale.value;
      const col = Math.floor(wx / TILE_SIZE) - padCols;
      const row = Math.floor(wy / TILE_SIZE) - padRows;
      // Fire for taps anywhere in the world (farm grid + padding) so scene placements outside farm are clickable
      const worldCol = col + padCols;
      const worldRow = row + padRows;
      if (worldCol >= 0 && worldCol < wCols && worldRow >= 0 && worldRow < wRows) {
        runOnJS(onTileTap)(col, row);
      }
    });

  // ── Compose ─────────────────────────────────────────────────────────────

  const gesture = Gesture.Race(Gesture.Simultaneous(pan, pinch), tap);

  return { camera, gesture };
}
