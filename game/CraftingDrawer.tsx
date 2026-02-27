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
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { CachedImage } from '@/components/ui/CachedImage';
import { useTheme } from '@/store/ThemeProvider';
import { type RecipeJournalEntry } from '@/lib/api';
import { useRecipeJournal } from '@/hooks/useRecipeJournal';
import { spacing } from '@/constants/theme';
import type { ItemDefinition, InventorySlot, CraftResult } from './types';
import { CraftingMiniGame } from './CraftingMiniGame';

const GRID_COLUMNS = 4;
const MAX_MATERIALS = 4;

export interface CraftingDrawerRef {
  open: () => void;
  close: () => void;
}

interface CraftingDrawerProps {
  itemDefs: Record<string, ItemDefinition>;
  inventory: InventorySlot[];
  onCraft: (materials: { itemType: string; qty: number }[], minigamePassed: boolean) => void;
  craftResult: CraftResult | null;
  onResultDismiss: () => void;
}

type Tab = 'craft' | 'journal';

export const CraftingDrawer = forwardRef<CraftingDrawerRef, CraftingDrawerProps>(
  function CraftingDrawer({ itemDefs, inventory, onCraft, craftResult, onResultDismiss }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const colors = theme.colors;

    const [tab, setTab] = useState<Tab>('craft');
    const [bench, setBench] = useState<{ itemType: string; qty: number }[]>([]);
    const [showMiniGame, setShowMiniGame] = useState(false);
    const [miniGameDifficulty, setMiniGameDifficulty] = useState(1);
    const [awaitingResult, setAwaitingResult] = useState(false);
    const [showResult, setShowResult] = useState(false);

    const { journal, fetchJournal, journalLoading } = useRecipeJournal('crafting');
    const [selectedRecipe, setSelectedRecipe] = useState<RecipeJournalEntry | null>(null);

    const resultScale = useSharedValue(0);
    const resultOpacity = useSharedValue(0);

    useEffect(() => {
      if (craftResult && awaitingResult) {
        setAwaitingResult(false);
        setShowResult(true);
        resultOpacity.value = withTiming(1, { duration: 200 });
        resultScale.value = withSequence(
          withTiming(1.15, { duration: 250, easing: Easing.out(Easing.back(2)) }),
          withTiming(1, { duration: 150 }),
        );
      }
    }, [craftResult, awaitingResult, resultOpacity, resultScale]);

    const resultAnimStyle = useAnimatedStyle(() => ({
      opacity: resultOpacity.value,
      transform: [{ scale: resultScale.value }],
    }));

    const craftableItems = useMemo(() => {
      return inventory.filter((slot) => {
        const def = itemDefs[slot.itemType];
        if (!def) return false;
        return def.category === 'material';
      });
    }, [inventory, itemDefs]);

    useImperativeHandle(
      ref,
      () => ({
        open: () => {
          setBench([]);
          setTab('craft');
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

    const addToBench = useCallback((itemType: string) => {
      setBench((prev) => {
        if (prev.length >= MAX_MATERIALS && !prev.find((i) => i.itemType === itemType)) return prev;
        const existing = prev.find((i) => i.itemType === itemType);
        const invSlot = inventory.find((s) => s.itemType === itemType);
        const maxQty = invSlot?.qty ?? 0;
        const currentInBench = existing?.qty ?? 0;
        if (currentInBench >= maxQty) return prev;
        if (existing) return prev.map((i) => i.itemType === itemType ? { ...i, qty: i.qty + 1 } : i);
        return [...prev, { itemType, qty: 1 }];
      });
    }, [inventory]);

    const removeFromBench = useCallback((itemType: string) => {
      setBench((prev) => {
        const existing = prev.find((i) => i.itemType === itemType);
        if (!existing) return prev;
        if (existing.qty <= 1) return prev.filter((i) => i.itemType !== itemType);
        return prev.map((i) => i.itemType === itemType ? { ...i, qty: i.qty - 1 } : i);
      });
    }, []);

    const handleCraftPress = useCallback(() => {
      if (bench.length === 0) return;
      setMiniGameDifficulty(Math.min(bench.length, 5));
      setShowMiniGame(true);
    }, [bench]);

    const handleMiniGameComplete = useCallback((passed: boolean) => {
      setShowMiniGame(false);
      setAwaitingResult(true);
      onCraft(bench, passed);
      setBench([]);
    }, [bench, onCraft]);

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
          benchRow: {
            flexDirection: 'row', gap: 8, marginBottom: spacing.lg,
            minHeight: cardSize + 12, alignItems: 'center',
          },
          benchSlot: {
            width: cardSize, height: cardSize, borderRadius: 12,
            backgroundColor: colors.border + '30', borderWidth: 2,
            borderColor: colors.border, borderStyle: 'dashed',
            alignItems: 'center', justifyContent: 'center',
          },
          benchSlotFilled: { borderStyle: 'solid', borderColor: colors.primary },
          grid: { flexDirection: 'row', flexWrap: 'wrap', gap, marginBottom: spacing.lg },
          materialCard: {
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
          craftBtn: {
            backgroundColor: colors.primary, borderRadius: 14,
            paddingVertical: 16, alignItems: 'center', marginTop: spacing.sm,
          },
          craftBtnDisabled: { opacity: 0.4 },
          craftBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },
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

    const resultView = showResult && craftResult ? (() => {
      const resultDef = itemDefs[craftResult.resultItemType];
      const resultImage = resultDef?.imageUrl;
      const resultName = craftResult.recipeLabel ?? resultDef?.label ?? craftResult.resultItemType;
      const isSuccess = craftResult.matched;
      const isNew = craftResult.isNewDiscovery;

      return (
        <View style={styles.resultOverlay}>
          <Animated.View style={resultAnimStyle}>
            <View style={{ alignItems: 'center' }}>
              <View style={[styles.resultImageWrap, isSuccess && { borderWidth: 2, borderColor: colors.primary }]}>
                {resultImage ? (
                  <CachedImage source={{ uri: resultImage }} style={styles.resultImage} />
                ) : (
                  <Ionicons name={isSuccess ? 'construct' : 'help-circle'} size={48} color={colors.textMuted} />
                )}
              </View>
              <Text style={[styles.resultTitle, { color: isSuccess ? colors.primary : colors.textSecondary }]}>
                {isSuccess ? resultName : 'Scrap'}
              </Text>
              <Text style={styles.resultSubtitle}>
                {isNew
                  ? 'New recipe discovered!'
                  : isSuccess
                    ? `×${craftResult.resultQty} added to inventory`
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
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Materials</Text>
              <Text style={styles.detailValue}>
                {selectedRecipe.ingredients.map((i) => {
                  const def = itemDefs[i.itemType];
                  return `${def?.label ?? i.itemType} ×${i.qty}`;
                }).join(', ')}
              </Text>
            </View>
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.detailLabel}>Result</Text>
              <Text style={styles.detailValue}>
                {itemDefs[selectedRecipe.resultItemType]?.label ?? selectedRecipe.resultItemType}
              </Text>
            </View>
          </>
        ) : (
          <Text style={[styles.emptyText, { marginTop: spacing.sm }]}>You haven't discovered this recipe yet!</Text>
        )}
      </View>
    ) : null;

    const craftTab = showResult && craftResult ? resultView : (
      <View style={{ paddingBottom: spacing.xl * 2 }}>
        {awaitingResult ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.emptyText, { marginTop: 12 }]}>Crafting...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Workbench</Text>
            <View style={styles.benchRow}>
              {Array.from({ length: MAX_MATERIALS }).map((_, i) => {
                const item = bench[i];
                const def = item ? itemDefs[item.itemType] : null;
                return (
                  <Pressable
                    key={i}
                    style={[styles.benchSlot, item && styles.benchSlotFilled]}
                    onPress={item ? () => removeFromBench(item.itemType) : undefined}
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

            <Text style={styles.sectionLabel}>Materials</Text>
            <View style={styles.grid}>
              {craftableItems.map((slot) => {
                const def = itemDefs[slot.itemType];
                if (!def) return null;
                return (
                  <Pressable
                    key={slot.itemType}
                    style={styles.materialCard}
                    onPress={() => addToBench(slot.itemType)}
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

            {craftableItems.length === 0 && (
              <View style={styles.emptyWrap}>
                <Ionicons name="construct-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.emptyText, { marginTop: 12 }]}>
                  No materials in your inventory.{'\n'}Gather wood, stone, and more to craft!
                </Text>
              </View>
            )}

            <Pressable
              style={[styles.craftBtn, bench.length === 0 && styles.craftBtnDisabled]}
              onPress={handleCraftPress}
              disabled={bench.length === 0}
            >
              <Text style={styles.craftBtnText}>Craft!</Text>
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
                  No crafting recipes yet.
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    );

    return (
      <>
        <AppDrawer ref={drawerRef} title="Workbench" snapPoints={['88%']} scrollable>
          <View style={styles.tabRow}>
            {(['craft', 'journal'] as Tab[]).map((t) => (
              <Pressable
                key={t}
                style={[styles.chip, tab === t && styles.chipActive]}
                onPress={() => handleTabChange(t)}
              >
                <Ionicons
                  name={t === 'craft' ? 'construct-outline' : 'book-outline'}
                  size={20}
                  color={tab === t ? '#fff' : colors.textSecondary}
                />
                <Text style={[styles.chipText, tab === t && styles.chipTextActive]}>
                  {t === 'craft' ? 'Craft' : 'Recipe Journal'}
                </Text>
              </Pressable>
            ))}
          </View>
          {tab === 'craft' ? craftTab : journalTab}
        </AppDrawer>

        {showMiniGame && (
          <CraftingMiniGame
            difficulty={miniGameDifficulty}
            onComplete={handleMiniGameComplete}
            onCancel={handleMiniGameCancel}
          />
        )}
      </>
    );
  },
);
