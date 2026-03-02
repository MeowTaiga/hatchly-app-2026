import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { TILE_SIZE } from '../../constants';
import { PetBubble, type BubbleMood } from './PetBubble';
import { PetHeartEffect } from './PetHeartEffect';
import { equipmentStyles } from './equipmentStyles';

const PET_SIZE = TILE_SIZE * 2;
const HALF_PET = PET_SIZE / 2;

const POLE_WADDLE_DEG = 2;

interface PetSpriteProps {
  petX: SharedValue<number>;
  petY: SharedValue<number>;
  facingRight: SharedValue<number>;
  bounceOffset: SharedValue<number>;
  behaviorOffset?: SharedValue<number>;
  /** Hand tool rotation (deg). -50 default; 70 when digging. */
  toolRotationDeg?: SharedValue<number>;
  jumpOffset: SharedValue<number>;
  imageUrl?: string | null;
  bubbleVisible?: boolean;
  bubbleMood?: BubbleMood;
  showHeart?: boolean;
  onHeartDone?: () => void;
  equippedHandToolImageUrl?: string | null;
  equippedHandToolEmoji?: string;
  equippedChairImageUrl?: string | null;
  equippedChairEmoji?: string;
}

/**
 * Renders the player's pet on the grid world.
 */
export const PetSprite = React.memo(function PetSprite({
  petX,
  petY,
  facingRight,
  bounceOffset,
  behaviorOffset,
  toolRotationDeg,
  jumpOffset,
  imageUrl,
  bubbleVisible,
  bubbleMood,
  showHeart,
  onHeartDone,
  equippedHandToolImageUrl,
  equippedHandToolEmoji,
  equippedChairImageUrl,
  equippedChairEmoji,
}: PetSpriteProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: petX.value - HALF_PET },
      {
        translateY:
          petY.value -
          HALF_PET -
          bounceOffset.value -
          (behaviorOffset?.value ?? 0) +
          jumpOffset.value,
      },
      { scaleX: facingRight.value },
    ],
  }));

  const bubbleUnflipStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: facingRight.value }],
  }));

  const poleAnimatedStyle = useAnimatedStyle(() => {
    const base = toolRotationDeg != null ? toolRotationDeg.value : -50;
    return {
      transform: [
        { scaleX: -1 },
        { rotate: `${base + bounceOffset.value * POLE_WADDLE_DEG}deg` },
      ],
    };
  });

  return (
    <Animated.View style={[styles.pet, animatedStyle]} pointerEvents="none">
      {bubbleVisible && bubbleMood != null && (
        <Animated.View style={[styles.bubbleWrap, bubbleUnflipStyle]}>
          <PetBubble mood={bubbleMood} />
        </Animated.View>
      )}
      {showHeart && onHeartDone && (
        <View style={styles.heartWrap}>
          <PetHeartEffect active onDone={onHeartDone} />
        </View>
      )}
      {/* Equipment rendered behind pet (chair, hand tool) */}
      {(equippedChairImageUrl || equippedChairEmoji) ? (
        <View style={equipmentStyles.chairWrap} pointerEvents="none">
          {equippedChairImageUrl ? (
            <CachedImage source={{ uri: equippedChairImageUrl }} style={equipmentStyles.chairImage} resizeMode="contain" />
          ) : (
            <Text style={equipmentStyles.chairEmoji}>{equippedChairEmoji ?? '🪑'}</Text>
          )}
        </View>
      ) : null}
      {(equippedHandToolImageUrl || equippedHandToolEmoji) ? (
        <Animated.View style={[equipmentStyles.poleWrap, poleAnimatedStyle]}>
          {equippedHandToolImageUrl ? (
            <CachedImage source={{ uri: equippedHandToolImageUrl }} style={equipmentStyles.poleImage} resizeMode="contain" />
          ) : (
            <Text style={equipmentStyles.poleEmoji}>{equippedHandToolEmoji ?? '🔧'}</Text>
          )}
        </Animated.View>
      ) : null}
      {imageUrl ? (
        <CachedImage source={{ uri: imageUrl }} style={styles.image} />
      ) : (
        <Animated.View style={styles.placeholder} />
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  pet: {
    position: 'absolute',
    width: PET_SIZE,
    height: PET_SIZE,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  bubbleWrap: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 4,
  },
  heartWrap: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: -8,
  },
  image: {
    width: PET_SIZE,
    height: PET_SIZE,
  },
  placeholder: {
    width: PET_SIZE,
    height: PET_SIZE,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
});
