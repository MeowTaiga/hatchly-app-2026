/**
 * Harvest effect overlay — crop: single jiggle+shrink. Tree fruit: individual
 * fruit sprites with subtle shake + fade.
 */

import { CachedImage } from '@/components/ui/CachedImage';
import React, { useCallback, useEffect, useState } from 'react';
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

/** How far a fruit falls before it lands and fades. */
const FRUIT_FALL_DISTANCE = TILE_SIZE * 0.9;
const FRUIT_DETACH_MS = 110;
const FRUIT_FALL_MS = 260;
const FRUIT_FADE_MS = 130;
/** Gap between successive fruit, so they don't read as one blob. */
const FRUIT_STAGGER_MS = 70;
/**
 * How long to wait for a fruit sprite before animating without it.
 *
 * The animation used to start on mount, so a crop image that arrived from disk a
 * few frames later missed most of it and the fruit appeared to blink or jump.
 */
const SPRITE_WAIT_MS = 220;

/**
 * One fruit coming off a tree: it detaches with a small tilt, falls under
 * gravity, then fades where it lands.
 */
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
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  // An emoji draws immediately; an image has to be decoded first.
  const [spriteReady, setSpriteReady] = useState(!cropImageUrl);
  const onSpriteLoad = useCallback(() => setSpriteReady(true), []);

  // Don't wait forever on an image that fails or stalls.
  useEffect(() => {
    if (spriteReady) return;
    const t = setTimeout(() => setSpriteReady(true), SPRITE_WAIT_MS);
    return () => clearTimeout(t);
  }, [spriteReady]);

  useEffect(() => {
    if (!spriteReady) return;
    opacity.value = withDelay(delayMs, withTiming(1, { duration: 60 }));
    // Pops off the branch, then keeps tilting as it falls.
    rotate.value = withDelay(
      delayMs,
      withSequence(
        withTiming(-10, { duration: FRUIT_DETACH_MS, easing: Easing.out(Easing.quad) }),
        withTiming(26, { duration: FRUIT_FALL_MS, easing: Easing.inOut(Easing.quad) }),
      ),
    );
    scale.value = withDelay(
      delayMs,
      withSequence(
        withTiming(1.12, { duration: FRUIT_DETACH_MS, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: FRUIT_FALL_MS, easing: Easing.out(Easing.quad) }),
      ),
    );
    // Held briefly, then accelerating downward — the part that reads as a drop.
    translateY.value = withDelay(
      delayMs + FRUIT_DETACH_MS,
      withTiming(FRUIT_FALL_DISTANCE, { duration: FRUIT_FALL_MS, easing: Easing.in(Easing.quad) }),
    );
    opacity.value = withDelay(
      delayMs + FRUIT_DETACH_MS + FRUIT_FALL_MS - FRUIT_FADE_MS,
      withTiming(0, { duration: FRUIT_FADE_MS, easing: Easing.in(Easing.quad) }),
    );
  }, [spriteReady, delayMs, rotate, scale, translateY, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
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
          onLoad={onSpriteLoad}
          onError={onSpriteLoad}
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
          delayMs={i * FRUIT_STAGGER_MS}
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
