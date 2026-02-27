import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { CachedImage } from '@/components/ui/CachedImage';
import type { QuestProgress } from '../types';
import type { ItemDefinition } from '../types';

export type QuestBubbleStatus = 'available' | 'in_progress' | 'completable';

const QUEST_ITEM_BY_STATUS: Record<QuestBubbleStatus, string> = {
  available: 'quest_light_bulb',
  in_progress: 'quest_open_book',
  completable: 'quest_closed_book',
};

const SIZE = 72; // 10% smaller than 80
const PADDING = 4;
const ICON_SIZE = SIZE - PADDING * 2;

interface QuestBubbleProps {
  status: QuestBubbleStatus;
  itemDefs: Record<string, ItemDefinition>;
  centerX: number;
  topY: number;
  size?: number;
}

export function QuestBubble({ status, itemDefs, centerX, topY, size = SIZE }: QuestBubbleProps) {
  const def = itemDefs[QUEST_ITEM_BY_STATUS[status]];
  const iconSize = size - PADDING * 2;
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withTiming(6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.box,
        {
          left: centerX - size / 2,
          top: topY - size - 8,
          width: size,
          height: size,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.2)']}
        locations={[0, 0.6, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {def?.imageUrl ? (
        <CachedImage
          source={{ uri: def.imageUrl }}
          style={{ width: iconSize, height: iconSize }}
          resizeMode="contain"
        />
      ) : (
        <Text style={[styles.emoji, { fontSize: iconSize * 0.6 }]}>{def?.emoji ?? '📖'}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    opacity: 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  emoji: {
    lineHeight: undefined,
  },
});

/**
 * Computes the quest bubble status for an NPC.
 * Returns the highest-priority status: completable > in_progress > available.
 */
export function getQuestStatusForNpc(
  npcItemType: string,
  quests: QuestProgress[],
  petLevel: number,
  farmLevel: number,
): QuestBubbleStatus | null {
  let status: QuestBubbleStatus | null = null;

  for (const q of quests) {
    const talkTrigger = q.triggers?.find((t) => t.type === 'talk_to_npc' && t.npcItemType === npcItemType);
    if (!talkTrigger) continue;

    if (q.status === 'active') {
      if (q.canComplete) return 'completable';
      if (!status) status = 'in_progress';
    } else if (q.status === 'locked') {
      if (!meetsActivationRequirements(q, petLevel, farmLevel, quests)) continue;
      if (!status) status = 'available';
    }
  }

  return status;
}

/** Exported for use in NPC click handlers (useGameActions, MultiplayerScene). */
export function meetsActivationRequirements(
  quest: QuestProgress,
  petLevel: number,
  farmLevel: number,
  allQuests: QuestProgress[],
): boolean {
  if (quest.petLevelMin != null && petLevel < quest.petLevelMin) return false;
  if (quest.farmLevelMin != null && farmLevel < quest.farmLevelMin) return false;
  if (quest.requiredQuestId) {
    const req = allQuests.find((q) => q.questId === quest.requiredQuestId);
    if (req?.status !== 'completed') return false;
  }
  return true;
}
