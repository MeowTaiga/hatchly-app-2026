/**
 * Multiplayer backpack — view-only inventory browser for town / shared scenes.
 * Capacity-first: big slot meter, search, category chips, and a seat grid so
 * empty backpack space is obvious. Placing items stays a farm-only action.
 */

import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';
import type { InventorySlot, ItemCategory, ItemDefinition } from '../types';
import { ITEM_CATEGORIES } from '../types';

export interface MPBackpackDrawerRef {
  open: () => void;
  close: () => void;
}

interface MPBackpackDrawerProps {
  inventory: InventorySlot[];
  itemDefs: Record<string, ItemDefinition>;
  backpackSlots?: number;
}

const GRID_COLUMNS = 4;

export const MPBackpackDrawer = forwardRef<MPBackpackDrawerRef, MPBackpackDrawerProps>(
  function MPBackpackDrawer({ inventory, itemDefs, backpackSlots = 20 }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const { theme } = useTheme();
    const colors = theme.colors;
    const { width } = useWindowDimensions();
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<ItemCategory | 'all'>('all');

    useImperativeHandle(ref, () => ({
      open: () => {
        setQuery('');
        setCategory('all');
        drawerRef.current?.open();
      },
      close: () => drawerRef.current?.close(),
    }));

    const owned = useMemo(
      () => inventory.filter((s) => s.qty > 0),
      [inventory],
    );

    const usedSlots = owned.length;
    const freeSlots = Math.max(0, backpackSlots - usedSlots);
    const fillRatio = backpackSlots > 0 ? Math.min(1, usedSlots / backpackSlots) : 0;
    const isFull = freeSlots <= 0;
    const isTight = fillRatio >= 0.8;
    const barColor = isFull ? colors.error : isTight ? '#F59E0B' : colors.success;

    const visibleCategories = useMemo(() => {
      const ownedCats = new Set<string>();
      for (const slot of owned) {
        const cat = itemDefs[slot.itemType]?.category;
        if (cat) ownedCats.add(cat);
      }
      return ITEM_CATEGORIES.filter((c) => c.key === 'all' || ownedCats.has(c.key));
    }, [owned, itemDefs]);

    const filtered = useMemo(() => {
      const q = query.trim().toLowerCase();
      return owned
        .filter((s) => {
          const def = itemDefs[s.itemType];
          if (!def) return false;
          if (category !== 'all' && def.category !== category) return false;
          if (!q) return true;
          return (
            def.label.toLowerCase().includes(q) ||
            s.itemType.toLowerCase().includes(q) ||
            (def.subCategory?.toLowerCase().includes(q) ?? false)
          );
        })
        .sort((a, b) => {
          const la = itemDefs[a.itemType]?.label ?? a.itemType;
          const lb = itemDefs[b.itemType]?.label ?? b.itemType;
          return la.localeCompare(lb);
        });
    }, [owned, itemDefs, category, query]);

    const gap = spacing.sm;
    const pad = spacing.xl * 2;
    const cardSize = Math.floor((width - pad - gap * (GRID_COLUMNS - 1)) / GRID_COLUMNS);

    const onPickCategory = useCallback((key: ItemCategory | 'all') => {
      setCategory(key);
    }, []);

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

    // Empty seat markers only on All + no search, so capacity stays tangible.
    const showEmptySeats = category === 'all' && !query.trim() && freeSlots > 0;
    const emptySeatCount = showEmptySeats ? Math.min(freeSlots, 8) : 0;

    return (
      <AppDrawer
        ref={drawerRef}
        title="Your pack"
        headerRight={slotsPill}
        snapPoints={['72%', '92%']}
        showCloseButton
        scrollable
      >
        <View
          style={[
            styles.hero,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
          ]}
        >
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroEyebrow, { color: colors.textMuted }]}>Backpack</Text>
              <Text style={[styles.heroTitle, { color: isFull ? colors.error : colors.text }]}>
                {usedSlots}
                <Text style={{ color: colors.textMuted, fontWeight: '700' }}> / {backpackSlots}</Text>
              </Text>
              <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
                {isFull
                  ? 'Pack is full — free space on your farm'
                  : `${freeSlots} open slot${freeSlots === 1 ? '' : 's'}`}
              </Text>
            </View>
            <View style={[styles.viewOnlyBadge, { backgroundColor: `${colors.primary}14` }]}>
              <Ionicons name="eye-outline" size={14} color={colors.primary} />
              <Text style={[styles.viewOnlyText, { color: colors.primary }]}>View only</Text>
            </View>
          </View>

          <View style={[styles.track, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.trackFill,
                { width: `${fillRatio * 100}%`, backgroundColor: barColor },
              ]}
            />
          </View>

          <Text style={[styles.heroHint, { color: colors.textMuted }]}>
            Browse what you’re carrying. Place and store items back on your farm.
          </Text>
        </View>

        <View
          style={[
            styles.searchWrap,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search your pack…"
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <View style={styles.chipRow}>
          {visibleCategories.map((cat) => {
            const active = category === cat.key;
            return (
              <Pressable
                key={cat.key}
                onPress={() => onPickCategory(cat.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.border + '55',
                  },
                ]}
              >
                <Ionicons
                  name={cat.ionicon as any}
                  size={14}
                  color={active ? colors.onPrimary ?? '#fff' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: active ? colors.onPrimary ?? '#fff' : colors.textSecondary,
                    },
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {filtered.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            {owned.length === 0
              ? 'Your pack is empty.'
              : query.trim()
                ? 'No items match that search.'
                : 'Nothing in this category.'}
          </Text>
        ) : (
          <View style={[styles.grid, { gap }]}>
            {filtered.map((slot) => {
              const def = itemDefs[slot.itemType];
              if (!def) return null;
              const catLabel =
                ITEM_CATEGORIES.find((c) => c.key === def.category)?.label ?? def.category;
              return (
                <View
                  key={slot.itemType}
                  style={[
                    styles.card,
                    {
                      width: cardSize,
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.cardArt}>
                    {def.imageUrl ? (
                      <CachedImage
                        source={{ uri: def.imageUrl }}
                        style={styles.cardImage}
                        resizeMode="contain"
                        recyclingKey={`mp-pack-${slot.itemType}`}
                      />
                    ) : (
                      <Text style={styles.cardEmoji}>{def.emoji ?? '?'}</Text>
                    )}
                    <View style={[styles.qtyBadge, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.qtyText, { color: colors.onPrimary ?? '#fff' }]}>
                        ×{slot.qty}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.cardLabel, { color: colors.text }]} numberOfLines={2}>
                    {def.label}
                  </Text>
                  <Text style={[styles.cardCat, { color: colors.textMuted }]} numberOfLines={1}>
                    {catLabel}
                  </Text>
                </View>
              );
            })}

            {Array.from({ length: emptySeatCount }).map((_, i) => (
              <View
                key={`empty-${i}`}
                style={[
                  styles.card,
                  styles.emptySeat,
                  {
                    width: cardSize,
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceElevated,
                  },
                ]}
              >
                <Ionicons name="add" size={22} color={colors.textMuted} />
                <Text style={[styles.emptySeatText, { color: colors.textMuted }]}>Open</Text>
              </View>
            ))}
          </View>
        )}

        {showEmptySeats && freeSlots > emptySeatCount && (
          <Text style={[styles.moreOpen, { color: colors.textMuted }]}>
            +{freeSlots - emptySeatCount} more open slot
            {freeSlots - emptySeatCount === 1 ? '' : 's'}
          </Text>
        )}
      </AppDrawer>
    );
  },
);

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
  hero: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 14,
    marginBottom: spacing.md,
    gap: 10,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    lineHeight: 32,
  },
  heroSub: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  viewOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  viewOnlyText: {
    fontSize: 12,
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
  heroHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    padding: 0,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 8,
    paddingBottom: 10,
    marginBottom: 2,
  },
  cardArt: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    marginBottom: 6,
  },
  cardImage: {
    width: 48,
    height: 48,
  },
  cardEmoji: {
    fontSize: 30,
  },
  qtyBadge: {
    position: 'absolute',
    right: 0,
    top: 0,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  qtyText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    minHeight: 30,
  },
  cardCat: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  emptySeat: {
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    gap: 4,
  },
  emptySeatText: {
    fontSize: 11,
    fontWeight: '700',
  },
  empty: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 36,
  },
  moreOpen: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
});
