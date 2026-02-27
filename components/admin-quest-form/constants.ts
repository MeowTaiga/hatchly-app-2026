/**
 * Constants for the admin quest form.
 */

import type { QuestType } from './types';

export const QUEST_TYPES: { key: QuestType; label: string }[] = [
  { key: 'farm_upgrade', label: 'Farm Upgrade' },
  { key: 'story', label: 'Story' },
  { key: 'daily', label: 'Daily' },
];

export const TRIGGER_TYPES = ['start', 'quest_complete', 'talk_to_npc', 'enter_scene', 'manual'] as const;

export const PLACEHOLDERS = [
  { key: '{playername}', label: 'Player name' },
  { key: '{item}', label: 'Item (use first reward)' },
  { key: '{stone_pickaxe}', label: 'Item image (use any item slug)' },
] as const;

export const HIGHLIGHT_TYPES = [
  'hud_button',
  'inventory_item',
  'world_item',
  'category_chip',
  'shop_item',
  'shop_category',
  'sell_item',
  'cook_item',
  'food_dish_item',
  'equip_item',
] as const;

export const HUD_BUTTON_TARGETS = ['backpack', 'shop', 'trash', 'farm_info', 'bestiary', 'equip'] as const;

export const DEFAULT_ACTION_TYPES = ['harvest', 'place', 'remove', 'water', 'catch'] as const;

export const EQUIP_SLOTS = ['handTool', 'bobber', 'bait', 'chair'] as const;
