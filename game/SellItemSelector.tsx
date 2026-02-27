/**
 * Sell item selector — uses BatchItemSelector for DRY UI.
 * Snapshot inventory on mount. Dispatch to backend on sell.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import { GemIcon } from '@/components/ui/GemIcon';
import { BatchItemSelector } from './BatchItemSelector';
import { useBatchItemTransfer } from './useBatchItemTransfer';
import type { ItemDefinition, InventorySlot } from './types';

export interface SellItemSelectorProps {
  initialSlots: InventorySlot[];
  itemDefs: Record<string, ItemDefinition>;
  getSellPrice: (def: ItemDefinition) => number;
  onSellBatch: (items: Array<{ itemType: string; qty: number }>) => void;
  onSellError?: (message: string) => void;
  highlightedItemType?: string;
  colors: {
    surface: string;
    surfaceElevated: string;
    border: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    primary: string;
    accent: string;
    gemColor?: string;
  };
}

export function SellItemSelector({
  initialSlots,
  itemDefs,
  getSellPrice,
  onSellBatch,
  onSellError,
  highlightedItemType,
  colors,
}: SellItemSelectorProps) {
  const {
    availableSlots,
    selectedSlots,
    toTransfer,
    addItem,
    removeFromSlot,
    applyTransfer,
  } = useBatchItemTransfer({ initialSlots, maxSlots: 6 });

  const handleConfirm = useCallback(
    async (items: Array<{ itemType: string; qty: number }>) => {
      applyTransfer(items);
      try {
        onSellBatch(items);
      } catch {
        onSellError?.('Something went wrong selling your items.');
      }
    },
    [applyTransfer, onSellBatch, onSellError],
  );

  const totalGems = toTransfer.reduce((sum, { itemType, qty }) => {
    const def = itemDefs[itemType];
    return sum + (def ? getSellPrice(def) * qty : 0);
  }, 0);

  return (
    <BatchItemSelector
      availableSlots={availableSlots}
      selectedSlots={selectedSlots}
      toTransfer={toTransfer}
      itemDefs={itemDefs}
      addItem={addItem}
      removeFromSlot={removeFromSlot}
      onConfirm={handleConfirm}
      highlightedItemType={highlightedItemType}
      confirmLabel={`Sell ${toTransfer.length} item${toTransfer.length !== 1 ? 's' : ''}`}
      colors={colors}
      sectionLabelSelected="Selected to sell"
      sectionLabelInventory="Your inventory"
      emptyInventoryText="Nothing to sell yet."
      emptySelectedText="All items are in the sell basket above. Tap a slot to remove."
      recyclingKeyPrefix="sell"
      renderConfirmLeft={() => (
        <View style={sellStyles.totalRow}>
          <GemIcon size={14} />
          <Text style={[sellStyles.totalText, { color: colors.gemColor ?? colors.accent }]}>
            +{totalGems} total
          </Text>
        </View>
      )}
      renderFooter={(items) => (
        <View style={[sellStyles.breakdownRow, { borderTopColor: colors.border }]}>
          {items
            .filter(({ itemType }) => itemDefs[itemType])
            .map(({ itemType, qty }, index, arr) => {
              const def = itemDefs[itemType]!;
              const price = getSellPrice(def);
              const lineTotal = price * qty;
              const isLast = index === arr.length - 1;
              return (
                <View
                  key={`bd-${itemType}-${index}`}
                  style={[
                    sellStyles.breakdownItem,
                    { borderBottomColor: colors.border },
                    isLast && sellStyles.breakdownItemLast,
                  ]}
                >
                  {def.imageUrl ? (
                    <CachedImage
                      source={{ uri: def.imageUrl }}
                      style={sellStyles.breakdownImg}
                      resizeMode="contain"
                      recyclingKey={`sell-bd-${itemType}`}
                    />
                  ) : (
                    <Text style={{ fontSize: 12 }}>{def.emoji}</Text>
                  )}
                  <Text style={[sellStyles.breakdownText, { color: colors.text }]} numberOfLines={1}>
                    {def.label}
                  </Text>
                  <View style={sellStyles.breakdownGemsRow}>
                    <GemIcon size={12} />
                    <Text style={[sellStyles.breakdownGems, { color: colors.gemColor ?? colors.accent }]}>
                      {price} × {qty} = {lineTotal}
                    </Text>
                  </View>
                </View>
              );
            })}
        </View>
      )}
    />
  );
}

const sellStyles = StyleSheet.create({
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  totalText: { fontSize: 14, fontWeight: '700' },
  breakdownRow: {
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  breakdownItemLast: { borderBottomWidth: 0 },
  breakdownImg: { width: 24, height: 24 },
  breakdownText: { flex: 1, fontSize: 13, fontWeight: '600' },
  breakdownGemsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  breakdownGems: { fontSize: 13, fontWeight: '800' },
});
