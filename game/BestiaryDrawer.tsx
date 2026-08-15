/**
 * Museum drawer — bugs, fish, discoverables, and a quest journal.
 *
 * Collection tabs show caught items only (no mystery ??? cards), sorted by
 * rarity. Progress counts live on each tab page hero, not on the chips.
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
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { CachedImage } from '@/components/ui/CachedImage';
import { GemIcon } from '@/components/ui/GemIcon';
import { useTheme } from '@/store/ThemeProvider';
import { api, type CollectionCatalogEntry, type CollectionEntry, type CollectionSetProgress, type QuestJournalEntry } from '@/lib/api';
import { spacing } from '@/constants/theme';
import { useGame } from './GameProvider';
import type { ItemDefinition, QuestProgress, QuestReward, RequirementClause } from './types';

type MuseumTab = 'bug' | 'fish' | 'discoverables' | 'quests';
type CollectionTab = 'bug' | 'fish' | 'discoverables';

type SelectedQuestDetail =
  | { kind: 'active'; quest: QuestProgress }
  | { kind: 'completed'; quest: QuestJournalEntry };

const EMPTY_TAB_STATS: Record<CollectionTab, { caught: number; total: number }> = {
  bug: { caught: 0, total: 0 },
  fish: { caught: 0, total: 0 },
  discoverables: { caught: 0, total: 0 },
};

const TABS: { key: MuseumTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'quests', label: 'Quests', icon: 'sparkles-outline' },
  { key: 'bug', label: 'Bugs', icon: 'bug-outline' },
  { key: 'fish', label: 'Fish', icon: 'fish-outline' },
  { key: 'discoverables', label: 'Finds', icon: 'diamond-outline' },
];

const GRID_COLUMNS = 4;

const RARITY_RANK: Record<string, number> = {
  mythic: 6,
  legendary: 5,
  unique: 4,
  epic: 3,
  rare: 2,
  common: 1,
};

const RARITY_ACCENT: Record<string, string> = {
  mythic: '#F472B6',
  legendary: '#F59E0B',
  unique: '#A78BFA',
  epic: '#A855F7',
  rare: '#38BDF8',
  common: '#94A3B8',
};

const COLLECTION_META: Record<CollectionTab, {
  emoji: string;
  kicker: string;
  titleEmpty: string;
  titleFilled: string;
  bodyEmpty: string;
  bodyFilled: string;
  accent: string;
}> = {
  bug: {
    emoji: '🐛',
    kicker: 'Bug collection',
    titleEmpty: 'Critters await',
    titleFilled: 'Your bug shelf',
    bodyEmpty: 'Catch bugs around the farm and they will fill this shelf, rarest first.',
    bodyFilled: 'Tap a critter for catch times, how often you found it, and your best size.',
    accent: '#34D399',
  },
  fish: {
    emoji: '🐟',
    kicker: 'Fish collection',
    titleEmpty: 'Waters are quiet',
    titleFilled: 'Your catch log',
    bodyEmpty: 'Reel something in and it will land here — bigger rarities float to the top.',
    bodyFilled: 'Tap a fish for bite times, your best catch, and when you last landed it.',
    accent: '#38BDF8',
  },
  discoverables: {
    emoji: '💎',
    kicker: 'Special finds',
    titleEmpty: 'Treasures buried',
    titleFilled: 'Your dig shelf',
    bodyEmpty: 'Fossils and special finds you dig up will stack here as you explore.',
    bodyFilled: 'Tap a find to see how often you uncovered it and when you last did.',
    accent: '#F59E0B',
  },
};

const QUEST_TYPE_META: Record<string, { emoji: string; label: string; accent: string }> = {
  farm_upgrade: { emoji: '🌾', label: 'Farm upgrade', accent: '#F59E0B' },
  story: { emoji: '📖', label: 'Story', accent: '#A855F7' },
  npc: { emoji: '💬', label: 'Friend', accent: '#38BDF8' },
  tutorial: { emoji: '✨', label: 'Tutorial', accent: '#34D399' },
};

const SET_ACCENT: Record<string, string> = {
  fish_pond: '#5B8C5A',
  fish_river: '#3B82A0',
  fish_lake: '#4A7C9B',
  fish_ocean: '#2563A8',
  fish_reef: '#0D9488',
  fish_ghost: '#7C3AED',
  fish_celestial: '#C026D3',
  fish_ancient: '#B45309',
  fish_royal: '#CA8A04',
  bug_flower: '#F472B6',
  bug_forest: '#16A34A',
  bug_grass: '#84CC16',
  bug_pond: '#38BDF8',
  bug_rock: '#94A3B8',
  bug_haunt: '#A78BFA',
  bug_open: '#34D399',
  bug_meadow_set: '#FBBF24',
  bug_garden_set: '#FB7185',
  bug_forest_set: '#15803D',
  bug_pond_set: '#0EA5E9',
  bug_night_set: '#6366F1',
  bug_spider_set: '#78716C',
  bug_royal_set: '#CA8A04',
  bug_celestial_set: '#C026D3',
  bug_haunted_set: '#7C3AED',
  // Legacy accents
  bug_crop: '#84CC16',
  bug_tree: '#16A34A',
  bug_light: '#FBBF24',
  bug_anywhere: '#34D399',
};

export interface BestiaryDrawerRef {
  open: () => void;
  close: () => void;
}

interface BestiaryDrawerProps {
  itemDefs: Record<string, ItemDefinition>;
}

function formatRarity(rarity?: string): string {
  if (!rarity || rarity === 'common') return 'Common';
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/** Friendly copy for fish/bug active windows shown on museum detail. */
function formatActiveTimeBlurb(
  activeTime: string | undefined,
  kind: 'fish' | 'bug',
): string | null {
  const verb = kind === 'fish' ? 'bite' : 'be found';
  switch (activeTime) {
    case 'morning':
      return `Can ${verb} in the morning hours`;
    case 'afternoon':
      return `Can ${verb} in the afternoon hours`;
    case 'night':
      return kind === 'fish'
        ? 'Can bite during the night'
        : 'Can be found during the night';
    case 'all_day':
      return kind === 'fish'
        ? 'Can bite any time of day'
        : 'Can be found any time of day';
    default:
      return null;
  }
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

function rarityOf(def: ItemDefinition, tab: MuseumTab): string {
  if (tab === 'fish') return def.fishRarity ?? 'common';
  if (tab === 'bug') return def.bugRarity ?? 'common';
  return def.bugRarity ?? def.fishRarity ?? 'common';
}

function questMeta(type: string) {
  return QUEST_TYPE_META[type] ?? { emoji: '⭐', label: 'Adventure', accent: '#F59E0B' };
}

function clauseProgressLabel(quest: QuestProgress): string {
  const clauses = quest.clauses ?? [];
  if (clauses.length === 0) return quest.description;
  const met = clauses.filter((c) => c.met).length;
  return `${met}/${clauses.length} steps · ${quest.description}`;
}

function speakerLabel(speaker?: 'pet' | 'npc'): string {
  return speaker === 'npc' ? 'Neighbour' : 'Your pet';
}

export const BestiaryDrawer = forwardRef<BestiaryDrawerRef, BestiaryDrawerProps>(
  function BestiaryDrawer({ itemDefs }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const colors = theme.colors;
    const { quests } = useGame();
    const activeQuests = useMemo(
      () => (quests ?? []).filter((q) => q.status === 'active'),
      [quests],
    );

    const [activeTab, setActiveTab] = useState<MuseumTab>('quests');
    const [collection, setCollection] = useState<CollectionEntry[]>([]);
    /** Server catalog for the active collection tab (loot table / item defs). */
    const [catalog, setCatalog] = useState<CollectionCatalogEntry[]>([]);
    const [questJournal, setQuestJournal] = useState<QuestJournalEntry[]>([]);
    const [collectionSets, setCollectionSets] = useState<CollectionSetProgress[]>([]);
    const [selectedSet, setSelectedSet] = useState<CollectionSetProgress | null>(null);
    const [tabStats, setTabStats] = useState(EMPTY_TAB_STATS);
    const [loading, setLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState<{
      def: ItemDefinition;
      entry: CollectionEntry;
    } | null>(null);
    const [selectedQuest, setSelectedQuest] = useState<SelectedQuestDetail | null>(null);

    const applyCollection = useCallback((tab: CollectionTab, items: CollectionEntry[], nextCatalog: CollectionCatalogEntry[]) => {
      setCollection(items);
      setCatalog(nextCatalog);
      setTabStats((prev) => ({
        ...prev,
        [tab]: {
          caught: items.length,
          // Prefer the server catalog. Fall back to caught count if an old
          // server omitted it, so we never show x/0.
          total: Math.max(nextCatalog.length, items.length),
        },
      }));
    }, []);

    const loadTab = useCallback(async (tab: MuseumTab) => {
      setLoading(true);
      try {
        if (tab === 'quests') {
          const data = await api.getQuestJournal();
          setQuestJournal(data.quests ?? []);
          setCollectionSets([]);
        } else {
          const data = await api.getCollection(tab);
          applyCollection(tab, data.items, data.catalog);
          if (tab === 'fish' || tab === 'bug') {
            try {
              const setsData = await api.getCollectionSets(tab);
              // Hide empty defs (0/0) and sets the player hasn't started (0/N).
              setCollectionSets(
                (setsData.sets ?? []).filter((s) => s.total > 0 && s.caught > 0),
              );
            } catch {
              setCollectionSets([]);
            }
          } else {
            setCollectionSets([]);
          }
        }
      } catch {
        if (tab === 'quests') setQuestJournal([]);
        else {
          setCollection([]);
          setCatalog([]);
          setCollectionSets([]);
        }
      } finally {
        setLoading(false);
      }
    }, [applyCollection]);

    const prefetchCounts = useCallback(async () => {
      try {
        const [bugs, fish, finds] = await Promise.all([
          api.getCollection('bug'),
          api.getCollection('fish'),
          api.getCollection('discoverables'),
        ]);
        setTabStats({
          bug: { caught: bugs.items.length, total: Math.max(bugs.catalog.length, bugs.items.length) },
          fish: { caught: fish.items.length, total: Math.max(fish.catalog.length, fish.items.length) },
          discoverables: {
            caught: finds.items.length,
            total: Math.max(finds.catalog.length, finds.items.length),
          },
        });
      } catch {
        // Counts stay at zero until each tab is opened.
      }
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        open: () => {
          setLoading(true);
          setCollection([]);
          setCatalog([]);
          setQuestJournal([]);
          setCollectionSets([]);
          setSelectedSet(null);
          setSelectedItem(null);
          setSelectedQuest(null);
          setActiveTab('quests');
          setTabStats(EMPTY_TAB_STATS);
          drawerRef.current?.open();
          prefetchCounts();
          loadTab('quests');
        },
        close: () => drawerRef.current?.close(),
      }),
      [loadTab, prefetchCounts],
    );

    const handleTabChange = useCallback(
      (tab: MuseumTab) => {
        setActiveTab(tab);
        setSelectedItem(null);
        setSelectedQuest(null);
        setSelectedSet(null);
        loadTab(tab);
      },
      [loadTab],
    );

    const catalogRarity = useMemo(() => {
      const m = new Map<string, string>();
      for (const entry of catalog) m.set(entry.itemType, entry.rarity);
      return m;
    }, [catalog]);

    /** Caught items only, ordered by the server catalog rarity when available. */
    const caughtSorted = useMemo(() => {
      if (activeTab === 'quests') return [];
      return collection
        .map((entry) => {
          const def = itemDefs[entry.itemType];
          if (!def) return null;
          const rarity = catalogRarity.get(entry.itemType) ?? rarityOf(def, activeTab);
          return { def, entry, rarity };
        })
        .filter((row): row is { def: ItemDefinition; entry: CollectionEntry; rarity: string } => !!row)
        .sort((a, b) => {
          const rankDiff = (RARITY_RANK[b.rarity] ?? 0) - (RARITY_RANK[a.rarity] ?? 0);
          if (rankDiff !== 0) return rankDiff;
          return a.def.label.localeCompare(b.def.label);
        });
    }, [activeTab, collection, itemDefs, catalogRarity]);

    const setCaughtSorted = useMemo(() => {
      if (!selectedSet?.itemTypes?.length) return [];
      const membership = new Set(selectedSet.itemTypes);
      return caughtSorted.filter((row) => membership.has(row.def.itemType));
    }, [selectedSet, caughtSorted]);

    const gap = 10;
    const horizontalPadding = spacing.xl * 2;
    const availableWidth = width - horizontalPadding;
    const cardSize = Math.floor((availableWidth - gap * (GRID_COLUMNS - 1)) / GRID_COLUMNS);

    const cardShadow = useMemo(
      () =>
        Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
          },
          android: { elevation: 2 },
        }) as object,
      [],
    );

    const styles = useMemo(
      () =>
        StyleSheet.create({
          chipScroll: { marginBottom: spacing.md, flexGrow: 0 },
          chipRow: { flexDirection: 'row', gap: 8, paddingRight: 4 },
          chip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 20,
            backgroundColor: colors.border + '80',
          },
          chipActive: { backgroundColor: colors.primary },
          chipText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
          chipTextActive: { color: colors.onPrimary ?? '#fff' },

          hero: {
            borderRadius: 22,
            padding: 16,
            marginBottom: 14,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
            ...cardShadow,
          },
          heroGlow: {
            position: 'absolute',
            width: 140,
            height: 140,
            borderRadius: 70,
            right: -40,
            top: -50,
          },
          heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
          heroBadge: {
            width: 52,
            height: 52,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
          },
          heroBadgeEmoji: { fontSize: 26 },
          heroCopy: { flex: 1 },
          heroKicker: {
            fontSize: 10,
            fontWeight: '900',
            letterSpacing: 1.1,
            textTransform: 'uppercase',
          },
          heroTitle: {
            fontSize: 22,
            fontWeight: '900',
            color: colors.text,
            marginTop: 2,
          },
          heroBody: {
            fontSize: 13,
            lineHeight: 18,
            color: colors.textSecondary,
            marginTop: 8,
          },
          progressBlock: { marginTop: 14 },
          progressHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 7,
          },
          progressLabel: { fontSize: 12, fontWeight: '800', color: colors.textSecondary },
          progressValue: { fontSize: 12, fontWeight: '900', color: colors.text },
          progressTrack: {
            height: 8,
            borderRadius: 4,
            backgroundColor: `${colors.text}12`,
            overflow: 'hidden',
          },
          progressFill: { height: '100%', borderRadius: 4 },

          setsBlock: { marginTop: spacing.xl, gap: 10 },
          setsHeading: {
            fontSize: 10,
            fontWeight: '900',
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: colors.textMuted,
            marginBottom: 2,
          },
          setsSubhead: {
            fontSize: 13,
            lineHeight: 18,
            color: colors.textSecondary,
            marginBottom: 6,
          },
          setCard: {
            borderRadius: 16,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 14,
            paddingVertical: 12,
            gap: 10,
            ...cardShadow,
          },
          setCardTop: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          },
          setBadge: {
            width: 44,
            height: 44,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
          },
          setEmoji: { fontSize: 22 },
          setCopy: { flex: 1, minWidth: 0 },
          setLabel: { fontSize: 15, fontWeight: '800', color: colors.text },
          setDesc: {
            fontSize: 12,
            fontWeight: '600',
            color: colors.textMuted,
            marginTop: 2,
          },
          setMetaCol: { alignItems: 'flex-end', gap: 4 },
          setCount: { fontSize: 12, fontWeight: '800', color: colors.textSecondary },
          setCompleteBadge: {
            fontSize: 10,
            fontWeight: '900',
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            color: '#059669',
          },
          setTrack: {
            height: 6,
            borderRadius: 4,
            backgroundColor: `${colors.text}12`,
            overflow: 'hidden',
          },
          setFill: { height: '100%', borderRadius: 4 },

          grid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap,
          },
          card: {
            width: cardSize,
            borderRadius: 16,
            backgroundColor: colors.surface,
            borderWidth: 1.5,
            padding: 8,
            alignItems: 'center',
            ...cardShadow,
          },
          cardImageWrap: {
            width: cardSize - 18,
            height: cardSize - 18,
            borderRadius: 12,
            backgroundColor: `${colors.text}08`,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            marginBottom: 6,
          },
          cardImage: { width: '88%', height: '88%' },
          cardEmoji: { fontSize: 28 },
          cardLabel: {
            fontSize: 10,
            fontWeight: '800',
            color: colors.text,
            textAlign: 'center',
          },
          cardRarity: {
            fontSize: 9,
            fontWeight: '800',
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            marginTop: 2,
          },

          emptyWrap: { paddingVertical: 36, alignItems: 'center', paddingHorizontal: 12 },
          emptyEmoji: { fontSize: 36, marginBottom: 10 },
          emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 6 },
          emptyText: {
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 20,
          },

          detailBack: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: spacing.md,
            paddingVertical: 8,
          },
          detailBackText: { fontSize: 16, fontWeight: '700', color: colors.primary },

          statsLabel: {
            fontSize: 10,
            fontWeight: '900',
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: colors.textMuted,
            marginTop: 4,
            marginBottom: 8,
          },
          statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
          statChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 14,
            backgroundColor: `${colors.primary}12`,
            borderWidth: 1,
            borderColor: `${colors.primary}22`,
            minWidth: '46%',
            flexGrow: 1,
          },
          statChipLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
          statChipValue: { fontSize: 14, fontWeight: '900', color: colors.text, marginTop: 1 },

          listCard: {
            borderRadius: 18,
            padding: 14,
            marginBottom: 10,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            ...cardShadow,
          },
          listCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
          listBadge: {
            width: 44,
            height: 44,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
          },
          listBadgeEmoji: { fontSize: 22 },
          listCopy: { flex: 1 },
          listType: {
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            color: colors.textMuted,
          },
          listTitle: {
            fontSize: 15,
            fontWeight: '800',
            color: colors.text,
            marginTop: 2,
          },
          listDate: {
            fontSize: 12,
            fontWeight: '600',
            color: colors.textMuted,
            marginTop: 2,
          },
          rewardChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 10,
            paddingVertical: 7,
            borderRadius: 12,
            backgroundColor: `${colors.primary}12`,
            borderWidth: 1,
            borderColor: `${colors.primary}22`,
          },
          rewardText: { fontSize: 12, fontWeight: '800', color: colors.text },
          detailDesc: {
            fontSize: 14,
            lineHeight: 20,
            color: colors.textSecondary,
            marginTop: 10,
          },
          stepRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 14,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 8,
          },
          stepCheck: {
            width: 22,
            height: 22,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 1,
          },
          stepLabel: {
            flex: 1,
            fontSize: 14,
            fontWeight: '700',
            color: colors.text,
            lineHeight: 20,
          },
          stepCount: {
            fontSize: 12,
            fontWeight: '800',
            color: colors.textMuted,
            marginTop: 2,
          },
          dialogBlock: {
            borderRadius: 16,
            padding: 14,
            marginBottom: 10,
            backgroundColor: `${colors.primary}10`,
            borderWidth: 1,
            borderColor: `${colors.primary}22`,
          },
          dialogSpeaker: {
            fontSize: 10,
            fontWeight: '900',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            color: colors.primary,
            marginBottom: 6,
          },
          dialogLine: {
            fontSize: 14,
            lineHeight: 20,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 6,
          },
        }),
      [colors, cardSize, gap, cardShadow],
    );

    const drawerTitle = selectedItem
      ? selectedItem.def.label
      : selectedSet
        ? selectedSet.label
        : selectedQuest
          ? selectedQuest.quest.title
          : 'Museum';

    const collectionTab = activeTab === 'quests' ? null : activeTab;
    const collectionMeta = collectionTab ? COLLECTION_META[collectionTab] : null;
    const stats = collectionTab ? tabStats[collectionTab] : null;
    const progressPct = stats && stats.total > 0
      ? Math.min(100, Math.round((stats.caught / stats.total) * 100))
      : 0;

    const renderFishCard = (
      def: ItemDefinition,
      entry: CollectionEntry,
      rarity: string,
      index: number,
    ) => {
      const accent = RARITY_ACCENT[rarity] ?? colors.primary;
      return (
        <Animated.View
          key={def.itemType}
          entering={FadeInDown.delay(Math.min(index, 8) * 30).duration(220)}
        >
          <Pressable
            style={[styles.card, { borderColor: `${accent}66` }]}
            onPress={() => setSelectedItem({ def, entry })}
          >
            <View style={styles.cardImageWrap}>
              {def.imageUrl ? (
                <CachedImage
                  source={{ uri: def.imageUrl }}
                  style={styles.cardImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.cardEmoji}>{def.emoji || '📦'}</Text>
              )}
            </View>
            <Text style={styles.cardLabel} numberOfLines={1}>
              {def.label}
            </Text>
            <Text style={[styles.cardRarity, { color: accent }]}>
              {formatRarity(rarity)}
            </Text>
          </Pressable>
        </Animated.View>
      );
    };

    // ── Detail: collection item ────────────────────────────────────────────
    if (selectedItem && collectionMeta) {
      const rarity = catalogRarity.get(selectedItem.def.itemType)
        ?? rarityOf(selectedItem.def, activeTab);
      const accent = RARITY_ACCENT[rarity] ?? colors.primary;
      const backLabel = selectedSet?.label
        ?? TABS.find((t) => t.key === activeTab)?.label
        ?? 'Museum';
      const activeTimeBlurb =
        activeTab === 'fish'
          ? formatActiveTimeBlurb(selectedItem.def.fishActiveTime, 'fish')
          : activeTab === 'bug'
            ? formatActiveTimeBlurb(selectedItem.def.bugActiveTime, 'bug')
            : null;
      return (
        <AppDrawer ref={drawerRef} title={drawerTitle} snapPoints={['88%']} scrollable>
          <View style={{ paddingBottom: spacing.xl * 2 }}>
            <Pressable style={styles.detailBack} onPress={() => setSelectedItem(null)}>
              <Ionicons name="arrow-back" size={20} color={colors.primary} />
              <Text style={styles.detailBackText}>Back to {backLabel}</Text>
            </Pressable>

            <Animated.View entering={FadeInDown.duration(260)} style={styles.hero}>
              <View style={[styles.heroGlow, { backgroundColor: `${accent}22` }]} />
              <View style={styles.heroTop}>
                <View style={[styles.heroBadge, { backgroundColor: `${accent}22` }]}>
                  {selectedItem.def.imageUrl ? (
                    <CachedImage
                      source={{ uri: selectedItem.def.imageUrl }}
                      style={{ width: 40, height: 40 }}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={styles.heroBadgeEmoji}>{selectedItem.def.emoji || collectionMeta.emoji}</Text>
                  )}
                </View>
                <View style={styles.heroCopy}>
                  <Text style={[styles.heroKicker, { color: accent }]}>{formatRarity(rarity)}</Text>
                  <Text style={styles.heroTitle}>{selectedItem.def.label}</Text>
                  {activeTimeBlurb ? (
                    <Text style={[styles.listDate, { marginTop: 4 }]}>
                      {activeTimeBlurb}
                    </Text>
                  ) : null}
                  <Text style={[styles.listDate, { marginTop: activeTimeBlurb ? 2 : 4 }]}>
                    Last found {formatDate(selectedItem.entry.lastCaught)}
                  </Text>
                </View>
              </View>
            </Animated.View>

            <Text style={styles.statsLabel}>Collection stats</Text>
            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <View>
                  <Text style={styles.statChipLabel}>Times found</Text>
                  <Text style={styles.statChipValue}>×{selectedItem.entry.count}</Text>
                </View>
              </View>
              {activeTab !== 'discoverables' && (
                <View style={styles.statChip}>
                  <View>
                    <Text style={styles.statChipLabel}>Best size</Text>
                    <Text style={styles.statChipValue}>
                      {getSizeLabel(selectedItem.entry.bestSize, 0.5, 2)}
                    </Text>
                  </View>
                </View>
              )}
              <View style={styles.statChip}>
                <View>
                  <Text style={styles.statChipLabel}>Rarity</Text>
                  <Text style={[styles.statChipValue, { color: accent }]}>
                    {formatRarity(rarity)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </AppDrawer>
      );
    }

    // ── Detail: collection set ─────────────────────────────────────────────
    if (selectedSet && collectionMeta) {
      const setAccent = SET_ACCENT[selectedSet.setId] ?? collectionMeta.accent;
      const setPct = selectedSet.total > 0
        ? Math.min(100, Math.round((selectedSet.caught / selectedSet.total) * 100))
        : 0;
      return (
        <AppDrawer ref={drawerRef} title={drawerTitle} snapPoints={['88%']} scrollable>
          <View style={{ paddingBottom: spacing.xl * 2 }}>
            <Pressable
              style={styles.detailBack}
              onPress={() => {
                setSelectedSet(null);
                setSelectedItem(null);
              }}
            >
              <Ionicons name="arrow-back" size={20} color={colors.primary} />
              <Text style={styles.detailBackText}>Back to Fish</Text>
            </Pressable>

            <Animated.View entering={FadeInDown.duration(260)} style={styles.hero}>
              <View style={[styles.heroGlow, { backgroundColor: `${setAccent}22` }]} />
              <View style={styles.heroTop}>
                <View style={[styles.heroBadge, { backgroundColor: `${setAccent}22` }]}>
                  <Text style={styles.heroBadgeEmoji}>{selectedSet.emoji || '🐟'}</Text>
                </View>
                <View style={styles.heroCopy}>
                  <Text style={[styles.heroKicker, { color: setAccent }]}>Collection set</Text>
                  <Text style={styles.heroTitle}>{selectedSet.label}</Text>
                </View>
              </View>
              {selectedSet.description ? (
                <Text style={styles.heroBody}>{selectedSet.description}</Text>
              ) : null}
              <View style={styles.progressBlock}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>
                    {selectedSet.complete ? 'Set complete' : 'Set progress'}
                  </Text>
                  <Text style={styles.progressValue}>
                    {selectedSet.caught}/{selectedSet.total}
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${setPct}%`,
                        backgroundColor: selectedSet.complete ? '#059669' : setAccent,
                      },
                    ]}
                  />
                </View>
                {selectedSet.complete ? (
                  <Text style={[styles.setCompleteBadge, { marginTop: 8 }]}>Complete!</Text>
                ) : null}
              </View>
            </Animated.View>

            {setCaughtSorted.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyEmoji}>{selectedSet.emoji || '🐟'}</Text>
                <Text style={styles.emptyTitle}>No catches yet</Text>
                <Text style={styles.emptyText}>
                  Fish you land from this set will show up here.
                </Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {setCaughtSorted.map(({ def, entry, rarity }, index) =>
                  renderFishCard(def, entry, rarity, index),
                )}
              </View>
            )}
          </View>
        </AppDrawer>
      );
    }

    // ── Detail: quest (active or completed) ────────────────────────────────
    if (selectedQuest) {
      const isActive = selectedQuest.kind === 'active';
      // Keep active detail in sync with live game progress while the page is open.
      const liveActive =
        isActive
          ? activeQuests.find((q) => q.questId === selectedQuest.quest.questId)
          : undefined;
      const quest = liveActive ?? selectedQuest.quest;
      const meta = questMeta(quest.type);
      const rewards: QuestReward = quest.rewards ?? {};
      const clauses: Array<Pick<RequirementClause, 'key' | 'label' | 'itemType' | 'have' | 'need' | 'met'>> =
        ('clauses' in quest ? quest.clauses : undefined) ?? [];
      const startDialog = quest.startDialog ?? [];
      const endDialog = quest.endDialog ?? [];
      const metCount = clauses.filter((c) => c.met).length;

      const renderRewards = (label: string) => {
        const hasRewards =
          !!rewards.gems || !!rewards.xp || !!rewards.items?.length || !!rewards.recipes?.length;
        if (!hasRewards) {
          return <Text style={styles.emptyText}>This adventure was its own reward.</Text>;
        }
        return (
          <>
            <Text style={styles.statsLabel}>{label}</Text>
            <View style={styles.statsRow}>
              {rewards.gems ? (
                <View style={styles.rewardChip}>
                  <GemIcon size={13} />
                  <Text style={[styles.rewardText, { color: colors.gemColor ?? colors.text }]}>
                    +{rewards.gems}
                  </Text>
                </View>
              ) : null}
              {rewards.xp ? (
                <View style={styles.rewardChip}>
                  <Ionicons name="sparkles" size={13} color={colors.primary} />
                  <Text style={styles.rewardText}>+{rewards.xp} XP</Text>
                </View>
              ) : null}
              {rewards.items?.map((r) => {
                const def = itemDefs[r.itemType];
                return (
                  <View key={r.itemType} style={styles.rewardChip}>
                    {def?.imageUrl ? (
                      <CachedImage
                        source={{ uri: def.imageUrl }}
                        style={{ width: 16, height: 16 }}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={{ fontSize: 12 }}>{def?.emoji ?? '📦'}</Text>
                    )}
                    <Text style={styles.rewardText}>
                      ×{r.qty} {def?.label ?? r.itemType}
                    </Text>
                  </View>
                );
              })}
              {rewards.recipes?.map((recipeId) => (
                <View key={recipeId} style={styles.rewardChip}>
                  <Ionicons name="book-outline" size={13} color={colors.primary} />
                  <Text style={styles.rewardText}>Recipe: {recipeId.replace(/_/g, ' ')}</Text>
                </View>
              ))}
            </View>
          </>
        );
      };

      const renderDialog = (
        lines: { text: string; speaker?: 'pet' | 'npc' }[],
        fallbackSpeaker: 'pet' | 'npc' | undefined,
        label: string,
      ) => {
        if (!lines.length) return null;
        const hasPerLineSpeaker = lines.some((l) => l.speaker);
        return (
          <>
            <Text style={[styles.statsLabel, { marginTop: spacing.md }]}>{label}</Text>
            <View style={styles.dialogBlock}>
              {!hasPerLineSpeaker ? (
                <Text style={styles.dialogSpeaker}>{speakerLabel(fallbackSpeaker)}</Text>
              ) : null}
              {lines.map((line, i) => (
                <View key={`${label}-${i}`} style={{ marginBottom: i === lines.length - 1 ? 0 : 8 }}>
                  {hasPerLineSpeaker ? (
                    <Text style={styles.dialogSpeaker}>
                      {speakerLabel(line.speaker ?? fallbackSpeaker)}
                    </Text>
                  ) : null}
                  <Text style={[styles.dialogLine, { marginBottom: 0 }]}>
                    “{line.text}”
                  </Text>
                </View>
              ))}
            </View>
          </>
        );
      };

      return (
        <AppDrawer ref={drawerRef} title={drawerTitle} snapPoints={['88%']} scrollable>
          <View style={{ paddingBottom: spacing.xl * 2 }}>
            <Pressable style={styles.detailBack} onPress={() => setSelectedQuest(null)}>
              <Ionicons name="arrow-back" size={20} color={colors.primary} />
              <Text style={styles.detailBackText}>Back to Quests</Text>
            </Pressable>

            <Animated.View entering={FadeInDown.duration(260)} style={styles.hero}>
              <View style={[styles.heroGlow, { backgroundColor: `${meta.accent}22` }]} />
              <View style={styles.heroTop}>
                <View style={[styles.heroBadge, { backgroundColor: `${meta.accent}22` }]}>
                  <Text style={styles.heroBadgeEmoji}>{meta.emoji}</Text>
                </View>
                <View style={styles.heroCopy}>
                  <Text style={[styles.heroKicker, { color: meta.accent }]}>
                    {isActive ? `Active · ${meta.label}` : meta.label}
                  </Text>
                  <Text style={styles.heroTitle}>{quest.title}</Text>
                  <Text style={[styles.listDate, { marginTop: 4 }]}>
                    {isActive
                      ? clauses.length > 0
                        ? `${metCount}/${clauses.length} steps done`
                        : 'In progress'
                      : `Completed ${formatDate((quest as QuestJournalEntry).completedAt)}`}
                  </Text>
                </View>
              </View>
              {quest.description ? (
                <Text style={styles.detailDesc}>{quest.description}</Text>
              ) : null}
              {'farmLevel' in quest && quest.farmLevel ? (
                <Text style={[styles.listDate, { marginTop: 6 }]}>
                  Farm upgrade → level {quest.farmLevel}
                </Text>
              ) : null}
            </Animated.View>

            {clauses.length > 0 ? (
              <>
                <Text style={styles.statsLabel}>{isActive ? 'Your steps' : 'What you did'}</Text>
                {clauses.map((clause) => (
                  <View key={clause.key} style={styles.stepRow}>
                    <View
                      style={[
                        styles.stepCheck,
                        {
                          backgroundColor: clause.met ? `${meta.accent}22` : `${colors.textMuted}18`,
                        },
                      ]}
                    >
                      <Ionicons
                        name={clause.met ? 'checkmark' : 'ellipse-outline'}
                        size={14}
                        color={clause.met ? meta.accent : colors.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.stepLabel, clause.met && !isActive && { color: colors.textSecondary }]}>
                        {clause.label}
                      </Text>
                      {clause.need > 1 ? (
                        <Text style={styles.stepCount}>
                          {Math.min(clause.have, clause.need)}/{clause.need}
                        </Text>
                      ) : null}
                    </View>
                    {clause.itemType && itemDefs[clause.itemType]?.imageUrl ? (
                      <CachedImage
                        source={{ uri: itemDefs[clause.itemType].imageUrl! }}
                        style={{ width: 28, height: 28 }}
                        resizeMode="contain"
                      />
                    ) : null}
                  </View>
                ))}
              </>
            ) : null}

            {renderRewards(isActive ? 'Rewards waiting' : 'Rewards earned')}

            {renderDialog(startDialog, quest.startDialogSpeaker, isActive ? 'Briefing' : 'How it started')}
            {!isActive
              ? renderDialog(endDialog, quest.endDialogSpeaker, 'How it wrapped up')
              : null}
          </View>
        </AppDrawer>
      );
    }

    // ── Main tabs ──────────────────────────────────────────────────────────
    return (
      <AppDrawer ref={drawerRef} title="Museum" snapPoints={['88%']} scrollable>
        <View style={{ paddingBottom: spacing.xl * 2 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chipRow}
          >
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => handleTabChange(tab.key)}
                >
                  <Ionicons
                    name={tab.icon}
                    size={18}
                    color={active ? colors.onPrimary ?? '#fff' : colors.textSecondary}
                  />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {loading ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.emptyText, { marginTop: 12 }]}>
                {activeTab === 'quests' ? 'Opening your journal...' : 'Loading your collection...'}
              </Text>
            </View>
          ) : activeTab === 'quests' ? (
            <>
              <Animated.View entering={FadeInDown.duration(260)} style={styles.hero}>
                <View style={[styles.heroGlow, { backgroundColor: `${colors.primary}14` }]} />
                <Text style={[styles.heroKicker, { color: colors.primary }]}>Quest journal</Text>
                <Text style={styles.heroTitle}>
                  {activeQuests.length > 0
                    ? `${activeQuests.length} on the docket`
                    : questJournal.length === 0
                      ? 'Adventures await'
                      : 'Stories you finished'}
                </Text>
                <Text style={styles.heroBody}>
                  {activeQuests.length > 0
                    ? 'Tap a quest for steps, rewards, and what your pet said.'
                    : questJournal.length === 0
                      ? 'Complete quests around the farm and they will show up here with the rewards you earned.'
                      : 'Tap a quest to see steps, dialog, and what you earned.'}
                </Text>
              </Animated.View>

              <Text style={styles.statsLabel}>Active</Text>
              {activeQuests.length === 0 ? (
                <View style={[styles.emptyWrap, { paddingVertical: spacing.md }]}>
                  <Text style={styles.emptyTitle}>Nothing on the docket (yet)</Text>
                  <Text style={styles.emptyText}>
                    New quests will land here when your pet has opinions.
                  </Text>
                </View>
              ) : (
                activeQuests.map((quest, index) => {
                  const meta = questMeta(quest.type);
                  return (
                    <Animated.View
                      key={quest.questId}
                      entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(240)}
                    >
                      <Pressable
                        style={styles.listCard}
                        onPress={() => setSelectedQuest({ kind: 'active', quest })}
                      >
                        <View style={styles.listCardTop}>
                          <View style={[styles.listBadge, { backgroundColor: `${meta.accent}22` }]}>
                            <Text style={styles.listBadgeEmoji}>{meta.emoji}</Text>
                          </View>
                          <View style={styles.listCopy}>
                            <Text style={styles.listType}>Active · {meta.label}</Text>
                            <Text style={styles.listTitle} numberOfLines={1}>
                              {quest.title}
                            </Text>
                            <Text style={styles.listDate} numberOfLines={2}>
                              {clauseProgressLabel(quest)}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })
              )}

              <Text style={[styles.statsLabel, { marginTop: spacing.lg }]}>Completed</Text>
              {questJournal.length === 0 ? (
                <View style={[styles.emptyWrap, { paddingVertical: spacing.md }]}>
                  <Text style={styles.emptyTitle}>No completed quests yet</Text>
                  <Text style={styles.emptyText}>
                    Talk to friends, grow your farm, and finish challenges — your journal fills itself.
                  </Text>
                </View>
              ) : (
                questJournal.map((quest, index) => {
                  const meta = questMeta(quest.type);
                  return (
                    <Animated.View
                      key={quest.questId}
                      entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(240)}
                    >
                      <Pressable
                        style={styles.listCard}
                        onPress={() => setSelectedQuest({ kind: 'completed', quest })}
                      >
                        <View style={styles.listCardTop}>
                          <View style={[styles.listBadge, { backgroundColor: `${meta.accent}22` }]}>
                            <Text style={styles.listBadgeEmoji}>{meta.emoji}</Text>
                          </View>
                          <View style={styles.listCopy}>
                            <Text style={styles.listType}>{meta.label}</Text>
                            <Text style={styles.listTitle} numberOfLines={1}>
                              {quest.title}
                            </Text>
                            <Text style={styles.listDate}>{formatDate(quest.completedAt)}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })
              )}
            </>
          ) : collectionMeta && stats ? (
            <>
              <Animated.View entering={FadeInDown.duration(260)} style={styles.hero}>
                <View style={[styles.heroGlow, { backgroundColor: `${collectionMeta.accent}22` }]} />
                <View style={styles.heroTop}>
                  <View style={[styles.heroBadge, { backgroundColor: `${collectionMeta.accent}22` }]}>
                    <Text style={styles.heroBadgeEmoji}>{collectionMeta.emoji}</Text>
                  </View>
                  <View style={styles.heroCopy}>
                    <Text style={[styles.heroKicker, { color: collectionMeta.accent }]}>
                      {collectionMeta.kicker}
                    </Text>
                    <Text style={styles.heroTitle}>
                      {stats.caught === 0 ? collectionMeta.titleEmpty : collectionMeta.titleFilled}
                    </Text>
                  </View>
                </View>
                <Text style={styles.heroBody}>
                  {stats.caught === 0 ? collectionMeta.bodyEmpty : collectionMeta.bodyFilled}
                </Text>
                <View style={styles.progressBlock}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Collection progress</Text>
                    <Text style={styles.progressValue}>
                      {stats.caught}/{stats.total}
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${progressPct}%`,
                          backgroundColor: collectionMeta.accent,
                        },
                      ]}
                    />
                  </View>
                </View>
              </Animated.View>

              {caughtSorted.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyEmoji}>{collectionMeta.emoji}</Text>
                  <Text style={styles.emptyTitle}>Shelf is empty</Text>
                  <Text style={styles.emptyText}>
                    {collectionMeta.bodyEmpty}
                  </Text>
                </View>
              ) : (
                <View style={styles.grid}>
                  {caughtSorted.map(({ def, entry, rarity }, index) =>
                    renderFishCard(def, entry, rarity, index),
                  )}
                </View>
              )}

              {(activeTab === 'fish' || activeTab === 'bug') && collectionSets.length > 0 ? (
                <View style={styles.setsBlock}>
                  <Text style={styles.setsHeading}>Collection sets</Text>
                  <Text style={styles.setsSubhead}>
                    {activeTab === 'fish'
                      ? 'Themed shelves to fill — tap a set to browse what you have caught.'
                      : 'Habitat shelves to fill — tap a set to browse what you have caught.'}
                  </Text>
                  {collectionSets.map((set, index) => {
                    const setAccent = SET_ACCENT[set.setId] ?? collectionMeta.accent;
                    const pct = set.total > 0
                      ? Math.min(100, Math.round((set.caught / set.total) * 100))
                      : 0;
                    return (
                      <Animated.View
                        key={set.setId}
                        entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(240)}
                      >
                        <Pressable
                          style={styles.setCard}
                          onPress={() => setSelectedSet(set)}
                        >
                          <View style={styles.setCardTop}>
                            <View style={[styles.setBadge, { backgroundColor: `${setAccent}20` }]}>
                              <Text style={styles.setEmoji}>
                                {set.emoji || (activeTab === 'bug' ? '🐛' : '🐟')}
                              </Text>
                            </View>
                            <View style={styles.setCopy}>
                              <Text style={styles.setLabel}>{set.label}</Text>
                              {set.description ? (
                                <Text style={styles.setDesc} numberOfLines={1}>
                                  {set.description}
                                </Text>
                              ) : null}
                            </View>
                            <View style={styles.setMetaCol}>
                              {set.complete ? (
                                <Text style={styles.setCompleteBadge}>Complete!</Text>
                              ) : (
                                <Text style={styles.setCount}>
                                  {set.caught}/{set.total}
                                </Text>
                              )}
                              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                            </View>
                          </View>
                          <View style={styles.setTrack}>
                            <View
                              style={[
                                styles.setFill,
                                {
                                  width: `${pct}%`,
                                  backgroundColor: set.complete ? '#059669' : setAccent,
                                },
                              ]}
                            />
                          </View>
                        </Pressable>
                      </Animated.View>
                    );
                  })}
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      </AppDrawer>
    );
  },
);
