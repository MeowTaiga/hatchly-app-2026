/**
 * Types for the admin item form state and reducer.
 */

import type { ItemCategory, AdminGameItemHarvestDrop } from '@/lib/api';
import type { ActionType } from './constants';

export type { AdminGameItemHarvestDrop };

export interface FormState {
  // Identity
  label: string;
  imageUrl: string;
  category: ItemCategory;
  itemType: string;
  subCategory: string;

  // Grid & Behavior
  placeable: boolean;
  cols: string;
  rows: string;
  autoConnect: boolean;
  centerOverflow: boolean;
  directionalImages: Record<string, string>;

  // Shop
  buyable: boolean;
  gemPrice: string;
  sellable: boolean;
  sellPrice: string;
  farmLevel: string;
  petLevel: string;
  shopSection: string;
  shopCurrency: string;
  isCurrency: boolean;
  availableUntil: string;

  // Crop
  growthMs: string;
  harvestYield: AdminGameItemHarvestDrop[];
  gemsGiven: string;

  // Bug
  bugSizeMin: string;
  bugSizeMax: string;
  bugRarity: string;
  bugActiveTime: string;
  bugSpawnOn: string[];
  bugScenes: string[];

  // Fish
  fishSizeMin: string;
  fishSizeMax: string;
  fishRarity: string;
  fishActiveTime: string;
  fishSpotTypes: string[];

  // Light
  lightEnabled: boolean;
  lightRadius: string;
  lightColor: string;
  lightIntensity: string;

  // Food
  foodHunger: string;
  foodHappiness: string;
  foodPetXp: string;
  foodBuffType: string;
  foodBuffDurationMs: string;

  // Interact
  actionType: ActionType;
  actionPayload: string;

  // NPC dialog (when category === 'npc')
  npcDialog: { text: string }[];

  // Image prompt (local only, not saved to item)
  imagePrompt: string;
  promptTouched: boolean;

  // Reference item for image generation (local only)
  referenceItemType: string;

  // Color scheme from another item (local only)
  colorSchemeItemType: string;
  extractedColors: string[];
  selectedColorIndices: number[];

  // Fruit (subCategory 'fruit')
  growsOnTrees: string[];
}

export type FormField = keyof Omit<FormState, 'harvestYield' | 'directionalImages'>;
