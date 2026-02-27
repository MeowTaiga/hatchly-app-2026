import React, { forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { createDrawerContentStyles } from '@/components/ui/drawerStyles';
import { foodIcon, multiplyDesc } from '@/components/food/FoodDrawer';
import { NUTRIENT_CONFIG, NUTRIENT_KEYS } from '@/lib/nutrients';
import type { FoodLogEntry } from '@/lib/api';
import { MEAL_META } from '@/lib/meals';
import { useTheme } from '@/store/ThemeProvider';
import { drawerInner } from '@/components/ui/drawerStyles';
import { radius } from '@/constants/theme';

// ─── Types ───────────────────────────────────────────────────────────────

export interface FoodDetailDrawerRef {
  open: (entry: FoodLogEntry) => void;
  close: () => void;
}

interface FoodDetailDrawerProps {
  onDelete?: (id: string) => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getValue(entry: FoodLogEntry, key: string): number {
  if (key === 'calories') return entry.calories * entry.numberOfServings;
  const v = entry[key as keyof FoodLogEntry];
  if (typeof v !== 'number') return 0;
  const total = v * entry.numberOfServings;
  return ['sodium', 'potassium', 'cholesterol'].includes(key)
    ? Math.round(total)
    : +(total.toFixed(1));
}

const NUTRIENT_DISPLAY_ORDER: (string | 'calories')[] = [
  'calories',
  ...NUTRIENT_KEYS,
];

// ─── Component ────────────────────────────────────────────────────────────

export const FoodDetailDrawer = forwardRef<FoodDetailDrawerRef, FoodDetailDrawerProps>(
  function FoodDetailDrawer({ onDelete }, ref) {
    const { theme } = useTheme();
    const colors = theme.colors;
    const st = useMemo(() => createDrawerContentStyles(theme), [theme]);
    const drawerRef = useRef<AppDrawerRef>(null);
    const [entry, setEntry] = React.useState<FoodLogEntry | null>(null);

    useImperativeHandle(ref, () => ({
      open(e: FoodLogEntry) {
        setEntry(e);
        drawerRef.current?.open();
      },
      close: () => drawerRef.current?.close(),
    }));

    const mult = entry?.numberOfServings ?? 1;
    const servingLabel = entry ? multiplyDesc(entry.servingDescription, mult) : '';
    const mealMeta = entry ? (MEAL_META[entry.mealType] ?? MEAL_META.lunch) : MEAL_META.lunch;

    const nutrients = useMemo(() => {
      if (!entry) return [];
      const out: { key: string; label: string; value: number; unit: string; color: string }[] = [];
      for (const key of NUTRIENT_DISPLAY_ORDER) {
        const val = key === 'calories'
          ? Math.round(getValue(entry, 'calories'))
          : getValue(entry, key);
        if (val <= 0) continue;
        const cfg = key === 'calories'
          ? { label: 'Calories', unit: 'cal' as const, color: colors.primary }
          : NUTRIENT_CONFIG[key as keyof typeof NUTRIENT_CONFIG];
        if (cfg) {
          out.push({
            key,
            label: cfg.label,
            value: val,
            unit: cfg.unit,
            color: cfg.color,
          });
        }
      }
      return out;
    }, [entry, colors.primary]);

    return (
      <AppDrawer
        ref={drawerRef}
        title={entry?.foodName ?? 'Food Details'}
        snapPoints={['88%']}
        scrollable
      >
        {entry ? (
        <View style={[drawerInner, styles.inner]}>
          {/* Hero card */}
          <View style={[st.card, styles.heroCard]}>
            <View style={[st.rowIcon, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name={foodIcon(entry.foodName)} size={24} color={colors.primary} />
            </View>
            <View style={st.rowBody}>
              <Text style={[st.rowValue, { fontSize: 18 }]} numberOfLines={2}>
                {entry.foodName}
              </Text>
              {entry.brandName ? (
                <Text style={st.rowLabel} numberOfLines={1}>{entry.brandName}</Text>
              ) : null}
              <Text style={[st.rowLabel, { marginTop: 4 }]}>{servingLabel}</Text>
            </View>
          </View>

          {/* Meal badge */}
          <View style={[styles.mealBadge, { backgroundColor: `${mealMeta.color}18` }]}>
            <Ionicons name={mealMeta.icon} size={16} color={mealMeta.color} />
            <Text style={[styles.mealBadgeText, { color: mealMeta.color }]}>{mealMeta.label}</Text>
          </View>

          {/* Nutrition breakdown */}
          <Text style={st.secLabel}>Nutrition</Text>
          <View style={[st.card, styles.nutritionCard]}>
            {nutrients.map((n, idx) => (
              <View
                key={n.key}
                style={[
                  styles.nutrientRow,
                  idx < nutrients.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.nutrientLabel, { color: colors.textSecondary }]}>
                  {n.label}
                </Text>
                <Text style={[styles.nutrientValue, { color: n.color }]}>
                  {n.value % 1 === 0 ? n.value : n.value.toFixed(1)} {n.unit}
                </Text>
              </View>
            ))}
          </View>
        </View>
        ) : null}
      </AppDrawer>
    );
  },
);

const styles = StyleSheet.create({
  inner: {},
  heroCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  mealBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  nutritionCard: {
    gap: 0,
  },
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  nutrientLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  nutrientValue: {
    fontSize: 15,
    fontWeight: '700',
  },
});
