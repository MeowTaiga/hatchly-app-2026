/**
 * Farm Level Card — shows farm level with progress bar. Tap opens game tab.
 * Uses useGameSummary for farm level and XP progress.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameSummary } from '@/hooks/useGameSummary';
import { useTheme } from '@/store/ThemeProvider';
import { spacing } from '@/constants/theme';

export function FarmLevelCard() {
  const { summary } = useGameSummary();
  const { theme } = useTheme();
  const { colors, typography } = theme;
  const router = useRouter();

  const pct = Math.min(summary.xpProgress, 100);

  return (
    <Pressable
      onPress={() => router.push('/(tabs)/game')}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface + 'CC' },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[styles.title, typography.label, { color: colors.text }]}>
        Your farm: Level {summary.farmLevel} — {summary.farmLevelEmoji} {summary.farmLevelTitle}
      </Text>
      <Text style={[styles.body, typography.subtitle, { color: colors.textSecondary }]}>
        {pct}% progress to next level. Tap to visit the Game tab!
      </Text>
      <View style={[styles.bar, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.barFill,
            { backgroundColor: colors.primary, width: `${pct}%` },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 16,
    padding: spacing.xl,
    marginBottom: spacing.base,
  },
  title: { marginBottom: spacing.xs },
  body: { lineHeight: 22, marginBottom: 10 },
  bar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
});
