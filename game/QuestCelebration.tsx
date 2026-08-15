/**
 * Quest completion celebration — cozy harvest frame with rewards overlaid
 * in the cream center. Uses the `quest_completion` game-item art as the panel.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { CachedImage } from '@/components/ui/CachedImage';
import { GemIcon } from '@/components/ui/GemIcon';
import type { FarmLevelDef, ItemDefinition, QuestCompletion } from './types';

const FRAME_ITEM_TYPE = 'quest_completion';
const REWARD_STAGGER_MS = 80;
/** Draw the frame art larger than the layout box (no clipping). */
const FRAME_IMAGE_SCALE = 1.2;

const VISIBLE_REWARD_ROWS = 4;
const REWARD_LINE_HEIGHT = 28;
const REWARD_LIST_GAP = 6;
const REWARD_LIST_MAX_HEIGHT =
  VISIBLE_REWARD_ROWS * REWARD_LINE_HEIGHT + (VISIBLE_REWARD_ROWS - 1) * REWARD_LIST_GAP;

/** Inset the overlay into the cream panel so leaves/pumpkins stay clear. */
const PANEL_INSET = {
  top: '14%',
  left: '13%',
  right: '13%',
  bottom: '22%',
} as const;

/**
 * Collect sits on the bottom pumpkin in the frame art (outside the cream panel).
 * Fractions of `frameSize` so the label tracks the art across phone sizes.
 */
/** Center of the bottom pumpkin, then nudged ~7px lower. */
const COLLECT_BOTTOM_FRAC = 0.07;
const COLLECT_NUDGE_DOWN_PX = 7;

type RewardEntry = {
  key: string;
  label: string;
  imageUrl?: string;
  emoji?: string;
  qty?: number;
  asGems?: boolean;
};

interface QuestCelebrationProps {
  /** Completions to celebrate, oldest first. Empty means nothing to show. */
  completions: QuestCompletion[];
  itemDefs: Record<string, ItemDefinition>;
  farmLevels: readonly FarmLevelDef[];
  /** Called once the player has acknowledged every completion. */
  onDone: () => void;
}

export function QuestCelebration({
  completions,
  itemDefs,
  farmLevels,
  onDone,
}: QuestCelebrationProps) {
  const [index, setIndex] = useState(0);
  const { width: screenW, height: screenH } = useWindowDimensions();
  // Prefer a large square that still leaves room for the backdrop; height-capped for short phones.
  const frameSize = Math.min(screenW * 0.96, screenH * 0.72, 520);

  useEffect(() => {
    if (completions.length > 0) setIndex(0);
  }, [completions]);

  const completion = completions[index];

  const cardScale = useSharedValue(0.92);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    if (!completion) return;
    cardOpacity.value = 0;
    cardScale.value = 0.92;
    cardOpacity.value = withTiming(1, { duration: 240 });
    cardScale.value = withSpring(1, { damping: 14, stiffness: 160 });
  }, [completion?.questId, cardOpacity, cardScale]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  if (!completion) return null;

  const level = completion.newFarmLevel
    ? farmLevels.find((l) => l.level === completion.newFarmLevel)
    : undefined;
  const isLevelUp = Boolean(completion.newFarmLevel);
  const rewards = completion.rewards;
  const frameUrl = itemDefs[FRAME_ITEM_TYPE]?.imageUrl;

  const advance = () => {
    if (index < completions.length - 1) setIndex(index + 1);
    else onDone();
  };

  const hasRewards =
    !!rewards &&
    ((rewards.items?.length ?? 0) > 0 || !!rewards.gems || !!rewards.xp);

  const rewardEntries = useMemo((): RewardEntry[] => {
    if (!rewards) return [];
    const entries: RewardEntry[] = [];
    for (const r of rewards.items ?? []) {
      const def = itemDefs[r.itemType];
      entries.push({
        key: r.itemType,
        label: def?.label ?? r.itemType,
        imageUrl: def?.imageUrl,
        emoji: def?.emoji,
        qty: r.qty,
      });
    }
    if (rewards.gems) {
      entries.push({ key: 'gems', label: 'Gems', asGems: true, qty: rewards.gems });
    }
    if (rewards.xp) {
      entries.push({ key: 'xp', label: 'XP', emoji: '⭐', qty: rewards.xp });
    }
    return entries;
  }, [rewards, itemDefs]);

  return (
    <Modal transparent animationType="fade" onRequestClose={advance}>
      <View style={styles.backdrop}>
        <Animated.View
          style={[styles.frameWrap, { width: frameSize, height: frameSize }, cardStyle]}
          pointerEvents="box-none"
        >
          {frameUrl ? (
            <CachedImage
              source={{ uri: frameUrl }}
              style={styles.frameImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.frameFallback} />
          )}

          <View style={styles.panel} pointerEvents="box-none">
            <Text style={styles.eyebrow}>
              {isLevelUp ? 'Farm upgraded' : 'Quest complete'}
            </Text>
            <Text style={styles.title} numberOfLines={3}>
              {isLevelUp
                ? (level?.title ?? `Level ${completion.newFarmLevel}`)
                : completion.title}
            </Text>

            {isLevelUp && (
              <Text style={styles.subtitle}>
                {level
                  ? `Your farm is now ${level.cols} × ${level.rows}`
                  : 'Your farm just got bigger'}
              </Text>
            )}

            {hasRewards && <RewardList entries={rewardEntries} />}
          </View>

          {/* Anchored to the frame pumpkin — only this dismisses. */}
          <View
            style={[
              styles.collectSlot,
              { bottom: frameSize * COLLECT_BOTTOM_FRAC - COLLECT_NUDGE_DOWN_PX },
            ]}
            pointerEvents="box-none"
          >
            <Pressable
              style={styles.collectBtnShadow}
              onPress={advance}
              accessibilityRole="button"
              accessibilityLabel={
                index < completions.length - 1 ? 'Collect and see next reward' : 'Collect rewards'
              }
            >
              <View style={styles.collectBtn}>
                {/* Soft top depth (warm, not white) */}
                <LinearGradient
                  colors={['rgba(255, 200, 120, 0.35)', 'rgba(232, 137, 44, 0)', 'transparent']}
                  locations={[0, 0.5, 1]}
                  style={styles.collectShine}
                  pointerEvents="none"
                />
                {/* Bottom inner shadow arc */}
                <LinearGradient
                  colors={['transparent', 'rgba(120, 50, 0, 0.22)', 'rgba(70, 25, 0, 0.35)']}
                  locations={[0, 0.5, 1]}
                  style={styles.collectInnerShadow}
                  pointerEvents="none"
                />
                <Text style={styles.collectLabel}>COLLECT</Text>
              </View>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function RewardList({ entries }: { entries: RewardEntry[] }) {
  const scrollable = entries.length > VISIBLE_REWARD_ROWS;
  const [canScrollDown, setCanScrollDown] = useState(scrollable);
  const [canScrollUp, setCanScrollUp] = useState(false);

  useEffect(() => {
    setCanScrollDown(scrollable);
    setCanScrollUp(false);
  }, [scrollable, entries.length]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const y = contentOffset.y;
    const maxY = Math.max(0, contentSize.height - layoutMeasurement.height);
    setCanScrollUp(y > 4);
    setCanScrollDown(y < maxY - 4);
  };

  const rows = entries.map((entry, i) => (
    <RewardPop key={entry.key} delayMs={i * REWARD_STAGGER_MS}>
      <RewardLine
        label={entry.label}
        imageUrl={entry.imageUrl}
        emoji={entry.emoji}
        qty={entry.qty}
        asGems={entry.asGems}
      />
    </RewardPop>
  ));

  return (
    <View style={styles.rewards}>
      <Text style={styles.rewardsLabel}>You got</Text>
      <View style={styles.rewardListWrap}>
        {scrollable && canScrollUp ? (
          <View style={styles.scrollHintTop} pointerEvents="none">
            <Text style={styles.scrollHintText}>⌃ more</Text>
          </View>
        ) : null}
        {scrollable ? (
          <ScrollView
            style={{ maxHeight: REWARD_LIST_MAX_HEIGHT }}
            contentContainerStyle={styles.rewardList}
            showsVerticalScrollIndicator
            nestedScrollEnabled
            bounces={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            {rows}
          </ScrollView>
        ) : (
          <View style={styles.rewardList}>{rows}</View>
        )}
        {scrollable && canScrollDown ? (
          <View style={styles.scrollHintBottom} pointerEvents="none">
            <Text style={styles.scrollHintText}>⌄ more</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function RewardPop({ delayMs, children }: { delayMs: number; children: React.ReactNode }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(200 + delayMs, withSpring(1, { damping: 14, stiffness: 170 }));
  }, [progress, delayMs]);

  // Fade + slide only — scaling the image view makes expo-image look soft on retina.
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 8 }],
  }));

  return <Animated.View style={[style, styles.rewardPop]}>{children}</Animated.View>;
}

/** Horizontal reward row: [icon] name ——— ×qty */
function RewardLine({
  label,
  imageUrl,
  emoji,
  qty,
  asGems,
}: {
  label: string;
  imageUrl?: string;
  emoji?: string;
  qty?: number;
  asGems?: boolean;
}) {
  return (
    <View style={styles.line}>
      <View style={styles.lineLeft}>
        <View style={styles.lineIcon}>
          {asGems ? (
            <GemIcon size={22} />
          ) : imageUrl ? (
            <CachedImage
              source={{ uri: imageUrl }}
              style={styles.lineImage}
              resizeMode="contain"
              allowDownscaling={false}
            />
          ) : (
            <Text style={styles.lineEmoji}>{emoji || '🎁'}</Text>
          )}
        </View>
        <Text style={styles.lineName} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={styles.lineRule} />
      <Text style={styles.lineQty}>×{qty != null && qty > 0 ? qty : 1}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(40, 28, 18, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    transform: [{ scale: FRAME_IMAGE_SCALE }],
  },
  frameFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F3E6D0',
    borderRadius: 28,
    borderWidth: 3,
    borderColor: '#C47A3A',
  },
  panel: {
    position: 'absolute',
    top: PANEL_INSET.top,
    left: PANEL_INSET.left,
    right: PANEL_INSET.right,
    bottom: PANEL_INSET.bottom,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: '#8B5A2B',
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    color: '#3D2914',
    lineHeight: 28,
    // Narrower wrap so long quest titles break ~15px sooner on each side.
    paddingHorizontal: 15,
    alignSelf: 'stretch',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    color: '#6B4A2E',
    marginTop: 6,
  },
  rewards: {
    alignItems: 'stretch',
    alignSelf: 'stretch',
    marginTop: 14,
    gap: 8,
    width: '100%',
    paddingLeft: 24,
    paddingRight: 24,
  },
  rewardsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5A2B',
    textAlign: 'center',
  },
  rewardListWrap: {
    width: '100%',
    position: 'relative',
  },
  rewardList: {
    width: '100%',
    gap: REWARD_LIST_GAP,
  },
  rewardPop: {
    width: '100%',
  },
  scrollHintTop: {
    position: 'absolute',
    top: -2,
    left: 0,
    right: 0,
    zIndex: 2,
    alignItems: 'center',
    paddingVertical: 2,
  },
  scrollHintBottom: {
    position: 'absolute',
    bottom: -2,
    left: 0,
    right: 0,
    zIndex: 2,
    alignItems: 'center',
    paddingVertical: 2,
  },
  scrollHintText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8B5A2B',
    letterSpacing: 0.2,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    height: REWARD_LINE_HEIGHT,
  },
  lineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    maxWidth: '58%',
  },
  lineIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineImage: {
    width: 24,
    height: 24,
  },
  lineEmoji: {
    fontSize: 16,
  },
  lineName: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#3D2914',
  },
  lineRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    minWidth: 12,
    backgroundColor: 'rgba(139, 90, 43, 0.35)',
  },
  lineQty: {
    fontSize: 13,
    fontWeight: '800',
    color: '#3D2914',
    minWidth: 28,
    textAlign: 'right',
  },
  collectSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 3,
  },
  collectBtnShadow: {
    borderRadius: 999,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.55,
        shadowRadius: 3,
      },
      android: {
        elevation: 10,
      },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 3,
      },
    }),
  },
  collectBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8892C',
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  collectShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '58%',
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
  },
  collectInnerShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '48%',
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
  },
  collectLabel: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#000000',
    textTransform: 'uppercase',
    zIndex: 1,
  },
});
