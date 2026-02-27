import React from 'react';
import { StyleSheet } from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { TILE_SIZE } from '../../constants';
import { BALLOON_SCALE } from './constants';
import { useBalloonAI } from './useBalloonAI';
import type { ActiveBalloon } from '../../types';

const BALLOON_SIZE = TILE_SIZE * BALLOON_SCALE;
const HALF_BALLOON = BALLOON_SIZE / 2;

interface BalloonSpriteProps {
  balloonX: SharedValue<number>;
  balloonY: SharedValue<number>;
  imageUrl?: string | null;
}

export const BalloonSprite = React.memo(function BalloonSprite({
  balloonX,
  balloonY,
  imageUrl,
}: BalloonSpriteProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: balloonX.value - HALF_BALLOON },
      { translateY: balloonY.value - HALF_BALLOON },
    ],
  }));

  return (
    <Animated.View style={[styles.balloon, animatedStyle]} pointerEvents="none">
      {imageUrl ? (
        <CachedImage source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
      ) : (
        <Animated.View style={styles.placeholder} />
      )}
    </Animated.View>
  );
});

interface BalloonInstanceProps {
  balloon: ActiveBalloon;
  imageUrl?: string | null;
  onPositionChange?: (spawnId: string, col: number, row: number) => void;
}

/**
 * Manages a single balloon's AI + sprite rendering.
 */
export const BalloonInstance = React.memo(function BalloonInstance({
  balloon,
  imageUrl,
  onPositionChange,
}: BalloonInstanceProps) {
  const { balloonX, balloonY } = useBalloonAI({
    startCol: balloon.col,
    startRow: balloon.row,
    active: true,
  });

  return (
    <BalloonSprite
      balloonX={balloonX}
      balloonY={balloonY}
      imageUrl={imageUrl}
    />
  );
});

const styles = StyleSheet.create({
  balloon: {
    position: 'absolute',
    width: BALLOON_SIZE,
    height: BALLOON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: BALLOON_SIZE,
    height: BALLOON_SIZE,
  },
  placeholder: {
    width: BALLOON_SIZE,
    height: BALLOON_SIZE,
    backgroundColor: 'rgba(255,100,100,0.5)',
    borderRadius: BALLOON_SIZE / 2,
  },
});
