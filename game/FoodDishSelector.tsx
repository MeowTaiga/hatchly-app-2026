/**
 * Food dish selector — uses BatchItemSelector to add food to a dish.
 */

import React, { useCallback } from 'react';
import { BatchItemSelector } from './BatchItemSelector';
import { useBatchItemTransfer } from './useBatchItemTransfer';
import type { ItemDefinition, InventorySlot } from './types';
import type { BatchItemSelectorColors } from './BatchItemSelector';

export interface FoodDishSelectorProps {
  initialSlots: InventorySlot[];
  itemDefs: Record<string, ItemDefinition>;
  onAddToDish: (items: Array<{ itemType: string; qty: number }>) => void;
  onError?: (message: string) => void;
  highlightedItemType?: string;
  colors: BatchItemSelectorColors;
}

export function FoodDishSelector({
  initialSlots,
  itemDefs,
  onAddToDish,
  onError,
  highlightedItemType,
  colors,
}: FoodDishSelectorProps) {
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
        onAddToDish(items);
      } catch {
        onError?.('Something went wrong adding food to the dish.');
      }
    },
    [applyTransfer, onAddToDish, onError],
  );

  const itemCount = toTransfer.reduce((s, x) => s + x.qty, 0);

  return (
    <BatchItemSelector
      availableSlots={availableSlots}
      selectedSlots={selectedSlots}
      toTransfer={toTransfer}
      itemDefs={itemDefs}
      addItem={addItem}
      removeFromSlot={removeFromSlot}
      onConfirm={handleConfirm}
      confirmLabel={`Add ${itemCount} item${itemCount !== 1 ? 's' : ''} to dish`}
      colors={colors}
      sectionLabelSelected="Selected to add"
      sectionLabelInventory="Your food"
      emptyInventoryText="No food in your inventory."
      emptySelectedText="All food is in the basket above. Tap a slot to remove."
      recyclingKeyPrefix="fooddish"
      highlightedItemType={highlightedItemType}
    />
  );
}
