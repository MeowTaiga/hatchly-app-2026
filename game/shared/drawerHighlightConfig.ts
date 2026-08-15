/**
 * Config for drawer-based quest highlights.
 * Maps highlight types to their "opener" targets when the drawer is closed.
 */

export const DRAWER_HIGHLIGHT_TYPES = ['sell_item', 'cook_item', 'craft_item', 'food_dish_item', 'equip_item'] as const;

export type DrawerHighlightType = (typeof DRAWER_HIGHLIGHT_TYPES)[number];

/** When drawer is closed, redirect to this highlight so user opens it first. */
export const DRAWER_OPENER_TARGETS: Record<
  DrawerHighlightType,
  { type: 'world_item' | 'hud_button'; target: string }
> = {
  sell_item: { type: 'world_item', target: 'sell_box' },
  cook_item: { type: 'world_item', target: 'cooking_pot' },
  craft_item: { type: 'world_item', target: 'primitive_crafting_table' },
  food_dish_item: { type: 'world_item', target: 'food_dish' },
  equip_item: { type: 'hud_button', target: 'equip' },
};

export function getDrawerOpenerForHighlight(
  type: DrawerHighlightType,
): { type: 'world_item' | 'hud_button'; target: string } {
  return DRAWER_OPENER_TARGETS[type];
}
