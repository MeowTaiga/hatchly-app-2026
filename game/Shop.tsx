/**
 * Shop — Main HUD shop drawer.
 * Thin wrapper around ShopDrawer with main-shop config (excludes fishing_shop, allows selling fish).
 */

import React, { forwardRef } from 'react';
import { ShopDrawer, type ShopDrawerRef, type ShopDrawerConfig } from './ShopDrawer';
import type { ItemDefinition } from './types';
import type { QuestHighlight } from './types';
import type { InventorySlot } from './types';

// ─── Public ref & props ──────────────────────────────────────────────────────

export interface ShopRef {
  open: () => void;
  close: () => void;
}

interface ShopProps {
  gems: number;
  farmLevel: number;
  petLevel: number;
  farmingSkillLevel?: number;
  itemDefs: Record<string, ItemDefinition>;
  inventory?: InventorySlot[];
  onPurchase: (itemType: string) => void;
  onClose?: () => void;
  activeHighlight?: QuestHighlight | null;
  onOpenChange?: (open: boolean) => void;
  onCategorySelect?: (categoryKey: string) => void;
}

const MAIN_SHOP_CONFIG: ShopDrawerConfig = {
  title: 'Shop',
  excludeSection: 'fishing_shop',
  excludeCategories: ['npc'],
};

export const Shop = forwardRef<ShopRef, ShopProps>(function Shop(
  {
    gems,
    farmLevel,
    petLevel,
    farmingSkillLevel = 0,
    itemDefs,
    inventory = [],
    onPurchase,
    onClose,
    activeHighlight,
    onOpenChange,
    onCategorySelect,
  },
  ref,
) {
  return (
    <ShopDrawer
      ref={ref}
      config={MAIN_SHOP_CONFIG}
      gems={gems}
      farmLevel={farmLevel}
      petLevel={petLevel}
      farmingSkillLevel={farmingSkillLevel}
      itemDefs={itemDefs}
      inventory={inventory}
      onPurchase={onPurchase}
      onClose={onClose}
      activeHighlight={activeHighlight}
      onOpenChange={onOpenChange}
      onCategorySelect={onCategorySelect}
    />
  );
});
