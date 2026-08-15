/**
 * Storage drawer — farm-wide uncapped vault with search.
 * Opened by interacting with a placed `storage` item (open_modal: storage).
 */

import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { useTheme } from '@/store/ThemeProvider';
import { spacing } from '@/constants/theme';
import type { InventorySlot, ItemDefinition } from './types';

export interface StorageDrawerRef {
  open: () => void;
  close: () => void;
}

interface StorageDrawerProps {
  itemDefs: Record<string, ItemDefinition>;
  inventory: InventorySlot[];
  storage: Record<string, number>;
  backpackSlots: number;
  onDeposit: (items: Array<{ itemType: string; qty: number }>) => void;
  onWithdraw: (items: Array<{ itemType: string; qty: number }>) => void;
  onError?: (message: string) => void;
}

type Tab = 'storage' | 'backpack';

function slotsFromRecord(
  record: Record<string, number>,
  itemDefs: Record<string, ItemDefinition>,
): InventorySlot[] {
  return Object.entries(record)
    .filter(([, qty]) => qty > 0)
    .map(([itemType, qty]) => ({ itemType, qty }))
    .sort((a, b) => {
      const la = itemDefs[a.itemType]?.label ?? a.itemType;
      const lb = itemDefs[b.itemType]?.label ?? b.itemType;
      return la.localeCompare(lb);
    });
}

export const StorageDrawer = forwardRef<StorageDrawerRef, StorageDrawerProps>(
  function StorageDrawer(
    { itemDefs, inventory, storage, backpackSlots, onDeposit, onWithdraw, onError },
    ref,
  ) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const { theme } = useTheme();
    const colors = theme.colors;
    const [tab, setTab] = useState<Tab>('storage');
    const [query, setQuery] = useState('');

    useImperativeHandle(ref, () => ({
      open: () => {
        setTab('storage');
        setQuery('');
        drawerRef.current?.open();
      },
      close: () => drawerRef.current?.close(),
    }));

    const storageSlots = useMemo(
      () => slotsFromRecord(storage, itemDefs),
      [storage, itemDefs],
    );

    const backpackUsed = inventory.filter((s) => s.qty > 0).length;

    const filterSlots = useCallback(
      (slots: InventorySlot[]) => {
        const q = query.trim().toLowerCase();
        if (!q) return slots;
        return slots.filter((s) => {
          const def = itemDefs[s.itemType];
          const label = (def?.label ?? s.itemType).toLowerCase();
          return label.includes(q) || s.itemType.toLowerCase().includes(q);
        });
      },
      [query, itemDefs],
    );

    const visible = useMemo(() => {
      const source = tab === 'storage' ? storageSlots : inventory.filter((s) => s.qty > 0);
      return filterSlots(source);
    }, [tab, storageSlots, inventory, filterSlots]);

    const moveOne = useCallback(
      (itemType: string) => {
        if (tab === 'backpack') {
          onDeposit([{ itemType, qty: 1 }]);
          return;
        }
        if (backpackUsed >= backpackSlots && !(inventory.find((s) => s.itemType === itemType)?.qty)) {
          onError?.(`Backpack full (${backpackSlots} slots).`);
          return;
        }
        onWithdraw([{ itemType, qty: 1 }]);
      },
      [tab, onDeposit, onWithdraw, backpackUsed, backpackSlots, inventory, onError],
    );

    const moveAll = useCallback(
      (itemType: string, qty: number) => {
        if (tab === 'backpack') {
          onDeposit([{ itemType, qty }]);
          return;
        }
        if (backpackUsed >= backpackSlots && !(inventory.find((s) => s.itemType === itemType)?.qty)) {
          onError?.(`Backpack full (${backpackSlots} slots).`);
          return;
        }
        onWithdraw([{ itemType, qty }]);
      },
      [tab, onDeposit, onWithdraw, backpackUsed, backpackSlots, inventory, onError],
    );

    return (
      <AppDrawer ref={drawerRef} title="Storage" snapPoints={['70%', '92%']}>
        <View style={styles.headerMeta}>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            Backpack {backpackUsed}/{backpackSlots} · Storage unlimited
          </Text>
        </View>

        <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search items…"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <View style={styles.tabs}>
          {([
            ['storage', `Storage (${storageSlots.length})`],
            ['backpack', `Backpack (${backpackUsed})`],
          ] as const).map(([key, label]) => {
            const active = tab === key;
            return (
              <Pressable
                key={key}
                style={[styles.tab, active && { backgroundColor: colors.primary }]}
                onPress={() => setTab(key)}
              >
                <Text style={[styles.tabText, { color: active ? '#fff' : colors.textSecondary }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.hint, { color: colors.textMuted }]}>
          {tab === 'storage'
            ? 'Tap to withdraw 1 · long-press to withdraw all'
            : 'Tap to store 1 · long-press to store all'}
        </Text>

        <ScrollView contentContainerStyle={styles.grid}>
          {visible.length === 0 && (
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              {query ? 'No matches' : tab === 'storage' ? 'Storage is empty' : 'Backpack is empty'}
            </Text>
          )}
          {visible.map((slot) => {
            const def = itemDefs[slot.itemType];
            if (!def) return null;
            return (
              <Pressable
                key={slot.itemType}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => moveOne(slot.itemType)}
                onLongPress={() => moveAll(slot.itemType, slot.qty)}
              >
                {def.imageUrl ? (
                  <CachedImage source={{ uri: def.imageUrl }} style={styles.img} resizeMode="contain" />
                ) : (
                  <Text style={styles.emoji}>{def.emoji}</Text>
                )}
                <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
                  {def.label}
                </Text>
                <Text style={[styles.qty, { color: colors.textSecondary }]}>×{slot.qty}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </AppDrawer>
    );
  },
);

const styles = StyleSheet.create({
  headerMeta: { marginBottom: spacing.sm },
  metaText: { fontSize: 12, fontWeight: '600' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: spacing.sm },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  tabText: { fontSize: 13, fontWeight: '700' },
  hint: { fontSize: 11, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 24 },
  empty: { width: '100%', textAlign: 'center', paddingVertical: 24, fontSize: 13 },
  card: {
    width: '22%',
    aspectRatio: 0.85,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  img: { width: 36, height: 36 },
  emoji: { fontSize: 28 },
  label: { fontSize: 10, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  qty: { fontSize: 10, fontWeight: '700' },
});
