import React, { forwardRef, useImperativeHandle, useRef, useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { useTheme } from '@/store/ThemeProvider';
import { useFood } from '@/store/FoodProvider';
import { createDrawerContentStyles } from '@/components/ui/drawerStyles';
import { foodIcon } from '@/components/food/FoodDrawer';
import {
  NUTRIENT_CONFIG,
  type MacroGoals,
  type NutrientKey,
  type MacroTotals,
} from '@/lib/nutrients';
import type { FoodLogEntry } from '@/lib/api';
import { spacing, radius, getMacroLabelColor } from '@/constants/theme';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getContribution(log: FoodLogEntry, key: NutrientKey): number {
  const v = log[key as keyof FoodLogEntry];
  if (typeof v !== 'number') return 0;
  const total = v * log.numberOfServings;
  const roundKeys: NutrientKey[] = ['sodium', 'potassium', 'cholesterol', 'iron', 'calcium', 'vitaminA', 'vitaminC', 'vitaminD'];
  return roundKeys.includes(key) ? Math.round(total) : +(total.toFixed(1));
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface MacroInfoDrawerRef {
  open: (focusKey?: NutrientKey) => void;
  close: () => void;
}

interface MacroInfoDrawerProps {
  totals: MacroTotals;
  goals: MacroGoals;
  orderedNutrientKeys: NutrientKey[];
  onGoalChange: (key: NutrientKey, value: number) => Promise<void>;
  onNutrientOrderChange: (order: NutrientKey[]) => Promise<void>;
  onFoodPress?: (entry: FoodLogEntry) => void;
}

// ─── Single Nutrient Detail View ───────────────────────────────────────────

interface NutrientDetailProps {
  keyName: NutrientKey;
  today: number;
  goal: number;
  logs: FoodLogEntry[];
  isEditing: boolean;
  editVal: string;
  onEditValChange: (v: string) => void;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onFoodPress?: (entry: FoodLogEntry) => void;
  st: ReturnType<typeof createDrawerContentStyles>;
}

function NutrientDetail({
  keyName,
  today,
  goal,
  logs,
  isEditing,
  editVal,
  onEditValChange,
  onStartEdit,
  onSave,
  onCancel,
  onFoodPress,
  st,
}: NutrientDetailProps) {
  const { theme, themeMode } = useTheme();
  const colors = theme.colors;
  const cfg = NUTRIENT_CONFIG[keyName];
  const pct = goal > 0 ? Math.min(Math.round((today / goal) * 100), 150) : 0;
  const fillWidth = Math.min(pct / 100, 1);
  const displayToday = today % 1 === 0 ? String(today) : today.toFixed(1);

  const contributingLogs = useMemo(
    () => logs.filter((l) => getContribution(l, keyName) > 0),
    [logs, keyName],
  );

  return (
    <View style={{ gap: spacing.base }}>
      <View style={[st.card, { borderLeftWidth: 4, borderLeftColor: cfg.color }]}>
        <View style={st.row}>
          <View style={[st.rowIcon, { backgroundColor: `${cfg.color}18` }]}>
            <Ionicons name="nutrition-outline" size={18} color={cfg.color} />
          </View>
          <View style={st.rowBody}>
            <Text style={st.rowValue}>{cfg.label}</Text>
            <Text style={st.rowLabel}>{cfg.unit} · Today: {displayToday} · Goal: {goal}</Text>
          </View>
        </View>

        <View style={[st.track, { marginTop: 10, marginBottom: 12 }]}>
          <View style={[st.trackFill, { width: `${fillWidth * 100}%`, backgroundColor: cfg.color }]} />
        </View>
        <Text style={[st.rowLabel, { marginBottom: 8 }]}>{pct}% of daily</Text>

        {isEditing ? (
          <View style={[st.row, { gap: 8, marginTop: 8 }]}>
            <BottomSheetTextInput
              style={st.input}
              value={editVal}
              onChangeText={onEditValChange}
              keyboardType="decimal-pad"
              placeholder={String(goal)}
              placeholderTextColor={colors.textMuted}
              selectTextOnFocus
            />
            <Pressable onPress={onSave} style={({ pressed }) => [st.primaryBtn, pressed && st.pressed]}>
              <Ionicons name="checkmark" size={16} color={colors.onPrimary ?? '#fff'} />
              <Text style={st.primaryBtnText}>Save</Text>
            </Pressable>
            <Pressable onPress={onCancel} style={({ pressed }) => [st.outlineBtn, pressed && st.pressed]}>
              <Text style={st.outlineBtnText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={onStartEdit} style={({ pressed }) => [st.outlineBtn, { marginTop: 8 }, pressed && st.pressed]}>
            <Text style={st.outlineBtnText}>Edit goal</Text>
          </Pressable>
        )}

        <View style={[styles.infoDivider, { borderTopColor: colors.border }]}>
          <Text style={[st.secLabel, { marginTop: 0 }]}>What it is</Text>
          <Text style={st.bodyText}>{cfg.what}</Text>
          <Text style={st.secLabel}>Why we track it</Text>
          <Text style={st.bodyText}>{cfg.why}</Text>
        </View>
      </View>

      <Text style={st.secLabel}>Contributing foods</Text>
      {contributingLogs.length === 0 ? (
        <View style={[st.card, styles.emptyContrib]}>
          <Ionicons name="restaurant-outline" size={28} color={colors.textMuted} />
          <Text style={[st.rowLabel, { textAlign: 'center', marginTop: 6 }]}>
            No foods logged today with {cfg.label.toLowerCase()}
          </Text>
        </View>
      ) : (
        <View style={[styles.foodListCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          {contributingLogs.map((log, idx) => {
            const amount = getContribution(log, keyName);
            const unit = cfg.unit;
            const isLast = idx === contributingLogs.length - 1;
            const rowContent = (
              <View style={[styles.foodRow, { borderBottomColor: colors.border, borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth }]}>
                <View style={[styles.foodRowIcon, { backgroundColor: `${cfg.color}18` }]}>
                  <Ionicons name={foodIcon(log.foodName)} size={18} color={cfg.color} />
                </View>
                <View style={st.rowBody}>
                  <Text style={[st.rowValue, { color: colors.text, fontSize: 14 }]} numberOfLines={1}>
                    {log.foodName}
                  </Text>
                  <Text style={[st.rowLabel, { color: colors.textSecondary, fontSize: 11 }]} numberOfLines={1}>
                    {log.servingDescription} {log.numberOfServings > 1 ? `× ${log.numberOfServings}` : ''}
                  </Text>
                </View>
                <Text style={[styles.foodAmount, { color: getMacroLabelColor(cfg.color, themeMode, colors) }]}>
                  {amount} {unit}
                </Text>
              </View>
            );
            return onFoodPress ? (
              <Pressable key={log.id} onPress={() => onFoodPress(log)} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                {rowContent}
              </Pressable>
            ) : (
              <React.Fragment key={log.id}>{rowContent}</React.Fragment>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export const MacroInfoDrawer = forwardRef<MacroInfoDrawerRef, MacroInfoDrawerProps>(
  function MacroInfoDrawer({ totals, goals, orderedNutrientKeys, onGoalChange, onNutrientOrderChange, onFoodPress }, ref) {
    const { theme } = useTheme();
    const colors = theme.colors;
    const { logs } = useFood();
    const st = useMemo(() => createDrawerContentStyles(theme), [theme]);
    const drawerRef = useRef<AppDrawerRef>(null);
    const [focusedKey, setFocusedKey] = useState<NutrientKey | null>(null);
    const [editingKey, setEditingKey] = useState<NutrientKey | null>(null);
    const [editVal, setEditVal] = useState('');
    const [isEditingOrder, setIsEditingOrder] = useState(false);
    const [localOrder, setLocalOrder] = useState<NutrientKey[]>(orderedNutrientKeys);

    useImperativeHandle(ref, () => ({
      open(focusKey?: NutrientKey) {
        drawerRef.current?.open();
        setFocusedKey(focusKey ?? null);
        setIsEditingOrder(false);
        setLocalOrder(orderedNutrientKeys);
      },
      close: () => drawerRef.current?.close(),
    }));

    const startEdit = useCallback((key: NutrientKey) => {
      setEditingKey(key);
      setEditVal(String(goals[key]));
    }, [goals]);

    const saveEdit = useCallback(async () => {
      if (!editingKey) return;
      const n = parseFloat(editVal);
      if (!isNaN(n) && n >= 0) await onGoalChange(editingKey, Math.round(n * 10) / 10);
      setEditingKey(null);
    }, [editingKey, editVal, onGoalChange]);

    const cancelEdit = useCallback(() => setEditingKey(null), []);

    const handleDragEnd = useCallback(
      async ({ data }: { data: NutrientKey[] }) => {
        setLocalOrder(data);
        await onNutrientOrderChange(data);
      },
      [onNutrientOrderChange],
    );

    const keyExtractor = useCallback((k: NutrientKey) => k, []);

    const renderReorderItem = useCallback(
      ({ item, drag, isActive }: RenderItemParams<NutrientKey>) => {
        const cfg = NUTRIENT_CONFIG[item];
        const goalVal = goals[item];
        return (
          <Pressable
            onLongPress={drag}
            delayLongPress={200}
            style={({ pressed }) => [
              st.card,
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderLeftWidth: 4,
                borderLeftColor: cfg.color,
                opacity: isActive ? 0.95 : pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={[styles.dragHandle, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons name="reorder-four" size={22} color={colors.textMuted} />
            </View>
            <View style={st.rowBody}>
              <Text style={[st.rowValue, { color: colors.text }]}>{cfg.label}</Text>
              <Text style={[st.rowLabel, { color: colors.textSecondary }]}>{cfg.unit} · Goal: {goalVal}</Text>
            </View>
          </Pressable>
        );
      },
      [st, goals, colors],
    );

    const headerRight = (
      <Pressable
        onPress={() => {
          if (isEditingOrder) setIsEditingOrder(false);
          else {
            setIsEditingOrder(true);
            setLocalOrder(orderedNutrientKeys);
          }
        }}
        hitSlop={12}
        style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
      >
        <Ionicons
          name={isEditingOrder ? 'checkmark-circle' : 'reorder-four'}
          size={26}
          color={isEditingOrder ? colors.primary : colors.textMuted}
        />
      </Pressable>
    );

    const drawerTitle = isEditingOrder
      ? 'Reorder Chips'
      : focusedKey
        ? NUTRIENT_CONFIG[focusedKey].label
        : 'Macros & Daily Goals';

    return (
      <AppDrawer
        ref={drawerRef}
        title={drawerTitle}
        snapPoints={['92%']}
        scrollable
        headerRight={headerRight}
      >
        {isEditingOrder ? (
          <View style={styles.reorderWrap}>
            <Text style={st.intro}>
              Long-press anywhere on an item and drag to reorder. This order matches the chips on the home screen.
            </Text>
            <DraggableFlatList
              data={localOrder}
              onDragEnd={handleDragEnd}
              keyExtractor={keyExtractor}
              renderItem={renderReorderItem}
              activationDistance={12}
              scrollEnabled={false}
              contentContainerStyle={styles.dragListContent}
            />
          </View>
        ) : focusedKey ? (
          <NutrientDetail
            keyName={focusedKey}
            today={totals[focusedKey] ?? 0}
            goal={goals[focusedKey]}
            logs={logs}
            isEditing={editingKey === focusedKey}
            editVal={editVal}
            onEditValChange={setEditVal}
            onStartEdit={() => startEdit(focusedKey)}
            onSave={saveEdit}
            onCancel={cancelEdit}
            onFoodPress={onFoodPress}
            st={st}
          />
        ) : (
          <View style={{ gap: spacing.base }}>
            <Text style={st.intro}>Tap a chip on the home screen to view details.</Text>
          </View>
        )}
      </AppDrawer>
    );
  },
);

const styles = StyleSheet.create({
  reorderWrap: {
    flex: 1,
    gap: spacing.base,
  },
  nestableScroll: {
    flex: 1,
  },
  dragListContent: {
    paddingBottom: spacing.xl,
  },
  infoDivider: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  emptyContrib: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  foodListCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  foodRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerBtn: { padding: 4 },
  dragHandle: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
