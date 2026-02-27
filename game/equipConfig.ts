/**
 * Equip slot configuration. Single source of truth for client.
 * handTool = mutually exclusive (fishing pole, bug net, pickaxe, etc.)
 * chair, bobber, bait = independent slots.
 */

export const HAND_TOOL_SUB_CATEGORIES = [
  'fishing_poles',
  'fishing_pole',
  'bug_net',
  'bug_nets',
  'pickaxe',
  'pickaxes',
  'shovel',
  'shovels',
] as const;

export type HandToolSubCategory = (typeof HAND_TOOL_SUB_CATEGORIES)[number];

export const FISHING_POLE_SUB_CATEGORIES = ['fishing_poles', 'fishing_pole'] as const;
export const BUG_NET_SUB_CATEGORIES = ['bug_net', 'bug_nets'] as const;
export const PICKAXE_SUB_CATEGORIES = ['pickaxe', 'pickaxes'] as const;
export const SHOVEL_SUB_CATEGORIES = ['shovel', 'shovels'] as const;

export type EquipSlotKey = 'handTool' | 'bobber' | 'bait' | 'chair';

export const EQUIP_SLOTS: EquipSlotKey[] = ['handTool', 'bobber', 'bait', 'chair'];

export const SLOT_TO_SUB_CATEGORIES: Record<EquipSlotKey, readonly string[]> = {
  handTool: HAND_TOOL_SUB_CATEGORIES,
  bobber: ['fishing_bobber'],
  bait: ['bait'],
  chair: ['chairs', 'chair'],
};

export function isHandToolSubCategory(subCategory: string | undefined): boolean {
  if (!subCategory) return false;
  return (HAND_TOOL_SUB_CATEGORIES as readonly string[]).includes(subCategory);
}

export function isFishingPoleSubCategory(subCategory: string | undefined): boolean {
  if (!subCategory) return false;
  return (FISHING_POLE_SUB_CATEGORIES as readonly string[]).includes(subCategory);
}

export function isBugNetSubCategory(subCategory: string | undefined): boolean {
  if (!subCategory) return false;
  return (BUG_NET_SUB_CATEGORIES as readonly string[]).includes(subCategory);
}

export function isPickaxeSubCategory(subCategory: string | undefined): boolean {
  if (!subCategory) return false;
  return (PICKAXE_SUB_CATEGORIES as readonly string[]).includes(subCategory);
}

export function isShovelSubCategory(subCategory: string | undefined): boolean {
  if (!subCategory) return false;
  return (SHOVEL_SUB_CATEGORIES as readonly string[]).includes(subCategory);
}

export function getSlotForSubCategory(subCategory: string): EquipSlotKey {
  for (const [slot, subs] of Object.entries(SLOT_TO_SUB_CATEGORIES)) {
    if (subs.includes(subCategory)) return slot as EquipSlotKey;
  }
  return 'handTool';
}

/** Game logic helpers: check if handTool itemType is a fishing pole, bug net, or pickaxe. */
export function isFishingPole(itemType: string | undefined, itemDefs: Record<string, { subCategory?: string }>): boolean {
  if (!itemType) return false;
  return isFishingPoleSubCategory(itemDefs[itemType]?.subCategory);
}

export function isBugNet(itemType: string | undefined, itemDefs: Record<string, { subCategory?: string }>): boolean {
  if (!itemType) return false;
  return isBugNetSubCategory(itemDefs[itemType]?.subCategory);
}

export function isPickaxe(itemType: string | undefined, itemDefs: Record<string, { subCategory?: string }>): boolean {
  if (!itemType) return false;
  return isPickaxeSubCategory(itemDefs[itemType]?.subCategory);
}

export function isShovel(itemType: string | undefined, itemDefs: Record<string, { subCategory?: string }>): boolean {
  if (!itemType) return false;
  return isShovelSubCategory(itemDefs[itemType]?.subCategory);
}
