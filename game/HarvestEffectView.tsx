/**
 * Harvest effect overlay — crop: single jiggle+shrink. Tree fruit: individual
 * fruit sprites with subtle shake + fade.
 */

import { CachedImage } from '@/components/ui/CachedImage';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { TILE_SIZE } from './constants';
import type { HarvestEffect } from './types';

const CROP_OVERFLOW_SCALE = 1.35;
const FRUIT_SIZE = TILE_SIZE * 0.45;

/** Single fruit sprite: quick rotate (origin top center), fall 15px, scale to 0. */
function FruitSprite({
  left,
  top,
  cropImageUrl,
  cropEmoji,
  delayMs,
}: {
  left: number;
  top: number;
  cropImageUrl?: string;
  cropEmoji?: string;
  delayMs: number;
}) {
  const rotate = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  useEffect(() => {
    rotate.value = withDelay(delayMs, withTiming(22, { duration: 120, easing: Easing.out(Easing.quad) }));
    translateY.value = withDelay(delayMs, withTiming(15, { duration: 120, easing: Easing.in(Easing.quad) }));
    scale.value = withDelay(delayMs, withTiming(0, { duration: 120, easing: Easing.in(Easing.quad) }));
  }, [delayMs]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left,
          top,
          width: FRUIT_SIZE,
          height: FRUIT_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
          transformOrigin: 'top',
        },
        style,
      ]}
    >
      {cropImageUrl ? (
        <CachedImage
          source={{ uri: cropImageUrl }}
          style={{ width: FRUIT_SIZE, height: FRUIT_SIZE }}
          resizeMode="contain"
        />
      ) : cropEmoji ? (
        <Text style={[styles.fruitEmoji, { fontSize: FRUIT_SIZE * 0.85 }]}>{cropEmoji}</Text>
      ) : null}
    </Animated.View>
  );
}

/** Tree fruit harvest: multiple individual fruit with shake + fade. */
function TreeFruitHarvest({ effect }: { effect: HarvestEffect }) {
  const totalQty = effect.drops.reduce((s, d) => s + d.qty, 0);
  const count = Math.min(Math.max(1, totalQty), 3);
  const pxW = TILE_SIZE * effect.tileCols;
  const pxH = TILE_SIZE * effect.tileRows;
  const positions: { left: number; top: number }[] = [
    { left: pxW / 2 - FRUIT_SIZE / 2, top: pxH / 3 - FRUIT_SIZE / 2 },
    { left: pxW / 4 - FRUIT_SIZE / 2, top: pxH / 3 + 12 - FRUIT_SIZE / 2 },
    { left: (3 * pxW) / 4 - FRUIT_SIZE / 2, top: pxH / 3 + 12 - FRUIT_SIZE / 2 },
  ];
  return (
    <>
      {positions.slice(0, count).map((pos, i) => (
        <FruitSprite
          key={i}
          left={pos.left}
          top={pos.top}
          cropImageUrl={effect.cropImageUrl}
          cropEmoji={effect.cropEmoji}
          delayMs={i * 30}
        />
      ))}
    </>
  );
}

/** Crop harvest: single jiggle + shrink (one crop). */
function CropHarvest({ effect }: { effect: HarvestEffect }) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  useEffect(() => {
    rotation.value = withSequence(
      withTiming(-8, { duration: 50, easing: Easing.out(Easing.quad) }),
      withTiming(6, { duration: 55, easing: Easing.out(Easing.quad) }),
      withTiming(-4, { duration: 45, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 45, easing: Easing.in(Easing.quad) }),
    );
    scale.value = withSequence(
      withTiming(1.1, { duration: 80, easing: Easing.out(Easing.back(1.3)) }),
      withTiming(0, { duration: 140, easing: Easing.in(Easing.quad) }),
    );
  }, []);
  const pxW = TILE_SIZE * effect.tileCols;
  const pxH = TILE_SIZE * effect.tileRows;
  const cropW = pxW * CROP_OVERFLOW_SCALE;
  const cropH = pxH * CROP_OVERFLOW_SCALE;
  const cropLeft = (pxW - cropW) / 2;
  const cropTop = pxH / 2 - cropH;
  const style = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));
  return (
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
        style,
      ]}
    >
      {effect.cropImageUrl ? (
        <CachedImage
          source={{ uri: effect.cropImageUrl }}
          style={{ width: cropW, height: cropH }}
          resizeMode="contain"
        />
      ) : effect.cropEmoji ? (
        <Text style={[styles.cropEmoji, { fontSize: TILE_SIZE * 0.5 }]}>{effect.cropEmoji}</Text>
      ) : null}
    </Animated.View>
  );
}

interface HarvestEffectViewProps {
  effect: HarvestEffect;
  itemDefs: Record<string, import('./types').ItemDefinition>;
}

export function HarvestEffectView({ effect }: HarvestEffectViewProps) {
  const totalQty = effect.drops.reduce((s, d) => s + d.qty, 0);
  const isStickOnly = effect.drops.every((d) => d.itemType === 'stick');
  const isTreeFruit = totalQty > 1 && (effect.cropImageUrl || effect.cropEmoji);

  if (isStickOnly) return null;

  const left = effect.col * TILE_SIZE;
  const top = effect.row * TILE_SIZE;
  const pxW = TILE_SIZE * effect.tileCols;
  const pxH = TILE_SIZE * effect.tileRows;

  return (
    <View
      style={[styles.overlay, { left, top, width: pxW, height: pxH, overflow: 'visible' }]}
      pointerEvents="none"
    >
      {isTreeFruit ? <TreeFruitHarvest effect={effect} /> : <CropHarvest effect={effect} />}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
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
  fruitEmoji: {
    textAlign: 'center',
  },
});
