/**
 * Food dish selector — tap foods into open bowl slots (capped by dish capacity).
 * Shows a visual plate of filled / pending / empty seats so the queue limit is obvious.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { CachedImage } from '@/components/ui/CachedImage';
import { useHoldToAdd } from '@/hooks/useHoldToAdd';
import { spacing, radius } from '@/constants/theme';
import type { ItemDefinition, InventorySlot } from './types';

const GRID_COLUMNS = 4;
const HOLD_DELAY_MS = 350;
const HOLD_INTERVAL_MS = 120;

export interface FoodDishSelectorColors {
  surface: string;
  surfaceElevated: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  accent: string;
  success: string;
  error: string;
  onPrimary?: string;
}

export interface FoodDishSelectorProps {
  initialSlots: InventorySlot[];
  itemDefs: Record<string, ItemDefinition>;
  /** Items already sitting in the dish (FIFO — first eaten first). */
  queue: string[];
  maxCapacity: number;
  petHunger?: number;
  onAddToDish: (items: Array<{ itemType: string; qty: number }>) => void;
  onError?: (message: string) => void;
  highlightedItemType?: string;
  colors: FoodDishSelectorColors;
}

type BowlSeat =
  | { kind: 'queued'; itemType: string; index: number }
  | { kind: 'pending'; itemType: string; pendingIndex: number }
  | { kind: 'empty'; index: number };

function foodStats(def: ItemDefinition | undefined) {
  return {
    hunger: def?.foodHunger ?? 10,
    happy: def?.foodHappiness ?? 5,
  };
}

function FoodThumb({
  itemType,
  itemDefs,
  size,
  recyclingKey,
}: {
  itemType: string;
  itemDefs: Record<string, ItemDefinition>;
  size: number;
  recyclingKey: string;
}) {
  const def = itemDefs[itemType];
  if (!def) {
    return <Text style={{ fontSize: size * 0.45 }}>?</Text>;
  }
  if (def.imageUrl) {
    return (
      <CachedImage
        source={{ uri: def.imageUrl }}
        style={{ width: size, height: size }}
        resizeMode="contain"
        recyclingKey={recyclingKey}
      />
    );
  }
  return <Text style={{ fontSize: size * 0.55 }}>{def.emoji ?? '?'}</Text>;
}

export function FoodDishSelector({
  initialSlots,
  itemDefs,
  queue,
  maxCapacity,
  petHunger,
  onAddToDish,
  onError,
  highlightedItemType,
  colors,
}: FoodDishSelectorProps) {
  const { width } = useWindowDimensions();
  const [inventorySnapshot, setInventorySnapshot] = useState<InventorySlot[]>(() =>
    initialSlots.map((s) => ({ ...s })),
  );
  const [pending, setPending] = useState<string[]>([]);
  const popScale = useSharedValue(1);

  const spaceLeft = Math.max(0, maxCapacity - queue.length);
  const pendingCount = pending.length;
  const filledCount = queue.length + pendingCount;
  const isFull = filledCount >= maxCapacity;
  const canConfirm = pendingCount > 0;

  useEffect(() => {
    // Cap pending if capacity shrinks (e.g. server sync filled more seats).
    setPending((prev) => (prev.length > spaceLeft ? prev.slice(0, spaceLeft) : prev));
  }, [spaceLeft]);

  const selectedByType = useMemo(() => {
    const map = new Map<string, number>();
    for (const itemType of pending) {
      map.set(itemType, (map.get(itemType) ?? 0) + 1);
    }
    return map;
  }, [pending]);

  const availableSlots = useMemo(() => {
    return inventorySnapshot
      .map((s) => {
        const taken = selectedByType.get(s.itemType) ?? 0;
        const remaining = s.qty - taken;
        return remaining > 0 ? { ...s, qty: remaining } : null;
      })
      .filter((s): s is InventorySlot => s != null);
  }, [inventorySnapshot, selectedByType]);

  const seats: BowlSeat[] = useMemo(() => {
    const list: BowlSeat[] = [];
    queue.forEach((itemType, index) => {
      list.push({ kind: 'queued', itemType, index });
    });
    pending.forEach((itemType, pendingIndex) => {
      list.push({ kind: 'pending', itemType, pendingIndex });
    });
    for (let i = list.length; i < maxCapacity; i++) {
      list.push({ kind: 'empty', index: i });
    }
    return list;
  }, [queue, pending, maxCapacity]);

  const pendingStats = useMemo(() => {
    let hunger = 0;
    let happy = 0;
    for (const itemType of pending) {
      const s = foodStats(itemDefs[itemType]);
      hunger += s.hunger;
      happy += s.happy;
    }
    return { hunger, happy };
  }, [pending, itemDefs]);

  const queuedStats = useMemo(() => {
    let hunger = 0;
    let happy = 0;
    for (const itemType of queue) {
      const s = foodStats(itemDefs[itemType]);
      hunger += s.hunger;
      happy += s.happy;
    }
    return { hunger, happy };
  }, [queue, itemDefs]);

  const bounce = useCallback(() => {
    popScale.value = withSequence(
      withTiming(1.06, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 140, easing: Easing.inOut(Easing.quad) }),
    );
  }, [popScale]);

  const bowlAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: popScale.value }],
  }));

  const addItem = useCallback(
    (itemType: string) => {
      setPending((prev) => {
        if (prev.length >= spaceLeft) return prev;
        const slot = inventorySnapshot.find((s) => s.itemType === itemType);
        const maxQty = slot?.qty ?? 0;
        const taken = prev.filter((t) => t === itemType).length;
        if (taken >= maxQty) return prev;
        bounce();
        return [...prev, itemType];
      });
    },
    [spaceLeft, inventorySnapshot, bounce],
  );

  const removePendingAt = useCallback((pendingIndex: number) => {
    setPending((prev) => prev.filter((_, i) => i !== pendingIndex));
  }, []);

  const { handlePressIn, handlePressOut, handlePress } = useHoldToAdd(addItem, {
    holdDelayMs: HOLD_DELAY_MS,
    holdIntervalMs: HOLD_INTERVAL_MS,
  });

  const handleConfirm = useCallback(() => {
    if (pending.length === 0) return;
    if (pending.length > spaceLeft) {
      onError?.(`Dish only has ${spaceLeft} open seat${spaceLeft === 1 ? '' : 's'}.`);
      return;
    }
    handlePressOut();
    const qtyByType = new Map<string, number>();
    for (const itemType of pending) {
      qtyByType.set(itemType, (qtyByType.get(itemType) ?? 0) + 1);
    }
    const items = Array.from(qtyByType.entries()).map(([itemType, qty]) => ({ itemType, qty }));
    setPending([]);
    setInventorySnapshot((prev) => {
      const next: InventorySlot[] = [];
      for (const s of prev) {
        const sold = qtyByType.get(s.itemType) ?? 0;
        const remaining = s.qty - sold;
        if (remaining > 0) next.push({ ...s, qty: remaining });
      }
      return next;
    });
    try {
      onAddToDish(items);
    } catch {
      onError?.('Something went wrong adding food to the dish.');
    }
  }, [pending, spaceLeft, handlePressOut, onAddToDish, onError]);

  const gap = spacing.sm;
  const pad = spacing.xl * 2;
  const cardSize = Math.floor((width - pad - gap * (GRID_COLUMNS - 1)) / GRID_COLUMNS);
  const seatSize = Math.min(44, Math.floor((width - pad - 12) / Math.min(maxCapacity, 8)));

  const hungerLabel =
    petHunger == null
      ? null
      : petHunger < 30
        ? 'Starving'
        : petHunger < 50
          ? 'Hungry'
          : petHunger < 75
            ? 'Peckish'
            : 'Full';

  const fillRatio = maxCapacity > 0 ? filledCount / maxCapacity : 0;
  const barColor =
    fillRatio >= 1 ? colors.error : fillRatio >= 0.75 ? '#F59E0B' : colors.success;

  return (
    <View style={styles.root}>
      {hungerLabel != null && petHunger != null && (
        <View style={[styles.petChip, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Text style={[styles.petChipLabel, { color: colors.textSecondary }]}>Pet</Text>
          <Text style={[styles.petChipValue, { color: colors.text }]}>
            {hungerLabel} · {Math.round(petHunger)}% hunger
          </Text>
        </View>
      )}

      <Animated.View
        style={[
          styles.bowlCard,
          { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
          bowlAnimStyle,
        ]}
      >
        <View style={styles.bowlHeader}>
          <Text style={[styles.bowlTitle, { color: colors.text }]}>Bowl</Text>
          <Text style={[styles.capacityText, { color: isFull ? colors.error : colors.textSecondary }]}>
            {filledCount}/{maxCapacity}
            {pendingCount > 0 ? ` · +${pendingCount} ready` : ''}
          </Text>
        </View>

        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.trackFill,
              {
                width: `${Math.min(100, fillRatio * 100)}%`,
                backgroundColor: barColor,
              },
            ]}
          />
        </View>

        <View style={styles.seatRow}>
          {seats.map((seat, i) => {
            if (seat.kind === 'empty') {
              return (
                <View
                  key={`empty-${seat.index}`}
                  style={[
                    styles.seat,
                    {
                      width: seatSize,
                      height: seatSize,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                    styles.seatEmpty,
                  ]}
                />
              );
            }
            const isPending = seat.kind === 'pending';
            return (
              <Pressable
                key={`${seat.kind}-${i}-${seat.itemType}`}
                disabled={!isPending}
                onPress={isPending ? () => removePendingAt(seat.pendingIndex) : undefined}
                style={[
                  styles.seat,
                  {
                    width: seatSize,
                    height: seatSize,
                    borderColor: isPending ? colors.primary : colors.border,
                    backgroundColor: colors.surface,
                  },
                  isPending && { borderWidth: 2 },
                ]}
              >
                <FoodThumb
                  itemType={seat.itemType}
                  itemDefs={itemDefs}
                  size={seatSize - 10}
                  recyclingKey={`fooddish-seat-${seat.kind}-${i}`}
                />
                {!isPending && (
                  <View style={[styles.queuedBadge, { backgroundColor: colors.textMuted }]}>
                    <Text style={styles.queuedBadgeText}>in</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.bowlHint, { color: colors.textMuted }]}>
          {isFull && pendingCount === 0
            ? 'Bowl is full — your pet will eat these in order. Upgrade the farm for more seats.'
            : pendingCount > 0
              ? `Tap a glowing seat to remove · +${pendingStats.hunger} hunger / +${pendingStats.happy} happy`
              : queue.length > 0
                ? `Next eaten first · ~${queuedStats.hunger} hunger waiting in bowl`
                : 'Tap food below to fill open seats'}
        </Text>
      </Animated.View>

      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Your food</Text>
      {availableSlots.length === 0 && pendingCount === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No food in your inventory.</Text>
      ) : availableSlots.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          All selected food is in the bowl above. Tap a glowing seat to pull one back.
        </Text>
      ) : (
        <View style={[styles.grid, { gap }]}>
          {availableSlots.map((slot) => {
            const def = itemDefs[slot.itemType];
            if (!def) return null;
            const stats = foodStats(def);
            const disabled = isFull;
            const highlighted = highlightedItemType === slot.itemType;
            return (
              <Pressable
                key={`inv-${slot.itemType}`}
                disabled={disabled}
                onPress={() => !disabled && handlePress(slot.itemType)}
                onPressIn={() => !disabled && handlePressIn(slot.itemType)}
                onPressOut={handlePressOut}
                style={[
                  styles.itemCard,
                  {
                    width: cardSize,
                    backgroundColor: colors.surface,
                    borderColor: highlighted ? '#FFD700' : colors.border,
                    borderWidth: highlighted ? 2 : 1,
                    opacity: disabled ? 0.4 : 1,
                  },
                ]}
              >
                <FoodThumb
                  itemType={slot.itemType}
                  itemDefs={itemDefs}
                  size={cardSize - 28}
                  recyclingKey={`fooddish-inv-${slot.itemType}`}
                />
                <Text style={[styles.cardLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                  {def.label}
                </Text>
                <Text style={[styles.cardStat, { color: colors.success }]}>+{stats.hunger}</Text>
                <Text style={[styles.cardQty, { color: colors.textMuted }]}>×{slot.qty}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {canConfirm && (
        <Pressable
          style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
          onPress={handleConfirm}
        >
          <Text style={[styles.confirmBtnText, { color: colors.onPrimary ?? '#fff' }]}>
            Add {pendingCount} to bowl
          </Text>
          <Text style={[styles.confirmSub, { color: (colors.onPrimary ?? '#fff') + 'CC' }]}>
            +{pendingStats.hunger} hunger · {spaceLeft - pendingCount} seat
            {spaceLeft - pendingCount === 1 ? '' : 's'} left after
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  petChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  petChipLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  petChipValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  bowlCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  bowlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bowlTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  capacityText: {
    fontSize: 13,
    fontWeight: '700',
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 4,
  },
  seatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  seat: {
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  seatEmpty: {
    borderStyle: 'dashed',
    opacity: 0.7,
  },
  queuedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  queuedBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
  },
  bowlHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  itemCard: {
    borderRadius: 10,
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardLabel: {
    fontSize: 10,
    marginTop: 2,
    maxWidth: '100%',
  },
  cardStat: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardQty: {
    position: 'absolute',
    top: 4,
    right: 6,
    fontSize: 10,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
  confirmBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '800',
  },
  confirmSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
