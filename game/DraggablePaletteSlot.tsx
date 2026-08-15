import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import type { ItemDefinition } from './types';

export interface DraggablePaletteSlotProps {
  itemType: string;
  def: ItemDefinition;
  /** False for items that can't be placed: tap and drag both become inert. */
  canPlace: boolean;
  /** Already the armed item, so tapping it again clears the selection. */
  isActive: boolean;
  onSelect: (itemType: string | null) => void;
  onDragStart: (itemType: string, def: ItemDefinition) => void;
  onDragEnd: (itemType: string, x: number, y: number) => void;
  /** Called when the gesture is torn down without ending, so no ghost is left behind. */
  onDragCancel: () => void;
  /** Finger position, written straight from the gesture worklet. */
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  children: React.ReactNode;
}

/** Min vertical drag distance before the pan activates. */
const PAN_MIN_DISTANCE = 12;
/** Hold delay (ms) before drag activates — allows horizontal scroll first. */
const DRAG_ACTIVATE_DELAY = 50;
/**
 * How far the finger must travel before a ghost appears.
 *
 * `activateAfterLongPress` activates the pan on a hold alone, so an ordinary tap
 * that lingers past the delay used to raise a ghost for an item the player was
 * only selecting. Waiting for movement means a tap produces nothing to clean up.
 */
const GHOST_REVEAL_DISTANCE = 6;

/**
 * Wraps a build palette slot to support tap, drag-to-place, and horizontal scrolling.
 *
 * Gesture priority:
 *  1. Quick taps (< 250ms) → tap gesture → selects the slot
 *  2. Horizontal swipes (before hold delay) → fall through to parent ScrollView
 *  3. Hold + drag → pan gesture → drag item to grid
 *
 * The pan writes the finger position to shared values and never crosses to JS
 * mid-drag; the drag hook picks it up on the UI thread.
 *
 * The gesture is memoised on purpose. `GestureDetector` reconfigures its native
 * handler whenever the gesture object changes identity, and the palette renders
 * under the world, so building a fresh one each render meant every slot's
 * handler was rebuilt mid-drag. Memoising the component itself would not help:
 * its visual arrives as `children`, which is a new element every time.
 */
export function DraggablePaletteSlot({
  itemType,
  def,
  canPlace,
  isActive,
  onSelect,
  onDragStart,
  onDragEnd,
  onDragCancel,
  dragX,
  dragY,
  children,
}: DraggablePaletteSlotProps) {
  /**
   * Whether this drag has moved far enough to have raised a ghost, so `onEnd`
   * knows if there is anything for the drag hook to resolve or clear.
   */
  const revealed = useSharedValue(false);
  /** True once onEnd ran, so onFinalize does not cancel a real drop. */
  const settled = useSharedValue(false);

  const gesture = useMemo(() => {
    /** Recipe scrolls aren't placeable, but tapping them still needs to fire (learn). */
    const canTap =
      canPlace ||
      def.subCategory === 'crafting_recipe' ||
      def.subCategory === 'cooking_recipe';

    const tap = Gesture.Tap()
      .maxDuration(250)
      .onEnd(() => {
        'worklet';
        if (canTap) runOnJS(onSelect)(isActive ? null : itemType);
      });

    const pan = Gesture.Pan()
      .enabled(canPlace)
      .activateAfterLongPress(DRAG_ACTIVATE_DELAY)
      .minDistance(PAN_MIN_DISTANCE)
      .onStart((e) => {
        'worklet';
        revealed.value = false;
        settled.value = false;
        dragX.value = e.absoluteX;
        dragY.value = e.absoluteY;
      })
      .onUpdate((e) => {
        'worklet';
        dragX.value = e.absoluteX;
        dragY.value = e.absoluteY;
        if (
          !revealed.value &&
          Math.abs(e.translationX) + Math.abs(e.translationY) > GHOST_REVEAL_DISTANCE
        ) {
          revealed.value = true;
          runOnJS(onDragStart)(itemType, def);
        }
      })
      .onEnd((e) => {
        'worklet';
        settled.value = true;
        if (revealed.value) {
          runOnJS(onDragEnd)(itemType, e.absoluteX, e.absoluteY);
          return;
        }
        // Held still and let go. The pan wins over the tap on a hold, so
        // without this a slow tap on a slot would select nothing at all.
        if (canTap) runOnJS(onSelect)(isActive ? null : itemType);
      })
      .onFinalize(() => {
        'worklet';
        const wasSettled = settled.value;
        revealed.value = false;
        settled.value = false;
        if (!wasSettled) runOnJS(onDragCancel)();
      });

    return Gesture.Exclusive(tap, pan);
  }, [itemType, def, canPlace, isActive, onSelect, onDragStart, onDragEnd, onDragCancel, dragX, dragY, revealed, settled]);

  return (
    <GestureDetector gesture={gesture}>
      <View collapsable={false}>
        {children}
      </View>
    </GestureDetector>
  );
}
