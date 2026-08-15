/**
 * Live fast countdown on Home, directly under the health circles.
 */

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/ThemeProvider';
import { useFasting } from '@/store/FastingProvider';
import { useTick, formatCountdown, formatClock } from '@/hooks/useTick';
import { spacing, radius } from '@/constants/theme';

interface FastingTimerCardProps {
  onPress: () => void;
}

export function FastingTimerCard({ onPress }: FastingTimerCardProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const { interested, active, isLoaded } = useFasting();
  const ticking = interested === true && !!active;
  const now = useTick(1000, ticking);

  const remainingMs = active
    ? Math.max(0, new Date(active.endsAt).getTime() - now)
    : 0;
  const done = !!active && remainingMs <= 0;
  const elapsedMs = active ? now - new Date(active.startedAt).getTime() : 0;
  const goalMs = (active?.goalHours ?? 16) * 60 * 60 * 1000;
  const progress = active ? Math.min(1, Math.max(0, elapsedMs / goalMs)) : 0;

  const cardShadow = useMemo(
    () =>
      Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
        android: { elevation: 2 },
      }),
    [],
  );

  if (!isLoaded || interested !== true) return null;

  const title = !active
    ? 'Start a fast'
    : done
      ? 'Fast complete'
      : `${active.goalHours}h fast`;
  const subtitle = !active
    ? 'Pick a window and we’ll count down'
    : done
      ? `You made it ${active.goalHours} hours`
      : `Eat at ${formatClock(active.endsAt)}`;

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
      <View style={[styles.icon, { backgroundColor: colors.primary + '18' }]}>
        <Ionicons name={done ? 'checkmark-circle' : 'timer-outline'} size={22} color={colors.primary} />
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {active && !done ? (
            <Text style={[styles.clock, { color: colors.primary }]}>{formatCountdown(remainingMs)}</Text>
          ) : (
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          )}
        </View>
        <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={1}>
          {subtitle}
        </Text>
        {active ? (
          <View style={[styles.bar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.fill,
                { width: `${Math.round(progress * 100)}%`, backgroundColor: colors.primary },
              ]}
            />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: spacing.xl,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: { fontSize: 15, fontWeight: '800', flex: 1 },
  clock: { fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  sub: { fontSize: 12, fontWeight: '500' },
  bar: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
