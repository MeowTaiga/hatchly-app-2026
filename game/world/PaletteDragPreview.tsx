import { CachedImage } from '@/components/ui/CachedImage';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { TILE_SIZE } from '../constants';
import type { CameraState, ItemDefinition } from '../types';

const BASE_EMOJI_SIZE = 28;

/**
 * How far above the finger the ghost rides.
 *
 * Centring it on the finger meant your own thumb covered the thing you were
 * placing, which is most of why aiming felt vague. The drag hook applies the
 * same offset when it resolves the target tile, so the ghost and the tile it
 * lands on stay in agreement.
 */
export const GHOST_LIFT = 44;

export interface PalettePreview {
  itemType: string;
  def: ItemDefinition;
}

/** How much the ghost fades when the tile under it would refuse the drop. */
const INVALID_FADE = 0.45;

interface PaletteDragPreviewProps {
  preview: PalettePreview;
  camera: CameraState;
  x: SharedValue<number>;
  y: SharedValue<number>;
  scale: SharedValue<number>;
  opacity: SharedValue<number>;
  /** Dropping here would be refused, so the ghost says so before you let go. */
  invalid: boolean;
}

/**
 * The ghost that follows a finger dragging an item out of the build palette.
 *
 * Everything that changes while the finger moves is a transform on the UI
 * thread. Its size comes from the item's footprint and is baked into the layout
 * once, with the camera's zoom folded into the scale — driving width and height
 * per frame would put a layout pass between every finger move and the screen,
 * which is what made dragging feel like it was catching.
 */
export function PaletteDragPreview({
  preview,
  camera,
  x,
  y,
  scale,
  opacity,
  invalid,
}: PaletteDragPreviewProps) {
  const baseWidth = preview.def.cols * TILE_SIZE;
  const baseHeight = preview.def.rows * TILE_SIZE;
  const fade = invalid ? INVALID_FADE : 1;

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value * fade,
    transform: [
      { translateX: x.value - baseWidth / 2 },
      { translateY: y.value - baseHeight / 2 - GHOST_LIFT },
      { scale: camera.scale.value * scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[styles.root, { width: baseWidth, height: baseHeight }, style]}
      pointerEvents="none"
    >
      {preview.def.imageUrl ? (
        <CachedImage source={{ uri: preview.def.imageUrl }} style={styles.image} resizeMode="contain" />
      ) : (
        <Text style={[styles.emoji, { fontSize: BASE_EMOJI_SIZE }]}>{preview.def.emoji}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 500,
    backgroundColor: 'transparent',
  },
  image: { width: '100%', height: '100%' },
  emoji: { fontWeight: 'bold' },
});
