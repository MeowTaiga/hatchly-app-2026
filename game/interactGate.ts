/**
 * Evaluate interactAction gates (farm/pet level + inventory/equip requirements).
 * Mirrors quest live-requirement kinds without consuming items.
 */

import type { InteractAction, ItemDefinition } from './types';

export interface InteractGateContext {
  inventory: Record<string, number> | Array<{ itemType: string; qty: number }>;
  farmLevel: number;
  petLevel?: number;
  equipped?: {
    handTool?: string;
    bobber?: string;
    bait?: string;
    chair?: string;
  };
  itemDefs: Record<string, ItemDefinition>;
}

function inventoryQty(
  inventory: InteractGateContext['inventory'],
  itemType: string,
): number {
  if (Array.isArray(inventory)) {
    return inventory.find((s) => s.itemType === itemType)?.qty ?? 0;
  }
  return inventory[itemType] ?? 0;
}

function equippedInSlot(
  equipped: InteractGateContext['equipped'],
  slot: string,
): string | undefined {
  if (!equipped) return undefined;
  if (slot === 'handTool') return equipped.handTool;
  if (slot === 'bobber') return equipped.bobber;
  if (slot === 'bait') return equipped.bait;
  if (slot === 'chair') return equipped.chair;
  return undefined;
}

export interface InteractGateResult {
  ok: boolean;
  /** Short pet-dialog friendly reason when blocked. */
  message?: string;
}

/**
 * Returns ok when the action has no gate, or all level + item/equip checks pass.
 */
export function evaluateInteractGate(
  act: InteractAction | undefined | null,
  ctx: InteractGateContext,
): InteractGateResult {
  if (!act || act.type === 'none') return { ok: true };

  const farmMin = act.farmLevelMin;
  if (farmMin != null && farmMin > 0 && ctx.farmLevel < farmMin) {
    const goingSomewhere = act.type === 'open_scene';
    return {
      ok: false,
      message: goingSomewhere
        ? `My farm needs to be level ${farmMin} before I can go there…`
        : `My farm needs to be level ${farmMin} before I can use that…`,
    };
  }

  const petMin = act.petLevelMin;
  if (petMin != null && petMin > 0 && (ctx.petLevel ?? 0) < petMin) {
    return {
      ok: false,
      message: `I need Lv. ${petMin} before I can use that…`,
    };
  }

  const req = act.requirements;
  if (!req) return { ok: true };

  for (const { itemType, qty } of req.items ?? []) {
    const have = inventoryQty(ctx.inventory, itemType);
    if (have < qty) {
      const label = ctx.itemDefs[itemType]?.label ?? itemType;
      return {
        ok: false,
        message:
          qty <= 1
            ? `I need a ${label} first…`
            : `I need ${qty} ${label} first…`,
      };
    }
  }

  for (const { slot, itemType } of req.equips ?? []) {
    const equipped = equippedInSlot(ctx.equipped, slot);
    if (!equipped) {
      return { ok: false, message: `I should equip something in my ${slot} first…` };
    }
    if (itemType && equipped !== itemType) {
      const label = ctx.itemDefs[itemType]?.label ?? itemType;
      return { ok: false, message: `I need to equip a ${label} first…` };
    }
  }

  return { ok: true };
}

export function interactActionHasGate(act: InteractAction | undefined | null): boolean {
  if (!act || act.type === 'none') return false;
  return (
    (act.farmLevelMin != null && act.farmLevelMin > 0) ||
    (act.petLevelMin != null && act.petLevelMin > 0) ||
    (act.requirements?.items?.length ?? 0) > 0 ||
    (act.requirements?.equips?.length ?? 0) > 0
  );
}
