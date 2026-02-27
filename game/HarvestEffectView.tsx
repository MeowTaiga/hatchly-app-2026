/**
 * Crop harvest overlay — quick jiggle around bottom-center, then shrink-vanish.
 * No opacity changes — crop stays solid throughout the animation.
 */

import { CachedImage } from '@/components/ui/CachedImage';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { TILE_SIZE } from './constants';
import type { HarvestEffect } from './types';

const CROP_OVERFLOW_SCALE = 1.35;

interface HarvestEffectViewProps {
  effect: HarvestEffect;
  itemDefs: Record<string, import('./types').ItemDefinition>;
}

export function HarvestEffectView({ effect }: HarvestEffectViewProps) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    // Quick jiggle: left-right-left-center, bottom-center anchor
    rotation.value = withSequence(
      withTiming(-12, { duration: 60, easing: Easing.out(Easing.quad) }),
      withTiming(10, { duration: 60, easing: Easing.out(Easing.quad) }),
      withTiming(-6, { duration: 50, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 50, easing: Easing.out(Easing.quad) }),
    );

    // Shrink-vanish after jiggle (no opacity change)
    scale.value = withSequence(
      withTiming(1.15, { duration: 100, easing: Easing.out(Easing.back(1.5)) }),
      withTiming(0, { duration: 150, easing: Easing.in(Easing.quad) }),
    );
  }, []);

  const left = effect.col * TILE_SIZE;
  const top = effect.row * TILE_SIZE;
  const pxW = TILE_SIZE * effect.tileCols;
  const pxH = TILE_SIZE * effect.tileRows;

  const cropW = pxW * CROP_OVERFLOW_SCALE;
  const cropH = pxH * CROP_OVERFLOW_SCALE;
  const cropLeft = (pxW - cropW) / 2;
  const cropTop = pxH / 2 - cropH;

  const cropAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <View
      style={[styles.cropOverlay, { left, top, width: pxW, height: pxH, overflow: 'visible' }]}
      pointerEvents="none"
    >
      <Animated.View
        style={[
          styles.cropWrapper,
          {
            width: cropW,
            height: cropH,
            left: cropLeft,
            top: cropTop,
            transformOrigin: 'center bottom',
          },
          cropAnimStyle,
        ]}
      >
        {effect.cropImageUrl ? (
          <CachedImage
            source={{ uri: effect.cropImageUrl }}
            style={{ width: cropW, height: cropH }}
            resizeMode="contain"
          />
        ) : effect.cropEmoji ? (
          <Text style={[styles.cropEmoji, { fontSize: TILE_SIZE * 0.5 }]}>
            {effect.cropEmoji}
          </Text>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  cropOverlay: {
    position: 'absolute',
    zIndex: 200,
  },
  cropWrapper: {
    position: 'absolute',
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropEmoji: {
    textAlign: 'center',
  },
});
