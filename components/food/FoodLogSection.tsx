/**
 * Today's food log — meal accordion on the home tab.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutAnimation, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { foodIcon, multiplyDesc } from '@/components/food/FoodDrawer';
import { useFood } from '@/store/FoodProvider';
import { type FoodLogEntry, type MealType } from '@/lib/api';
import { MEAL_META, MEAL_ORDER } from '@/lib/meals';
import { useTheme } from '@/store/ThemeProvider';
import { spacing } from '@/constants/theme';

const MOVE_OPTIONS = MEAL_ORDER;

interface FoodLogSectionProps {
  onFoodPress?: (entry: FoodLogEntry) => void;
}

export function FoodLogSection({ onFoodPress }: FoodLogSectionProps = {}) {
  const { theme } = useTheme();
  const { logs, deleteLog, updateLogMeal, totals } = useFood();
  const colors = theme.colors;

  const cardShadow = useMemo(
    () =>
      Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
        android: { elevation: 2 },
      }),
    [],
  );

  const st = useMemo(
    () =>
      StyleSheet.create({
        container: { width: '100%', marginBottom: spacing.base },
        header: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          marginBottom: 12,
        },
        kicker: {
          fontSize: 11,
          fontWeight: '900',
          letterSpacing: 1.1,
          color: colors.textMuted,
          marginBottom: 2,
        },
        title: {
          fontSize: 18,
          fontWeight: '900',
          letterSpacing: -0.3,
          color: colors.text,
        },
        sub: {
          fontSize: 12,
          color: colors.textSecondary,
          marginTop: 2,
        },
        calPill: {
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: colors.primary + '18',
          marginTop: 2,
        },
        calPillText: {
          fontSize: 12,
          fontWeight: '800',
          color: colors.primary,
        },
        empty: {
          borderRadius: 22,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          padding: 16,
        },
        emptyText: {
          fontSize: 13,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: 18,
        },
        group: {
          borderRadius: 22,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          marginBottom: 10,
          overflow: 'hidden',
        },
        groupHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 14,
          paddingHorizontal: 14,
          gap: 10,
        },
        groupIcon: {
          width: 42,
          height: 42,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
        },
        groupLabel: {
          flex: 1,
          fontSize: 15,
          fontWeight: '800',
          color: colors.text,
        },
        groupBadge: {
          backgroundColor: colors.border + '55',
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 10,
        },
        groupBadgeText: {
          fontSize: 12,
          fontWeight: '700',
          color: colors.textSecondary,
        },
        groupCal: {
          fontSize: 13,
          fontWeight: '800',
          color: colors.primary,
        },
        logRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 10,
          paddingHorizontal: 14,
          gap: 10,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
        },
        logRowIcon: {
          width: 30,
          height: 30,
          borderRadius: 10,
          backgroundColor: colors.border + '60',
          alignItems: 'center',
          justifyContent: 'center',
        },
        logRowBody: { flex: 1, gap: 2 },
        logRowName: { fontSize: 14, fontWeight: '700', color: colors.text },
        logRowSub: { fontSize: 11, color: colors.textMuted },
        logRowChips: { flexDirection: 'row', gap: 4, marginTop: 3, flexWrap: 'wrap' },
        chip: {
          paddingHorizontal: 6,
          paddingVertical: 1.5,
          borderRadius: 6,
        },
        chipText: { fontSize: 10, fontWeight: '700' },
        chipUnit: { fontWeight: '500', fontSize: 9 },
        deleteAction: {
          backgroundColor: colors.error,
          justifyContent: 'center',
          alignItems: 'center',
          width: 64,
        },
      }),
    [colors],
  );

  const grouped = useMemo(() => {
    const g: Record<MealType, FoodLogEntry[]> = {
      breakfast: [], lunch: [], dinner: [], snack: [],
    };
    for (const l of logs) g[l.mealType]?.push(l);
    return g;
  }, [logs]);

  const nonEmptyMeals = useMemo(
    () => MEAL_ORDER.filter((m) => grouped[m].length > 0),
    [grouped],
  );

  const [openMeal, setOpenMeal] = useState<MealType | null>(() =>
    nonEmptyMeals.length === 1 ? nonEmptyMeals[0] : null,
  );

  React.useEffect(() => {
    if (nonEmptyMeals.length === 1) setOpenMeal(nonEmptyMeals[0]);
  }, [nonEmptyMeals]);

  const toggle = useCallback((meal: MealType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenMeal((prev) => (prev === meal ? null : meal));
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try { await deleteLog(id); } catch {}
  }, [deleteLog]);

  const handleMove = useCallback((entry: FoodLogEntry) => {
    const others = MOVE_OPTIONS.filter((m) => m !== entry.mealType);
    Alert.alert(
      'Move to…',
      `Move "${entry.foodName}" to a different meal?`,
      [
        ...others.map((m) => ({
          text: MEAL_META[m].label,
          onPress: async () => {
            try { await updateLogMeal(entry.id, m); } catch {}
          },
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  }, [updateLogMeal]);

  const totalCal = Math.round(totals.calories);

  return (
    <View style={st.container}>
      <View style={st.header}>
        <View style={{ flex: 1 }}>
          <Text style={st.kicker}>FUEL</Text>
          <Text style={st.title}>Today's food</Text>
          <Text style={st.sub}>
            {logs.length === 0
              ? 'Tap the calorie ring to log a meal'
              : `${logs.length} item${logs.length === 1 ? '' : 's'} across ${nonEmptyMeals.length} meal${nonEmptyMeals.length === 1 ? '' : 's'}`}
          </Text>
        </View>
        {logs.length > 0 ? (
          <View style={st.calPill}>
            <Text style={st.calPillText}>{totalCal} cal</Text>
          </View>
        ) : null}
      </View>

        {logs.length === 0 ? (
        <View style={[st.empty, cardShadow]}>
          <Text style={st.emptyText}>
            Nothing logged yet — breakfast, lunch, dinner, and snacks show up here.
          </Text>
        </View>
      ) : (
        MEAL_ORDER.map((meal) => {
          const items = grouped[meal];
          if (items.length === 0) return null;
          const meta = MEAL_META[meal];
          const isOpen = openMeal === meal;
          const mealCal = items.reduce((s, l) => s + Math.round(l.calories * l.numberOfServings), 0);

          return (
            <View key={meal} style={[st.group, cardShadow]}>
              <Pressable onPress={() => toggle(meal)} style={st.groupHeader}>
                <View style={[st.groupIcon, { backgroundColor: `${meta.color}18` }]}>
                  <Ionicons name={meta.icon} size={18} color={meta.color} />
                </View>
                <Text style={st.groupLabel}>{meta.label}</Text>
                <View style={st.groupBadge}>
                  <Text style={st.groupBadgeText}>{items.length}</Text>
                </View>
                <Text style={st.groupCal}>{mealCal} cal</Text>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
              </Pressable>

              {isOpen &&
                items.map((entry) => (
                  <LogRow
                    key={entry.id}
                    entry={entry}
                    st={st}
                    onDelete={() => handleDelete(entry.id)}
                    onMove={() => handleMove(entry)}
                    onPress={() => onFoodPress?.(entry)}
                  />
                ))}
            </View>
          );
        })
      )}
    </View>
  );
}

function Chip({ v, u, c, st }: { v: string; u: string; c: string; st: any }) {
  return (
    <View style={[st.chip, { backgroundColor: `${c}20` }]}>
      <Text style={[st.chipText, { color: c }]}>
        {v}
        <Text style={st.chipUnit}> {u}</Text>
      </Text>
    </View>
  );
}

function LogRow({ entry, st, onDelete, onMove, onPress }: {
  entry: FoodLogEntry;
  st: any;
  onDelete: () => void;
  onMove: () => void;
  onPress?: () => void;
}) {
  const mult = entry.numberOfServings;
  const cal = Math.round(entry.calories * mult);
  const servingLabel = multiplyDesc(entry.servingDescription, mult);

  const { theme } = useTheme();
  const colors = theme.colors;
  const renderRight = useCallback(
    () => (
      <Pressable onPress={onDelete} style={st.deleteAction}>
        <Ionicons name="trash-outline" size={18} color={colors.textInverse} />
      </Pressable>
    ),
    [onDelete, st.deleteAction, colors.textInverse],
  );

  return (
    <Swipeable
      renderRightActions={renderRight}
      overshootRight={false}
      friction={2}
    >
      <Pressable onPress={onPress} onLongPress={onMove} delayLongPress={400} style={st.logRow}>
        <View style={st.logRowIcon}>
          <Ionicons name={foodIcon(entry.foodName)} size={15} color={colors.primary} />
        </View>
        <View style={st.logRowBody}>
          <Text style={st.logRowName} numberOfLines={1}>
            {entry.foodName}
          </Text>
          <Text style={st.logRowSub} numberOfLines={1}>
            {servingLabel}
          </Text>
          <View style={st.logRowChips}>
            <Chip v={`${cal}`} u="cal" c={colors.primary} st={st} />
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
}
