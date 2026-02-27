/**
 * Quest dialog highlight logic: raw highlight, stepped highlight, and auto-advance.
 *
 * Stepped highlights redirect to HUD buttons or world items when the target UI isn't open yet
 * (e.g. highlight shop button first if we need to highlight a shop item but shop is closed).
 */

import { useCallback, useMemo } from 'react';
import type { QuestHighlight } from '../types';
import type { GameState } from './types';
import { getDrawerOpenerForHighlight } from '../shared/drawerHighlightConfig';
import type { DrawerHighlightType } from '../shared/drawerHighlightConfig';

interface UseQuestHighlightParams {
  state: GameState;
  dispatch: React.Dispatch<import('./types').GameAction>;
}

interface UseQuestHighlightResult {
  /** Raw highlight from the current dialog step (before stepping). */
  rawHighlight: QuestHighlight | null;
  /** Stepped highlight: may redirect to hud_button or world_item when drawer isn't open. */
  activeHighlight: QuestHighlight | null;
  /** Attempts to advance the dialog when the given action matches the highlight target. */
  tryAutoAdvanceDialog: (action: string, itemType?: string) => void;
  /** Sets whether the shop drawer is open (for stepped highlight). */
  setShopOpen: (open: boolean) => void;
  setSellBoxOpen: (open: boolean) => void;
  setCookingOpen: (open: boolean) => void;
  setFoodDishOpen: (open: boolean) => void;
  setEquipOpen: (open: boolean) => void;
  /** Called when user selects a shop category chip (triggers auto-advance if matching). */
  onShopCategorySelect: (categoryKey: string) => void;
}

/**
 * Manages quest dialog highlights and auto-advance logic.
 *
 * @param params - Current state and dispatch.
 * @returns Highlight values and related callbacks.
 */
export function useQuestHighlight({ state, dispatch }: UseQuestHighlightParams): UseQuestHighlightResult {
  const rawHighlight: QuestHighlight | null = useMemo(() => {
    if (!state.currentQuestDialog) return null;
    const step = state.currentQuestDialog[state.questDialogIndex];
    return step?.highlight ?? null;
  }, [state.currentQuestDialog, state.questDialogIndex]);

  const activeHighlight: QuestHighlight | null = useMemo(() => {
    if (!rawHighlight) return null;
    const needsBackpack = rawHighlight.type === 'inventory_item' || rawHighlight.type === 'category_chip';
    if (needsBackpack && !state.editMode) {
      return { type: 'hud_button', target: 'backpack' };
    }
    const needsShop = rawHighlight.type === 'shop_item' || rawHighlight.type === 'shop_category';
    if (needsShop && !state.shopOpen) {
      return { type: 'hud_button', target: 'shop' };
    }
    const drawerTypes: DrawerHighlightType[] = ['sell_item', 'cook_item', 'food_dish_item', 'equip_item'];
    const drawerOpenMap: Record<DrawerHighlightType, boolean> = {
      sell_item: state.sellBoxOpen,
      cook_item: state.cookingOpen,
      food_dish_item: state.foodDishOpen,
      equip_item: state.equipOpen,
    };
    for (const dt of drawerTypes) {
      if (rawHighlight.type === dt && !drawerOpenMap[dt]) {
        const opener = getDrawerOpenerForHighlight(dt);
        return { type: opener.type, target: opener.target };
      }
    }
    return rawHighlight;
  }, [rawHighlight, state.editMode, state.shopOpen, state.sellBoxOpen, state.cookingOpen, state.foodDishOpen, state.equipOpen]);

  const tryAutoAdvanceDialog = useCallback(
    (action: string, itemType?: string) => {
      if (!rawHighlight) return;
      const step = state.currentQuestDialog?.[state.questDialogIndex];
      if (!step?.highlight) return;

      let shouldAdvance = false;
      const ht = step.highlight.type;
      const tgt = step.highlight.target;
      switch (ht) {
        case 'inventory_item':
          if (action === 'place' && tgt === itemType) shouldAdvance = true;
          break;
        case 'world_item':
          if ((action === 'harvest' || action === 'water' || action === 'interact') && tgt === itemType) shouldAdvance = true;
          break;
        case 'hud_button':
          if (action === 'hud_action' && tgt === itemType) shouldAdvance = true;
          else if (action === tgt) shouldAdvance = true;
          break;
        case 'category_chip':
          if (action === 'select_category' && tgt === itemType) shouldAdvance = true;
          break;
        case 'shop_item':
          if (action === 'purchase' && tgt === itemType) shouldAdvance = true;
          break;
        case 'shop_category':
          if (action === 'select_shop_category' && tgt === itemType) shouldAdvance = true;
          break;
        case 'sell_item':
          if (action === 'sell' && tgt === itemType) shouldAdvance = true;
          break;
        case 'cook_item':
          if (action === 'cook' && tgt === itemType) shouldAdvance = true;
          break;
        case 'food_dish_item':
          if (action === 'add_to_food_dish' && tgt === itemType) shouldAdvance = true;
          break;
        case 'equip_item':
          if (action === 'equip' && tgt === itemType) shouldAdvance = true;
          break;
      }
      if (shouldAdvance) {
        dispatch({ type: 'ADVANCE_QUEST_DIALOG' });
      }
    },
    [rawHighlight, state.currentQuestDialog, state.questDialogIndex, dispatch],
  );

  const setShopOpen = useCallback(
    (open: boolean) => dispatch({ type: 'SET_SHOP_OPEN', open }),
    [dispatch],
  );
  const setSellBoxOpen = useCallback(
    (open: boolean) => dispatch({ type: 'SET_SELL_BOX_OPEN', open }),
    [dispatch],
  );
  const setCookingOpen = useCallback(
    (open: boolean) => dispatch({ type: 'SET_COOKING_OPEN', open }),
    [dispatch],
  );
  const setFoodDishOpen = useCallback(
    (open: boolean) => dispatch({ type: 'SET_FOOD_DISH_OPEN', open }),
    [dispatch],
  );
  const setEquipOpen = useCallback(
    (open: boolean) => dispatch({ type: 'SET_EQUIP_OPEN', open }),
    [dispatch],
  );

  const onShopCategorySelect = useCallback(
    (categoryKey: string) => tryAutoAdvanceDialog('select_shop_category', categoryKey),
    [tryAutoAdvanceDialog],
  );

  return {
    rawHighlight,
    activeHighlight,
    tryAutoAdvanceDialog,
    setShopOpen,
    setSellBoxOpen,
    setCookingOpen,
    setFoodDishOpen,
    setEquipOpen,
    onShopCategorySelect,
  };
}
