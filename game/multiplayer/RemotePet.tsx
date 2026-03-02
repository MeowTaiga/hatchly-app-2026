import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import { useTheme } from '@/store/ThemeProvider';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { TILE_SIZE } from '../constants';
import { useWalkAnimation } from './useWalkAnimation';
import { equipmentStyles } from '../creature/pet/equipmentStyles';
import type { RemotePlayer } from './types';

const PET_SIZE = TILE_SIZE * 2;
const HALF_PET = PET_SIZE / 2;
const NAMETAG_WIDTH = 120;
const BUBBLE_DISMISS_MS = 5000;

import type { FishResultBubble } from './MultiplayerProvider';
import { RARITY_BUBBLE_COLORS, formatFishSize, FishStarRow } from './fishBubbleUtils';

const POLE_WADDLE_DEG = 2;
const POLE_REEL_DEG = 8;

interface RemotePetProps {
  player: RemotePlayer;
  chatText?: string | null;
  fishResult?: FishResultBubble | null;
  fishFailed?: boolean;
  isReeling?: boolean;
  itemDefs?: Record<string, { imageUrl?: string; emoji?: string }>;
}

export const RemotePet = React.memo(function RemotePet({ player, chatText, fishResult, fishFailed, isReeling = false, itemDefs }: RemotePetProps) {
  const { theme } = useTheme();
  const { animX, animY, facingRight, bounceOffset } = useWalkAnimation(player.x, player.y);
  const reelRotation = useSharedValue(0);
  const isReelingSv = useSharedValue(isReeling ? 1 : 0);
  const [visibleBubble, setVisibleBubble] = useState<string | null>(null);

  useEffect(() => {
    isReelingSv.value = isReeling ? 1 : 0;
  }, [isReeling]);
  const [visibleFishResult, setVisibleFishResult] = useState<FishResultBubble | null>(null);
  const [visibleFishFailed, setVisibleFishFailed] = useState(false);

  const displayImageUrl =
    (player.activePose && player.petPose?.[player.activePose]) || player.petImageUrl;
  const handToolDef = player.equippedHandTool && itemDefs?.[player.equippedHandTool];
  const chairDef = player.equippedChair && itemDefs?.[player.equippedChair];

  useEffect(() => {
    if (!chatText) return;
    setVisibleBubble(chatText);
    const timer = setTimeout(() => setVisibleBubble(null), BUBBLE_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [chatText]);

  useEffect(() => {
    if (fishResult) {
      setVisibleFishResult(fishResult);
      const timer = setTimeout(() => setVisibleFishResult(null), BUBBLE_DISMISS_MS);
      return () => clearTimeout(timer);
    } else {
      setVisibleFishResult(null);
    }
  }, [fishResult]);

  useEffect(() => {
    if (fishFailed) {
      setVisibleFishFailed(true);
      const timer = setTimeout(() => setVisibleFishFailed(false), BUBBLE_DISMISS_MS);
      return () => clearTimeout(timer);
    } else {
      setVisibleFishFailed(false);
    }
  }, [fishFailed]);

  useEffect(() => {
    if (isReeling) {
      cancelAnimation(reelRotation);
      reelRotation.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 150, easing: Easing.inOut(Easing.ease) }),
          withTiming(-1, { duration: 150, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(reelRotation);
      reelRotation.value = 0;
    }
    return () => cancelAnimation(reelRotation);
  }, [isReeling]);

  const positionStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: animX.value - HALF_PET },
      { translateY: animY.value - PET_SIZE - bounceOffset.value },
      { scaleX: facingRight.value },
    ],
  }));

  const unflipStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: facingRight.value }],
  }));

  const poleAnimatedStyle = useAnimatedStyle(() => {
    const rot = isReelingSv.value ? reelRotation.value * POLE_REEL_DEG : bounceOffset.value * POLE_WADDLE_DEG;
    return {
      transform: [
        { scaleX: -1 },
        { rotate: `${-50 + rot}deg` },
      ],
    };
  });

  return (
    <Animated.View style={[styles.container, positionStyle]}>
      {/* Equipment rendered behind pet */}
      {chairDef && (chairDef.imageUrl || chairDef.emoji) && (
        <View style={equipmentStyles.chairWrap} pointerEvents="none">
          {chairDef.imageUrl ? (
            <CachedImage source={{ uri: chairDef.imageUrl }} style={equipmentStyles.chairImage} resizeMode="contain" />
          ) : (
            <Text style={equipmentStyles.chairEmoji}>{chairDef.emoji ?? '🪑'}</Text>
          )}
        </View>
      )}
      {handToolDef && (handToolDef.imageUrl || handToolDef.emoji) && (
        <Animated.View style={[equipmentStyles.poleWrap, poleAnimatedStyle]}>
          {handToolDef.imageUrl ? (
            <CachedImage source={{ uri: handToolDef.imageUrl }} style={equipmentStyles.poleImage} resizeMode="contain" />
          ) : (
            <Text style={equipmentStyles.poleEmoji}>{handToolDef.emoji ?? '🔧'}</Text>
          )}
        </Animated.View>
      )}
      {displayImageUrl ? (
        <CachedImage
          source={{ uri: displayImageUrl }}
          style={styles.petImage}
          resizeMode="contain"
        />
      ) : (
        <Text style={styles.fallbackEmoji}>🐾</Text>
      )}
      <Animated.View style={[styles.nametagWrap, unflipStyle]}>
        <View style={styles.nametagBg}>
          <Text style={styles.nametagText} numberOfLines={1}>
            {player.username}
          </Text>
        </View>
      </Animated.View>
      {visibleBubble && (
        <Animated.View style={[styles.bubbleAbsolute, unflipStyle]}>
          <View style={[styles.chatBubble, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.chatText, { color: theme.colors.text }]} numberOfLines={3}>
              {visibleBubble}
            </Text>
            <View style={[styles.chatTail, { backgroundColor: theme.colors.surface }]} />
          </View>
        </Animated.View>
      )}
      {visibleFishResult && (() => {
        const c = RARITY_BUBBLE_COLORS[visibleFishResult.rarity ?? 'common'];
        return (
          <Animated.View style={[styles.bubbleAbsolute, styles.fishBalloonHigher, unflipStyle]}>
            <View style={[styles.fishBalloon, { backgroundColor: c.bg }]}>
              <View style={styles.fishBalloonImageWrap}>
                {visibleFishResult.imageUrl ? (
                  <CachedImage
                    source={{ uri: visibleFishResult.imageUrl }}
                    style={[styles.fishBalloonImage, { backgroundColor: 'transparent' }]}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.fishBalloonEmoji}>🐟</Text>
                )}
              </View>
              <Text style={[styles.fishBalloonLabel, { color: c.text }]} numberOfLines={1}>
                {visibleFishResult.label}
              </Text>
              <FishStarRow
                sizeLabel={visibleFishResult.sizeLabel}
                filledColor={c.text}
                dimColor="rgba(255,255,255,0.4)"
              />
              <Text style={[styles.fishBalloonSize, { color: c.textMuted }]}>
                {formatFishSize(visibleFishResult.size, visibleFishResult.sizeLabel)}
              </Text>
              <View style={[styles.chatTail, { backgroundColor: c.bg }]} />
            </View>
          </Animated.View>
        );
      })()}
      {visibleFishFailed && (
        <Animated.View style={[styles.bubbleAbsolute, styles.fishBalloonHigher, unflipStyle]}>
          <View style={[styles.fishBalloon, styles.fishFailedBalloon, { backgroundColor: theme.colors.surface }]}>
            <Text style={styles.fishFailedEmoji}>😢</Text>
            <Text style={[styles.fishFailedText, { color: theme.colors.text }]}>Got away...</Text>
            <View style={[styles.chatTail, { backgroundColor: theme.colors.surface }]} />
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: PET_SIZE,
    height: PET_SIZE,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
    zIndex: 10,
  },
  petImage: {
    width: PET_SIZE,
    height: PET_SIZE,
  },
  fallbackEmoji: {
    fontSize: 32,
  },
  nametagWrap: {
    position: 'absolute',
    bottom: -14,
    width: NAMETAG_WIDTH,
    left: (PET_SIZE - NAMETAG_WIDTH) / 2,
    alignItems: 'center',
  },
  nametagBg: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nametagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  bubbleAbsolute: {
    position: 'absolute',
    bottom: PET_SIZE + 18,
  },
  fishBalloonHigher: {
    bottom: PET_SIZE + 48,
  },
  fishBalloon: {
    minWidth: 100,
    maxWidth: 140,
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fishBalloonImageWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  fishBalloonImage: {
    width: 56,
    height: 56,
  },
  fishBalloonEmoji: {
    fontSize: 40,
  },
  fishBalloonLabel: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  fishBalloonSize: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  fishFailedBalloon: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  fishFailedEmoji: {
    fontSize: 48,
    marginBottom: 4,
  },
  fishFailedText: {
    fontSize: 13,
    fontWeight: '700',
  },
  chatBubble: {
    maxWidth: 140,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  chatText: {
    fontSize: 11,
    lineHeight: 14,
  },
  chatTail: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    width: 8,
    height: 8,
    transform: [{ rotate: '45deg' }],
  },
});
