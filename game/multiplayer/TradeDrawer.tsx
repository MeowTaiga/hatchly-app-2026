/**
 * Realtime trade window — your offer vs theirs, inventory picker, confirm.
 * Terminal outcomes (declined / cancelled / completed) render in-drawer.
 */

import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { CachedImage } from '@/components/ui/CachedImage';
import { useTheme } from '@/store/ThemeProvider';
import { useGame } from '@/game/GameProvider';
import { spacing, radius } from '@/constants/theme';
import { isTradeTerminal, type TradeOfferItem, type TradeState } from './tradeTypes';

export interface TradeDrawerRef {
  open: () => void;
  close: () => void;
}

interface TradeDrawerProps {
  trade: TradeState | null;
  busy?: boolean;
  onUpdateOffer: (items: TradeOfferItem[]) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const TRADABLE_CATEGORIES = new Set([
  'ingredient',
  'material',
  'food',
  'fish',
  'bug',
  'seed',
  'soil',
]);

function OfferChip({
  itemType,
  qty,
  label,
  imageUrl,
  emoji,
  onPress,
  colors,
}: {
  itemType: string;
  qty: number;
  label: string;
  imageUrl?: string;
  emoji?: string;
  onPress?: () => void;
  colors: { text: string; border: string; surface: string; primary: string };
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      {imageUrl ? (
        <CachedImage source={{ uri: imageUrl }} style={styles.chipImg} resizeMode="contain" />
      ) : (
        <Text style={styles.chipEmoji}>{emoji ?? '?'}</Text>
      )}
      <Text style={[styles.chipQty, { color: colors.primary }]}>×{qty}</Text>
      <Text style={[styles.chipLabel, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function OutcomePanel({
  trade,
  colors,
}: {
  trade: TradeState;
  colors: {
    text: string;
    textMuted: string;
    textSecondary: string;
    border: string;
    surface: string;
    primary: string;
    successDark?: string;
    error?: string;
    errorDark?: string;
  };
}) {
  const declined = trade.status === 'declined';
  const completed = trade.status === 'completed';
  const accent = completed
    ? colors.successDark ?? '#34D399'
    : declined
      ? colors.errorDark ?? colors.error ?? '#F43F5E'
      : colors.textMuted;
  const icon = completed
    ? 'checkmark-circle'
    : declined
      ? 'close-circle'
      : 'remove-circle-outline';
  const title = completed
    ? 'Trade complete'
    : declined
      ? 'Trade declined'
      : 'Trade cancelled';
  const body =
    trade.endMessage ??
    (completed
      ? 'Items have been exchanged.'
      : declined
        ? `@${trade.partner.username} declined the trade.`
        : 'This trade was cancelled.');

  return (
    <View style={styles.outcome}>
      {trade.partner.petImageUrl ? (
        <CachedImage
          source={{ uri: trade.partner.petImageUrl }}
          style={[styles.outcomePet, { opacity: completed ? 1 : 0.85 }]}
          resizeMode="contain"
        />
      ) : (
        <View style={[styles.outcomeIconRing, { backgroundColor: `${accent}22` }]}>
          <Ionicons name={icon} size={36} color={accent} />
        </View>
      )}
      <View style={[styles.outcomeBadge, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={icon} size={16} color={accent} />
        <Text style={[styles.outcomeBadgeText, { color: accent }]}>{title}</Text>
      </View>
      <Text style={[styles.outcomeTitle, { color: colors.text }]}>@{trade.partner.username}</Text>
      <Text style={[styles.outcomeBody, { color: colors.textSecondary }]}>{body}</Text>
    </View>
  );
}

export const TradeDrawer = forwardRef<TradeDrawerRef, TradeDrawerProps>(
  function TradeDrawer({ trade, busy, onUpdateOffer, onConfirm, onCancel }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const { theme } = useTheme();
    const { colors } = theme;
    const { inventory, itemDefs } = useGame();

    useImperativeHandle(ref, () => ({
      open: () => drawerRef.current?.open(),
      close: () => drawerRef.current?.close(),
    }));

    const qtyByType = useMemo(() => {
      const m = new Map<string, number>();
      for (const slot of inventory) {
        m.set(slot.itemType, (m.get(slot.itemType) ?? 0) + slot.qty);
      }
      return m;
    }, [inventory]);

    const inventoryList = useMemo(() => {
      const slots: { itemType: string; qty: number }[] = [];
      for (const [itemType, qty] of qtyByType) {
        if (qty <= 0) continue;
        const def = itemDefs[itemType];
        if (!def) continue;
        if (!(def.sellable || TRADABLE_CATEGORIES.has(def.category))) continue;
        slots.push({ itemType, qty });
      }
      slots.sort((a, b) => {
        const la = itemDefs[a.itemType]?.label ?? a.itemType;
        const lb = itemDefs[b.itemType]?.label ?? b.itemType;
        return la.localeCompare(lb);
      });
      return slots;
    }, [qtyByType, itemDefs]);

    const yourOfferMap = useMemo(() => {
      const m = new Map<string, number>();
      for (const o of trade?.yourOffer ?? []) m.set(o.itemType, o.qty);
      return m;
    }, [trade?.yourOffer]);

    const addOne = (itemType: string) => {
      if (!trade || busy || trade.status !== 'open') return;
      const have = qtyByType.get(itemType) ?? 0;
      if (have <= 0) return;
      const next = [...(trade.yourOffer ?? [])];
      const idx = next.findIndex((o) => o.itemType === itemType);
      if (idx >= 0) next[idx] = { itemType, qty: next[idx].qty + 1 };
      else next.push({ itemType, qty: 1 });
      onUpdateOffer(next);
    };

    const removeOne = (itemType: string) => {
      if (!trade || busy || trade.status !== 'open') return;
      const next = (trade.yourOffer ?? [])
        .map((o) => (o.itemType === itemType ? { ...o, qty: o.qty - 1 } : o))
        .filter((o) => o.qty > 0);
      onUpdateOffer(next);
    };

    const terminal = isTradeTerminal(trade?.status);
    const waiting = !!trade && (trade.status === 'pending' || !!trade.waitingForAccept);
    const canConfirm = !!trade && trade.status === 'open' && !trade.youReady && !busy;

    const footer = trade ? (
      <View
        style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}
      >
        {terminal ? (
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [
              styles.footerBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={[styles.footerBtnText, { color: colors.onPrimary ?? '#fff' }]}>
              Close
            </Text>
          </Pressable>
        ) : waiting ? (
          <View style={styles.waitBlock}>
            <Text style={[styles.waitText, { color: colors.text }]}>
              Waiting for @{trade.partner.username}
            </Text>
            <Text style={[styles.waitHint, { color: colors.textMuted }]}>
              They can accept or decline your request
            </Text>
            <Pressable
              onPress={onCancel}
              disabled={busy}
              style={({ pressed }) => [
                styles.waitCancel,
                { borderColor: colors.border },
                (pressed || busy) && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.footerBtnText, { color: colors.textSecondary }]}>
                Cancel request
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.footerRow}>
            <Pressable
              onPress={onCancel}
              disabled={busy}
              style={({ pressed }) => [
                styles.footerBtn,
                { borderColor: colors.border },
                styles.footerGhost,
                (pressed || busy) && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.footerBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={!canConfirm}
              style={({ pressed }) => [
                styles.footerBtn,
                {
                  backgroundColor: trade.youReady
                    ? colors.successDark ?? colors.success
                    : colors.primary,
                },
                (!canConfirm || pressed) && { opacity: canConfirm ? 0.9 : 0.45 },
              ]}
            >
              <Text style={[styles.footerBtnText, { color: colors.onPrimary ?? '#fff' }]}>
                {trade.youReady
                  ? trade.theyReady
                    ? 'Completing…'
                    : 'Waiting…'
                  : 'Confirm'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    ) : null;

    const title = !trade
      ? 'Trade'
      : terminal
        ? trade.status === 'declined'
          ? 'Declined'
          : trade.status === 'completed'
            ? 'Complete'
            : 'Cancelled'
        : `Trade · @${trade.partner.username}`;

    return (
      <AppDrawer
        ref={drawerRef}
        title={title}
        snapPoints={['88%']}
        initialSnapIndex={0}
        showCloseButton
        scrollable
        footer={footer}
        onClose={onCancel}
      >
        {!trade ? (
          <Text style={{ color: colors.textMuted }}>No active trade</Text>
        ) : terminal ? (
          <OutcomePanel trade={trade} colors={colors} />
        ) : (
          <View style={styles.root}>
            {waiting ? (
              <View
                style={[
                  styles.pendingCard,
                  { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}33` },
                ]}
              >
                {trade.partner.petImageUrl ? (
                  <CachedImage
                    source={{ uri: trade.partner.petImageUrl }}
                    style={styles.pendingPet}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={[styles.pendingPetFallback, { backgroundColor: colors.border }]}>
                    <Ionicons name="paw" size={28} color={colors.textMuted} />
                  </View>
                )}
                <Text style={[styles.pendingName, { color: colors.text }]}>
                  @{trade.partner.username}
                </Text>
                <Text style={[styles.pendingHint, { color: colors.textMuted }]}>
                  Trade request sent — hang tight while they decide.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.readyRow}>
                  <View
                    style={[
                      styles.readyPill,
                      {
                        backgroundColor: trade.youReady
                          ? `${colors.successDark ?? '#34D399'}22`
                          : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={trade.youReady ? 'checkmark-circle' : 'ellipse-outline'}
                      size={14}
                      color={trade.youReady ? colors.successDark ?? '#34D399' : colors.textMuted}
                    />
                    <Text style={[styles.readyText, { color: colors.text }]}>You</Text>
                  </View>
                  <Ionicons name="swap-horizontal" size={18} color={colors.textMuted} />
                  <View
                    style={[
                      styles.readyPill,
                      {
                        backgroundColor: trade.theyReady
                          ? `${colors.successDark ?? '#34D399'}22`
                          : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={trade.theyReady ? 'checkmark-circle' : 'ellipse-outline'}
                      size={14}
                      color={trade.theyReady ? colors.successDark ?? '#34D399' : colors.textMuted}
                    />
                    <Text style={[styles.readyText, { color: colors.text }]}>
                      @{trade.partner.username}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.sec, { color: colors.textMuted }]}>Their offer</Text>
                <View style={styles.offerWrap}>
                  {(trade.theirOffer ?? []).length === 0 ? (
                    <Text style={[styles.empty, { color: colors.textMuted }]}>Nothing yet</Text>
                  ) : (
                    trade.theirOffer.map((o) => {
                      const def = itemDefs[o.itemType];
                      return (
                        <OfferChip
                          key={o.itemType}
                          itemType={o.itemType}
                          qty={o.qty}
                          label={def?.label ?? o.itemType}
                          imageUrl={def?.imageUrl}
                          emoji={def?.emoji}
                          colors={colors}
                        />
                      );
                    })
                  )}
                </View>

                <Text style={[styles.sec, { color: colors.textMuted }]}>Your offer</Text>
                <View style={styles.offerWrap}>
                  {(trade.yourOffer ?? []).length === 0 ? (
                    <Text style={[styles.empty, { color: colors.textMuted }]}>
                      Tap items below to add
                    </Text>
                  ) : (
                    trade.yourOffer.map((o) => {
                      const def = itemDefs[o.itemType];
                      return (
                        <OfferChip
                          key={o.itemType}
                          itemType={o.itemType}
                          qty={o.qty}
                          label={def?.label ?? o.itemType}
                          imageUrl={def?.imageUrl}
                          emoji={def?.emoji}
                          onPress={trade.status === 'open' ? () => removeOne(o.itemType) : undefined}
                          colors={colors}
                        />
                      );
                    })
                  )}
                </View>

                {trade.status === 'open' && (
                  <>
                    <Text style={[styles.sec, { color: colors.textMuted }]}>
                      Your inventory (tap to offer)
                    </Text>
                    <ScrollView
                      horizontal={false}
                      style={styles.invScroll}
                      contentContainerStyle={styles.invGrid}
                    >
                      {inventoryList.length === 0 ? (
                        <Text style={[styles.empty, { color: colors.textMuted }]}>
                          No tradable items
                        </Text>
                      ) : (
                        inventoryList.map((slot) => {
                          const def = itemDefs[slot.itemType];
                          const offered = yourOfferMap.get(slot.itemType) ?? 0;
                          return (
                            <Pressable
                              key={slot.itemType}
                              onPress={() => addOne(slot.itemType)}
                              disabled={busy || slot.qty <= 0}
                              style={({ pressed }) => [
                                styles.invCell,
                                {
                                  backgroundColor: colors.surface,
                                  borderColor: offered > 0 ? colors.primary : colors.border,
                                },
                                pressed && { opacity: 0.85 },
                              ]}
                            >
                              {def?.imageUrl ? (
                                <CachedImage
                                  source={{ uri: def.imageUrl }}
                                  style={styles.invImg}
                                  resizeMode="contain"
                                />
                              ) : (
                                <Text style={{ fontSize: 22 }}>{def?.emoji ?? '?'}</Text>
                              )}
                              <Text style={[styles.invQty, { color: colors.text }]}>
                                {slot.qty}
                                {offered > 0 ? ` · +${offered}` : ''}
                              </Text>
                              <Text
                                style={[styles.invLabel, { color: colors.textSecondary }]}
                                numberOfLines={1}
                              >
                                {def?.label ?? slot.itemType}
                              </Text>
                            </Pressable>
                          );
                        })
                      )}
                    </ScrollView>
                  </>
                )}
              </>
            )}
          </View>
        )}
      </AppDrawer>
    );
  },
);

const styles = StyleSheet.create({
  root: { gap: 10, paddingBottom: 8 },
  pendingCard: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 8,
  },
  pendingPet: { width: 96, height: 96 },
  pendingPetFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingName: { fontSize: 18, fontWeight: '800' },
  pendingHint: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  outcome: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  outcomePet: { width: 112, height: 112 },
  outcomeIconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outcomeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  outcomeBadgeText: { fontSize: 13, fontWeight: '800' },
  outcomeTitle: { fontSize: 20, fontWeight: '800' },
  outcomeBody: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  readyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 4,
  },
  readyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  readyText: { fontSize: 12, fontWeight: '700' },
  sec: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  offerWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 52,
  },
  empty: { fontSize: 13, fontWeight: '600', paddingVertical: 8 },
  chip: {
    width: 72,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 6,
    alignItems: 'center',
    gap: 2,
  },
  chipImg: { width: 36, height: 36 },
  chipEmoji: { fontSize: 22 },
  chipQty: { fontSize: 11, fontWeight: '800' },
  chipLabel: { fontSize: 10, fontWeight: '600' },
  invScroll: { maxHeight: 280 },
  invGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  invCell: {
    width: '30%',
    minWidth: 96,
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 8,
    alignItems: 'center',
    gap: 2,
  },
  invImg: { width: 40, height: 40 },
  invQty: { fontSize: 12, fontWeight: '800' },
  invLabel: { fontSize: 10, fontWeight: '600' },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.base,
    paddingTop: 10,
    paddingBottom: 10,
  },
  footerRow: { flexDirection: 'row', gap: 10 },
  footerBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerGhost: { borderWidth: 1.5, backgroundColor: 'transparent' },
  footerBtnText: { fontSize: 15, fontWeight: '800' },
  waitBlock: { gap: 8, alignItems: 'center' },
  waitText: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
  },
  waitHint: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  waitCancel: {
    alignSelf: 'stretch',
    height: 44,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
