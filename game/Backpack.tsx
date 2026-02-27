import React, { forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import type { InventorySlot, ItemCategory, ItemDefinition } from './types';
import { ITEM_CATEGORIES } from './types';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { colors, spacing } from '@/constants/theme';

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
  onClose?: () => void;
  onSetCategory: (cat: ItemCategory | 'all') => void;
}

/**
 * Backpack drawer using the shared `AppDrawer` bottom-sheet.
 *
 * - Imperative ref API: `.open()` / `.close()` (matches WaterDrawer pattern).
 * - Horizontally scrollable category chips filter displayed items.
 * - Non-placeable items show an "Item" badge.
 */
export const Backpack = forwardRef<BackpackRef, BackpackProps>(function Backpack(
  { inventory, activeCategory, itemDefs, onClose, onSetCategory },
  ref,
) {
  const drawerRef = useRef<AppDrawerRef>(null);

  useImperativeHandle(ref, () => ({
    open: () => drawerRef.current?.open(),
    close: () => drawerRef.current?.close(),
  }));

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return inventory;
    return inventory.filter((s) => itemDefs[s.itemType]?.category === activeCategory);
  }, [inventory, activeCategory, itemDefs]);

  return (
    <AppDrawer
      ref={drawerRef}
      title="Backpack"
      snapPoints={['65%']}
      showCloseButton
      scrollable
      onClose={onClose}
    >
      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
      >
        {ITEM_CATEGORIES.map((cat) => {
          const active = activeCategory === cat.key;
          return (
            <Pressable
              key={cat.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onSetCategory(cat.key)}
            >
              <Ionicons
                name={cat.ionicon as any}
                size={16}
                color={active ? '#fff' : colors.textSecondary}
              />
              <Text
                style={[styles.chipText, active && styles.chipTextActive]}
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
          <Text style={styles.empty}>No items in this category</Text>
        )}
        {filtered.map((slot) => {
          const def = itemDefs[slot.itemType];
          if (!def) return null;
          return (
            <View key={slot.itemType} style={styles.itemCard}>
              {def.imageUrl ? (
                <CachedImage source={{ uri: def.imageUrl }} style={styles.itemImage} resizeMode="contain" />
              ) : (
                <Text style={styles.itemEmoji}>{def.emoji}</Text>
              )}
              <Text style={styles.itemLabel} numberOfLines={1}>{def.label}</Text>
              <Text style={styles.itemQty}>×{slot.qty}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  itemCard: {
    width: '22%',
    aspectRatio: 0.85,
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
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
    color: colors.textSecondary,
    textAlign: 'center',
  },
  itemQty: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
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
    color: colors.textMuted,
    textAlign: 'center',
    width: '100%',
    marginTop: 32,
  },
});
