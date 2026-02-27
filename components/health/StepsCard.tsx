/**
 * Steps Card — steps over the period (total, avg/day, days met goal).
 * Uses useHealthRangeData for weekly/monthly. onPress opens FitnessDrawer.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useHealthPeriod } from '@/store/HealthPeriodProvider';
import { useHealthRangeData } from '@/hooks/useHealthRangeData';
import { useTheme } from '@/store/ThemeProvider';
import { formatPeriodLabel } from '@/lib/healthPeriod';
import { STEP_GOAL } from '@/lib/healthAggregates';
import { spacing } from '@/constants/theme';

const RING_SIZE = 72;
const STROKE = 6;
const R = (RING_SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

interface StepsCardProps {
  onPress: () => void;
}

export function StepsCard({ onPress }: StepsCardProps) {
  const { period } = useHealthPeriod();
  const { stepsData } = useHealthRangeData(period);
  const { theme } = useTheme();
  const { colors, typography } = theme;

  const total = stepsData?.total ?? 0;
  const avgPerDay = stepsData?.avgPerDay ?? 0;
  const daysMetGoal = stepsData?.daysMetGoal ?? 0;
  const totalDays = stepsData?.totalDays ?? 1;
  const pct = totalDays > 0 ? Math.min((avgPerDay / STEP_GOAL) * 100, 150) / 100 : 0;
  const offset = C * (1 - Math.min(pct, 1));

  const displayValue =
    totalDays > 0
      ? period === 'week'
        ? `${total.toLocaleString()} total`
        : `Avg ${avgPerDay.toLocaleString()}/day`
      : '—';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface + 'CC' },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.ringWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={R}
              stroke={colors.border}
              strokeWidth={STROKE}
              fill="none"
            />
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={R}
              stroke={colors.accent}
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={`${C} ${C}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Ionicons name="footsteps" size={24} color={colors.accent} />
          </View>
        </View>
        <View style={styles.body}>
          <Text style={[styles.title, typography.label, { color: colors.text }]}>Steps</Text>
          <Text style={[styles.value, typography.title, { color: colors.text }]}>{displayValue}</Text>
          <Text style={[styles.subtitle, typography.subtitle, { color: colors.textSecondary }]}>
            {formatPeriodLabel(period)}
            {totalDays > 0 ? ` · ${daysMetGoal} of ${totalDays} days met ${STEP_GOAL.toLocaleString()}` : ''}
          </Text>
          <Text style={[styles.hint, typography.subtitle, { color: colors.textMuted }]}>
            Tap to connect Health or refresh
          </Text>
        </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  title: { marginBottom: spacing.xs },
  value: { marginBottom: 2 },
  subtitle: { fontSize: 13, marginBottom: 2 },
  hint: { fontSize: 12 },
});
