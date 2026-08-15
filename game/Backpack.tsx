import React, { forwardRef, useImperativeHandle, useRef, useMemo, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import type { InventorySlot, ItemCategory, ItemDefinition } from './types';
import { ITEM_CATEGORIES } from './types';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';

// ─── Ref API ────────────────────────────────────────────────────────────────

export interface BackpackRef {
  open: () => void;
  close: () => void;
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface BackpackProps {
  inventory: InventorySlot[];
  activeCategory: ItemCategory | 'all';
  itemDefs: Record<string, ItemDefinition>;
  backpackSlots?: number;
  onClose?: () => void;
  onSetCategory: (cat: ItemCategory | 'all') => void;
}

/**
 * Backpack drawer using the shared `AppDrawer` bottom-sheet.
 *
 * - Imperative ref API: `.open()` / `.close()` (matches WaterDrawer pattern).
 * - Horizontally scrollable category chips filter displayed items.
 * - Category tabs with no owned items are hidden.
 * - Non-placeable items show an "Item" badge (includes recipe scrolls).
 * - Slot capacity is shown as a header pill + fill bar.
 */
export const Backpack = forwardRef<BackpackRef, BackpackProps>(function Backpack(
  { inventory, activeCategory, itemDefs, backpackSlots = 20, onClose, onSetCategory },
  ref,
) {
  const drawerRef = useRef<AppDrawerRef>(null);
  const { theme } = useTheme();
  const colors = theme.colors;

  useImperativeHandle(ref, () => ({
    open: () => drawerRef.current?.open(),
    close: () => drawerRef.current?.close(),
  }));

  const usedSlots = useMemo(
    () => inventory.filter((s) => s.qty > 0).length,
    [inventory],
  );
  const freeSlots = Math.max(0, backpackSlots - usedSlots);
  const fillRatio = backpackSlots > 0 ? Math.min(1, usedSlots / backpackSlots) : 0;
  const isFull = freeSlots <= 0;
  const isTight = fillRatio >= 0.8;
  const barColor = isFull ? colors.error : isTight ? '#F59E0B' : colors.success;

  const visibleCategories = useMemo(() => {
    const owned = new Set<string>();
    for (const slot of inventory) {
      const cat = itemDefs[slot.itemType]?.category;
      if (cat) owned.add(cat);
    }
    return ITEM_CATEGORIES.filter((cat) => cat.key === 'all' || owned.has(cat.key));
  }, [inventory, itemDefs]);

  useEffect(() => {
    if (activeCategory === 'all') return;
    if (visibleCategories.some((c) => c.key === activeCategory)) return;
    onSetCategory('all');
  }, [activeCategory, visibleCategories, onSetCategory]);

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return inventory;
    return inventory.filter((s) => itemDefs[s.itemType]?.category === activeCategory);
  }, [inventory, activeCategory, itemDefs]);

  const slotsPill = (
    <View
      style={[
        styles.slotsPill,
        {
          backgroundColor: isFull ? `${colors.error}18` : colors.surfaceElevated,
          borderColor: isFull ? colors.error : colors.border,
        },
      ]}
    >
      <Text style={[styles.slotsUsed, { color: isFull ? colors.error : colors.text }]}>
        {usedSlots}
      </Text>
      <Text style={[styles.slotsSep, { color: colors.textMuted }]}>/</Text>
      <Text style={[styles.slotsMax, { color: colors.textSecondary }]}>{backpackSlots}</Text>
    </View>
  );

  return (
    <AppDrawer
      ref={drawerRef}
      title="Backpack"
      headerRight={slotsPill}
      snapPoints={['65%']}
      showCloseButton
      scrollable
      onClose={onClose}
    >
      <View style={[styles.capacityCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <View style={styles.capacityHeader}>
          <Text style={[styles.capacityLabel, { color: colors.textSecondary }]}>Slots</Text>
          <Text style={[styles.capacityValue, { color: isFull ? colors.error : colors.text }]}>
            {usedSlots}
            <Text style={{ color: colors.textMuted, fontWeight: '600' }}> / {backpackSlots}</Text>
          </Text>
        </View>
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.trackFill,
              {
                width: `${fillRatio * 100}%`,
                backgroundColor: barColor,
              },
            ]}
          />
        </View>
        <Text style={[styles.capacityHint, { color: colors.textMuted }]}>
          {isFull
            ? 'Full — move items to Storage to free space'
            : `${freeSlots} open slot${freeSlots === 1 ? '' : 's'} · same item stacks share one slot`}
        </Text>
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
      >
        {visibleCategories.map((cat) => {
          const active = activeCategory === cat.key;
          return (
            <Pressable
              key={cat.key}
              style={[
                styles.chip,
                { backgroundColor: colors.border + '50' },
                active && { backgroundColor: colors.primary },
              ]}
              onPress={() => onSetCategory(cat.key)}
            >
              <Ionicons
                name={cat.ionicon as any}
                size={16}
                color={active ? colors.onPrimary ?? '#fff' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.chipText,
                  { color: colors.textSecondary },
                  active && { color: colors.onPrimary ?? '#fff' },
                ]}
                numberOfLines={1}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Item grid */}
      <View style={styles.grid}>
        {filtered.length === 0 && (
          <Text style={[styles.empty, { color: colors.textMuted }]}>No items in this category</Text>
        )}
        {filtered.map((slot) => {
          const def = itemDefs[slot.itemType];
          if (!def) return null;
          return (
            <View
              key={slot.itemType}
              style={[
                styles.itemCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {def.imageUrl ? (
                <CachedImage source={{ uri: def.imageUrl }} style={styles.itemImage} resizeMode="contain" />
              ) : (
                <Text style={styles.itemEmoji}>{def.emoji}</Text>
              )}
              <Text style={[styles.itemLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                {def.label}
              </Text>
              <Text style={[styles.itemQty, { color: colors.text }]}>×{slot.qty}</Text>
              {!def.placeable && (
                <View style={styles.tagBadge}>
                  <Text style={styles.tagText}>Item</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </AppDrawer>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  slotsPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 4,
  },
  slotsUsed: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  slotsSep: {
    fontSize: 13,
    fontWeight: '700',
    marginHorizontal: 2,
  },
  slotsMax: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  capacityCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 12,
    marginBottom: spacing.md,
    gap: 8,
  },
  capacityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  capacityLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  capacityValue: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
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
  capacityHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  chipScroll: {
    flexGrow: 0,
    marginBottom: spacing.md,
  },
  chipRow: {
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  itemCard: {
    width: '22%',
    aspectRatio: 0.85,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    padding: 6,
  },
  itemImage: {
    width: 40,
    height: 40,
    marginBottom: 2,
  },
  itemEmoji: {
    fontSize: 28,
    marginBottom: 2,
  },
  itemLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  itemQty: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 1,
  },
  tagBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(99,102,241,0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#6366F1',
  },
  empty: {
    fontSize: 13,
    textAlign: 'center',
    width: '100%',
    marginTop: 32,
  },
});
