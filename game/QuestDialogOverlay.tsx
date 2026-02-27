import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CachedImage } from '@/components/ui/CachedImage';
import { ItemChip } from '@/components/ui/ItemChip';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { DialogText } from './DialogText';
import type { DialogStep, QuestReward, ItemDefinition } from './types';

interface QuestDialogOverlayProps {
  steps: DialogStep[] | null;
  stepIndex: number;
  petName: string;
  petImageUrl: string | null;
  /** Pet name (or fallback) for {playername} placeholder in dialog text. */
  playerName?: string;
  /** When provided, use instead of pet for speaker name and avatar. */
  speakerName?: string;
  speakerImageUrl?: string | null;
  /** Rewards to show on last step (e.g. items, gems, xp from quest completion). */
  rewards?: QuestReward | null;
  /** Item definitions for reward display and {item_slug} placeholders. */
  itemDefs?: Record<string, ItemDefinition>;
  /** When false, user can tap to dismiss without completing highlight. Default true. */
  blocking?: boolean;
  onAdvance: () => void;
}

export function QuestDialogOverlay({
  steps,
  stepIndex,
  petName,
  petImageUrl,
  playerName = 'Player',
  speakerName,
  speakerImageUrl,
  rewards,
  itemDefs = {},
  blocking = true,
  onAdvance,
}: QuestDialogOverlayProps) {
  const displayName = speakerName ?? petName;
  const displayImageUrl = speakerImageUrl !== undefined ? speakerImageUrl : petImageUrl;
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const topOverlayHeight = Math.min(screenHeight * 0.45, 320);
  const bgOpacity = useSharedValue(0);
  const bubbleSlideY = useSharedValue(-30);
  const bubbleOpacity = useSharedValue(0);

  const currentStep = steps?.[stepIndex] ?? null;
  const isLast = steps ? stepIndex >= steps.length - 1 : true;
  const hasHighlight = !!currentStep?.highlight;
  const showRewards = isLast && rewards && (rewards.items?.length || rewards.gems || rewards.xp);
  /** When blocking is false, user can always tap to advance (dismiss). */
  const canAdvance = !blocking || !hasHighlight;

  useEffect(() => {
    if (currentStep) {
      bgOpacity.value = withTiming(hasHighlight ? 0 : 1, { duration: 250 });
      bubbleOpacity.value = withTiming(1, { duration: 280 });
      bubbleSlideY.value = withSpring(0, { damping: 14, stiffness: 120 });
    } else {
      bgOpacity.value = withTiming(0, { duration: 200 });
      bubbleOpacity.value = withTiming(0, { duration: 180 });
      bubbleSlideY.value = -30;
    }
  }, [currentStep?.text, hasHighlight]);

  useEffect(() => {
    if (currentStep && stepIndex > 0) {
      bubbleSlideY.value = -12;
      bubbleSlideY.value = withSpring(0, { damping: 14, stiffness: 140 });
      bubbleOpacity.value = 0.7;
      bubbleOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [stepIndex]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bubbleSlideY.value }],
    opacity: bubbleOpacity.value,
  }));

  if (!currentStep) return null;

  const hintText = !blocking
    ? 'Tap to dismiss'
    : hasHighlight
      ? 'Complete the action to continue'
      : isLast
        ? 'Tap to close'
        : 'Tap to continue';

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Show backdrop when user can advance (tap to dismiss) */}
      {canAdvance && (
        <Animated.View style={[styles.backdropTop, { height: topOverlayHeight }, backdropStyle]} pointerEvents="auto">
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.35)', 'transparent']}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
          <Pressable style={StyleSheet.absoluteFill} onPress={onAdvance} />
        </Animated.View>
      )}

      <Animated.View
        style={[
          styles.contentWrap,
          { top: insets.top + 24 },
          contentStyle,
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          style={styles.container}
          onPress={canAdvance ? onAdvance : undefined}
          disabled={!canAdvance}
        >
          <View style={styles.avatarWrap}>
            {displayImageUrl ? (
              <CachedImage source={{ uri: displayImageUrl }} style={styles.avatar} resizeMode="contain" />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarEmoji}>🐾</Text>
              </View>
            )}
          </View>

          <View style={styles.bubble}>
            <View style={styles.bubbleTail} />
            <Text style={styles.petName}>{displayName}</Text>
            <DialogText
              text={currentStep.text}
              playerName={playerName}
              itemDefs={itemDefs}
              defaultItemType={rewards?.items?.[0]?.itemType}
              textStyle={styles.messageText}
            />
            {showRewards && (
              <>
                <View style={styles.rewardsDivider} />
                <View style={styles.rewardsSection}>
                  {rewards.items?.map((r) => {
                    const def = itemDefs[r.itemType];
                    return (
                      <ItemChip
                        key={`${r.itemType}-${r.qty}`}
                        label={def?.label ?? r.itemType}
                        imageUrl={def?.imageUrl}
                        emoji={def?.emoji}
                        qty={r.qty}
                        size={36}
                      />
                    );
                  })}
                  {rewards.gems ? (
                    <ItemChip asGems gemsAmount={rewards.gems} label="" size={36} />
                  ) : null}
                  {rewards.xp ? (
                    <View style={styles.rewardRow}>
                      <View style={[styles.rewardImage, styles.rewardImagePlaceholder]}>
                        <Text style={styles.rewardEmoji}>⭐</Text>
                      </View>
                      <View style={styles.rewardInfo}>
                        <Text style={styles.rewardName}>+{rewards.xp} XP</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              </>
            )}
            <Text style={styles.tapHint}>{hintText}</Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const shadow = Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  android: { elevation: 8 },
}) as object;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 500,
  },
  backdropTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  contentWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    ...shadow,
  },
  avatar: {
    width: 56,
    height: 56,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 26,
  },
  bubble: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderTopLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...shadow,
  },
  bubbleTail: {
    position: 'absolute',
    left: -6,
    top: 10,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderRightWidth: 8,
    borderBottomWidth: 6,
    borderTopColor: 'transparent',
    borderRightColor: '#fff',
    borderBottomColor: 'transparent',
  },
  petName: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  messageText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20,
  },
  tapHint: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted ?? '#999',
    marginTop: 6,
    textAlign: 'right',
    letterSpacing: 0.2,
  },
  rewardsDivider: {
    height: 1,
    backgroundColor: colors.border ?? '#e0e0e0',
    marginVertical: 10,
  },
  rewardsSection: {
    gap: 8,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rewardImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  rewardImagePlaceholder: {
    backgroundColor: colors.primaryLight ?? '#e8f4f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardEmoji: {
    fontSize: 18,
  },
  rewardInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rewardName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  rewardQty: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});
