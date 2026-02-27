import React, { useLayoutEffect, useRef } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { TILE_SIZE } from './constants';

const DRAG_OPACITY = 0.6;

/** Screen-space layout of the backpack/build palette drop zone. When drag ends over this area, item is stored. */
export interface DropZoneLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DraggablePlacedItemProps {
  col: number;
  row: number;
  tileCols: number;
  tileRows: number;
  anchorId: string;
  itemType: string;
  gridCols: number;
  gridRows: number;
  onMoveEnd: (anchorId: string, col: number, row: number) => void;
  /** Called when item is dropped over the backpack zone (returns to inventory). */
  onStore?: (anchorId: string) => void;
  /** Screen bounds of backpack drop zone. When drop position is inside, onStore is used instead of onMoveEnd. */
  dropZoneLayout?: DropZoneLayout | null;
  onDragPreview?: (preview: { col: number; row: number; tileCols: number; tileRows: number; itemType: string; anchorId: string } | null) => void;
  /** When this clears (becomes null) after we were the pending item, reset translate to avoid flicker. */
  pendingDropTarget: { anchorId: string; newCol: number; newRow: number } | null;
  /** When false, drag is disabled but wrapper stays mounted so child never unmounts (avoids flicker). */
  enabled?: boolean;
  children: React.ReactNode;
}

/**
 * Checks if (x,y) in screen coords is inside the drop zone.
 */
function isInsideDropZone(
  x: number, y: number, zone: DropZoneLayout | null | undefined,
): boolean {
  if (!zone) return false;
  return x >= zone.x && x <= zone.x + zone.width && y >= zone.y && y <= zone.y + zone.height;
}

/**
 * Wraps a placed item so it can be dragged in edit mode.
 * - Semi-transparent while dragging.
 * - Reports preview (col, row) for drop highlight.
 * - Drop on backpack zone: stores item (onStore). Drop on grid: moves item (onMoveEnd).
 * - Does not reset translate on pan end; resets when pendingDropTarget clears (server confirmed).
 */
export const DraggablePlacedItem = React.memo(function DraggablePlacedItem({
  col,
  row,
  tileCols,
  tileRows,
  anchorId,
  itemType,
  gridCols,
  gridRows,
  onMoveEnd,
  onStore,
  dropZoneLayout,
  onDragPreview,
  pendingDropTarget,
  enabled = true,
  children,
}: DraggablePlacedItemProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const isDragging = useSharedValue(0);
  const prevPendingRef = useRef<typeof pendingDropTarget>(null);
  const isMounted = useRef(true);

  React.useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useLayoutEffect(() => {
    const wasPending = prevPendingRef.current?.anchorId === anchorId;
    prevPendingRef.current = pendingDropTarget;
    // Reset translation when the server confirms the move (clearing pending status)
    if (wasPending && pendingDropTarget === null) {
      translateX.value = 0;
      translateY.value = 0;
    }
  }, [pendingDropTarget, anchorId, translateX, translateY]);

  const handleDragEnd = React.useCallback(
    (absoluteX: number, absoluteY: number, transX: number, transY: number) => {
      if (onStore && isInsideDropZone(absoluteX, absoluteY, dropZoneLayout)) {
        onStore(anchorId);
      } else {
        const baseX = col * TILE_SIZE;
        const baseY = row * TILE_SIZE;
        const newCol = Math.floor((baseX + transX) / TILE_SIZE);
        const newRow = Math.floor((baseY + transY) / TILE_SIZE);
        const clampedCol = Math.max(0, Math.min(gridCols - tileCols, newCol));
        const clampedRow = Math.max(0, Math.min(gridRows - tileRows, newRow));

        if (clampedCol === col && clampedRow === row) {
          translateX.value = withSpring(0);
          translateY.value = withSpring(0);
        } else {
          onMoveEnd(anchorId, clampedCol, clampedRow);

          // After dispatching the move, we wait to see if it was accepted.
          // If no pending drop target shows up, we snap back.
          setTimeout(() => {
            if (isMounted.current && prevPendingRef.current === null && isDragging.value === 0) {
              translateX.value = withSpring(0);
              translateY.value = withSpring(0);
            }
          }, 250);
        }
      }
    },
    [anchorId, col, row, gridCols, gridRows, tileCols, tileRows, onMoveEnd, onStore, dropZoneLayout, isDragging, translateX, translateY],
  );

  const pan = Gesture.Pan()
    .enabled(enabled)
    .onStart((e) => {
      isDragging.value = 1;
      const width = tileCols * TILE_SIZE;
      const height = tileRows * TILE_SIZE;
      // Store the offset from center so the item snaps its center to the finger
      offsetX.value = e.x - width / 2;
      offsetY.value = e.y - height / 2;
      translateX.value = offsetX.value;
      translateY.value = offsetY.value;
      if (onDragPreview) runOnJS(onDragPreview)({ col, row, tileCols, tileRows, itemType, anchorId });
    })
    .onUpdate((e) => {
      translateX.value = e.translationX + offsetX.value;
      translateY.value = e.translationY + offsetY.value;
      const baseX = col * TILE_SIZE;
      const baseY = row * TILE_SIZE;
      const curTX = e.translationX + offsetX.value;
      const curTY = e.translationY + offsetY.value;
      const newCol = Math.floor((baseX + curTX) / TILE_SIZE);
      const newRow = Math.floor((baseY + curTY) / TILE_SIZE);
      const clampedCol = Math.max(0, Math.min(gridCols - tileCols, newCol));
      const clampedRow = Math.max(0, Math.min(gridRows - tileRows, newRow));
      if (onDragPreview) runOnJS(onDragPreview)({ col: clampedCol, row: clampedRow, tileCols, tileRows, itemType, anchorId });
    })
    .onEnd((e) => {
      isDragging.value = 0;
      if (onDragPreview) runOnJS(onDragPreview)(null);

      const curTX = e.translationX + offsetX.value;
      const curTY = e.translationY + offsetY.value;

      runOnJS(handleDragEnd)(e.absoluteX, e.absoluteY, curTX, curTY);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    opacity: isDragging.value ? DRAG_OPACITY : 1,
    zIndex: isDragging.value ? 1000 : 1,
  }));

  const outerStyle = {
    position: 'absolute' as const,
    left: col * TILE_SIZE,
    top: row * TILE_SIZE,
    width: tileCols * TILE_SIZE,
    height: tileRows * TILE_SIZE,
  };

  return (
    <View style={outerStyle} collapsable={false}>
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ width: '100%', height: '100%' }, animatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
});
