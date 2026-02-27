/**
 * Nutrition Progress Card — avg calories + macros vs goals over the period.
 * Uses useHealthRangeData for weekly/monthly aggregates.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHealthPeriod } from '@/store/HealthPeriodProvider';
import { useHealthRangeData } from '@/hooks/useHealthRangeData';
import { useMacroGoals } from '@/store/MacroGoalsProvider';
import { useWeight } from '@/store/WeightProvider';
import { useTheme } from '@/store/ThemeProvider';
import { NUTRIENT_CONFIG } from '@/lib/nutrients';
import { formatPeriodLabel } from '@/lib/healthPeriod';
import { spacing } from '@/constants/theme';

const MACRO_ITEMS: { key: 'calories' | 'protein' | 'fat' | 'carbs'; label: string; colorKey: 'primary' | 'protein' | 'fat' | 'carbs'; unit: string }[] = [
  { key: 'calories', label: 'Calories', colorKey: 'primary', unit: 'cal' },
  { key: 'protein', label: 'Protein', colorKey: 'protein', unit: 'g' },
  { key: 'fat', label: 'Total Fat', colorKey: 'fat', unit: 'g' },
  { key: 'carbs', label: 'Carbs', colorKey: 'carbs', unit: 'g' },
];

interface NutritionProgressCardProps {
  onPress?: () => void;
}

export function NutritionProgressCard({ onPress }: NutritionProgressCardProps) {
  const { period } = useHealthPeriod();
  const { foodData } = useHealthRangeData(period);
  const { goals } = useMacroGoals();
  const { dailyCalorieTarget } = useWeight();
  const { theme } = useTheme();
  const { colors, typography } = theme;

  const content = (
    <>
      <Text style={[styles.title, typography.label, { color: colors.text }]}>Nutrition</Text>
      <Text style={[styles.subtitle, typography.subtitle, { color: colors.textSecondary }]}>
        {formatPeriodLabel(period)}
        {foodData && foodData.daysWithData > 0
          ? ` · Avg over ${foodData.daysWithData} days`
          : ''}
      </Text>
      {MACRO_ITEMS.map(({ key, label, colorKey, unit }) => {
        const color = colorKey === 'primary' ? colors.primary : NUTRIENT_CONFIG[colorKey].color;
        const iconColor = colorKey === 'primary' ? (colors.primaryText ?? colors.primary) : NUTRIENT_CONFIG[colorKey].color;
        const avg = foodData
          ? key === 'calories'
            ? foodData.avgCalories
            : foodData[key === 'protein' ? 'avgProtein' : key === 'fat' ? 'avgFat' : 'avgCarbs']
          : 0;
        const goal = key === 'calories' ? dailyCalorieTarget : (goals[key] ?? 0);
        const pct = goal > 0 ? Math.min((avg / goal) * 100, 150) : 0;
        const fillWidth = Math.min(pct / 100, 1);

        return (
          <View key={key} style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: color + '20' }]}>
              <Ionicons name="nutrition-outline" size={16} color={iconColor} />
            </View>
            <View style={styles.body}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
                <Text style={[styles.value, { color: colors.textSecondary }]}>
                  {avg} / {goal} {unit}
                </Text>
              </View>
              <View style={[styles.track, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.fill,
                    { width: `${fillWidth * 100}%`, backgroundColor: color },
                  ]}
                />
              </View>
            </View>
          </View>
        );
      })}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.surface + 'CC' },
          pressed && { opacity: 0.9 },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.card, { backgroundColor: colors.surface + 'CC' }]}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 16,
    padding: spacing.xl,
    marginBottom: spacing.base,
  },
  title: { marginBottom: spacing.xs },
  subtitle: { marginBottom: 16, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: { fontSize: 13, fontWeight: '600' },
  value: { fontSize: 12 },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
});
