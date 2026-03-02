/**
 * Types for the Game HUD components.
 */

import type { Scene, InventorySlot, ItemCategory, ItemDefinition, ToolMode, QuestHighlight, HarvestEffect } from '../types';
import type { DropZoneLayout } from '../DraggablePlacedItem';

export interface GameHUDProps {
  activeScene: Scene;
  farmName: string;
  editMode: boolean;
  toolMode: ToolMode;
  placeableSlots: InventorySlot[];
  displaySlots: InventorySlot[];
  selectedItemType: string | null;
  activeCategory: ItemCategory | 'all';
  farmLevel: number;
  gems: number;
  canUpgrade: boolean;
  itemDefs: Record<string, ItemDefinition>;
  movingItemId: string | null;
  activeHighlight: QuestHighlight | null;
  harvestEffects: HarvestEffect[];
  onDismissHarvestEffect: (id: string) => void;
  onBackToFarm: () => void;
  onSelectItem: (itemType: string | null) => void;
  onOpenShop: () => void;
  onOpenFarmInfo: () => void;
  onSetCategory: (cat: ItemCategory | 'all') => void;
  onCancelMove: () => void;
  onSetToolMode: (mode: ToolMode) => void;
  onOpenBestiary?: () => void;
  onOpenEquip?: () => void;
  onBuildPaletteLayout?: (layout: DropZoneLayout | null) => void;
  onPaletteDragStart?: (itemType: string, def: ItemDefinition) => void;
  onPaletteDragUpdate?: (x: number, y: number, def: ItemDefinition) => void;
  onPaletteDragEnd?: (itemType: string, x: number, y: number) => void;
  /** Called after admin actions (reset farm/quests) to refresh game state. */
  onRefreshGame?: () => void;
}

export type { Scene, InventorySlot, ItemCategory, ItemDefinition, ToolMode, QuestHighlight };
