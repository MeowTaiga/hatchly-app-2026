import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { TILE_SIZE } from '../constants';
import { itemArtBox, PlacedItemView } from '../PlacedItemView';
import type { ItemDefinition, PlacedItem } from '../types';

const DRAG_OPACITY = 0.6;
const FILL = { width: '100%', height: '100%', overflow: 'visible' } as const;
/** Snappy and barely overshooting, so a drop reads as landing rather than wobbling. */
const SETTLE_SPRING = { damping: 22, stiffness: 320, mass: 0.6 } as const;
/** Centered hit area, so taps on transparent image edges reach items behind. */
const HIT_AREA_RATIO = 0.55;

/** Screen-space bounds of the backpack drop zone. */
export interface DropZoneLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DragPreview {
  col: number;
  row: number;
  tileCols: number;
  tileRows: number;
  itemType: string;
  anchorId: string;
}

interface WorldItemProps {
  item: PlacedItem;
  itemDefs: Record<string, ItemDefinition>;
  isSelected: boolean;
  isMoving: boolean;
  fenceConnectionMask?: number;
  highlighted: boolean;
  gridCols: number;
  gridRows: number;
  /** Camera zoom, to convert finger travel into world pixels. */
  cameraScale: SharedValue<number>;
  /** Enables the pan gesture. The rest of the component mounts either way. */
  draggable: boolean;
  /** True while this item's move is awaiting server confirmation. */
  isPendingDrop: boolean;
  dropZoneLayout: DropZoneLayout | null;
  /** Returns true when the move was accepted; false snaps the item back. */
  onMoveEnd: (anchorId: string, col: number, row: number) => boolean;
  onStore: (anchorId: string) => void;
  onDragPreview: (preview: DragPreview | null) => void;
}

function isInsideDropZone(x: number, y: number, zone: DropZoneLayout | null): boolean {
  if (!zone) return false;
  return x >= zone.x && x <= zone.x + zone.width && y >= zone.y && y <= zone.y + zone.height;
}

/**
 * A placed item plus its drag behaviour, as one memo boundary.
 *
 * Drag used to live in a separate wrapper that took the item view as `children`.
 * Because the parent rebuilt that child element on every world render, the
 * wrapper's props were never reference-equal and all ~150 of them re-rendered on
 * any grid change. Owning the view here means the comparator below actually holds.
 *
 * Hooks mount unconditionally so toggling edit mode never remounts the item —
 * only the gesture handler is conditional.
 */
export const WorldItem = React.memo(function WorldItem({
  item,
  itemDefs,
  isSelected,
  isMoving,
  fenceConnectionMask,
  highlighted,
  gridCols,
  gridRows,
  cameraScale,
  draggable,
  isPendingDrop,
  dropZoneLayout,
  onMoveEnd,
  onStore,
  onDragPreview,
}: WorldItemProps) {
  const { col, row, tileCols, tileRows, itemType } = item;
  const anchorId = item.id;
  const def = itemDefs[itemType];
  const art = itemArtBox(def, item);
  const footW = tileCols * TILE_SIZE;
  const footH = tileRows * TILE_SIZE;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const isDragging = useSharedValue(0);
  // Last tile handed to JS, so a drag only crosses the bridge on tile changes.
  const lastPreviewCol = useSharedValue(-1);
  const lastPreviewRow = useSharedValue(-1);
  const wasPendingRef = useRef(false);
  /** The tile the current translate is measured from. */
  const anchorTileRef = useRef({ col, row });

  /**
   * Keep the item where the finger left it when its tile changes underneath.
   *
   * On-screen position is `left`/`top` plus the drag offset. Accepting a move
   * rewrites `left`/`top` immediately while the offset still holds the whole
   * drag, so the item used to jump by the drag distance a second time and only
   * come back when the server confirmed and the offset was zeroed. Cancelling
   * out the tile change and springing the remainder away turns that into a
   * settle onto the target tile.
   */
  useLayoutEffect(() => {
    const from = anchorTileRef.current;
    if (from.col === col && from.row === row) return;
    anchorTileRef.current = { col, row };
    if (translateX.value === 0 && translateY.value === 0) return;
    translateX.value += (from.col - col) * TILE_SIZE;
    translateY.value += (from.row - row) * TILE_SIZE;
    translateX.value = withSpring(0, SETTLE_SPRING);
    translateY.value = withSpring(0, SETTLE_SPRING);
  }, [col, row, translateX, translateY]);

  useLayoutEffect(() => {
    const wasPending = wasPendingRef.current;
    wasPendingRef.current = isPendingDrop;
    // Backstop: if a confirmation lands without the tile ever changing, make
    // sure no drag offset is left behind.
    if (wasPending && !isPendingDrop) {
      translateX.value = withSpring(0, SETTLE_SPRING);
      translateY.value = withSpring(0, SETTLE_SPRING);
    }
  }, [isPendingDrop, translateX, translateY]);

  const width = art.pxW;
  const height = art.pxH;
  const hitW = Math.max(20, footW * HIT_AREA_RATIO);
  const hitH = Math.max(20, footH * HIT_AREA_RATIO);

  const handleDragEnd = useCallback(
    (absoluteX: number, absoluteY: number, transX: number, transY: number) => {
      if (isInsideDropZone(absoluteX, absoluteY, dropZoneLayout)) {
        onStore(anchorId);
        return;
      }

      // Round, not floor: the item should land on the tile it mostly covers,
      // which is what the drop footprint has been showing during the drag.
      const newCol = Math.round((col * TILE_SIZE + transX) / TILE_SIZE);
      const newRow = Math.round((row * TILE_SIZE + transY) / TILE_SIZE);
      const clampedCol = Math.max(0, Math.min(gridCols - tileCols, newCol));
      const clampedRow = Math.max(0, Math.min(gridRows - tileRows, newRow));

      // Either it didn't move or the move was refused: settle back home. When
      // accepted, the tile-change effect above springs it onto the new tile.
      if ((clampedCol === col && clampedRow === row) || !onMoveEnd(anchorId, clampedCol, clampedRow)) {
        translateX.value = withSpring(0, SETTLE_SPRING);
        translateY.value = withSpring(0, SETTLE_SPRING);
      }
    },
    [anchorId, col, row, gridCols, gridRows, tileCols, tileRows, onMoveEnd, onStore,
      dropZoneLayout, translateX, translateY],
  );

  const pan = useMemo(
    () => Gesture.Pan()
      .onStart((e) => {
        isDragging.value = 1;
        // e.x/e.y are hit-area coords, and the hit area is centred on the item.
        offsetX.value = e.x - hitW / 2;
        offsetY.value = e.y - hitH / 2;
        translateX.value = offsetX.value;
        translateY.value = offsetY.value;
        lastPreviewCol.value = col;
        lastPreviewRow.value = row;
        runOnJS(onDragPreview)({ col, row, tileCols, tileRows, itemType, anchorId });
      })
      .onUpdate((e) => {
        // Finger travel is screen pixels; the item lives inside the zoomed
        // camera, so undo the zoom or it drifts away from the finger.
        const zoom = cameraScale.value || 1;
        const curTX = e.translationX / zoom + offsetX.value;
        const curTY = e.translationY / zoom + offsetY.value;
        translateX.value = curTX;
        translateY.value = curTY;

        const newCol = Math.round((col * TILE_SIZE + curTX) / TILE_SIZE);
        const newRow = Math.round((row * TILE_SIZE + curTY) / TILE_SIZE);
        const clampedCol = Math.max(0, Math.min(gridCols - tileCols, newCol));
        const clampedRow = Math.max(0, Math.min(gridRows - tileRows, newRow));

        // The preview snaps to whole tiles, so reporting every frame would just
        // re-render the world with values it already has.
        if (clampedCol !== lastPreviewCol.value || clampedRow !== lastPreviewRow.value) {
          lastPreviewCol.value = clampedCol;
          lastPreviewRow.value = clampedRow;
          runOnJS(onDragPreview)({ col: clampedCol, row: clampedRow, tileCols, tileRows, itemType, anchorId });
        }
      })
      .onEnd((e) => {
        const zoom = cameraScale.value || 1;
        isDragging.value = 0;
        runOnJS(onDragPreview)(null);
        runOnJS(handleDragEnd)(
          e.absoluteX,
          e.absoluteY,
          e.translationX / zoom + offsetX.value,
          e.translationY / zoom + offsetY.value,
        );
      })
      // The gesture can be torn down without ending. Without this the item
      // stays parked at the drag offset with nothing to bring it back.
      .onFinalize(() => {
        if (!isDragging.value) return;
        isDragging.value = 0;
        runOnJS(onDragPreview)(null);
        translateX.value = withSpring(0, SETTLE_SPRING);
        translateY.value = withSpring(0, SETTLE_SPRING);
      }),
    [col, row, tileCols, tileRows, itemType, anchorId, gridCols, gridRows, hitW, hitH,
      onDragPreview, handleDragEnd, isDragging, offsetX, offsetY, translateX, translateY,
      lastPreviewCol, lastPreviewRow, cameraScale],
  );

  const animatedStyle = useAnimatedStyle(() => {
    const tx = translateX.value;
    const ty = translateY.value;
    // Stay lifted until the item has actually settled, not just until the finger
    // lifts — otherwise it drops behind its neighbours mid-spring.
    const lifted = isDragging.value === 1 || tx !== 0 || ty !== 0;
    return {
      transform: [{ translateX: tx }, { translateY: ty }],
      opacity: isDragging.value ? DRAG_OPACITY : 1,
      zIndex: lifted ? 1000 : 1,
      overflow: 'visible' as const,
    };
  });

  const outerStyle = useMemo(() => ({
    position: 'absolute' as const,
    left: col * TILE_SIZE,
    top: row * TILE_SIZE - art.overflowUp,
    width,
    height,
    overflow: 'visible' as const,
  }), [col, row, width, height, art.overflowUp]);

  const hitAreaStyle = useMemo(() => ({
    position: 'absolute' as const,
    left: (width - hitW) / 2,
    top: art.overflowUp + (footH - hitH) / 2,
    width: hitW,
    height: hitH,
  }), [width, hitW, hitH, art.overflowUp, footH]);

  // The outer View owns the position, so the view itself draws at the origin.
  const localItem = useMemo(() => ({ ...item, col: 0, row: 0 }), [item]);

  return (
    <View style={outerStyle} collapsable={false} pointerEvents="box-none">
      <Animated.View style={[FILL, animatedStyle]}>
        <View style={FILL} pointerEvents="none">
          <PlacedItemView
            item={localItem}
            itemDefs={itemDefs}
            isSelected={isSelected}
            isMoving={isMoving}
            fenceConnectionMask={fenceConnectionMask}
            highlighted={highlighted}
          />
        </View>
        {/* Only in edit mode — otherwise every item registers a native pan
            handler that the gesture system hit-tests on every touch. */}
        {draggable && (
          <GestureDetector gesture={pan}>
            <View style={hitAreaStyle} />
          </GestureDetector>
        )}
      </Animated.View>
    </View>
  );
}, (prev, next) => {
  const a = prev.item;
  const b = next.item;
  return (
    a.id === b.id &&
    a.itemType === b.itemType &&
    a.col === b.col &&
    a.row === b.row &&
    a.tileCols === b.tileCols &&
    a.tileRows === b.tileRows &&
    a.imageUrl === b.imageUrl &&
    a.emoji === b.emoji &&
    a.color === b.color &&
    a.watered === b.watered &&
    a.plantedAt === b.plantedAt &&
    a.growthMs === b.growthMs &&
    a.anchorId === b.anchorId &&
    a.treeFruitCount === b.treeFruitCount &&
    a.fruitLastHarvestedDate === b.fruitLastHarvestedDate &&
    a.clientId === b.clientId &&
    prev.isSelected === next.isSelected &&
    prev.isMoving === next.isMoving &&
    prev.fenceConnectionMask === next.fenceConnectionMask &&
    prev.highlighted === next.highlighted &&
    prev.gridCols === next.gridCols &&
    prev.gridRows === next.gridRows &&
    prev.cameraScale === next.cameraScale &&
    prev.draggable === next.draggable &&
    prev.isPendingDrop === next.isPendingDrop &&
    prev.itemDefs === next.itemDefs &&
    prev.dropZoneLayout === next.dropZoneLayout &&
    prev.onMoveEnd === next.onMoveEnd &&
    prev.onStore === next.onStore &&
    prev.onDragPreview === next.onDragPreview
  );
});
