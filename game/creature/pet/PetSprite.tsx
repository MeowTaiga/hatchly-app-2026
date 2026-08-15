import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { TILE_SIZE } from '../../constants';
import { PetBubble, type BubbleMood } from './PetBubble';
import { PetHeartEffect } from './PetHeartEffect';
import {
  TOOL_ANIM_IDLE_ROTATION_DEG,
  buildEquipEmojiStyle,
  buildEquipImageStyle,
  buildEquipWrapStyle,
  resolveEquipOverlay,
  type EquipOverlayConfig,
} from './equipmentStyles';

const PET_SIZE = TILE_SIZE * 2;
const HALF_PET = PET_SIZE / 2;

const POLE_WADDLE_DEG = 2;

interface PetSpriteProps {
  petX: SharedValue<number>;
  petY: SharedValue<number>;
  facingRight: SharedValue<number>;
  bounceOffset: SharedValue<number>;
  behaviorOffset?: SharedValue<number>;
  /** Hand tool rotation (deg). -50 default; ~50 when digging. */
  toolRotationDeg?: SharedValue<number>;
  jumpOffset: SharedValue<number>;
  imageUrl?: string | null;
  bubbleVisible?: boolean;
  bubbleMood?: BubbleMood;
  showHeart?: boolean;
  onHeartDone?: () => void;
  equippedHandToolImageUrl?: string | null;
  equippedHandToolEmoji?: string;
  equippedHandToolOverlay?: EquipOverlayConfig | null;
  equippedChairImageUrl?: string | null;
  equippedChairEmoji?: string;
  equippedChairOverlay?: EquipOverlayConfig | null;
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
  equippedHandToolOverlay,
  equippedChairImageUrl,
  equippedChairEmoji,
  equippedChairOverlay,
}: PetSpriteProps) {
  const handResolved = useMemo(
    () => resolveEquipOverlay('handTool', equippedHandToolOverlay),
    [equippedHandToolOverlay],
  );
  const chairResolved = useMemo(
    () => resolveEquipOverlay('chair', equippedChairOverlay),
    [equippedChairOverlay],
  );
  const handWrapStyle = useMemo(
    () => buildEquipWrapStyle('handTool', handResolved),
    [handResolved],
  );
  const handImageStyle = useMemo(
    () => buildEquipImageStyle('handTool', handResolved),
    [handResolved],
  );
  const handEmojiStyle = useMemo(
    () => buildEquipEmojiStyle('handTool', handResolved),
    [handResolved],
  );
  const chairWrapStyle = useMemo(
    () => buildEquipWrapStyle('chair', chairResolved),
    [chairResolved],
  );
  const chairImageStyle = useMemo(
    () => buildEquipImageStyle('chair', chairResolved),
    [chairResolved],
  );
  const chairEmojiStyle = useMemo(
    () => buildEquipEmojiStyle('chair', chairResolved),
    [chairResolved],
  );
  const chairRotStyle = useMemo(
    () => ({ transform: [{ rotate: `${chairResolved.rotationDeg}deg` }] }),
    [chairResolved.rotationDeg],
  );

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

  const baseRotation = handResolved.rotationDeg;
  const poleAnimatedStyle = useAnimatedStyle(() => {
    const anim = toolRotationDeg != null ? toolRotationDeg.value : TOOL_ANIM_IDLE_ROTATION_DEG;
    const animDelta = anim - TOOL_ANIM_IDLE_ROTATION_DEG;
    return {
      transform: [{ rotate: `${baseRotation + animDelta + bounceOffset.value * POLE_WADDLE_DEG}deg` }],
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
        <View style={[chairWrapStyle, chairRotStyle]} pointerEvents="none">
          {equippedChairImageUrl ? (
            <CachedImage source={{ uri: equippedChairImageUrl }} style={chairImageStyle} resizeMode="contain" />
          ) : (
            <Text style={chairEmojiStyle}>{equippedChairEmoji ?? '🪑'}</Text>
          )}
        </View>
      ) : null}
      {(equippedHandToolImageUrl || equippedHandToolEmoji) ? (
        <Animated.View style={[handWrapStyle, poleAnimatedStyle]}>
          {equippedHandToolImageUrl ? (
            <CachedImage source={{ uri: equippedHandToolImageUrl }} style={handImageStyle} resizeMode="contain" />
          ) : (
            <Text style={handEmojiStyle}>{equippedHandToolEmoji ?? '🔧'}</Text>
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
