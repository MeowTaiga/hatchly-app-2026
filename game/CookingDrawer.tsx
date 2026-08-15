/**
 * Cooking drawer — learn scrolls + cook learned recipes (mirrors CraftingDrawer).
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
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { CachedImage } from '@/components/ui/CachedImage';
import { useTheme } from '@/store/ThemeProvider';
import { useAuth } from '@/store/AuthProvider';
import { type RecipeJournalEntry } from '@/lib/api';
import { useRecipeJournal } from '@/hooks/useRecipeJournal';
import { spacing } from '@/constants/theme';
import {
  adjustMinigameDifficulty,
  cookingDifficultyRelief,
} from '@/constants/skillPerks';
import type { ItemDefinition, InventorySlot, CookResult } from './types';
import { CookingMiniGame } from './CookingMiniGame';

export interface CookingDrawerRef {
  open: () => void;
  close: () => void;
}

interface CookingDrawerProps {
  itemDefs: Record<string, ItemDefinition>;
  inventory: InventorySlot[];
  storage?: Record<string, number>;
  onCook: (recipeId: string, minigamePassed: boolean) => void;
  onLearnRecipe: (itemType: string) => void;
  cookResult: CookResult | null;
  learnRecipeResult: { recipeId: string; recipeLabel: string; recipeItemType: string } | null;
  onResultDismiss: () => void;
  onLearnResultDismiss: () => void;
  tryAutoAdvanceDialog?: (action: string, itemType?: string) => void;
  onOpenChange?: (open: boolean) => void;
}

type CookTabKey =
  | 'processing'
  | 'baking'
  | 'sandwich'
  | 'bakery'
  | 'salad'
  | 'soup'
  | 'dessert'
  | 'drink'
  | 'seafood'
  | 'other'
  | 'scrolls';

type LearnedRecipe = RecipeJournalEntry & { canCraft: boolean };

function recipeGroup(recipe: RecipeJournalEntry): Exclude<CookTabKey, 'scrolls'> {
  const g = (recipe as RecipeJournalEntry & { group?: string }).group;
  if (
    g === 'processing' ||
    g === 'baking' ||
    g === 'sandwich' ||
    g === 'bakery' ||
    g === 'salad' ||
    g === 'soup' ||
    g === 'dessert' ||
    g === 'drink' ||
    g === 'seafood'
  ) {
    return g;
  }
  return 'other';
}

const TAB_META: Record<
  CookTabKey,
  { label: string; ionicon: keyof typeof Ionicons.glyphMap }
> = {
  processing: { label: 'Prep', ionicon: 'cut-outline' },
  baking: { label: 'Bake', ionicon: 'flame-outline' },
  sandwich: { label: 'Sandwich', ionicon: 'restaurant-outline' },
  bakery: { label: 'Bakery', ionicon: 'cafe-outline' },
  salad: { label: 'Salad', ionicon: 'leaf-outline' },
  soup: { label: 'Soup', ionicon: 'beaker-outline' },
  dessert: { label: 'Dessert', ionicon: 'ice-cream-outline' },
  drink: { label: 'Drink', ionicon: 'wine-outline' },
  seafood: { label: 'Fish', ionicon: 'fish-outline' },
  other: { label: 'Other', ionicon: 'ellipse-outline' },
  scrolls: { label: 'Scrolls', ionicon: 'document-text-outline' },
};

export const CookingDrawer = forwardRef<CookingDrawerRef, CookingDrawerProps>(
  function CookingDrawer({
    itemDefs,
    inventory,
    storage = {},
    onCook,
    onLearnRecipe,
    cookResult,
    learnRecipeResult,
    onResultDismiss,
    onLearnResultDismiss,
    tryAutoAdvanceDialog,
    onOpenChange,
  }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const { theme } = useTheme();
    const { user } = useAuth();
    const colors = theme.colors;
    const cookingLevel = user?.skills?.cooking?.level ?? user?.pet?.skills?.cooking?.level ?? 0;
    const [cookMiniDifficulty, setCookMiniDifficulty] = useState(1);

    const [showMiniGame, setShowMiniGame] = useState(false);
    const [pendingRecipe, setPendingRecipe] = useState<RecipeJournalEntry | null>(null);
    const [awaitingResult, setAwaitingResult] = useState(false);
    const [awaitingLearn, setAwaitingLearn] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [activeTab, setActiveTab] = useState<CookTabKey>('processing');

    const { journal, fetchJournal, journalLoading } = useRecipeJournal('cooking');

    const invMap = useMemo(() => {
      const m = new Map<string, number>();
      for (const slot of inventory) m.set(slot.itemType, (m.get(slot.itemType) ?? 0) + slot.qty);
      for (const [itemType, qty] of Object.entries(storage)) {
        if (qty > 0) m.set(itemType, (m.get(itemType) ?? 0) + qty);
      }
      return m;
    }, [inventory, storage]);

    const scrollsToLearn = useMemo(() => {
      return journal
        .filter((r) => !r.owned && (r.hasScroll || (r.recipeItemType ? (invMap.get(r.recipeItemType) ?? 0) > 0 : false)))
        .sort((a, b) => a.label.localeCompare(b.label));
    }, [journal, invMap]);

    const learnedRecipes = useMemo((): LearnedRecipe[] => {
      return journal
        .filter((r) => r.owned)
        .map((r) => {
          const canCraft = r.ingredients.every(
            (ing) => (invMap.get(ing.itemType) ?? 0) >= ing.qty,
          );
          return { ...r, canCraft };
        })
        .sort((a, b) => {
          if (a.canCraft !== b.canCraft) return a.canCraft ? -1 : 1;
          return a.label.localeCompare(b.label);
        });
    }, [journal, invMap]);

    const grouped = useMemo(() => {
      const buckets: Record<Exclude<CookTabKey, 'scrolls'>, LearnedRecipe[]> = {
        processing: [],
        baking: [],
        sandwich: [],
        bakery: [],
        salad: [],
        soup: [],
        dessert: [],
        drink: [],
        seafood: [],
        other: [],
      };
      for (const recipe of learnedRecipes) {
        buckets[recipeGroup(recipe)].push(recipe);
      }
      return buckets;
    }, [learnedRecipes]);

    const visibleTabs = useMemo(() => {
      const tabs: CookTabKey[] = [];
      (Object.keys(grouped) as Exclude<CookTabKey, 'scrolls'>[]).forEach((key) => {
        if (grouped[key].length > 0) tabs.push(key);
      });
      if (scrollsToLearn.length > 0) tabs.push('scrolls');
      return tabs;
    }, [grouped, scrollsToLearn.length]);

    useEffect(() => {
      if (visibleTabs.length === 0) return;
      if (!visibleTabs.includes(activeTab)) {
        setActiveTab(visibleTabs[0]);
      }
    }, [visibleTabs, activeTab]);

    const activeRecipes = useMemo(() => {
      if (activeTab === 'scrolls') return [];
      return grouped[activeTab] ?? [];
    }, [activeTab, grouped]);

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
        fetchJournal();
        if (cookResult.matched && cookResult.resultItemType) {
          tryAutoAdvanceDialog?.('cook', cookResult.resultItemType);
        }
      }
    }, [cookResult, awaitingResult, resultOpacity, resultScale, fetchJournal, tryAutoAdvanceDialog]);

    useEffect(() => {
      if (!learnRecipeResult) return;
      if (awaitingLearn) {
        setAwaitingLearn(false);
        fetchJournal();
      }
      onLearnResultDismiss();
    }, [learnRecipeResult, awaitingLearn, fetchJournal, onLearnResultDismiss]);

    const resultAnimStyle = useAnimatedStyle(() => ({
      opacity: resultOpacity.value,
      transform: [{ scale: resultScale.value }],
    }));

    useImperativeHandle(
      ref,
      () => ({
        open: () => {
          setPendingRecipe(null);
          setShowResult(false);
          setAwaitingResult(false);
          setAwaitingLearn(false);
          onResultDismiss();
          onLearnResultDismiss();
          fetchJournal();
          onOpenChange?.(true);
          drawerRef.current?.open();
        },
        close: () => {
          onOpenChange?.(false);
          drawerRef.current?.close();
        },
      }),
      [onResultDismiss, onLearnResultDismiss, fetchJournal, onOpenChange],
    );

    const handleCookPress = useCallback((recipe: RecipeJournalEntry) => {
      const can = recipe.ingredients.every(
        (ing) => (invMap.get(ing.itemType) ?? 0) >= ing.qty,
      );
      if (!can) return;
      setPendingRecipe(recipe);
      setCookMiniDifficulty(
        adjustMinigameDifficulty(
          recipe.difficulty,
          cookingDifficultyRelief(cookingLevel),
        ),
      );
      setShowMiniGame(true);
    }, [cookingLevel, invMap]);

    const handleLearnPress = useCallback((recipe: RecipeJournalEntry) => {
      if (!recipe.recipeItemType) return;
      setAwaitingLearn(true);
      onLearnRecipe(recipe.recipeItemType);
    }, [onLearnRecipe]);

    const handleMiniGameComplete = useCallback((passed: boolean) => {
      setShowMiniGame(false);
      if (!pendingRecipe) return;
      setAwaitingResult(true);
      onCook(pendingRecipe.recipeId, passed);
      setPendingRecipe(null);
    }, [pendingRecipe, onCook]);

    const handleMiniGameCancel = useCallback(() => {
      setShowMiniGame(false);
      setPendingRecipe(null);
    }, []);

    const handleDismissResult = useCallback(() => {
      setShowResult(false);
      resultScale.value = 0;
      resultOpacity.value = 0;
      onResultDismiss();
    }, [onResultDismiss, resultScale, resultOpacity]);

    const styles = useMemo(
      () =>
        StyleSheet.create({
          intro: {
            fontSize: 12,
            lineHeight: 17,
            color: colors.textSecondary,
            marginBottom: spacing.sm,
          },
          tabScroll: { flexGrow: 0, marginBottom: spacing.sm },
          tabRow: { flexDirection: 'row', gap: 8, paddingRight: 4 },
          tabChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 16,
            backgroundColor: `${colors.text}08`,
          },
          tabChipActive: { backgroundColor: colors.primary },
          tabChipText: {
            fontSize: 12,
            fontWeight: '700',
            color: colors.textSecondary,
          },
          tabChipTextActive: { color: '#fff' },
          tabCount: {
            fontSize: 11,
            fontWeight: '800',
            color: colors.textMuted,
            minWidth: 14,
            textAlign: 'center',
          },
          tabCountActive: { color: 'rgba(255,255,255,0.85)' },
          grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
          tile: {
            width: '48.5%',
            borderRadius: 12,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 8,
            gap: 6,
          },
          tileMuted: { opacity: 0.62 },
          tileImageWrap: {
            alignSelf: 'center',
            width: 44,
            height: 44,
            borderRadius: 10,
            backgroundColor: `${colors.text}08`,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          },
          tileImage: { width: 34, height: 34 },
          tileLabel: {
            fontSize: 12,
            fontWeight: '800',
            color: colors.text,
            textAlign: 'center',
            minHeight: 30,
          },
          matsRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 4,
          },
          matChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
            paddingVertical: 2,
            paddingHorizontal: 5,
            borderRadius: 8,
            backgroundColor: `${colors.primary}12`,
          },
          matChipMissing: {
            backgroundColor: `${colors.text}08`,
            opacity: 0.7,
          },
          matImage: { width: 14, height: 14 },
          matText: { fontSize: 10, fontWeight: '700', color: colors.text },
          matTextMissing: { color: colors.textMuted },
          actionBtn: {
            backgroundColor: colors.primary,
            borderRadius: 9,
            paddingVertical: 7,
            alignItems: 'center',
            marginTop: 2,
          },
          actionBtnDisabled: { backgroundColor: `${colors.text}14` },
          actionBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
          actionBtnTextDisabled: { color: colors.textMuted },
          emptyWrap: { paddingVertical: 48, alignItems: 'center', paddingHorizontal: 12 },
          emptyText: {
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 20,
          },
          resultOverlay: {
            alignItems: 'center',
            paddingVertical: 32,
            paddingHorizontal: 24,
          },
          resultImageBigWrap: {
            width: 100,
            height: 100,
            borderRadius: 20,
            backgroundColor: colors.border + '30',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            marginBottom: 16,
          },
          resultImageBig: { width: 80, height: 80 },
          resultTitle: {
            fontSize: 22,
            fontWeight: '900',
            textAlign: 'center',
            marginBottom: 4,
          },
          resultSubtitle: {
            fontSize: 15,
            fontWeight: '600',
            color: colors.textSecondary,
            textAlign: 'center',
            marginBottom: 20,
          },
          resultDismissBtn: {
            backgroundColor: colors.primary,
            borderRadius: 14,
            paddingVertical: 14,
            paddingHorizontal: 48,
            alignItems: 'center',
          },
          resultDismissText: { fontSize: 16, fontWeight: '800', color: '#fff' },
        }),
      [colors],
    );

    const resultView = showResult && cookResult ? (
      <View style={styles.resultOverlay}>
        <Animated.View style={resultAnimStyle}>
          <View style={{ alignItems: 'center' }}>
            <View
              style={[
                styles.resultImageBigWrap,
                cookResult.matched && { borderWidth: 2, borderColor: colors.primary },
              ]}
            >
              {itemDefs[cookResult.resultItemType]?.imageUrl ? (
                <CachedImage
                  source={{ uri: itemDefs[cookResult.resultItemType].imageUrl! }}
                  style={styles.resultImageBig}
                  resizeMode="contain"
                />
              ) : (
                <Ionicons
                  name={cookResult.matched ? 'restaurant' : 'help-circle'}
                  size={48}
                  color={colors.textMuted}
                />
              )}
            </View>
            <Text
              style={[
                styles.resultTitle,
                { color: cookResult.matched ? colors.primary : colors.textSecondary },
              ]}
            >
              {cookResult.matched
                ? (cookResult.recipeLabel ?? itemDefs[cookResult.resultItemType]?.label ?? 'Cooked')
                : 'Strange Stew'}
            </Text>
            <Text style={styles.resultSubtitle}>
              {cookResult.matched
                ? `×${cookResult.resultQty} added to inventory`
                : 'The pot bubbled strangely…'}
            </Text>
            <Pressable style={styles.resultDismissBtn} onPress={handleDismissResult}>
              <Text style={styles.resultDismissText}>Continue</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    ) : null;

    const renderLearnedTile = (recipe: LearnedRecipe, index: number) => {
      const resultDef = itemDefs[recipe.resultItemType];
      const canCraft = !!recipe.canCraft;
      return (
        <Animated.View
          key={recipe.recipeId}
          entering={FadeInDown.delay(Math.min(index, 8) * 30).duration(180)}
          style={[styles.tile, !canCraft && styles.tileMuted]}
        >
          <View style={styles.tileImageWrap}>
            {resultDef?.imageUrl ? (
              <CachedImage
                source={{ uri: resultDef.imageUrl }}
                style={styles.tileImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={{ fontSize: 20 }}>{resultDef?.emoji ?? '🍽️'}</Text>
            )}
          </View>
          <Text style={styles.tileLabel} numberOfLines={2}>
            {recipe.label}
          </Text>
          <View style={styles.matsRow}>
            {recipe.ingredients.map((ing) => {
              const def = itemDefs[ing.itemType];
              const have = invMap.get(ing.itemType) ?? 0;
              const missing = have < ing.qty;
              return (
                <View
                  key={`${recipe.recipeId}-${ing.itemType}`}
                  style={[styles.matChip, missing && styles.matChipMissing]}
                >
                  {def?.imageUrl ? (
                    <CachedImage
                      source={{ uri: def.imageUrl }}
                      style={styles.matImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={{ fontSize: 10 }}>{def?.emoji ?? '?'}</Text>
                  )}
                  <Text style={[styles.matText, missing && styles.matTextMissing]}>
                    {have}/{ing.qty}
                  </Text>
                </View>
              );
            })}
          </View>
          <Pressable
            style={[styles.actionBtn, !canCraft && styles.actionBtnDisabled]}
            onPress={() => handleCookPress(recipe)}
            disabled={!canCraft}
          >
            <Text style={[styles.actionBtnText, !canCraft && styles.actionBtnTextDisabled]}>
              Cook
            </Text>
          </Pressable>
        </Animated.View>
      );
    };

    const renderScrollTile = (recipe: RecipeJournalEntry, index: number) => {
      const scrollDef = recipe.recipeItemType ? itemDefs[recipe.recipeItemType] : undefined;
      const resultDef = itemDefs[recipe.resultItemType];
      return (
        <Animated.View
          key={`learn-${recipe.recipeId}`}
          entering={FadeInDown.delay(Math.min(index, 8) * 30).duration(180)}
          style={styles.tile}
        >
          <View style={styles.tileImageWrap}>
            {scrollDef?.imageUrl || resultDef?.imageUrl ? (
              <CachedImage
                source={{ uri: (scrollDef?.imageUrl || resultDef?.imageUrl)! }}
                style={styles.tileImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={{ fontSize: 20 }}>📜</Text>
            )}
          </View>
          <Text style={styles.tileLabel} numberOfLines={2}>
            {recipe.label}
          </Text>
          <Text style={[styles.matText, { textAlign: 'center', color: colors.textMuted }]}>
            Consume scroll
          </Text>
          <Pressable style={styles.actionBtn} onPress={() => handleLearnPress(recipe)}>
            <Text style={styles.actionBtnText}>Learn</Text>
          </Pressable>
        </Animated.View>
      );
    };

    const listView = (
      <View style={{ paddingBottom: spacing.xl * 2 }}>
        {awaitingResult || awaitingLearn ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.emptyText, { marginTop: 12 }]}>
              {awaitingLearn ? 'Learning recipe...' : 'Cooking...'}
            </Text>
          </View>
        ) : journalLoading && journal.length === 0 ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : visibleTabs.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              Find cooking recipe scrolls from quests and the shop, then learn them here.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.intro}>
              Learn recipe scrolls, then cook dishes you know. Only learned recipes work.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabScroll}
              contentContainerStyle={styles.tabRow}
            >
              {visibleTabs.map((tab) => {
                const meta = TAB_META[tab];
                const active = activeTab === tab;
                const count =
                  tab === 'scrolls' ? scrollsToLearn.length : (grouped[tab]?.length ?? 0);
                return (
                  <Pressable
                    key={tab}
                    style={[styles.tabChip, active && styles.tabChipActive]}
                    onPress={() => setActiveTab(tab)}
                  >
                    <Ionicons
                      name={meta.ionicon}
                      size={14}
                      color={active ? '#fff' : colors.textSecondary}
                    />
                    <Text style={[styles.tabChipText, active && styles.tabChipTextActive]}>
                      {meta.label}
                    </Text>
                    <Text style={[styles.tabCount, active && styles.tabCountActive]}>{count}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.grid}>
              {activeTab === 'scrolls'
                ? scrollsToLearn.map((r, i) => renderScrollTile(r, i))
                : activeRecipes.map((r, i) => renderLearnedTile(r, i))}
            </View>
          </>
        )}
      </View>
    );

    return (
      <>
        <AppDrawer ref={drawerRef} title="Cooking Pot" snapPoints={['78%']} scrollable>
          {resultView ?? listView}
        </AppDrawer>
        {showMiniGame && pendingRecipe && (
          <CookingMiniGame
            difficulty={cookMiniDifficulty}
            onComplete={handleMiniGameComplete}
            onCancel={handleMiniGameCancel}
          />
        )}
      </>
    );
  },
);
