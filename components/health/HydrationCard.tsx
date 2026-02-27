/**
 * Hydration Card — water progress (avg oz, days met goal) over the period.
 * Uses useHealthRangeData for weekly/monthly. When onPress provided, opens water drawer.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useHealthPeriod } from '@/store/HealthPeriodProvider';
import { useHealthRangeData } from '@/hooks/useHealthRangeData';
import { useTheme } from '@/store/ThemeProvider';
import { formatPeriodLabel } from '@/lib/healthPeriod';
import { spacing } from '@/constants/theme';

const RING_SIZE = 72;
const STROKE = 6;
const R = (RING_SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

interface HydrationCardProps {
  /** When provided, called on press (e.g. to open water drawer). Otherwise navigates to Home. */
  onPress?: () => void;
}

export function HydrationCard({ onPress }: HydrationCardProps) {
  const { period } = useHealthPeriod();
  const { waterData } = useHealthRangeData(period);
  const { theme } = useTheme();
  const { colors, typography } = theme;
  const router = useRouter();

  const goalOz = waterData?.goalOz ?? 64;
  const avgOz = waterData?.avgOz ?? 0;
  const daysMetGoal = waterData?.daysMetGoal ?? 0;
  const totalDays = waterData?.totalDays ?? 1;
  const pct = goalOz > 0 ? Math.min(avgOz / goalOz, 1) : 0;
  const offset = C * (1 - pct);

  const handlePress = () => {
    if (onPress) onPress();
    else router.push('/');
  };

  return (
    <Pressable
      onPress={handlePress}
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
            <Ionicons name="water" size={24} color={colors.accent} />
          </View>
        </View>
        <View style={styles.body}>
          <Text style={[styles.title, typography.label, { color: colors.text }]}>Hydration</Text>
          <Text style={[styles.value, typography.title, { color: colors.text }]}>
            Avg {avgOz} / {goalOz} oz
          </Text>
          <Text style={[styles.subtitle, typography.subtitle, { color: colors.textSecondary }]}>
            {formatPeriodLabel(period)}
            {totalDays > 0 ? ` · ${daysMetGoal} of ${totalDays} days met goal` : ''}
          </Text>
          <Text style={[styles.hint, typography.subtitle, { color: colors.textMuted }]}>
            {onPress ? 'Tap to log water' : 'Tap to log water on Home'}
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
