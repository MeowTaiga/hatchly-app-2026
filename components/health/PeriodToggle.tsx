/**
 * Period Toggle — segmented control for Week | Month on the health overview.
 * Consumes HealthPeriodContext; calls setPeriod on press.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useHealthPeriod } from '@/store/HealthPeriodProvider';
import { useTheme } from '@/store/ThemeProvider';
import type { HealthPeriod } from '@/lib/healthPeriod';
import { spacing, radius } from '@/constants/theme';

const OPTIONS: { value: HealthPeriod; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

export function PeriodToggle() {
  const { period, setPeriod } = useHealthPeriod();
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={[styles.container, { backgroundColor: colors.border + '40' }]}>
      {OPTIONS.map((opt) => {
        const isSelected = period === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => setPeriod(opt.value)}
            style={({ pressed }) => [
              styles.option,
              isSelected && { backgroundColor: colors.surface },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: isSelected ? colors.text : colors.textSecondary },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radius.full,
    padding: 4,
    alignSelf: 'center',
    marginBottom: spacing.base,
  },
  option: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
