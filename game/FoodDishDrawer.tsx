/**
 * Food Dish Drawer — Fill a placed food dish for the pet to eat from.
 * Capacity scales with farm level and is shown as bowl seats in the selector.
 */

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { FoodDishSelector } from './FoodDishSelector';
import { getMaxFoodDishQueueSize } from './foodDishCapacity';
import { useTheme } from '@/store/ThemeProvider';
import { useAuth } from '@/store/AuthProvider';
import { spacing } from '@/constants/theme';
import type { ItemDefinition, InventorySlot } from './types';
import type { QuestHighlight } from './types';

export interface FoodDishDrawerRef {
  open: (anchorId: string) => void;
  close: () => void;
}

interface FoodDishDrawerProps {
  itemDefs: Record<string, ItemDefinition>;
  inventory: InventorySlot[];
  farmLevel: number;
  foodDishQueues?: Record<string, string[]>;
  onAddToDish: (anchorId: string, items: Array<{ itemType: string; qty: number }>) => void;
  onError?: (message: string) => void;
  activeHighlight?: QuestHighlight | null;
  onOpenChange?: (open: boolean) => void;
  tryAutoAdvanceDialog?: (action: string, itemType?: string) => void;
}

export const FoodDishDrawer = forwardRef<FoodDishDrawerRef, FoodDishDrawerProps>(
  function FoodDishDrawer(
    {
      itemDefs,
      inventory,
      farmLevel,
      foodDishQueues,
      onAddToDish,
      onError,
      activeHighlight,
      onOpenChange,
      tryAutoAdvanceDialog,
    },
    ref,
  ) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const [anchorId, setAnchorId] = useState<string | null>(null);
    const { theme } = useTheme();
    const colors = theme.colors;
    const { user } = useAuth();
    const [openCount, setOpenCount] = useState(0);

    const maxCapacity = useMemo(() => getMaxFoodDishQueueSize(farmLevel), [farmLevel]);

    const foodSlots = useMemo(() => {
      return inventory.filter((slot) => {
        const def = itemDefs[slot.itemType];
        return def && slot.qty > 0 && def.category === 'food';
      });
    }, [inventory, itemDefs]);

    const queue = useMemo(() => {
      if (!anchorId || !foodDishQueues) return [];
      return foodDishQueues[anchorId] ?? [];
    }, [anchorId, foodDishQueues]);

    const highlightedItemType =
      activeHighlight?.type === 'food_dish_item' ? activeHighlight.target : undefined;

    const handleDrawerChange = useCallback(
      (index: number) => {
        onOpenChange?.(index >= 0);
      },
      [onOpenChange],
    );

    const handleAddToDish = useCallback(
      (id: string, items: Array<{ itemType: string; qty: number }>) => {
        items.forEach(({ itemType }) => tryAutoAdvanceDialog?.('add_to_food_dish', itemType));
        onAddToDish(id, items);
      },
      [onAddToDish, tryAutoAdvanceDialog],
    );

    useImperativeHandle(ref, () => ({
      open: (id: string) => {
        setAnchorId(id);
        setOpenCount((c) => c + 1);
        drawerRef.current?.open();
      },
      close: () => drawerRef.current?.close(),
    }));

    const title =
      queue.length >= maxCapacity
        ? `Pet Bowl · Full (${maxCapacity})`
        : `Pet Bowl · ${queue.length}/${maxCapacity}`;

    return (
      <AppDrawer
        ref={drawerRef}
        title={title}
        snapPoints={['65%', '92%']}
        onChange={handleDrawerChange}
      >
        {anchorId && (
          <View style={styles.drawerContent}>
            <FoodDishSelector
              key={`${anchorId}-${openCount}`}
              initialSlots={foodSlots}
              itemDefs={itemDefs}
              queue={queue}
              maxCapacity={maxCapacity}
              petHunger={user?.pet?.hunger}
              onAddToDish={(items) => handleAddToDish(anchorId, items)}
              onError={onError}
              highlightedItemType={highlightedItemType}
              colors={colors}
            />
          </View>
        )}
      </AppDrawer>
    );
  },
);

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
    paddingBottom: spacing.sm,
  },
});
