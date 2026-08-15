/**
 * BobberView — Renders a bobber sprite in the water at a fishing tile.
 * Shown for local and remote players when they're actively fishing.
 * Idle: subtle sway. Reeling (mini-game active): bounce animation.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { TILE_SIZE } from '../constants';

const BOBBER_SIZE = TILE_SIZE * 0.6;
const BOBBER_OFFSET_Y = TILE_SIZE * 0.2;
const MOVE_DURATION_MS = 350;
const NAMETAG_PADDING = 6;
const NAMETAG_RADIUS = 8;

interface BobberViewProps {
  col: number;
  row: number;
  imageUrl?: string | null;
  emoji?: string;
  username?: string;
  isReeling?: boolean;
}

export const BobberView = React.memo(function BobberView({
  col,
  row,
  imageUrl,
  emoji,
  username,
  isReeling = false,
}: BobberViewProps) {
  const sway = useSharedValue(0);
  const bounce = useSharedValue(0);
  const posX = useSharedValue(col * TILE_SIZE);
  const posY = useSharedValue(row * TILE_SIZE + BOBBER_OFFSET_Y);
  const isFirstPosition = useRef(true);

  useEffect(() => {
    const targetX = col * TILE_SIZE;
    const targetY = row * TILE_SIZE + BOBBER_OFFSET_Y;
    if (isFirstPosition.current) {
      isFirstPosition.current = false;
      posX.value = targetX;
      posY.value = targetY;
    } else {
      posX.value = withTiming(targetX, { duration: MOVE_DURATION_MS, easing: Easing.out(Easing.cubic) });
      posY.value = withTiming(targetY, { duration: MOVE_DURATION_MS, easing: Easing.out(Easing.cubic) });
    }
  }, [col, row]);

  useEffect(() => {
    if (isReeling) {
      cancelAnimation(sway);
      sway.value = 0;
      bounce.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 180, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 180, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(bounce);
      bounce.value = 0;
      sway.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(-1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
    return () => {
      cancelAnimation(sway);
      cancelAnimation(bounce);
    };
  }, [isReeling]);

  const wrapPositionStyle = useAnimatedStyle(() => ({
    left: posX.value,
    top: posY.value,
  }));

  const containerStyle = useAnimatedStyle(() => {
    const bounceY = bounce.value * 6;
    const swayDeg = sway.value * 5;
    const driftX = sway.value * 4;
    const driftY = Math.abs(sway.value) * 2;
    return {
      transform: [
        { translateX: driftX },
        { translateY: -bounceY - driftY },
        { rotate: `${swayDeg}deg` },
      ],
    };
  });

  return (
    <Animated.View style={[styles.wrap, { width: TILE_SIZE }, wrapPositionStyle]} pointerEvents="none">
      <Animated.View style={[styles.bobber, containerStyle]}>
        {imageUrl ? (
          <CachedImage source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
        ) : (
          <Text style={styles.emoji}>{emoji ?? '🪝'}</Text>
        )}
      </Animated.View>
      {username ? (
        <View style={styles.nametagWrap}>
          <View style={styles.nametagBg}>
            <Text style={styles.nametagText}>
              {username}
            </Text>
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignItems: 'center',
    // Above live props / pets (those use footprint Y as zIndex).
    zIndex: 1_000_000,
  },
  bobber: {
    width: BOBBER_SIZE,
    height: BOBBER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: BOBBER_SIZE,
    height: BOBBER_SIZE,
  },
  emoji: {
    fontSize: BOBBER_SIZE * 0.7,
  },
  nametagWrap: {
    marginTop: 2,
    alignSelf: 'center',
  },
  nametagBg: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: NAMETAG_PADDING,
    paddingVertical: 3,
    borderRadius: NAMETAG_RADIUS,
  },
  nametagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
});
