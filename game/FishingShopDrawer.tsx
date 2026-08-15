/**
 * FishingShopDrawer — Shop drawer for the fishing building.
 * Shows items with shopSection 'fishing_shop', allows selling fish.
 */

import React, { forwardRef } from 'react';
import { ShopDrawer, type ShopDrawerRef, type ShopDrawerConfig } from './ShopDrawer';
import type { ItemDefinition, InventorySlot } from './types';
import type { QuestHighlight } from './types';

export interface FishingShopDrawerRef {
  open: () => void;
  close: () => void;
}

interface FishingShopDrawerProps {
  gems: number;
  farmLevel: number;
  petLevel: number;
  itemDefs: Record<string, ItemDefinition>;
  inventory: InventorySlot[];
  onPurchase: (itemType: string) => void;
  onClose?: () => void;
  activeHighlight?: QuestHighlight | null;
}

const FISHING_SHOP_CONFIG: ShopDrawerConfig = {
  title: 'Fishing Shop',
  sectionKey: 'fishing_shop',
  includeSubCategories: ['fishing_poles', 'fishing_pole', 'fishing_bobber', 'bait'],
  useSubCategoryChips: true,
};

export const FishingShopDrawer = forwardRef<FishingShopDrawerRef, FishingShopDrawerProps>(
  function FishingShopDrawer(
    { gems, farmLevel, petLevel, itemDefs, inventory, onPurchase, onClose, activeHighlight },
    ref,
  ) {
    return (
      <ShopDrawer
        ref={ref}
        config={FISHING_SHOP_CONFIG}
        gems={gems}
        farmLevel={farmLevel}
        petLevel={petLevel}
        itemDefs={itemDefs}
        inventory={inventory}
        onPurchase={onPurchase}
        onClose={onClose}
        activeHighlight={activeHighlight}
      />
    );
  },
);
