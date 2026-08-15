/**
 * Today’s wellness pulse — mood check-in + protein / meals / diary chips
 * (metrics not already covered by the circle trackers above).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/store/ThemeProvider';
import { useFood } from '@/store/FoodProvider';
import { useMacroGoals } from '@/store/MacroGoalsProvider';
import { api } from '@/lib/api';
import { MOOD_OPTIONS } from '@/components/chat/moodOptions';
import { MEAL_ORDER } from '@/lib/meals';
import { spacing } from '@/constants/theme';

interface TodayPulseCardProps {
  onLogMood: () => void;
  /** Bump after logging mood so status refreshes. */
  refreshToken?: number;
}

export function TodayPulseCard({ onLogMood, refreshToken = 0 }: TodayPulseCardProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { totals, logs } = useFood();
  const { goals: macroGoals } = useMacroGoals();

  const [latestMood, setLatestMood] = useState<string | null>(null);
  const [todayMoodCount, setTodayMoodCount] = useState(0);
  const [canReward, setCanReward] = useState(true);

  const refreshMood = useCallback(async () => {
    try {
      const status = await api.getMoodStatus();
      setLatestMood(status.latest?.mood ?? null);
      setTodayMoodCount(status.todayCount ?? 0);
      setCanReward(status.canReward);
    } catch {
      // keep prior
    }
  }, []);

  useEffect(() => {
    refreshMood();
  }, [refreshMood, refreshToken]);

  const cardShadow = useMemo(
    () =>
      Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
        android: { elevation: 2 },
      }),
    [],
  );

  const moodMeta = latestMood ? MOOD_OPTIONS.find((o) => o.id === latestMood) : null;

  const proteinGoal = macroGoals.protein ?? 0;
  const proteinPct =
    proteinGoal > 0 ? Math.min(150, Math.round((totals.protein / proteinGoal) * 100)) : 0;

  const mealsLogged = useMemo(() => {
    const types = new Set(logs.map((l) => l.mealType));
    return MEAL_ORDER.filter((m) => types.has(m)).length;
  }, [logs]);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: colors.textMuted }]}>TODAY</Text>
          <Text style={[styles.title, { color: colors.text }]}>Wellness pulse</Text>
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/health')}
          hitSlop={8}
          style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.linkText, { color: colors.primary }]}>Health</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </Pressable>
      </View>

      <Pressable
        onPress={onLogMood}
        style={({ pressed }) => [
          styles.moodRow,
          { backgroundColor: colors.primary + '14', borderColor: colors.primary + '28' },
          pressed && { opacity: 0.88 },
        ]}
      >
        <View style={[styles.moodIcon, { backgroundColor: colors.primary + '22' }]}>
          <Text style={styles.moodEmoji}>{moodMeta?.emoji ?? '♡'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.moodTitle, { color: colors.text }]}>
            {moodMeta ? `Feeling ${moodMeta.label.toLowerCase()}` : 'How are you feeling?'}
          </Text>
          <Text style={[styles.moodSub, { color: colors.textSecondary }]}>
            {canReward
              ? 'Log a mood · earn XP & gems'
              : moodMeta
                ? 'Tap to add another diary entry'
                : 'Open your mood diary'}
          </Text>
        </View>
        <View style={[styles.ctaPill, { backgroundColor: colors.primary }]}>
          <Text style={styles.ctaText}>{moodMeta ? 'Log' : 'Check in'}</Text>
        </View>
      </Pressable>

      <View style={styles.metrics}>
        <View style={[styles.metric, { backgroundColor: 'rgba(127,127,127,0.08)' }]}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Protein</Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {proteinGoal > 0 ? `${proteinPct}%` : `${Math.round(totals.protein)}g`}
          </Text>
          <Text style={[styles.metricHint, { color: colors.textSecondary }]}>
            {proteinGoal > 0
              ? `${Math.round(totals.protein)} / ${proteinGoal}g`
              : 'Set a goal'}
          </Text>
        </View>
        <View style={[styles.metric, { backgroundColor: 'rgba(127,127,127,0.08)' }]}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Meals</Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {mealsLogged}/4
          </Text>
          <Text style={[styles.metricHint, { color: colors.textSecondary }]}>
            {logs.length === 0
              ? 'Nothing logged'
              : `${logs.length} item${logs.length === 1 ? '' : 's'} today`}
          </Text>
        </View>
        <View style={[styles.metric, { backgroundColor: 'rgba(127,127,127,0.08)' }]}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Diary</Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {todayMoodCount}
          </Text>
          <Text style={[styles.metricHint, { color: colors.textSecondary }]}>
            {todayMoodCount === 0
              ? 'No check-ins'
              : todayMoodCount === 1
                ? 'entry today'
                : 'entries today'}
          </Text>
        </View>
      </View>
    </View>
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
    marginBottom: 12,
  },
  kicker: { fontSize: 11, fontWeight: '900', letterSpacing: 1.1, marginBottom: 2 },
  title: { fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 },
  linkText: { fontSize: 13, fontWeight: '700' },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  moodIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodEmoji: { fontSize: 22 },
  moodTitle: { fontSize: 15, fontWeight: '800' },
  moodSub: { fontSize: 12, marginTop: 2 },
  ctaPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  ctaText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  metrics: { flexDirection: 'row', gap: 8 },
  metric: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metricValue: { fontSize: 16, fontWeight: '900' },
  metricHint: { fontSize: 10, marginTop: 2, textAlign: 'center' },
});
