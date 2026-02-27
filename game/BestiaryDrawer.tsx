/**
 * BestiaryDrawer — Museum/catalog of caught creatures (bugs, fish, fossils).
 *
 * Follows FarmInfoDrawer pattern: AppDrawer, theme-aware, inline detail view.
 * 6-column grid, category chips, tappable cards show detail inline (no modal).
 */

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { CachedImage } from '@/components/ui/CachedImage';
import { useTheme } from '@/store/ThemeProvider';
import { api, type CollectionEntry } from '@/lib/api';
import { spacing } from '@/constants/theme';
import type { ItemDefinition } from './types';

type CollectionCategory = 'bug' | 'fish' | 'discoverables';

const CATEGORIES: { key: CollectionCategory; label: string; icon: string }[] = [
  { key: 'bug', label: 'Bugs', icon: 'bug-outline' },
  { key: 'fish', label: 'Fish', icon: 'fish-outline' },
  { key: 'discoverables', label: 'Discoverables', icon: 'cube-outline' },
];

const GRID_COLUMNS = 6;

export interface BestiaryDrawerRef {
  open: () => void;
  close: () => void;
}

interface BestiaryDrawerProps {
  itemDefs: Record<string, ItemDefinition>;
}

function getSizeLabel(size: number, min: number, max: number): string {
  const mid = (min + max) / 2;
  const range = (max - min) / 2;
  if (size < mid - range * 0.4) return 'Tiny';
  if (size < mid) return 'Small';
  if (size <= mid + range * 0.4) return 'Medium';
  if (size < max) return 'Large';
  return 'Huge';
}

function formatRarity(rarity?: string): string {
  if (!rarity || rarity === 'common') return 'Common';
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

export const BestiaryDrawer = forwardRef<BestiaryDrawerRef, BestiaryDrawerProps>(
  function BestiaryDrawer({ itemDefs }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const colors = theme.colors;

    const [activeCategory, setActiveCategory] = useState<CollectionCategory>('bug');
    const [collection, setCollection] = useState<CollectionEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState<{
      def: ItemDefinition;
      entry: CollectionEntry | null;
    } | null>(null);

    const fetchCollection = useCallback(async (category: CollectionCategory) => {
      setLoading(true);
      try {
        const data = await api.getCollection(category);
        setCollection(data);
      } catch {
        setCollection([]);
      } finally {
        setLoading(false);
      }
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        open: () => {
          setLoading(true);
          setCollection([]);
          setSelectedItem(null);
          setActiveCategory('bug');
          drawerRef.current?.open();
          fetchCollection('bug');
        },
        close: () => drawerRef.current?.close(),
      }),
      [fetchCollection],
    );

    const handleCategoryChange = useCallback(
      (cat: CollectionCategory) => {
        setActiveCategory(cat);
        setSelectedItem(null);
        fetchCollection(cat);
      },
      [fetchCollection],
    );

    const defsForCategory = useMemo(() => {
      const byCategory = Object.values(itemDefs).filter((d) => d.category === activeCategory);
      // For discoverables: also include items the user has in collection (fossil loot may have different category)
      if (activeCategory === 'discoverables' && collection.length > 0) {
        const collectedTypes = new Set(collection.map((e) => e.itemType));
        const fromCollection = collection
          .map((e) => itemDefs[e.itemType])
          .filter((d): d is NonNullable<typeof d> => !!d && !byCategory.some((b) => b.itemType === d.itemType));
        return [...byCategory, ...fromCollection];
      }
      return byCategory;
    }, [itemDefs, activeCategory, collection]);

    const collectionMap = useMemo(() => {
      const m = new Map<string, CollectionEntry>();
      for (const e of collection) m.set(e.itemType, e);
      return m;
    }, [collection]);

    const gap = spacing.sm;
    const horizontalPadding = spacing.xl * 2; // Match AppDrawer content padding
    const availableWidth = width - horizontalPadding;
    const cardSize = Math.floor((availableWidth - gap * (GRID_COLUMNS - 1)) / GRID_COLUMNS);

    const cardShadow = useMemo(
      () =>
        Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
          },
          android: { elevation: 2 },
        }) as object,
      [],
    );

    const styles = useMemo(
      () =>
        StyleSheet.create({
          chipRow: {
            flexDirection: 'row',
            gap: 8,
            marginBottom: spacing.md,
          },
          chip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 20,
            backgroundColor: colors.border + '80',
          },
          chipActive: {
            backgroundColor: colors.primary,
          },
          chipText: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
          chipTextActive: { color: colors.onPrimary ?? '#fff' },
          grid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'flex-start',
            gap,
          },
          card: {
            width: cardSize,
            height: cardSize,
            flexShrink: 0,
            borderRadius: 12,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            ...cardShadow,
          },
          cardCaught: {
            borderColor: colors.primary + '80',
            backgroundColor: colors.surfaceElevated ?? colors.surface,
          },
          cardUncaught: {
            opacity: 0.7,
          },
          cardImage: { width: '100%', height: '100%', resizeMode: 'contain' },
          cardPlaceholder: { fontSize: 22, color: colors.textMuted },
          emptyWrap: { paddingVertical: 48, alignItems: 'center' },
          emptyText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
          detailSection: {
            marginTop: spacing.xl,
            paddingTop: spacing.lg,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
          },
          detailHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            marginBottom: spacing.lg,
          },
          detailImageWrap: {
            width: 72,
            height: 72,
            borderRadius: 14,
            backgroundColor: colors.border + '40',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          },
          detailImage: { width: 56, height: 56, resizeMode: 'contain' },
          detailTitleWrap: { flex: 1 },
          detailName: { fontSize: 20, fontWeight: '800', color: colors.text },
          detailRarity: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginTop: 2 },
          detailRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 10,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
          },
          detailRowLast: { borderBottomWidth: 0 },
          detailLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
          detailValue: { fontSize: 14, fontWeight: '700', color: colors.text },
          detailUncaught: { fontSize: 15, color: colors.textMuted, marginTop: spacing.sm },
          detailBack: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: spacing.lg,
            paddingVertical: 8,
          },
        }),
      [colors, cardSize, gap, cardShadow],
    );

    const content = selectedItem ? (
      <View style={{ paddingBottom: spacing.xl * 2 }}>
        <Pressable
          style={styles.detailBack}
          onPress={() => setSelectedItem(null)}
        >
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={[styles.detailValue, { color: colors.primary, fontSize: 16 }]}>Back</Text>
        </Pressable>
        <View style={styles.detailHeader}>
          <View style={styles.detailImageWrap}>
            {selectedItem.entry && selectedItem.def.imageUrl ? (
              <CachedImage
                source={{ uri: selectedItem.def.imageUrl }}
                style={styles.detailImage}
              />
            ) : (
              <Text style={styles.cardPlaceholder}>?</Text>
            )}
          </View>
          <View style={styles.detailTitleWrap}>
            <Text style={styles.detailName}>
              {selectedItem.entry ? selectedItem.def.label : '???'}
            </Text>
            <Text style={styles.detailRarity}>
              {formatRarity((selectedItem.def as any).bugRarity)}
            </Text>
          </View>
        </View>
        {selectedItem.entry ? (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Times caught</Text>
              <Text style={styles.detailValue}>×{selectedItem.entry.count}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Best size</Text>
              <Text style={styles.detailValue}>
                {getSizeLabel(
                  selectedItem.entry.bestSize,
                  (selectedItem.def as any).bugSizeMin ?? 0.5,
                  (selectedItem.def as any).bugSizeMax ?? 2,
                )}
              </Text>
            </View>
            <View style={[styles.detailRow, styles.detailRowLast]}>
              <Text style={styles.detailLabel}>Last caught</Text>
              <Text style={styles.detailValue}>{formatDate(selectedItem.entry.lastCaught)}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.detailUncaught}>You haven't caught this one yet!</Text>
        )}
      </View>
    ) : (
      <View style={{ paddingBottom: spacing.xl * 2 }}>
        <View style={styles.chipRow}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.key}
              style={[styles.chip, activeCategory === cat.key && styles.chipActive]}
              onPress={() => handleCategoryChange(cat.key)}
            >
              <Ionicons
                name={cat.icon as any}
                size={20}
                color={activeCategory === cat.key ? colors.onPrimary ?? '#fff' : colors.textSecondary}
              />
              <Text style={[styles.chipText, activeCategory === cat.key && styles.chipTextActive]}>
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading && collection.length === 0 ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.emptyText, { marginTop: 12 }]}>Loading your collection...</Text>
          </View>
        ) : (
          <>
            <View style={styles.grid}>
              {defsForCategory.map((def) => {
                const entry = collectionMap.get(def.itemType);
                const caught = !!entry;
                return (
                  <Pressable
                    key={def.itemType}
                    style={[styles.card, caught ? styles.cardCaught : styles.cardUncaught]}
                    onPress={() => setSelectedItem({ def, entry: entry ?? null })}
                  >
                    {caught && def.imageUrl ? (
                      <CachedImage source={{ uri: def.imageUrl }} style={styles.cardImage} />
                    ) : (
                      <Text style={styles.cardPlaceholder}>?</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {defsForCategory.length === 0 && (
              <View style={styles.emptyWrap}>
                <Ionicons name="leaf-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.emptyText, { marginTop: 12 }]}>
                  No {activeCategory} in the catalog yet.{'\n'}Go catch some on your farm!
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    );

    return (
      <AppDrawer ref={drawerRef} title={selectedItem ? selectedItem.def.label : 'Museum'} snapPoints={['88%']} scrollable={true}>
        {content}
      </AppDrawer>
    );
  },
);
