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
  craftingDifficultyRelief,
} from '@/constants/skillPerks';
import type { ItemDefinition, InventorySlot, CraftResult, QuestHighlight } from './types';
import { CraftingMiniGame } from './CraftingMiniGame';
import { QuestHighlightGlow } from './shared/QuestHighlightGlow';
import { useDrawerHighlight } from './shared/useDrawerHighlight';

export interface CraftingDrawerRef {
  open: () => void;
  close: () => void;
}

interface CraftingDrawerProps {
  itemDefs: Record<string, ItemDefinition>;
  inventory: InventorySlot[];
  storage?: Record<string, number>;
  onCraft: (recipeId: string, minigamePassed: boolean) => void;
  onLearnRecipe: (itemType: string) => void;
  craftResult: CraftResult | null;
  learnRecipeResult: { recipeId: string; recipeLabel: string; recipeItemType: string } | null;
  onResultDismiss: () => void;
  onLearnResultDismiss: () => void;
  tryAutoAdvanceDialog?: (action: string, itemType?: string) => void;
  activeHighlight?: QuestHighlight | null;
  onOpenChange?: (open: boolean) => void;
}

type CraftTabKey = 'tools' | 'decorations' | 'other' | 'scrolls';

type LearnedRecipe = RecipeJournalEntry & { canCraft: boolean };

function recipeGroup(
  recipe: RecipeJournalEntry,
  itemDefs: Record<string, ItemDefinition>,
): Exclude<CraftTabKey, 'scrolls'> {
  const cat = itemDefs[recipe.resultItemType]?.category;
  if (cat === 'equip') return 'tools';
  if (
    cat === 'decoration' ||
    cat === 'building' ||
    cat === 'scenery' ||
    cat === 'flooring' ||
    cat === 'tiled_flooring'
  ) {
    return 'decorations';
  }
  return 'other';
}

const TAB_META: Record<
  CraftTabKey,
  { label: string; ionicon: keyof typeof Ionicons.glyphMap }
> = {
  tools: { label: 'Tools', ionicon: 'hammer-outline' },
  decorations: { label: 'Decor', ionicon: 'flower-outline' },
  other: { label: 'Other', ionicon: 'cube-outline' },
  scrolls: { label: 'Scrolls', ionicon: 'document-text-outline' },
};

export const CraftingDrawer = forwardRef<CraftingDrawerRef, CraftingDrawerProps>(
  function CraftingDrawer({
    itemDefs,
    inventory,
    storage = {},
    onCraft,
    onLearnRecipe,
    craftResult,
    learnRecipeResult,
    onResultDismiss,
    onLearnResultDismiss,
    tryAutoAdvanceDialog,
    activeHighlight = null,
    onOpenChange,
  }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const { theme } = useTheme();
    const { user } = useAuth();
    const colors = theme.colors;
    const craftingLevel = user?.skills?.crafting?.level ?? user?.pet?.skills?.crafting?.level ?? 0;
    const [craftMiniDifficulty, setCraftMiniDifficulty] = useState(1);

    const [showMiniGame, setShowMiniGame] = useState(false);
    const [pendingRecipe, setPendingRecipe] = useState<RecipeJournalEntry | null>(null);
    const [awaitingResult, setAwaitingResult] = useState(false);
    const [awaitingLearn, setAwaitingLearn] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [activeTab, setActiveTab] = useState<CraftTabKey>('tools');

    const { journal, fetchJournal, journalLoading } = useRecipeJournal('crafting');
    const { isItemHighlighted } = useDrawerHighlight({
      activeHighlight,
      highlightType: 'craft_item',
      tryAutoAdvanceDialog: tryAutoAdvanceDialog ?? (() => undefined),
    });

    // When a quest points at a craftable result, jump to its tab.
    useEffect(() => {
      if (activeHighlight?.type !== 'craft_item') return;
      const target = activeHighlight.target;
      const learned = journal.find((r) => r.owned && r.resultItemType === target);
      if (!learned) return;
      const g = recipeGroup(learned, itemDefs);
      setActiveTab(g);
    }, [activeHighlight, journal, itemDefs]);

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
      const tools: LearnedRecipe[] = [];
      const decorations: LearnedRecipe[] = [];
      const other: LearnedRecipe[] = [];
      for (const recipe of learnedRecipes) {
        const g = recipeGroup(recipe, itemDefs);
        if (g === 'tools') tools.push(recipe);
        else if (g === 'decorations') decorations.push(recipe);
        else other.push(recipe);
      }
      return { tools, decorations, other };
    }, [learnedRecipes, itemDefs]);

    const visibleTabs = useMemo(() => {
      const tabs: CraftTabKey[] = [];
      if (grouped.tools.length > 0) tabs.push('tools');
      if (grouped.decorations.length > 0) tabs.push('decorations');
      if (grouped.other.length > 0) tabs.push('other');
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
      if (activeTab === 'tools') return grouped.tools;
      if (activeTab === 'decorations') return grouped.decorations;
      return grouped.other;
    }, [activeTab, grouped]);

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
        fetchJournal();
        if (craftResult.matched && craftResult.resultItemType) {
          tryAutoAdvanceDialog?.('craft', craftResult.resultItemType);
        }
      }
    }, [craftResult, awaitingResult, resultOpacity, resultScale, fetchJournal, tryAutoAdvanceDialog]);

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
          drawerRef.current?.open();
        },
        close: () => drawerRef.current?.close(),
      }),
      [onResultDismiss, onLearnResultDismiss, fetchJournal],
    );

    const handleCraftPress = useCallback((recipe: RecipeJournalEntry) => {
      if (!recipe.canCraft) return;
      setPendingRecipe(recipe);
      setCraftMiniDifficulty(
        adjustMinigameDifficulty(
          recipe.difficulty,
          craftingDifficultyRelief(craftingLevel),
        ),
      );
      setShowMiniGame(true);
    }, [craftingLevel]);

    const handleLearnPress = useCallback((recipe: RecipeJournalEntry) => {
      if (!recipe.recipeItemType) return;
      setAwaitingLearn(true);
      onLearnRecipe(recipe.recipeItemType);
    }, [onLearnRecipe]);

    const handleMiniGameComplete = useCallback((passed: boolean) => {
      setShowMiniGame(false);
      if (!pendingRecipe) return;
      setAwaitingResult(true);
      onCraft(pendingRecipe.recipeId, passed);
      setPendingRecipe(null);
    }, [pendingRecipe, onCraft]);

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
          tabScroll: {
            flexGrow: 0,
            marginBottom: spacing.sm,
          },
          tabRow: {
            flexDirection: 'row',
            gap: 8,
            paddingRight: 4,
          },
          tabChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 16,
            backgroundColor: `${colors.text}08`,
          },
          tabChipActive: {
            backgroundColor: colors.primary,
          },
          tabChipText: {
            fontSize: 12,
            fontWeight: '700',
            color: colors.textSecondary,
          },
          tabChipTextActive: {
            color: '#fff',
          },
          tabCount: {
            fontSize: 11,
            fontWeight: '800',
            color: colors.textMuted,
            minWidth: 14,
            textAlign: 'center',
          },
          tabCountActive: {
            color: 'rgba(255,255,255,0.85)',
          },
          grid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
          },
          tile: {
            width: '48.5%',
            borderRadius: 12,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 8,
            gap: 6,
          },
          tileMuted: {
            opacity: 0.62,
          },
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
          matText: {
            fontSize: 10,
            fontWeight: '700',
            color: colors.text,
          },
          matTextMissing: {
            color: colors.textMuted,
          },
          actionBtn: {
            backgroundColor: colors.primary,
            borderRadius: 9,
            paddingVertical: 7,
            alignItems: 'center',
            marginTop: 2,
          },
          actionBtnDisabled: {
            backgroundColor: `${colors.text}14`,
          },
          actionBtnText: {
            fontSize: 12,
            fontWeight: '800',
            color: '#fff',
          },
          actionBtnTextDisabled: {
            color: colors.textMuted,
          },
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

    const resultView = showResult && craftResult ? (
      <View style={styles.resultOverlay}>
        <Animated.View style={resultAnimStyle}>
          <View style={{ alignItems: 'center' }}>
            <View
              style={[
                styles.resultImageBigWrap,
                craftResult.matched && { borderWidth: 2, borderColor: colors.primary },
              ]}
            >
              {itemDefs[craftResult.resultItemType]?.imageUrl ? (
                <CachedImage
                  source={{ uri: itemDefs[craftResult.resultItemType].imageUrl! }}
                  style={styles.resultImageBig}
                  resizeMode="contain"
                />
              ) : (
                <Ionicons
                  name={craftResult.matched ? 'construct' : 'help-circle'}
                  size={48}
                  color={colors.textMuted}
                />
              )}
            </View>
            <Text
              style={[
                styles.resultTitle,
                { color: craftResult.matched ? colors.primary : colors.textSecondary },
              ]}
            >
              {craftResult.matched
                ? (craftResult.recipeLabel ?? itemDefs[craftResult.resultItemType]?.label ?? 'Crafted')
                : 'Scrap'}
            </Text>
            <Text style={styles.resultSubtitle}>
              {craftResult.matched
                ? `×${craftResult.resultQty} added to inventory`
                : "The craft didn't hold together."}
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
      const highlighted = isItemHighlighted(recipe.resultItemType);
      return (
        <Animated.View
          key={recipe.recipeId}
          entering={FadeInDown.delay(Math.min(index, 8) * 30).duration(180)}
          style={[
            styles.tile,
            !canCraft && styles.tileMuted,
            highlighted && { borderColor: colors.primary, borderWidth: 2 },
          ]}
        >
          <QuestHighlightGlow active={highlighted} style={{ borderRadius: 12 }}>
            <View style={styles.tileImageWrap}>
              {resultDef?.imageUrl ? (
                <CachedImage
                  source={{ uri: resultDef.imageUrl }}
                  style={styles.tileImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={{ fontSize: 20 }}>{resultDef?.emoji ?? '📦'}</Text>
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
              onPress={() => handleCraftPress(recipe)}
              disabled={!canCraft}
            >
              <Text style={[styles.actionBtnText, !canCraft && styles.actionBtnTextDisabled]}>
                Craft
              </Text>
            </Pressable>
          </QuestHighlightGlow>
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
              {awaitingLearn ? 'Learning recipe...' : 'Crafting...'}
            </Text>
          </View>
        ) : journalLoading && journal.length === 0 ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : learnedRecipes.length === 0 && scrollsToLearn.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="document-text-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyText, { marginTop: 12 }]}>
              No recipes yet.{'\n'}
              Get a recipe scroll and learn it here.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.intro}>
              Craft with materials you have. Learn new recipes from scrolls.
            </Text>

            {visibleTabs.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tabScroll}
                contentContainerStyle={styles.tabRow}
              >
                {visibleTabs.map((key) => {
                  const meta = TAB_META[key];
                  const active = activeTab === key;
                  const count =
                    key === 'scrolls'
                      ? scrollsToLearn.length
                      : key === 'tools'
                        ? grouped.tools.length
                        : key === 'decorations'
                          ? grouped.decorations.length
                          : grouped.other.length;
                  return (
                    <Pressable
                      key={key}
                      style={[styles.tabChip, active && styles.tabChipActive]}
                      onPress={() => setActiveTab(key)}
                    >
                      <Ionicons
                        name={meta.ionicon}
                        size={14}
                        color={active ? '#fff' : colors.textSecondary}
                      />
                      <Text style={[styles.tabChipText, active && styles.tabChipTextActive]}>
                        {meta.label}
                      </Text>
                      <Text style={[styles.tabCount, active && styles.tabCountActive]}>
                        {count}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}

            {activeTab === 'scrolls' ? (
              <View style={styles.grid}>
                {scrollsToLearn.map((recipe, index) => renderScrollTile(recipe, index))}
              </View>
            ) : activeRecipes.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>Nothing in this tab yet.</Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {activeRecipes.map((recipe, index) => renderLearnedTile(recipe, index))}
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
          title="Workbench"
          snapPoints={['88%']}
          scrollable
          onChange={(index) => onOpenChange?.(index >= 0)}
        >
          {showResult && craftResult ? resultView : listView}
        </AppDrawer>

        {showMiniGame && pendingRecipe && (
          <CraftingMiniGame
            difficulty={craftMiniDifficulty}
            onComplete={handleMiniGameComplete}
            onCancel={handleMiniGameCancel}
          />
        )}
      </>
    );
  },
);
