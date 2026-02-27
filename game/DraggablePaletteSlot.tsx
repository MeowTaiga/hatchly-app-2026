import React from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import { runOnJS } from 'react-native-reanimated';
import type { ItemDefinition } from './types';

export interface DraggablePaletteSlotProps {
  itemType: string;
  def: ItemDefinition;
  qty: number;
  isActive: boolean;
  /** Called on tap (quick press). */
  onPress: () => void;
  /** Called when pan starts. */
  onDragStart: (itemType: string, def: ItemDefinition) => void;
  /** Called during pan with screen coords and item def for grid preview. Omit if using previewX/previewY. */
  onDragUpdate?: (x: number, y: number, def: ItemDefinition) => void;
  /** Called when pan ends. If drop was on grid, parent calls placeItemAt. */
  onDragEnd: (itemType: string, x: number, y: number) => void;
  /** When provided, pan updates these directly (no runOnJS) for smoother preview. */
  previewX?: SharedValue<number>;
  previewY?: SharedValue<number>;
  children: React.ReactNode;
}

/** Min vertical drag distance before the pan activates. */
const PAN_MIN_DISTANCE = 12;
/** Hold delay (ms) before drag activates — allows horizontal scroll first. */
const DRAG_ACTIVATE_DELAY = 50;

/**
 * Wraps a build palette slot to support tap, drag-to-place, and horizontal scrolling.
 *
 * Gesture priority:
 *  1. Quick taps (< 250ms) → tap gesture → selects the slot
 *  2. Horizontal swipes (before hold delay) → fall through to parent ScrollView
 *  3. Long-press + drag (after 250ms hold) → pan gesture → drag item to grid
 */
export const DraggablePaletteSlot = React.memo(function DraggablePaletteSlot({
  itemType,
  def,
  qty,
  isActive,
  onPress,
  onDragStart,
  onDragUpdate,
  onDragEnd,
  previewX,
  previewY,
  children,
}: DraggablePaletteSlotProps) {
  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      'worklet';
      runOnJS(onPress)();
    });

  const pan = Gesture.Pan()
    .activateAfterLongPress(DRAG_ACTIVATE_DELAY)
    .minDistance(PAN_MIN_DISTANCE)
    .onStart((e) => {
      'worklet';
      if (previewX && previewY) {
        previewX.value = e.absoluteX;
        previewY.value = e.absoluteY;
      }
      runOnJS(onDragStart)(itemType, def);
    })
    .onUpdate((e) => {
      'worklet';
      if (previewX && previewY) {
        previewX.value = e.absoluteX;
        previewY.value = e.absoluteY;
      } else if (onDragUpdate) {
        runOnJS(onDragUpdate)(e.absoluteX, e.absoluteY, def);
      }
    })
    .onEnd((e) => {
      'worklet';
      runOnJS(onDragEnd)(itemType, e.absoluteX, e.absoluteY);
    });

  const gesture = Gesture.Exclusive(tap, pan);

  return (
    <GestureDetector gesture={gesture}>
      <View collapsable={false}>
        {children}
      </View>
    </GestureDetector>
  );
});
