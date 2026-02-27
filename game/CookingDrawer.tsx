/**
 * Cooking Drawer — Cooking pot UI with ingredient grid, recipe journal, and batch cooking.
 *
 * Features: Cook/Journal tabs, hold-to-add ingredients, top-right recipe preview when bowl
 * matches a discovered recipe, Cook 1 / Cook ×10 buttons on recipe detail, and batch crafting
 * support (server consumes/produces proportionally).
 */
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
  useMemo,
  useState,
  useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { CachedImage } from '@/components/ui/CachedImage';
import { useTheme } from '@/store/ThemeProvider';
import { type RecipeJournalEntry } from '@/lib/api';
import { useRecipeJournal } from '@/hooks/useRecipeJournal';
import { useHoldToAdd } from '@/hooks/useHoldToAdd';
import { spacing } from '@/constants/theme';
import type { ItemDefinition, InventorySlot, CookResult } from './types';
import { CookingMiniGame } from './CookingMiniGame';

const GRID_COLUMNS = 4;
const MAX_INGREDIENTS = 4;

const previewStyles = StyleSheet.create({
  wrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  img: { width: 40, height: 40, resizeMode: 'contain' },
  emoji: { fontSize: 24 },
  badge: { position: 'absolute', bottom: 2, right: 4, fontSize: 11, fontWeight: '800' },
});

function normalizeBowl(bowl: { itemType: string; qty: number }[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const ing of bowl) {
    map.set(ing.itemType, (map.get(ing.itemType) ?? 0) + ing.qty);
  }
  return map;
}

function findBatchFactor(recipeIngredients: { itemType: string; qty: number }[], provided: Map<string, number>): number {
  const recipeMap = new Map<string, number>();
  for (const ri of recipeIngredients) {
    recipeMap.set(ri.itemType, (recipeMap.get(ri.itemType) ?? 0) + ri.qty);
  }
  if (recipeMap.size === 0) return 0;
  let minFactor = Infinity;
  for (const [itemType, recipeQty] of recipeMap) {
    if (recipeQty <= 0) continue;
    const providedQty = provided.get(itemType) ?? 0;
    const factor = Math.floor(providedQty / recipeQty);
    minFactor = Math.min(minFactor, factor);
  }
  return minFactor === Infinity ? 0 : Math.max(0, minFactor);
}

function ingredientsMatchBatch(
  recipeIngredients: { itemType: string; qty: number }[],
  provided: Map<string, number>,
  batchFactor: number,
): boolean {
  if (batchFactor < 1) return false;
  const recipeMap = new Map<string, number>();
  for (const ri of recipeIngredients) {
    recipeMap.set(ri.itemType, (recipeMap.get(ri.itemType) ?? 0) + ri.qty);
  }
  for (const [itemType, recipeQty] of recipeMap) {
    const required = recipeQty * batchFactor;
    const have = provided.get(itemType) ?? 0;
    if (have < required) return false;
  }
  return true;
}

function getMatchingRecipe(
  bowl: { itemType: string; qty: number }[],
  journal: RecipeJournalEntry[],
): { recipe: RecipeJournalEntry; batchFactor: number } | null {
  if (bowl.length === 0) return null;
  const bowlMap = normalizeBowl(bowl);
  const discovered = journal.filter((r) => r.discoveredAt);
  let best: { recipe: RecipeJournalEntry; batchFactor: number } | null = null;
  for (const r of discovered) {
    const factor = findBatchFactor(r.ingredients, bowlMap);
    if (factor >= 1 && ingredientsMatchBatch(r.ingredients, bowlMap, factor)) {
      if (!best || factor > best.batchFactor) best = { recipe: r, batchFactor: factor };
    }
  }
  return best;
}

/** Imperative handle for the cooking drawer (open/close). */
export interface CookingDrawerRef {
  open: () => void;
  close: () => void;
}

interface CookingDrawerProps {
  itemDefs: Record<string, ItemDefinition>;
  inventory: InventorySlot[];
  onCook: (ingredients: { itemType: string; qty: number }[], minigamePassed: boolean) => void;
  cookResult: CookResult | null;
  onResultDismiss: () => void;
  activeHighlight?: import('./types').QuestHighlight | null;
  onOpenChange?: (open: boolean) => void;
  tryAutoAdvanceDialog?: (action: string, itemType?: string) => void;
}

type Tab = 'cook' | 'journal';

const cardHighlight = { borderWidth: 2, borderColor: '#FFD700' };

export const CookingDrawer = forwardRef<CookingDrawerRef, CookingDrawerProps>(
  function CookingDrawer({ itemDefs, inventory, onCook, cookResult, onResultDismiss, activeHighlight, onOpenChange, tryAutoAdvanceDialog }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const colors = theme.colors;

    const [tab, setTab] = useState<Tab>('cook');
    const [bowl, setBowl] = useState<{ itemType: string; qty: number }[]>([]);
    const [showMiniGame, setShowMiniGame] = useState(false);
    const [miniGameDifficulty, setMiniGameDifficulty] = useState(1);
    const [awaitingResult, setAwaitingResult] = useState(false);
    const [showResult, setShowResult] = useState(false);

    const { journal, fetchJournal, journalLoading } = useRecipeJournal('cooking');
    const [selectedRecipe, setSelectedRecipe] = useState<RecipeJournalEntry | null>(null);

    const resultScale = useSharedValue(0);
    const resultOpacity = useSharedValue(0);

    useEffect(() => {
      if (cookResult && awaitingResult) {
        setAwaitingResult(false);
        setShowResult(true);
        resultOpacity.value = withTiming(1, { duration: 200 });
        resultScale.value = withSequence(
          withTiming(1.15, { duration: 250, easing: Easing.out(Easing.back(2)) }),
          withTiming(1, { duration: 150 }),
        );
      }
    }, [cookResult, awaitingResult, resultOpacity, resultScale]);

    const resultAnimStyle = useAnimatedStyle(() => ({
      opacity: resultOpacity.value,
      transform: [{ scale: resultScale.value }],
    }));

    const cookableItems = useMemo(() => {
      return inventory.filter((slot) => {
        const def = itemDefs[slot.itemType];
        if (!def) return false;
        return def.category === 'ingredient' || def.category === 'food' || def.category === 'fish';
      });
    }, [inventory, itemDefs]);

    useImperativeHandle(
      ref,
      () => ({
        open: () => {
          setBowl([]);
          setTab('cook');
          setSelectedRecipe(null);
          setShowResult(false);
          setAwaitingResult(false);
          onResultDismiss();
          fetchJournal();
          drawerRef.current?.open();
        },
        close: () => drawerRef.current?.close(),
      }),
      [onResultDismiss, fetchJournal],
    );

    const highlightedIngredient =
      activeHighlight?.type === 'cook_item' ? activeHighlight.target : undefined;

    const addToBowl = useCallback((itemType: string) => {
      tryAutoAdvanceDialog?.('cook', itemType);
      setBowl((prev) => {
        if (prev.length >= MAX_INGREDIENTS && !prev.find((i) => i.itemType === itemType)) return prev;
        const existing = prev.find((i) => i.itemType === itemType);
        const invSlot = inventory.find((s) => s.itemType === itemType);
        const maxQty = invSlot?.qty ?? 0;
        const currentInBowl = existing?.qty ?? 0;
        if (currentInBowl >= maxQty) return prev;
        if (existing) return prev.map((i) => i.itemType === itemType ? { ...i, qty: i.qty + 1 } : i);
        return [...prev, { itemType, qty: 1 }];
      });
    }, [inventory, tryAutoAdvanceDialog]);

    const { handlePressIn, handlePressOut, handlePress } = useHoldToAdd(addToBowl, {
      holdDelayMs: 400,
      holdIntervalMs: 150,
    });

    const removeFromBowl = useCallback((itemType: string) => {
      setBowl((prev) => {
        const existing = prev.find((i) => i.itemType === itemType);
        if (!existing) return prev;
        if (existing.qty <= 1) return prev.filter((i) => i.itemType !== itemType);
        return prev.map((i) => i.itemType === itemType ? { ...i, qty: i.qty - 1 } : i);
      });
    }, []);

    const handleCookPress = useCallback(() => {
      if (bowl.length === 0) return;
      setMiniGameDifficulty(Math.min(bowl.length, 5));
      setShowMiniGame(true);
    }, [bowl]);

    const canCookBatch = useCallback(
      (recipe: RecipeJournalEntry, batch: number): boolean => {
        if (batch < 1) return false;
        for (const ing of recipe.ingredients) {
          const invSlot = inventory.find((s) => s.itemType === ing.itemType);
          const have = invSlot?.qty ?? 0;
          if (have < ing.qty * batch) return false;
        }
        return true;
      },
      [inventory],
    );

    const handleCookFromRecipe = useCallback(
      (recipe: RecipeJournalEntry, batch: number) => {
        const ingredients = recipe.ingredients.map((i) => ({ itemType: i.itemType, qty: i.qty * batch }));
        setBowl(ingredients);
        setTab('cook');
        setShowMiniGame(true);
        setMiniGameDifficulty(Math.min(recipe.ingredients.length, 5));
        setSelectedRecipe(null);
      },
      [],
    );

    const handleMiniGameComplete = useCallback((passed: boolean) => {
      setShowMiniGame(false);
      setAwaitingResult(true);
      onCook(bowl, passed);
      setBowl([]);
    }, [bowl, onCook]);

    const handleMiniGameCancel = useCallback(() => {
      setShowMiniGame(false);
    }, []);

    const handleDismissResult = useCallback(() => {
      setShowResult(false);
      resultScale.value = 0;
      resultOpacity.value = 0;
      onResultDismiss();
    }, [onResultDismiss, resultScale, resultOpacity]);

    const handleTabChange = useCallback((t: Tab) => {
      setTab(t);
      setSelectedRecipe(null);
      if (t === 'journal') fetchJournal();
    }, [fetchJournal]);

    const gap = spacing.sm;
    const horizontalPadding = spacing.xl * 2;
    const availableWidth = width - horizontalPadding;
    const cardSize = Math.floor((availableWidth - gap * (GRID_COLUMNS - 1)) / GRID_COLUMNS);

    const styles = useMemo(
      () =>
        StyleSheet.create({
          tabRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.lg },
          chip: {
            flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20,
            backgroundColor: colors.border + '80',
          },
          chipActive: { backgroundColor: colors.primary },
          chipText: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
          chipTextActive: { color: '#fff' },
          sectionLabel: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginBottom: spacing.sm },
          bowlRow: {
            flexDirection: 'row', gap: 8, marginBottom: spacing.lg,
            minHeight: cardSize + 12, alignItems: 'center',
          },
          bowlSlot: {
            width: cardSize, height: cardSize, borderRadius: 12,
            backgroundColor: colors.border + '30', borderWidth: 2,
            borderColor: colors.border, borderStyle: 'dashed',
            alignItems: 'center', justifyContent: 'center',
          },
          bowlSlotFilled: { borderStyle: 'solid', borderColor: colors.primary },
          grid: { flexDirection: 'row', flexWrap: 'wrap', gap, marginBottom: spacing.lg },
          ingredientCard: {
            width: cardSize, height: cardSize + 20, borderRadius: 12,
            backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
            alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          },
          cardImage: { width: cardSize - 16, height: cardSize - 16, resizeMode: 'contain' },
          cardQty: {
            position: 'absolute', bottom: 2, right: 4,
            fontSize: 11, fontWeight: '800', color: colors.textMuted,
          },
          cardLabel: { fontSize: 9, color: colors.textSecondary, marginTop: 2 },
          cookBtn: {
            backgroundColor: colors.primary, borderRadius: 14,
            paddingVertical: 16, alignItems: 'center', marginTop: spacing.sm,
          },
          cookBtnDisabled: { opacity: 0.4 },
          cookBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },
          journalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap },
          journalCard: {
            width: cardSize, height: cardSize, borderRadius: 12,
            backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
            alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          },
          journalCardDiscovered: { borderColor: colors.primary + '80' },
          journalCardUndiscovered: { opacity: 0.6 },
          placeholder: { fontSize: 22, color: colors.textMuted },
          counterText: {
            fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md, fontWeight: '600',
          },
          detailBack: {
            flexDirection: 'row', alignItems: 'center', gap: 8,
            marginBottom: spacing.lg, paddingVertical: 8,
          },
          detailHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
          detailImageWrap: {
            width: 72, height: 72, borderRadius: 14,
            backgroundColor: colors.border + '40', alignItems: 'center',
            justifyContent: 'center', overflow: 'hidden',
          },
          detailImage: { width: 56, height: 56, resizeMode: 'contain' },
          detailName: { fontSize: 20, fontWeight: '800', color: colors.text },
          detailSub: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginTop: 2 },
          detailRow: {
            flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10,
            borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
          },
          detailLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
          detailValue: { fontSize: 14, fontWeight: '700', color: colors.text },
          detailIngredients: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: spacing.sm },
          detailIngCard: {
            flexDirection: 'row', alignItems: 'center', gap: 8,
            paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12,
            backgroundColor: colors.border + '30', minWidth: 120,
          },
          detailIngImg: { width: 36, height: 36, borderRadius: 8, resizeMode: 'contain' },
          detailIngLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
          detailIngQty: { fontSize: 12, fontWeight: '800', color: colors.primary },
          detailCookRow: { flexDirection: 'row', gap: 10, marginTop: spacing.lg },
          detailCookBtn: {
            flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
            backgroundColor: colors.primary,
          },
          detailCookBtnDisabled: { opacity: 0.5 },
          detailCookBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
          emptyWrap: { paddingVertical: 48, alignItems: 'center' },
          emptyText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
          resultOverlay: {
            alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24,
          },
          resultImageWrap: {
            width: 100, height: 100, borderRadius: 20,
            backgroundColor: colors.border + '30', alignItems: 'center',
            justifyContent: 'center', overflow: 'hidden', marginBottom: 16,
          },
          resultImage: { width: 80, height: 80, resizeMode: 'contain' },
          resultTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
          resultSubtitle: { fontSize: 15, fontWeight: '600', color: colors.textSecondary, textAlign: 'center', marginBottom: 20 },
          resultBadge: {
            backgroundColor: colors.primary + '20', borderRadius: 12, paddingHorizontal: 16,
            paddingVertical: 8, marginBottom: 24,
          },
          resultBadgeText: { fontSize: 13, fontWeight: '800', color: colors.primary },
          resultDismissBtn: {
            backgroundColor: colors.primary, borderRadius: 14,
            paddingVertical: 14, paddingHorizontal: 48, alignItems: 'center',
          },
          resultDismissText: { fontSize: 16, fontWeight: '800', color: '#fff' },
        }),
      [colors, cardSize, gap],
    );

    const getItemImage = (itemType: string) => itemDefs[itemType]?.imageUrl;

    const matchingRecipe = useMemo(
      () => (tab === 'cook' ? getMatchingRecipe(bowl, journal) : null),
      [tab, bowl, journal],
    );

    const resultView = showResult && cookResult ? (() => {
      const resultDef = itemDefs[cookResult.resultItemType];
      const resultImage = resultDef?.imageUrl;
      const resultName = cookResult.recipeLabel ?? resultDef?.label ?? cookResult.resultItemType;
      const isSuccess = cookResult.matched;
      const isNew = cookResult.isNewDiscovery;

      return (
        <View style={styles.resultOverlay}>
          <Animated.View style={resultAnimStyle}>
            <View style={{ alignItems: 'center' }}>
              <View style={[styles.resultImageWrap, isSuccess && { borderWidth: 2, borderColor: colors.primary }]}>
                {resultImage ? (
                  <CachedImage source={{ uri: resultImage }} style={styles.resultImage} />
                ) : (
                  <Ionicons name={isSuccess ? 'restaurant' : 'help-circle'} size={48} color={colors.textMuted} />
                )}
              </View>
              <Text style={[styles.resultTitle, { color: isSuccess ? colors.primary : colors.textSecondary }]}>
                {isSuccess ? resultName : 'Strange Stew...'}
              </Text>
              <Text style={styles.resultSubtitle}>
                {isNew
                  ? 'New recipe discovered!'
                  : isSuccess
                    ? `×${cookResult.resultQty} added to inventory`
                    : "That combination didn't work out."}
              </Text>
              {isNew && (
                <View style={styles.resultBadge}>
                  <Text style={styles.resultBadgeText}>NEW DISCOVERY</Text>
                </View>
              )}
              <Pressable style={styles.resultDismissBtn} onPress={handleDismissResult}>
                <Text style={styles.resultDismissText}>Continue</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      );
    })() : null;

    const recipeDetail = selectedRecipe ? (
      <View style={{ paddingBottom: spacing.xl * 2 }}>
        <Pressable style={styles.detailBack} onPress={() => setSelectedRecipe(null)}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={[styles.detailValue, { color: colors.primary, fontSize: 16 }]}>Back</Text>
        </Pressable>
        <View style={styles.detailHeader}>
          <View style={styles.detailImageWrap}>
            {selectedRecipe.discoveredAt && getItemImage(selectedRecipe.resultItemType) ? (
              <CachedImage source={{ uri: getItemImage(selectedRecipe.resultItemType)! }} style={styles.detailImage} />
            ) : (
              <Text style={styles.placeholder}>?</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.detailName}>
              {selectedRecipe.discoveredAt ? selectedRecipe.label : '???'}
            </Text>
            <Text style={styles.detailSub}>Difficulty: {'★'.repeat(selectedRecipe.difficulty)}</Text>
          </View>
        </View>
        {selectedRecipe.discoveredAt ? (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Times Crafted</Text>
              <Text style={styles.detailValue}>×{selectedRecipe.timesCrafted ?? 0}</Text>
            </View>
            <Text style={[styles.detailLabel, { marginTop: spacing.md }]}>Ingredients</Text>
            <View style={styles.detailIngredients}>
              {selectedRecipe.ingredients.map((ing) => {
                const def = itemDefs[ing.itemType];
                return (
                  <View key={ing.itemType} style={styles.detailIngCard}>
                    {def?.imageUrl ? (
                      <CachedImage source={{ uri: def.imageUrl }} style={styles.detailIngImg} />
                    ) : (
                      <Text style={{ fontSize: 20 }}>{def?.emoji ?? '?'}</Text>
                    )}
                    <Text style={styles.detailIngLabel} numberOfLines={1}>
                      {def?.label ?? ing.itemType}
                    </Text>
                    <Text style={styles.detailIngQty}>×{ing.qty}</Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Result</Text>
              <Text style={styles.detailValue}>
                {itemDefs[selectedRecipe.resultItemType]?.label ?? selectedRecipe.resultItemType}
              </Text>
            </View>
            {(() => {
              const resultDef = itemDefs[selectedRecipe.resultItemType];
              if (!resultDef || resultDef.category !== 'food') return null;
              const hunger = resultDef.foodHunger ?? 10;
              const happiness = resultDef.foodHappiness ?? 5;
              return (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Restores</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="nutrition" size={14} color={colors.textSecondary} />
                      <Text style={styles.detailValue}>Hunger +{hunger}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="heart" size={14} color={colors.textSecondary} />
                      <Text style={styles.detailValue}>Happiness +{happiness}</Text>
                    </View>
                  </View>
                </View>
              );
            })()}
            <View style={styles.detailCookRow}>
              <Pressable
                style={[styles.detailCookBtn, !canCookBatch(selectedRecipe, 1) && styles.detailCookBtnDisabled]}
                onPress={() => canCookBatch(selectedRecipe, 1) && handleCookFromRecipe(selectedRecipe, 1)}
                disabled={!canCookBatch(selectedRecipe, 1)}
              >
                <Text style={styles.detailCookBtnText}>Cook 1</Text>
              </Pressable>
              <Pressable
                style={[styles.detailCookBtn, !canCookBatch(selectedRecipe, 10) && styles.detailCookBtnDisabled]}
                onPress={() => canCookBatch(selectedRecipe, 10) && handleCookFromRecipe(selectedRecipe, 10)}
                disabled={!canCookBatch(selectedRecipe, 10)}
              >
                <Text style={styles.detailCookBtnText}>Cook ×10</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Text style={[styles.emptyText, { marginTop: spacing.sm }]}>You haven't discovered this recipe yet!</Text>
        )}
      </View>
    ) : null;

    const cookTab = showResult && cookResult ? resultView : (
      <View style={{ paddingBottom: spacing.xl * 2 }}>
        {awaitingResult ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.emptyText, { marginTop: 12 }]}>Cooking...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Mixing Bowl</Text>
            <View style={styles.bowlRow}>
              {Array.from({ length: MAX_INGREDIENTS }).map((_, i) => {
                const item = bowl[i];
                const def = item ? itemDefs[item.itemType] : null;
                return (
                  <Pressable
                    key={i}
                    style={[styles.bowlSlot, item && styles.bowlSlotFilled]}
                    onPress={item ? () => removeFromBowl(item.itemType) : undefined}
                  >
                    {def?.imageUrl ? (
                      <CachedImage source={{ uri: def.imageUrl }} style={styles.cardImage} />
                    ) : item ? (
                      <Text style={{ fontSize: 18 }}>{def?.emoji ?? '?'}</Text>
                    ) : null}
                    {item && <Text style={styles.cardQty}>×{item.qty}</Text>}
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>Ingredients</Text>
            <View style={styles.grid}>
              {cookableItems.map((slot) => {
                const def = itemDefs[slot.itemType];
                if (!def) return null;
                return (
                  <Pressable
                    key={slot.itemType}
                    style={[styles.ingredientCard, highlightedIngredient === slot.itemType && cardHighlight]}
                    onPress={() => handlePress(slot.itemType)}
                    onPressIn={() => handlePressIn(slot.itemType)}
                    onPressOut={handlePressOut}
                  >
                    {def.imageUrl ? (
                      <CachedImage source={{ uri: def.imageUrl }} style={styles.cardImage} />
                    ) : (
                      <Text style={{ fontSize: 22 }}>{def.emoji}</Text>
                    )}
                    <Text style={styles.cardLabel} numberOfLines={1}>{def.label}</Text>
                    <Text style={styles.cardQty}>×{slot.qty}</Text>
                  </Pressable>
                );
              })}
            </View>

            {cookableItems.length === 0 && (
              <View style={styles.emptyWrap}>
                <Ionicons name="leaf-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.emptyText, { marginTop: 12 }]}>
                  No ingredients in your inventory.{'\n'}Harvest crops or find items to cook with!
                </Text>
              </View>
            )}

            <Pressable
              style={[styles.cookBtn, bowl.length === 0 && styles.cookBtnDisabled]}
              onPress={handleCookPress}
              disabled={bowl.length === 0}
            >
              <Text style={styles.cookBtnText}>Cook!</Text>
            </Pressable>
          </>
        )}
      </View>
    );

    const journalTab = selectedRecipe ? recipeDetail : (
      <View style={{ paddingBottom: spacing.xl * 2 }}>
        {journalLoading && journal.length === 0 ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            <Text style={styles.counterText}>
              {journal.filter((r) => r.discoveredAt).length} / {journal.length} discovered
            </Text>
            <View style={styles.journalGrid}>
              {journal.map((recipe) => {
                const discovered = !!recipe.discoveredAt;
                const recipeImage = getItemImage(recipe.resultItemType);
                return (
                  <Pressable
                    key={recipe.recipeId}
                    style={[
                      styles.journalCard,
                      discovered ? styles.journalCardDiscovered : styles.journalCardUndiscovered,
                    ]}
                    onPress={() => setSelectedRecipe(recipe)}
                  >
                    {discovered && recipeImage ? (
                      <CachedImage source={{ uri: recipeImage }} style={styles.cardImage} />
                    ) : (
                      <Text style={styles.placeholder}>?</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
            {journal.length === 0 && (
              <View style={styles.emptyWrap}>
                <Ionicons name="book-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.emptyText, { marginTop: 12 }]}>
                  No recipes available yet.
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    );

    return (
      <>
        <AppDrawer
          ref={drawerRef}
          title="Cooking Pot"
          snapPoints={['88%']}
          scrollable
          onChange={(index) => onOpenChange?.(index >= 0)}
          headerRight={
            matchingRecipe ? (
              <View style={[previewStyles.wrap, { backgroundColor: colors.border + '40' }]}>
                {getItemImage(matchingRecipe.recipe.resultItemType) ? (
                  <CachedImage
                    source={{ uri: getItemImage(matchingRecipe.recipe.resultItemType)! }}
                    style={previewStyles.img}
                  />
                ) : (
                  <Text style={previewStyles.emoji}>{itemDefs[matchingRecipe.recipe.resultItemType]?.emoji ?? '?'}</Text>
                )}
                <Text style={[previewStyles.badge, { color: colors.primary }]}>×{matchingRecipe.batchFactor}</Text>
              </View>
            ) : undefined
          }
        >
          <View style={styles.tabRow}>
            {(['cook', 'journal'] as Tab[]).map((t) => (
              <Pressable
                key={t}
                style={[styles.chip, tab === t && styles.chipActive]}
                onPress={() => handleTabChange(t)}
              >
                <Ionicons
                  name={t === 'cook' ? 'flame-outline' : 'book-outline'}
                  size={20}
                  color={tab === t ? '#fff' : colors.textSecondary}
                />
                <Text style={[styles.chipText, tab === t && styles.chipTextActive]}>
                  {t === 'cook' ? 'Cook' : 'Recipe Journal'}
                </Text>
              </Pressable>
            ))}
          </View>
          {tab === 'cook' ? cookTab : journalTab}
        </AppDrawer>

        {showMiniGame && (
          <CookingMiniGame
            difficulty={miniGameDifficulty}
            onComplete={handleMiniGameComplete}
            onCancel={handleMiniGameCancel}
          />
        )}
      </>
    );
  },
);
