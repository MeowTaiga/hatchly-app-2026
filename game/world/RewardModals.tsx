import { useTheme } from '@/store/ThemeProvider';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ItemRewardModal } from '../ItemRewardModal';
import type { BalloonPopResult, BugCatchResult, FossilDigResult } from '../types';

/** Bug size buckets, smallest to largest. */
const RARITY_TIERS = [
  { label: 'Tiny', stars: 1, color: '#90CAF9' },
  { label: 'Small', stars: 2, color: '#67E8F9' },
  { label: 'Average', stars: 3, color: '#A5D6A7' },
  { label: 'Large', stars: 4, color: '#FFD54F' },
  { label: 'Huge', stars: 5, color: '#FF8A65' },
] as const;

const DEFAULT_TIER = RARITY_TIERS[2];
const TOTAL_STARS = 5;

function StarRow({ filled, color, dimColor }: { filled: number; color: string; dimColor: string }) {
  return (
    <View style={styles.starRow}>
      {Array.from({ length: TOTAL_STARS }, (_, i) => (
        <Text key={i} style={[styles.star, { color: i < filled ? color : dimColor }]}>★</Text>
      ))}
    </View>
  );
}

export function BugCatchModal({
  result,
  imageUrl,
  onDismiss,
}: {
  result: BugCatchResult;
  imageUrl?: string | null;
  onDismiss: () => void;
}) {
  const { themeMode } = useTheme();
  const rarity = RARITY_TIERS.find((t) => t.label === result.sizeLabel) ?? DEFAULT_TIER;
  return (
    <ItemRewardModal
      title="Caught!"
      label={result.label}
      imageUrl={imageUrl}
      emoji="🐛"
      accentColor={rarity.color}
      extraContent={
        <>
          <StarRow
            filled={rarity.stars}
            color={rarity.color}
            dimColor={themeMode === 'dark' ? '#48484A' : '#E0E0E0'}
          />
          <View style={[styles.sizePill, { backgroundColor: rarity.color }]}>
            <Text style={styles.sizePillText}>
              {result.sizeLabel} · {result.size.toFixed(2)}x
            </Text>
          </View>
        </>
      }
      onDismiss={onDismiss}
    />
  );
}

export function BalloonPopModal({
  result,
  imageUrl,
  onDismiss,
}: {
  result: BalloonPopResult;
  imageUrl?: string | null;
  onDismiss: () => void;
}) {
  const isGemsOnly = result.itemType === 'gems';
  return (
    <ItemRewardModal
      title="Popped!"
      label={isGemsOnly ? `+${result.gemsAwarded ?? 0} Gems` : `You got ${result.label}!`}
      imageUrl={isGemsOnly ? undefined : imageUrl}
      emoji="🎈"
      qty={isGemsOnly ? undefined : result.qty}
      gemsAwarded={result.gemsAwarded}
      accentColor="#A855F7"
      onDismiss={onDismiss}
    />
  );
}

export function FossilDigModal({
  result,
  imageUrl,
  onDismiss,
}: {
  result: FossilDigResult;
  imageUrl?: string | null;
  onDismiss: () => void;
}) {
  return (
    <ItemRewardModal
      title="Dug up!"
      label={`You got ${result.label}!`}
      imageUrl={imageUrl}
      emoji="🦴"
      qty={result.qty}
      accentColor="#D97706"
      onDismiss={onDismiss}
    />
  );
}

const styles = StyleSheet.create({
  starRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  star: { fontSize: 16, marginHorizontal: 0.5 },
  sizePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  sizePillText: { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
});
