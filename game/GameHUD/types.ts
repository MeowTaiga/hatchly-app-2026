/**
 * Types for the Game HUD components.
 */

import type { Scene, InventorySlot, ItemCategory, ItemDefinition, ToolMode, QuestHighlight, HarvestEffect } from '../types';
import type { DropZoneLayout } from '../world/WorldItem';
import type { PaletteDragHandlers } from './BuildPalette';

/** HUD buttons a quest dialog can point at. Mirrors the server's list. */
export type HudButtonTarget = 'backpack' | 'shop' | 'trash' | 'farm_info' | 'bestiary' | 'equip';

export interface GameHUDProps {
  activeScene: Scene;
  farmName: string;
  editMode: boolean;
  toolMode: ToolMode;
  placeableSlots: InventorySlot[];
  displaySlots: InventorySlot[];
  /** Unfiltered inventory — used to hide empty backpack category tabs. */
  inventorySlots: InventorySlot[];
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
  /** Max backpack stacks — shown on the backpack button badge. */
  backpackSlots?: number;
  /**
   * Reports which HUD button was pressed, by the same target names a quest
   * dialog highlight uses. A dialog step pointing at a HUD button has no other
   * way to know it was obeyed.
   */
  onHudAction?: (target: HudButtonTarget) => void;
  onBuildPaletteLayout?: (layout: DropZoneLayout | null) => void;
  /** Drag plumbing for the build palette slots. */
  paletteDrag: PaletteDragHandlers;
  /** Called after admin actions (reset farm/quests) to refresh game state. */
  onRefreshGame?: () => void;
}

export type { Scene, InventorySlot, ItemCategory, ItemDefinition, ToolMode, QuestHighlight };

