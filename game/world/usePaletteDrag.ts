import { useCallback, useRef, useState } from 'react';
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useGame } from '../GameProvider';
import { resolvePlacement, TREE_FOOTPRINT } from '../gridHelpers';
import { NO_ANCHOR, packedAnchorAt, unpackAnchor, type GridDimensions } from '../screenToGrid';
import type { CameraState, GridData, ItemDefinition } from '../types';
import { GHOST_LIFT, type PalettePreview } from './PaletteDragPreview';

/** Scale the ghost holds while airborne, so it reads as picked up. */
const GHOST_AIRBORNE_SCALE = 1.12;

/** The tile region an item would land on, highlighted under the finger. */
export interface DropPreview {
  col: number;
  row: number;
  tileCols: number;
  tileRows: number;
  /** False when letting go here would be refused, so the highlight can say so. */
  valid: boolean;
}

interface UsePaletteDragOptions {
  camera: CameraState;
  gridDims: GridDimensions;
  grid: GridData;
  /** Screen Y below which a drop counts as "back into the palette". */
  hudCutoff: number;
}

export interface PaletteDrag {
  /** What is being dragged. Set once per drag, so this is not a per-frame value. */
  dragPreview: PalettePreview | null;
  /** The tile highlight under the ghost. Changes only when the target tile does. */
  dropPreview: DropPreview | null;
  /** Finger position, owned by the UI thread. */
  ghostX: SharedValue<number>;
  ghostY: SharedValue<number>;
  ghostScale: SharedValue<number>;
  ghostOpacity: SharedValue<number>;
  onDragStart: (itemType: string, def: ItemDefinition) => void;
  onDragEnd: (itemType: string, screenX: number, screenY: number) => void;
  /** Safety net for a drag the gesture system tears down without ending. */
  onDragCancel: () => void;
}

function footprintOf(def: ItemDefinition): { tileCols: number; tileRows: number } {
  const isTree = def.category === 'tree';
  return {
    tileCols: isTree ? TREE_FOOTPRINT : def.cols,
    tileRows: isTree ? TREE_FOOTPRINT : def.rows,
  };
}

/**
 * Dragging an item out of the build palette and onto the world.
 *
 * The finger position, the ghost that follows it and the tile the drop resolves
 * to all live on the UI thread. JS is only woken when the target tile changes,
 * which is a handful of times per drag rather than sixty times a second — the
 * previous version pushed three React state updates per frame through the
 * largest component in the app, and animated the ghost with `left`/`top`, so
 * every finger move also forced a layout pass.
 */
export function usePaletteDrag({
  camera,
  gridDims,
  grid,
  hudCutoff,
}: UsePaletteDragOptions): PaletteDrag {
  const { itemDefs, placeItemAt } = useGame();

  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);
  const ghostScale = useSharedValue(1);
  const ghostOpacity = useSharedValue(0);
  const isDragging = useSharedValue(0);
  const footCols = useSharedValue(1);
  const footRows = useSharedValue(1);

  const [dragPreview, setDragPreview] = useState<PalettePreview | null>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  /** Read on drop: the UI thread already worked the target out. */
  const dropRef = useRef<DropPreview | null>(null);
  /** Guards against a cancel arriving after a real drop. */
  const openRef = useRef(false);
  /** What's in hand, readable without making the reaction depend on render state. */
  const draggedDefRef = useRef<ItemDefinition | null>(null);

  /**
   * The grid and placement function as of the last render.
   *
   * Read through a ref so every callback below is stable for the life of the
   * screen. They are handed to the palette slots, and a slot rebuilds its native
   * gesture handler whenever they change identity — placing an item changes the
   * grid, so without this every placement reconfigured the whole palette.
   */
  const latest = useRef({ grid, itemDefs, hudCutoff, placeItemAt });
  latest.current = { grid, itemDefs, hudCutoff, placeItemAt };

  const applyAnchor = useCallback((packed: number) => {
    const coord = unpackAnchor(packed);
    const def = draggedDefRef.current;
    const next: DropPreview | null = coord && def
      ? {
        ...coord,
        tileCols: footCols.value,
        tileRows: footRows.value,
        valid: resolvePlacement(latest.current.grid, latest.current.itemDefs, def, coord.col, coord.row).ok,
      }
      : null;
    dropRef.current = next;
    setDropPreview(next);
  }, [footCols, footRows]);

  // Resolving the target here keeps the whole hot path off the JS thread. The
  // packed result means an unchanged tile costs nothing at all.
  useAnimatedReaction(
    () => {
      if (!isDragging.value) return NO_ANCHOR;
      return packedAnchorAt(
        ghostX.value,
        ghostY.value - GHOST_LIFT,
        camera.translateX.value,
        camera.translateY.value,
        camera.scale.value,
        gridDims,
        footCols.value,
        footRows.value,
      );
    },
    (curr, prev) => {
      if (curr === prev) return;
      runOnJS(applyAnchor)(curr);
    },
  );

  const clearGhost = useCallback(() => {
    setDragPreview(null);
    setDropPreview(null);
    dropRef.current = null;
    draggedDefRef.current = null;
    ghostScale.value = 1;
    ghostOpacity.value = 0;
  }, [ghostScale, ghostOpacity]);

  const endDrag = useCallback(() => {
    openRef.current = false;
    isDragging.value = 0;
  }, [isDragging]);

  const onDragStart = useCallback((itemType: string, def: ItemDefinition) => {
    const { tileCols, tileRows } = footprintOf(def);
    footCols.value = tileCols;
    footRows.value = tileRows;
    dropRef.current = null;
    draggedDefRef.current = def;
    openRef.current = true;

    setDragPreview({ itemType, def });
    setDropPreview(null);

    // Fade and swell in place of appearing at full size, so the pickup reads.
    ghostOpacity.value = withTiming(1, { duration: 90 });
    ghostScale.value = withSpring(GHOST_AIRBORNE_SCALE, { damping: 14, stiffness: 220 });
    isDragging.value = 1;
  }, [footCols, footRows, ghostOpacity, ghostScale, isDragging]);

  const onDragEnd = useCallback(
    (itemType: string, _screenX: number, screenY: number) => {
      if (!openRef.current) return;
      endDrag();

      const { itemDefs, hudCutoff, placeItemAt } = latest.current;
      const def = itemDefs[itemType];
      const drop = dropRef.current;
      // Released over the grid rather than back into the palette. A refusal
      // needs no ghost animation: the footprint was already showing red, and
      // the pet says why.
      if (screenY <= hudCutoff && def && drop) {
        placeItemAt(itemType, drop.col, drop.row);
      }
      clearGhost();
    },
    [endDrag, clearGhost],
  );

  // A drag can be torn down without ending — the gesture losing to another
  // recogniser, or the touch being cancelled. Runs unconditionally so the ghost
  // cannot survive its drag under any ordering.
  const onDragCancel = useCallback(() => {
    endDrag();
    clearGhost();
  }, [endDrag, clearGhost]);

  return {
    dragPreview,
    dropPreview,
    ghostX,
    ghostY,
    ghostScale,
    ghostOpacity,
    onDragStart,
    onDragEnd,
    onDragCancel,
  };
}
