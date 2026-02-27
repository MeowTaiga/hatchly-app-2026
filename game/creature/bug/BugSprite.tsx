import React from 'react';
import { StyleSheet } from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { TILE_SIZE } from '../../constants';
import { BUG_SCALE } from './constants';
import { useBugAI } from './useBugAI';
import { AnimatedLightGlow } from '../../LightGlow';
import type { ActiveBug, GridData, ItemDefinition } from '../../types';

const BUG_SIZE = TILE_SIZE * BUG_SCALE;
const HALF_BUG = BUG_SIZE / 2;

interface BugSpriteProps {
  bugX: SharedValue<number>;
  bugY: SharedValue<number>;
  facingRight: SharedValue<number>;
  bounceOffset: SharedValue<number>;
  imageUrl?: string | null;
}

export const BugSprite = React.memo(function BugSprite({
  bugX,
  bugY,
  facingRight,
  bounceOffset,
  imageUrl,
}: BugSpriteProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: bugX.value - HALF_BUG },
      { translateY: bugY.value - HALF_BUG - bounceOffset.value },
      { rotate: `${facingRight.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.bug, animatedStyle]} pointerEvents="none">
      {imageUrl ? (
        <CachedImage source={{ uri: imageUrl }} style={styles.image} />
      ) : (
        <Animated.View style={styles.placeholder} />
      )}
    </Animated.View>
  );
});

interface BugInstanceProps {
  bug: ActiveBug;
  cols: number;
  rows: number;
  imageUrl?: string | null;
  onPositionChange?: (spawnId: string, col: number, row: number) => void;
  lightRadius?: number;
  lightColor?: string;
  lightIntensity?: number;
  darkness?: number;
  activeGrid?: GridData;
  itemDefs?: Record<string, ItemDefinition>;
}

/**
 * Manages a single bug's AI + sprite rendering.
 */
export const BugInstance = React.memo(function BugInstance({
  bug,
  cols,
  rows,
  imageUrl,
  onPositionChange,
  lightRadius,
  lightColor,
  lightIntensity,
  darkness,
  activeGrid,
  itemDefs,
}: BugInstanceProps) {
  const handlePositionChange = React.useCallback(
    (col: number, row: number) => onPositionChange?.(bug.spawnId, col, row),
    [bug.spawnId, onPositionChange],
  );

  const { bugX, bugY, facingRight, bounceOffset } = useBugAI({
    cols,
    rows,
    startCol: bug.col,
    startRow: bug.row,
    active: true,
    onPositionChange: handlePositionChange,
    hostPlacedItemId: bug.hostPlacedItemId,
    activeGrid,
    itemDefs,
  });

  return (
    <>
      <BugSprite
        bugX={bugX}
        bugY={bugY}
        facingRight={facingRight}
        bounceOffset={bounceOffset}
        imageUrl={imageUrl}
      />
      {lightRadius != null && lightRadius > 0 && (
        <AnimatedLightGlow
          bugX={bugX}
          bugY={bugY}
          radius={lightRadius}
          color={lightColor ?? '#FFDD88'}
          intensity={lightIntensity ?? 0.5}
          darkness={darkness ?? 0}
          imageUrl={imageUrl}
          imageSize={BUG_SIZE}
        />
      )}
    </>
  );
});

const styles = StyleSheet.create({
  bug: {
    position: 'absolute',
    width: BUG_SIZE,
    height: BUG_SIZE,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  image: {
    width: BUG_SIZE,
    height: BUG_SIZE,
  },
  placeholder: {
    width: BUG_SIZE,
    height: BUG_SIZE,
    backgroundColor: 'rgba(200,100,200,0.5)',
    borderRadius: BUG_SIZE / 2,
  },
});
