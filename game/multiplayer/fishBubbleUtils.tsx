/**
 * Shared utilities for the fish catch result bubble (rarity colors, size formatting, stars).
 */

import React from 'react';
import { View, Text } from 'react-native';
import type { FishRarity } from './MultiplayerProvider';

/** Stars per size label (matches bug catch modal). */
const SIZE_LABEL_STARS: Record<string, number> = {
  Tiny: 1,
  Small: 2,
  Average: 3,
  Large: 4,
  Huge: 5,
};

export function getStarsForSizeLabel(sizeLabel?: string): number {
  if (!sizeLabel) return 3;
  return SIZE_LABEL_STARS[sizeLabel] ?? 3;
}

export function FishStarRow({
  sizeLabel,
  filledColor,
  dimColor,
}: {
  sizeLabel?: string;
  filledColor: string;
  dimColor: string;
}) {
  const filled = getStarsForSizeLabel(sizeLabel);
  const total = 5;
  const stars = [];
  for (let i = 0; i < total; i++) {
    stars.push(
      <Text key={i} style={{ fontSize: 12, color: i < filled ? filledColor : dimColor, marginHorizontal: 0.5 }}>
        ★
      </Text>
    );
  }
  return <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>{stars}</View>;
}

/** Saturated rarity colors for the bubble. bg is slightly transparent; text is high-contrast. */
export const RARITY_BUBBLE_COLORS: Record<FishRarity, { bg: string; text: string; textMuted: string }> = {
  common: { bg: 'rgba(107,114,128,0.88)', text: '#FFFFFF', textMuted: 'rgba(255,255,255,0.88)' },
  rare: { bg: 'rgba(59,130,246,0.88)', text: '#FFFFFF', textMuted: 'rgba(255,255,255,0.88)' },
  epic: { bg: 'rgba(124,58,237,0.88)', text: '#FFFFFF', textMuted: 'rgba(255,255,255,0.88)' },
  unique: { bg: 'rgba(217,119,6,0.88)', text: '#FFFFFF', textMuted: 'rgba(255,255,255,0.88)' },
  legendary: { bg: 'rgba(234,88,12,0.88)', text: '#FFFFFF', textMuted: 'rgba(255,255,255,0.88)' },
  mythic: { bg: 'rgba(219,39,119,0.88)', text: '#FFFFFF', textMuted: 'rgba(255,255,255,0.88)' },
};

export function formatFishSize(size: number, sizeLabel?: string): string {
  if (typeof size !== 'number' || size <= 0) return sizeLabel ?? '—';
  return `${size.toFixed(1)} in`;
}
