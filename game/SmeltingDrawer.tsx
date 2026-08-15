/**
 * Smelter — pick an ingot recipe, then play the crucible temper minigame.
 */

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { CachedImage } from '@/components/ui/CachedImage';
import { useTheme } from '@/store/ThemeProvider';
import { api, type RecipeJournalEntry } from '@/lib/api';
import { spacing } from '@/constants/theme';
import type { ItemDefinition, InventorySlot, CraftResult } from './types';
import { SmeltingMiniGame } from './SmeltingMiniGame';

export interface SmeltingDrawerRef {
  open: () => void;
  close: () => void;
}

interface SmeltingDrawerProps {
  itemDefs: Record<string, ItemDefinition>;
  inventory: InventorySlot[];
  storage?: Record<string, number>;
  onSmelt: (recipeId: string, minigamePassed: boolean) => void;
  smeltResult: CraftResult | null;
  onResultDismiss: () => void;
  onOpenChange?: (open: boolean) => void;
}

export const SmeltingDrawer = forwardRef<SmeltingDrawerRef, SmeltingDrawerProps>(
  function SmeltingDrawer(
    { itemDefs, inventory, storage = {}, onSmelt, smeltResult, onResultDismiss, onOpenChange },
    ref,
  ) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const { theme } = useTheme();
    const colors = theme.colors;
    const [journal, setJournal] = useState<RecipeJournalEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [pending, setPending] = useState<RecipeJournalEntry | null>(null);
    const [awaiting, setAwaiting] = useState(false);
    const [showResult, setShowResult] = useState(false);

    const fetchJournal = useCallback(async () => {
      setLoading(true);
      try {
        const data = await api.getSmeltJournal();
        setJournal(data.recipes);
      } catch {
        setJournal([]);
      } finally {
        setLoading(false);
      }
    }, []);

    useImperativeHandle(ref, () => ({
      open: () => {
        void fetchJournal();
        drawerRef.current?.open();
      },
      close: () => drawerRef.current?.close(),
    }));

    const qty = useMemo(() => {
      const m = new Map<string, number>();
      for (const slot of inventory) m.set(slot.itemType, (m.get(slot.itemType) ?? 0) + slot.qty);
      for (const [itemType, n] of Object.entries(storage)) {
        if (n > 0) m.set(itemType, (m.get(itemType) ?? 0) + n);
      }
      return m;
    }, [inventory, storage]);

    useEffect(() => {
      if (!smeltResult || !awaiting) return;
      setAwaiting(false);
      setShowResult(true);
      void fetchJournal();
    }, [smeltResult, awaiting, fetchJournal]);

    return (
      <>
        <AppDrawer
          ref={drawerRef}
          title="Smelter"
          snapPoints={['72%']}
          onChange={(index) => {
            onOpenChange?.(index >= 0);
            if (index < 0) {
              setShowResult(false);
              onResultDismiss();
            }
          }}
        >
          <View style={styles.body}>
            <Text style={[styles.blurb, { color: colors.textSecondary }]}>
              Stoke the crucible. Keep the melt in the gold band until the ingot pours.
            </Text>
            {loading && journal.length === 0 ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <ScrollView contentContainerStyle={styles.list}>
                {journal.map((r) => {
                  const def = itemDefs[r.resultItemType];
                  const can = r.ingredients.every((ing) => (qty.get(ing.itemType) ?? 0) >= ing.qty);
                  return (
                    <Pressable
                      key={r.recipeId}
                      disabled={!can}
                      onPress={() => setPending(r)}
                      style={[
                        styles.row,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.surface,
                          opacity: can ? 1 : 0.45,
                        },
                      ]}
                    >
                      {def?.imageUrl ? (
                        <CachedImage source={{ uri: def.imageUrl }} style={styles.icon} resizeMode="contain" />
                      ) : (
                        <Text style={styles.emoji}>{def?.emoji ?? '🪙'}</Text>
                      )}
                      <View style={styles.rowBody}>
                        <Text style={[styles.label, { color: colors.text }]}>{r.label}</Text>
                        <Text style={[styles.ings, { color: colors.textMuted }]}>
                          {r.ingredients
                            .map((ing) => `${ing.qty}× ${itemDefs[ing.itemType]?.label ?? ing.itemType}`)
                            .join('  ·  ')}
                        </Text>
                      </View>
                      <Text style={[styles.stars, { color: colors.primary }]}>{'★'.repeat(r.difficulty)}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            {showResult && smeltResult ? (
              <View style={[styles.result, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Text style={[styles.resultTitle, { color: colors.text }]}>
                  {smeltResult.matched ? `Forged ${smeltResult.recipeLabel}` : 'The melt collapsed into slag'}
                </Text>
                <Pressable onPress={() => { setShowResult(false); onResultDismiss(); }}>
                  <Text style={[styles.dismiss, { color: colors.primary }]}>OK</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </AppDrawer>
        {pending ? (
          <SmeltingMiniGame
            label={pending.label}
            difficulty={pending.difficulty}
            onComplete={(passed) => {
              const id = pending.recipeId;
              setPending(null);
              setAwaiting(true);
              onSmelt(id, passed);
            }}
            onCancel={() => setPending(null)}
          />
        ) : null}
      </>
    );
  },
);

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: spacing.md, gap: 10 },
  blurb: { fontSize: 13, fontWeight: '600' },
  list: { gap: 8, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
  },
  icon: { width: 40, height: 40 },
  emoji: { fontSize: 28, width: 40, textAlign: 'center' },
  rowBody: { flex: 1, gap: 2 },
  label: { fontSize: 15, fontWeight: '800' },
  ings: { fontSize: 12, fontWeight: '500' },
  stars: { fontSize: 12, fontWeight: '800' },
  result: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  resultTitle: { fontSize: 15, fontWeight: '800' },
  dismiss: { fontSize: 14, fontWeight: '800' },
});
