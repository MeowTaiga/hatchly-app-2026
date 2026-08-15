/**
 * Today’s goals summary on Home and Wellness.
 */

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/ThemeProvider';
import { useGoals } from '@/store/GoalsProvider';
import { GoalIcon } from '@/components/goals/GoalIcon';
import { spacing, radius } from '@/constants/theme';

interface GoalsCardProps {
  onPress: () => void;
}

export function GoalsCard({ onPress }: GoalsCardProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const { state, isLoaded } = useGoals();

  const cardShadow = useMemo(
    () =>
      Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
        android: { elevation: 2 },
      }),
    [],
  );

  const due = useMemo(
    () => [
      ...state.goals.filter((g) => g.dueToday),
      ...(state.sharedGoals ?? []).filter((g) => g.dueToday),
    ],
    [state.goals, state.sharedGoals],
  );
  const preview = due.slice(0, 5);
  const progress = state.dueCount > 0 ? state.completedCount / state.dueCount : 0;

  if (!isLoaded) return null;

  const title = state.dueCount === 0 ? 'Today’s goals' : `${state.completedCount} of ${state.dueCount} today`;
  const subtitle =
    state.dueCount === 0
      ? 'Add a recommended goal or make your own'
      : state.completedCount >= state.dueCount
        ? 'All done — nice work'
        : 'Tap to check them off';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        cardShadow,
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: colors.textMuted }]}>GOALS</Text>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
      {preview.length > 0 ? (
        <View style={styles.icons}>
          {preview.map((g) => (
            <View
              key={g.id}
              style={[
                styles.iconWrap,
                {
                  backgroundColor: g.completedToday ? colors.primary + '22' : colors.surfaceElevated,
                  borderColor: g.completedToday ? colors.primary : colors.border,
                  opacity: g.completedToday ? 0.55 : 1,
                },
              ]}
            >
              <GoalIcon
                itemType={g.iconItemType}
                imageUrl={g.iconImageUrl}
                emoji={g.iconEmoji}
                size={26}
              />
            </View>
          ))}
          {due.length > preview.length ? (
            <Text style={[styles.more, { color: colors.textMuted }]}>+{due.length - preview.length}</Text>
          ) : null}
        </View>
      ) : null}
      {state.dueCount > 0 ? (
        <View style={[styles.bar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.fill,
              { width: `${Math.round(progress * 100)}%`, backgroundColor: colors.primary },
            ]}
          />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: spacing.xl,
    gap: 10,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  sub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  icons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  more: { fontSize: 12, fontWeight: '700' },
  bar: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
