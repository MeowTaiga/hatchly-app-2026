/**
 * Combined farm hub — level XP, gems, and active quests in one card.
 */

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGameSummary } from '@/hooks/useGameSummary';
import { useTheme } from '@/store/ThemeProvider';
import { GemIcon } from '@/components/ui/GemIcon';
import { spacing } from '@/constants/theme';

export function FarmHubCard() {
  const { summary } = useGameSummary();
  const { theme } = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const gemColor = colors.gemColor ?? colors.primary;
  const pct = Math.min(summary.xpProgress, 100);

  const cardShadow = useMemo(
    () =>
      Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
        android: { elevation: 2 },
      }),
    [],
  );

  return (
    <Pressable
      onPress={() => router.push('/(tabs)/game')}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        cardShadow,
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: colors.textMuted }]}>FARM</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            {summary.farmLevelEmoji} Level {summary.farmLevel} · {summary.farmLevelTitle}
          </Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            {pct}% to next farm level · tap to play
          </Text>
        </View>
        <View style={[styles.gemPill, { backgroundColor: gemColor + '18' }]}>
          <GemIcon size={16} />
          <Text style={[styles.gemText, { color: colors.text }]}>{summary.gems}</Text>
        </View>
      </View>

      <View style={[styles.bar, { backgroundColor: colors.border }]}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
      </View>

      <View style={styles.questBlock}>
        <View style={styles.questHeader}>
          <View style={[styles.questIcon, { backgroundColor: colors.secondary + '20' }]}>
            <Ionicons name="flag" size={14} color={colors.secondary} />
          </View>
          <Text style={[styles.questTitle, { color: colors.text }]}>
            {summary.questCount} active quest{summary.questCount === 1 ? '' : 's'}
          </Text>
        </View>
        {summary.activeQuestTitles.length > 0 ? (
          summary.activeQuestTitles.map((title) => (
            <Text key={title} style={[styles.questItem, { color: colors.textSecondary }]} numberOfLines={1}>
              · {title}
            </Text>
          ))
        ) : (
          <Text style={[styles.questItem, { color: colors.textMuted }]}>
            Visit the farm to pick up new quests
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1,
    padding: spacing.xl,
    marginBottom: spacing.base,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  kicker: { fontSize: 11, fontWeight: '900', letterSpacing: 1.1, marginBottom: 2 },
  title: { fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  sub: { fontSize: 12, marginTop: 2 },
  gemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  gemText: { fontSize: 14, fontWeight: '800' },
  bar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 14,
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
  questBlock: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(127,127,127,0.08)',
    gap: 4,
  },
  questHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  questIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questTitle: { fontSize: 14, fontWeight: '800' },
  questItem: { fontSize: 12, lineHeight: 18, paddingLeft: 4 },
});
