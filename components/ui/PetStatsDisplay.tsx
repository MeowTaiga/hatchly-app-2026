/**
 * Shared pet stats display — Happy, Hunger, Mood as numbers with icons.
 * Used by PetHeroBar and PetStatusBar for consistent status display.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface PetStatsDisplayColors {
  text: string;
  textSecondary: string;
  textMuted: string;
  error?: string;
}

interface PetStatsDisplayProps {
  happy: number;
  hunger: number;
  mood: number;
  colors: PetStatsDisplayColors;
  /** Icon size. Default 10. */
  iconSize?: number;
  /** Font size for numbers. Default 10. */
  fontSize?: number;
  /** Gap between stat items. Default 6. */
  gap?: number;
  /** When provided, stats become tappable and open the pet profile drawer. */
  onStatsPress?: () => void;
}

function StatItem({
  icon,
  value,
  colors,
  lowThreshold,
  iconSize,
  fontSize,
}: {
  icon: 'heart' | 'nutrition' | 'sparkles';
  value: number;
  colors: PetStatsDisplayColors;
  lowThreshold?: number;
  iconSize: number;
  fontSize: number;
}) {
  const isLow = lowThreshold != null && value < lowThreshold;
  const numColor = isLow ? (colors.error ?? '#EF4444') : colors.textSecondary;

  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={iconSize} color={colors.textMuted} />
      <Text style={[styles.statNum, { fontSize, color: numColor }]}>{Math.round(value)}</Text>
    </View>
  );
}

export function PetStatsDisplay({
  happy,
  hunger,
  mood,
  colors,
  iconSize = 10,
  fontSize = 10,
  gap = 6,
  onStatsPress,
}: PetStatsDisplayProps) {
  const content = (
    <View style={[styles.statsRow, { gap }]}>
      <StatItem icon="heart" value={happy} colors={colors} iconSize={iconSize} fontSize={fontSize} />
      <StatItem icon="nutrition" value={hunger} colors={colors} lowThreshold={50} iconSize={iconSize} fontSize={fontSize} />
      <StatItem icon="sparkles" value={mood} colors={colors} iconSize={iconSize} fontSize={fontSize} />
    </View>
  );

  if (onStatsPress) {
    return (
      <Pressable onPress={onStatsPress} style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statNum: {
    fontWeight: '700',
  },
  pressable: {
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.8,
  },
});
