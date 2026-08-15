/**
 * Game-item art for a goal. Prefers URLs from the goals API, then the
 * item preview cache. Letter is only a last-frame placeholder.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import {
  ensureItemPreviewCache,
  resolveItemPreview,
} from '@/lib/itemPreviewCache';
import { useGoalsOptional } from '@/store/GoalsProvider';

interface GoalIconProps {
  itemType: string;
  size?: number;
  imageUrl?: string;
  emoji?: string;
}

export const GoalIcon = React.memo(function GoalIcon({
  itemType,
  size = 32,
  imageUrl,
  emoji,
}: GoalIconProps) {
  const goals = useGoalsOptional();
  const art = goals?.state.iconArt?.[itemType];
  const [, setTick] = useState(0);

  const uri = imageUrl || art?.imageUrl;
  const em = emoji || art?.emoji;

  useEffect(() => {
    if (uri || em) return;
    let alive = true;
    void ensureItemPreviewCache().then(() => {
      if (alive) setTick((n) => n + 1);
    });
    return () => {
      alive = false;
    };
  }, [itemType, uri, em]);

  const preview = resolveItemPreview(itemType);
  const resolvedUrl = uri || preview.imageUrl;
  const resolvedEmoji = em || preview.emoji;
  const letter = (preview.label || itemType).charAt(0).toUpperCase();

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {resolvedUrl ? (
        <CachedImage
          source={{ uri: resolvedUrl }}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      ) : resolvedEmoji ? (
        <Text style={[styles.emoji, { fontSize: size * 0.62 }]}>{resolvedEmoji}</Text>
      ) : (
        <Text style={[styles.letter, { fontSize: size * 0.42 }]}>{letter}</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {},
  letter: { fontWeight: '800', color: '#888' },
});
