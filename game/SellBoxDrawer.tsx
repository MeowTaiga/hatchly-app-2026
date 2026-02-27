/**
 * Sell Box Drawer — Sell items from inventory.
 * Opened by interacting with the sell_box placement on the farm.
 * UI is fully isolated: snapshot inventory on open, modify in place, dispatch to backend.
 */

import React, { forwardRef, useImperativeHandle, useRef, useMemo, useState, useCallback } from 'react';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { SellItemSelector } from './SellItemSelector';
import { useTheme } from '@/store/ThemeProvider';
import type { ItemDefinition, InventorySlot } from './types';
import type { QuestHighlight } from './types';

export interface SellBoxDrawerRef {
  open: () => void;
  close: () => void;
}

function getSellPrice(def: ItemDefinition): number {
  return typeof def.sellPrice === 'number' ? def.sellPrice : 0;
}

interface SellBoxDrawerProps {
  itemDefs: Record<string, ItemDefinition>;
  inventory: InventorySlot[];
  onSellBatch: (items: Array<{ itemType: string; qty: number }>) => void;
  onSellError?: (message: string) => void;
  activeHighlight?: QuestHighlight | null;
  onOpenChange?: (open: boolean) => void;
  tryAutoAdvanceDialog?: (action: string, itemType?: string) => void;
}

export const SellBoxDrawer = forwardRef<SellBoxDrawerRef, SellBoxDrawerProps>(
  function SellBoxDrawer({ itemDefs, inventory, onSellBatch, onSellError, activeHighlight, onOpenChange, tryAutoAdvanceDialog }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const { theme } = useTheme();
    const colors = theme.colors;
    const [openCount, setOpenCount] = useState(0);

    const sellableSlots = useMemo(() => {
      return inventory.filter((slot) => {
        const def = itemDefs[slot.itemType];
        return def && slot.qty > 0 && def.sellable !== false;
      });
    }, [inventory, itemDefs]);

    const highlightedItemType =
      activeHighlight?.type === 'sell_item' ? activeHighlight.target : undefined;

    const handleDrawerChange = useCallback(
      (index: number) => {
        onOpenChange?.(index >= 0);
      },
      [onOpenChange],
    );

    const handleSellBatch = useCallback(
      (items: Array<{ itemType: string; qty: number }>) => {
        items.forEach(({ itemType }) => tryAutoAdvanceDialog?.('sell', itemType));
        onSellBatch(items);
      },
      [onSellBatch, tryAutoAdvanceDialog],
    );

    useImperativeHandle(ref, () => ({
      open: () => {
        setOpenCount((c) => c + 1);
        drawerRef.current?.open();
      },
      close: () => drawerRef.current?.close(),
    }));

    return (
      <AppDrawer
        ref={drawerRef}
        title="Sell Items"
        snapPoints={['60%', '90%']}
        onChange={handleDrawerChange}
      >
        <SellItemSelector
          key={openCount}
          initialSlots={sellableSlots}
          itemDefs={itemDefs}
          getSellPrice={getSellPrice}
          onSellBatch={handleSellBatch}
          onSellError={onSellError}
          highlightedItemType={highlightedItemType}
          colors={colors}
        />
      </AppDrawer>
    );
  },
);
