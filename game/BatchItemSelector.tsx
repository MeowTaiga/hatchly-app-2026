/**
 * Reusable batch item selector — shared UI for sell, food dish, etc.
 */

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import { useHoldToAdd } from '@/hooks/useHoldToAdd';
import { spacing } from '@/constants/theme';
import type { ItemDefinition, InventorySlot } from './types';
import type { TransferSlot } from './useBatchItemTransfer';

const GRID_COLUMNS = 6;
const MAX_SLOTS = 6;
const HOLD_DELAY_MS = 400;
const HOLD_INTERVAL_MS = 150;

export interface BatchItemSelectorColors {
  surface: string;
  surfaceElevated: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  accent: string;
  gemColor?: string;
}

export interface BatchItemSelectorProps {
  availableSlots: InventorySlot[];
  selectedSlots: TransferSlot[];
  toTransfer: Array<{ itemType: string; qty: number }>;
  itemDefs: Record<string, ItemDefinition>;
  addItem: (itemType: string) => void;
  removeFromSlot: (index: number) => void;
  onConfirm: (items: Array<{ itemType: string; qty: number }>) => void;
  confirmLabel: string;
  colors: BatchItemSelectorColors;
  sectionLabelSelected?: string;
  sectionLabelInventory?: string;
  emptyInventoryText?: string;
  emptySelectedText?: string;
  recyclingKeyPrefix?: string;
  /** Optional left content in confirm row (e.g. total gems). */
  renderConfirmLeft?: (toTransfer: Array<{ itemType: string; qty: number }>) => React.ReactNode;
  /** Optional footer (e.g. sell breakdown). Renders below the confirm row. */
  renderFooter?: (toTransfer: Array<{ itemType: string; qty: number }>) => React.ReactNode;
  /** Optional itemType to highlight (quest highlight). */
  highlightedItemType?: string;
}

export function BatchItemSelector({
  availableSlots,
  selectedSlots,
  toTransfer,
  itemDefs,
  addItem,
  removeFromSlot,
  onConfirm,
  confirmLabel,
  colors,
  sectionLabelSelected = 'Selected',
  sectionLabelInventory = 'Your inventory',
  emptyInventoryText = 'Nothing to add.',
  emptySelectedText = 'All items are in the basket above. Tap a slot to remove.',
  recyclingKeyPrefix = 'batch',
  renderConfirmLeft,
  renderFooter,
  highlightedItemType,
}: BatchItemSelectorProps) {
  const cardHighlight = useMemo(
    () => ({ borderWidth: 2, borderColor: '#FFD700' }),
    [],
  );
  const { width } = useWindowDimensions();
  const gap = spacing.sm;
  const cardSize = Math.floor((width - spacing.xl * 4 - gap * (GRID_COLUMNS - 1)) / GRID_COLUMNS);

  const { handlePressIn, handlePressOut, handlePress } = useHoldToAdd(addItem, {
    holdDelayMs: HOLD_DELAY_MS,
    holdIntervalMs: HOLD_INTERVAL_MS,
  });

  const handleRemoveFromSlot = (index: number) => {
    handlePressOut();
    removeFromSlot(index);
  };

  const handleConfirm = () => {
    if (toTransfer.length === 0) return;
    handlePressOut();
    onConfirm(toTransfer);
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        sectionLabel: { fontSize: 12, fontWeight: '700' as const, color: colors.textSecondary, marginBottom: spacing.sm },
        selectedRow: {
          flexDirection: 'row' as const,
          gap: 8,
          marginBottom: spacing.md,
          minHeight: cardSize + 8,
          alignItems: 'center',
        },
        slot: {
          width: cardSize,
          height: cardSize,
          borderRadius: 8,
          backgroundColor: colors.border + '30',
          borderWidth: 2,
          borderColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden' as const,
        },
        slotEmpty: { borderStyle: 'dashed' as const, borderColor: colors.border },
        slotContent: {
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
        },
        placeholder: {
          width: cardSize - 12,
          height: cardSize - 12,
          borderRadius: 4,
          backgroundColor: colors.border + '30',
        },
        grid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap },
        itemCard: {
          width: cardSize,
          height: cardSize + 16,
          borderRadius: 8,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden' as const,
        },
        cardImage: { width: cardSize - 12, height: cardSize - 12 },
        cardQty: {
          position: 'absolute' as const,
          bottom: 2,
          right: 4,
          fontSize: 9,
          fontWeight: '800' as const,
          color: colors.textMuted,
        },
        cardLabel: { fontSize: 8, color: colors.textSecondary, marginTop: 2 },
        confirmRow: {
          flexDirection: 'row' as const,
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: spacing.lg,
          paddingTop: spacing.md,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
        },
        confirmBtn: {
          backgroundColor: colors.primary,
          borderRadius: 12,
          paddingVertical: 12,
          paddingHorizontal: 24,
        },
        confirmBtnText: { fontSize: 15, fontWeight: '800' as const, color: '#fff' },
        emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' as const, paddingVertical: 24 },
      }),
    [colors, cardSize, gap],
  );

  return (
    <View style={{ paddingBottom: spacing.xl * 2 }}>
      <Text style={styles.sectionLabel}>{sectionLabelSelected}</Text>
      <View style={styles.selectedRow}>
        {selectedSlots.map((slot, i) => {
          const def = slot ? itemDefs[slot.itemType] : null;
          const isEmpty = !slot;
          return (
            <Pressable
              key={`sel-${i}`}
              style={[
                styles.slot,
                isEmpty && styles.slotEmpty,
                !isEmpty && slot && highlightedItemType === slot.itemType && cardHighlight,
              ]}
              onPress={!isEmpty ? () => handleRemoveFromSlot(i) : undefined}
            >
              <View style={styles.slotContent}>
                {slot && def ? (
                  <>
                    {def.imageUrl ? (
                      <CachedImage
                        source={{ uri: def.imageUrl }}
                        style={styles.cardImage}
                        resizeMode="contain"
                        recyclingKey={`${recyclingKeyPrefix}-sel-${slot.itemType}`}
                      />
                    ) : (
                      <Text style={{ fontSize: 14 }}>{def.emoji ?? '?'}</Text>
                    )}
                    <Text style={styles.cardQty}>×{slot.qty}</Text>
                  </>
                ) : (
                  <View style={[styles.placeholder, { backgroundColor: colors.border + '30' }]} />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>{sectionLabelInventory}</Text>
      {availableSlots.length === 0 && toTransfer.length === 0 ? (
        <Text style={styles.emptyText}>{emptyInventoryText}</Text>
      ) : availableSlots.length === 0 ? (
        <Text style={styles.emptyText}>{emptySelectedText}</Text>
      ) : (
        <View style={styles.grid}>
          {availableSlots.map((slot) => {
            const def = itemDefs[slot.itemType];
            if (!def) return null;
            return (
              <Pressable
                key={`inv-${slot.itemType}`}
                style={[styles.itemCard, highlightedItemType === slot.itemType && cardHighlight]}
                onPress={() => handlePress(slot.itemType)}
                onPressIn={() => handlePressIn(slot.itemType)}
                onPressOut={handlePressOut}
              >
                {def.imageUrl ? (
                  <CachedImage
                    source={{ uri: def.imageUrl }}
                    style={styles.cardImage}
                    resizeMode="contain"
                    recyclingKey={`${recyclingKeyPrefix}-inv-${slot.itemType}`}
                  />
                ) : (
                  <Text style={{ fontSize: 16 }}>{def.emoji}</Text>
                )}
                <Text style={styles.cardLabel} numberOfLines={1}>
                  {def.label}
                </Text>
                <Text style={styles.cardQty}>×{slot.qty}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {toTransfer.length > 0 && (
        <>
          <View style={styles.confirmRow}>
            {renderConfirmLeft?.(toTransfer) ?? <View style={{ flex: 1 }} />}
            <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmBtnText}>{confirmLabel}</Text>
            </Pressable>
          </View>
          {renderFooter?.(toTransfer)}
        </>
      )}
    </View>
  );
}
