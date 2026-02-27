/**
 * ShopDrawer — Reusable shop drawer with section filtering and optional sell support.
 * Main shop and fishing shop are thin wrappers with different config.
 */

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useMemo,
  useCallback,
  useState,
  useEffect,
} from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
  ImageBackground,
  type ColorValue,
} from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import { GemIcon } from '@/components/ui/GemIcon';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { ItemCategory, ItemDefinition, InventorySlot } from './types';
import type { QuestHighlight } from './types';
import { ITEM_CATEGORIES } from './types';
import { SUB_CATEGORY_LABELS } from '@/components/admin-item-form/constants';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { SellItemSelector } from './SellItemSelector';
import { useTheme } from '@/store/ThemeProvider';
import { api, type ShopBanner } from '@/lib/api';
import { spacing, radius } from '@/constants/theme';
import type { ColorPalette } from '@/constants/theme';

// ─── Config & Ref API ────────────────────────────────────────────────────────

export interface ShopDrawerConfig {
  title: string;
  /** Only show items with this shopSection (e.g. 'fishing_shop'). Undefined = no section filter. */
  sectionKey?: string;
  /** When sectionKey is set, also include buyable items with these subCategories (e.g. fishing poles, bait). */
  includeSubCategories?: string[];
  /** Exclude items with this shopSection from buy list (e.g. main shop excludes 'fishing_shop'). */
  excludeSection?: string;
  /** Categories that can be sold here. Empty/undefined = all items sellable. */
  sellCategories?: ItemCategory[];
  /** When true, chips are derived from item subCategory instead of category (e.g. for fishing shop). */
  useSubCategoryChips?: boolean;
  /** Categories to exclude from buy list (e.g. 'npc' — NPCs are not purchasable in shop). */
  excludeCategories?: ItemCategory[];
}

export interface ShopDrawerRef {
  open: () => void;
  close: () => void;
}

interface ShopDrawerProps {
  config: ShopDrawerConfig;
  gems: number;
  itemDefs: Record<string, ItemDefinition>;
  inventory?: InventorySlot[];
  onPurchase: (itemType: string) => void;
  onSell?: (itemType: string, qty?: number) => void;
  onSellBatch?: (items: Array<{ itemType: string; qty: number }>) => void;
  onClose?: () => void;
  activeHighlight?: QuestHighlight | null;
  onOpenChange?: (open: boolean) => void;
  onCategorySelect?: (categoryKey: string) => void;
}

/** Internal section definition for chips. */
interface SectionDef {
  key: string;
  label: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimeLeft(isoDate: string): string {
  const ms = new Date(isoDate).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const hours = ms / 3_600_000;
  if (hours < 1) return 'Soon';
  if (hours < 24) return `${Math.floor(hours)}h left`;
  const days = hours / 24;
  if (days < 7) return `${Math.floor(days)}d left`;
  return 'Limited';
}

function isAvailable(def: ItemDefinition): boolean {
  if (!def.availableUntil) return true;
  return new Date(def.availableUntil).getTime() > Date.now();
}

/** All items are sellable; default sell price is 0. */
function getSellPrice(def: ItemDefinition): number {
  return typeof def.sellPrice === 'number' ? def.sellPrice : 0;
}

// ─── ShopCard (compact 3-col) ────────────────────────────────────────────────

function ShopCard({
  def,
  gems,
  onBuy,
  justPurchased,
  colors,
  highlighted,
}: {
  def: ItemDefinition;
  gems: number;
  onBuy: () => void;
  justPurchased: boolean;
  colors: ColorPalette;
  highlighted?: boolean;
}) {
  const canAfford = gems >= (def.gemPrice ?? 0);
  const available = isAvailable(def);
  const disabled = !canAfford || !available;
  const hasTimer = !!def.availableUntil && available;

  return (
    <Pressable
      style={[
        s.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        disabled && s.cardDisabled,
        highlighted && s.cardHighlight,
      ]}
      onPress={disabled ? undefined : onBuy}
    >
      <View style={[s.cardImg, { backgroundColor: colors.surfaceElevated }]}>
        {def.imageUrl ? (
          <CachedImage source={{ uri: def.imageUrl }} style={s.cardImgInner} resizeMode="contain" />
        ) : (
          <Text style={s.cardEmoji}>{def.emoji}</Text>
        )}
        {hasTimer && (
          <View style={s.timerBadge}>
            <Ionicons name="time-outline" size={8} color="#fff" />
            <Text style={s.timerText}>{formatTimeLeft(def.availableUntil!)}</Text>
          </View>
        )}
      </View>
      <Text style={[s.cardLabel, { color: colors.text }]} numberOfLines={1}>
        {def.label}
      </Text>
      <View style={s.cardPrice}>
        <GemIcon size={11} />
        <Text style={[s.priceNum, { color: disabled ? colors.textMuted : (colors.gemColor ?? colors.accent) }]}>
          {def.gemPrice}
        </Text>
      </View>
      {justPurchased && (
        <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.delay(400).duration(250)} style={s.purchaseOverlay}>
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <Text style={s.purchaseText}>Bought!</Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

// ─── BannerCard ───────────────────────────────────────────────────────────────

function BannerCard({
  banner,
  active,
  onPress,
  colors,
}: {
  banner: ShopBanner;
  active: boolean;
  onPress: () => void;
  colors: ColorPalette;
}) {
  const showImage = banner.displayImage && banner.imageUrl;
  return (
    <Pressable
      style={[
        s.banner,
        { borderColor: active ? colors.primary : colors.border },
        active && { borderWidth: 2 },
      ]}
      onPress={onPress}
    >
      {showImage ? (
        <ImageBackground source={{ uri: banner.imageUrl! }} style={s.bannerBg} imageStyle={s.bannerBgImage} resizeMode="cover">
          <View style={s.bannerOverlay} />
          <Text style={s.bannerLabel}>{banner.label}</Text>
        </ImageBackground>
      ) : (
        <View style={[s.bannerFallback, { backgroundColor: colors.surfaceElevated }]}>
          <Text style={[s.bannerFallbackLabel, { color: colors.text }]}>{banner.label}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── ShopDrawer ────────────────────────────────────────────────────────────────

export const ShopDrawer = forwardRef<ShopDrawerRef, ShopDrawerProps>(function ShopDrawer(
  { config, gems, itemDefs, inventory = [], onPurchase, onSell, onSellBatch, onClose, activeHighlight, onOpenChange, onCategorySelect },
  ref,
) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const drawerRef = useRef<AppDrawerRef>(null);

  const [shopConfig, setShopConfig] = useState<{ banners: ShopBanner[] } | null>(null);
  const [activeSection, setActiveSection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastPurchased, setLastPurchased] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'buy' | 'sell'>('buy');

  const { title, sectionKey, includeSubCategories, excludeSection, sellCategories = [], useSubCategoryChips = false, excludeCategories = [] } = config;
  const hasSell = !!(onSell || onSellBatch);

  useImperativeHandle(ref, () => ({
    open: () => drawerRef.current?.open(),
    close: () => drawerRef.current?.close(),
  }));

  const handleDrawerChange = useCallback(
    (index: number) => {
      onOpenChange?.(index >= 0);
    },
    [onOpenChange],
  );

  useEffect(() => {
    api.getShopConfig(sectionKey).then(setShopConfig).catch(() => setShopConfig({ banners: [] }));
  }, [sectionKey]);

  // Buy list: filter by sectionKey, includeSubCategories, excludeSection, excludeCategories
  const buyableItems = useMemo(() => {
    let base = Object.values(itemDefs).filter((d) => d.buyable && (d.gemPrice ?? 0) > 0);
    if (excludeCategories.length) base = base.filter((d) => !excludeCategories.includes(d.category));
    if (sectionKey) {
      const matchSection = (d: ItemDefinition) =>
        d.shopSection === sectionKey ||
        (!!includeSubCategories?.length && !!d.subCategory && includeSubCategories.includes(d.subCategory));
      return base.filter(matchSection);
    }
    if (excludeSection) return base.filter((d) => !d.shopSection || d.shopSection !== excludeSection);
    return base;
  }, [itemDefs, sectionKey, includeSubCategories, excludeSection, excludeCategories]);

  const banners = shopConfig?.banners ?? [];

  const categoryChips = useMemo((): SectionDef[] => {
    if (useSubCategoryChips) {
      const subCats = new Set(buyableItems.map((d) => d.subCategory).filter(Boolean)) as Set<string>;
      return [
        { key: 'all', label: 'All' },
        ...Array.from(subCats)
          .sort()
          .map((k) => ({ key: k, label: SUB_CATEGORY_LABELS[k] ?? k })),
      ];
    }
    const cats = new Set(buyableItems.map((d) => d.category));
    return [
      { key: 'all', label: 'All' },
      ...ITEM_CATEGORIES.filter((c) => c.key !== 'all' && cats.has(c.key)),
    ];
  }, [buyableItems, useSubCategoryChips]);

  const filtered = useMemo(() => {
    const available = buyableItems.filter(isAvailable);
    const q = searchQuery.trim().toLowerCase();
    if (q) return available.filter((d) => d.label.toLowerCase().includes(q));
    if (activeSection === 'all') return available;
    const isBanner = banners.some((b) => b.key === activeSection);
    if (isBanner) return available.filter((d) => d.shopSection === activeSection);
    if (useSubCategoryChips) return available.filter((d) => d.subCategory === activeSection);
    return available.filter((d) => d.category === activeSection);
  }, [buyableItems, searchQuery, activeSection, banners, useSubCategoryChips]);

  // Sell list: all inventory items (all items are sellable), excluding excludeCategories
  const sellableSlots = useMemo(() => {
    return inventory.filter((slot) => {
      const def = itemDefs[slot.itemType];
      if (!def || slot.qty <= 0) return false;
      if (excludeCategories.length && excludeCategories.includes(def.category)) return false;
      return true;
    });
  }, [inventory, itemDefs, excludeCategories]);

  const handlePurchase = useCallback(
    (itemType: string) => {
      setLastPurchased(itemType);
      onPurchase(itemType);
      setTimeout(() => setLastPurchased(null), 1000);
    },
    [onPurchase],
  );

  const isItemHighlighted = useCallback(
    (itemType: string) => activeHighlight?.type === 'shop_item' && activeHighlight.target === itemType,
    [activeHighlight],
  );
  const isCategoryHighlighted = useCallback(
    (categoryKey: string) => activeHighlight?.type === 'shop_category' && activeHighlight.target === categoryKey,
    [activeHighlight],
  );

  const chipStyle = useCallback(
    (active: boolean) => [s.chip, { backgroundColor: active ? colors.primary : colors.surfaceElevated }],
    [colors],
  );
  const chipTextStyle = useCallback(
    (active: boolean) => [s.chipText, { color: active ? (colors.onPrimary ?? '#fff') : colors.textSecondary }],
    [colors],
  );

  const headerRight = hasSell ? (
    <View style={s.headerRightRow}>
      <Pressable
        style={[s.modeBtn, viewMode === 'buy' && s.modeBtnActive, { backgroundColor: viewMode === 'buy' ? colors.primary : colors.surfaceElevated }]}
        onPress={() => setViewMode('buy')}
      >
        <Text style={[s.modeBtnText, { color: viewMode === 'buy' ? (colors.onPrimary ?? '#fff') : colors.textSecondary }]}>Buy</Text>
      </Pressable>
      <Pressable
        style={[s.modeBtn, viewMode === 'sell' && s.modeBtnActive, { backgroundColor: viewMode === 'sell' ? colors.primary : colors.surfaceElevated }]}
        onPress={() => setViewMode('sell')}
      >
        <Text style={[s.modeBtnText, { color: viewMode === 'sell' ? (colors.onPrimary ?? '#fff') : colors.textSecondary }]}>Sell</Text>
      </Pressable>
    </View>
  ) : undefined;

  return (
    <AppDrawer
      ref={drawerRef}
      title={title}
      snapPoints={['90%']}
      showCloseButton
      scrollable
      headerRight={headerRight}
      onClose={onClose}
      onChange={handleDrawerChange}
    >
      {viewMode === 'buy' && (
      <>
      <View style={[s.searchWrap, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search items..."
          placeholderTextColor={colors.textMuted as string}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {banners.length > 0 && !searchQuery && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.bannerScroll} style={s.bannerScrollOuter}>
          {banners.map((b) => (
            <BannerCard
              key={b.key}
              banner={b}
              active={activeSection === b.key}
              onPress={() => setActiveSection((prev) => (prev === b.key ? 'all' : b.key))}
              colors={colors}
            />
          ))}
        </ScrollView>
      )}

      {!searchQuery && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow} style={s.chipScroll}>
          {categoryChips.map((c) => {
            const active = activeSection === c.key;
            const highlighted = isCategoryHighlighted(c.key);
            return (
              <Pressable
                key={c.key}
                style={[chipStyle(active), highlighted && s.chipHighlight]}
                onPress={() => {
                  setActiveSection(c.key);
                  onCategorySelect?.(c.key);
                }}
              >
                <Text style={chipTextStyle(active)}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={s.grid}>
        {filtered.length === 0 && (
          <View style={s.emptyWrap}>
            <Ionicons name="storefront-outline" size={44} color={colors.textMuted} />
            <Text style={[s.emptyText, { color: colors.textMuted }]}>
              {searchQuery ? 'No results found.' : 'Nothing for sale here yet!'}
            </Text>
          </View>
        )}
        {filtered.map((def) => (
          <ShopCard
            key={def.itemType}
            def={def}
            gems={gems}
            onBuy={() => handlePurchase(def.itemType)}
            justPurchased={lastPurchased === def.itemType}
            colors={colors}
            highlighted={isItemHighlighted(def.itemType)}
          />
        ))}
      </View>
      </>
      )}

      {viewMode === 'sell' && hasSell && (
        <View style={s.sellSection}>
          <SellItemSelector
            key={`shop-sell-${viewMode}`}
            initialSlots={sellableSlots}
            itemDefs={itemDefs}
            getSellPrice={getSellPrice}
            onSellBatch={(items) => {
              if (onSellBatch) onSellBatch(items);
              else items.forEach(({ itemType, qty }) => onSell?.(itemType, qty));
            }}
            colors={colors}
          />
        </View>
      )}
    </AppDrawer>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_GAP = 8;

const s = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: Platform.select({ ios: 8, android: 4 }),
    gap: 8,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500', paddingVertical: 0 },
  bannerScrollOuter: { flexGrow: 0, marginBottom: spacing.md },
  bannerScroll: { gap: 10, paddingHorizontal: 2 },
  banner: {
    width: 200,
    height: 90,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  bannerBg: { flex: 1, justifyContent: 'flex-end', padding: 10 },
  bannerBgImage: { borderRadius: radius.lg },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: radius.lg },
  bannerLabel: { fontSize: 16, fontWeight: '800', color: '#fff', zIndex: 1 },
  bannerFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg },
  bannerFallbackLabel: { fontSize: 15, fontWeight: '700' },
  chipScroll: { flexGrow: 0, marginBottom: spacing.md },
  chipRow: { gap: 6, paddingHorizontal: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14 },
  chipHighlight: { borderWidth: 2, borderColor: '#FFD700' },
  chipText: { fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP },
  card: {
    width: `${(100 - 6) / 3}%` as any,
    borderRadius: 14,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
    ...(Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 }, android: { elevation: 2 } }) as object),
  },
  cardDisabled: { opacity: 0.45 },
  cardHighlight: { borderWidth: 2, borderColor: '#FFD700' },
  cardImg: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6, overflow: 'hidden' },
  cardImgInner: { width: 32, height: 32 },
  cardEmoji: { fontSize: 22 },
  timerBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  timerText: { fontSize: 8, fontWeight: '700', color: '#fff' },
  cardLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  cardPrice: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  priceGem: { fontSize: 11 },
  priceNum: { fontSize: 12, fontWeight: '800' },
  purchaseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(110, 231, 183, 0.9)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  purchaseText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  emptyWrap: { width: '100%', alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  headerRightRow: { flexDirection: 'row', gap: 6, marginRight: 8 },
  modeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  modeBtnActive: {},
  modeBtnText: { fontSize: 13, fontWeight: '700' },
  sellSection: { paddingTop: spacing.sm },
  sellHeader: { fontSize: 18, fontWeight: '800', marginBottom: spacing.md },
  sellEmpty: { fontSize: 14 },
  sellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  sellImg: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  sellImgInner: { width: 32, height: 32 },
  sellEmoji: { fontSize: 24 },
  sellInfo: { flex: 1 },
  sellLabel: { fontSize: 14, fontWeight: '600' },
  sellQty: { fontSize: 12 },
  sellPriceCol: { alignItems: 'flex-end', gap: 6 },
  sellPrice: { fontSize: 14, fontWeight: '800' },
  sellBtns: { flexDirection: 'row', gap: 6 },
  sellBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  sellBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});
