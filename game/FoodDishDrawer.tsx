/**
 * Food Dish Drawer — Add food items to a placed food dish.
 * Opened by interacting with a food_dish item on the farm.
 */

import React, { forwardRef, useImperativeHandle, useRef, useMemo, useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { CachedImage } from '@/components/ui/CachedImage';
import { FoodDishSelector } from './FoodDishSelector';
import { useTheme } from '@/store/ThemeProvider';
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
  foodDishQueues?: Record<string, string[]>;
  onAddToDish: (anchorId: string, items: Array<{ itemType: string; qty: number }>) => void;
  onError?: (message: string) => void;
  activeHighlight?: QuestHighlight | null;
  onOpenChange?: (open: boolean) => void;
  tryAutoAdvanceDialog?: (action: string, itemType?: string) => void;
}

const QUEUE_ITEM_SIZE = 36;

export const FoodDishDrawer = forwardRef<FoodDishDrawerRef, FoodDishDrawerProps>(
  function FoodDishDrawer({ itemDefs, inventory, foodDishQueues, onAddToDish, onError, activeHighlight, onOpenChange, tryAutoAdvanceDialog }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const [anchorId, setAnchorId] = useState<string | null>(null);
    const { theme } = useTheme();
    const colors = theme.colors;
    const [openCount, setOpenCount] = useState(0);

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
      (anchorId: string, items: Array<{ itemType: string; qty: number }>) => {
        items.forEach(({ itemType }) => tryAutoAdvanceDialog?.('add_to_food_dish', itemType));
        onAddToDish(anchorId, items);
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

    return (
      <AppDrawer ref={drawerRef} title="Add Food to Dish" snapPoints={['60%', '90%']} onChange={handleDrawerChange}>
        {anchorId && (
          <View style={styles.drawerContent}>
            {queue.length > 0 && (
              <View style={styles.queueSection}>
                <Text style={[styles.queueLabel, { color: colors.textSecondary }]}>
                  In dish (next eaten first)
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.queueRow}
                >
                  {queue.map((itemType, index) => {
                    const def = itemDefs[itemType];
                    if (!def) return null;
                    return (
                      <View
                        key={`${itemType}-${index}`}
                        style={[styles.queueItem, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                      >
                        {def.imageUrl ? (
                          <CachedImage
                            source={{ uri: def.imageUrl }}
                            style={styles.queueItemImage}
                            resizeMode="contain"
                            recyclingKey={`fooddish-queue-${itemType}-${index}`}
                          />
                        ) : (
                          <Text style={styles.queueItemEmoji}>{def.emoji ?? '?'}</Text>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}
            <FoodDishSelector
              key={openCount}
              initialSlots={foodSlots}
              itemDefs={itemDefs}
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
  },
  queueSection: {
    marginBottom: spacing.lg,
  },
  queueLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  queueRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  queueItem: {
    width: QUEUE_ITEM_SIZE,
    height: QUEUE_ITEM_SIZE,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  queueItemImage: {
    width: QUEUE_ITEM_SIZE - 8,
    height: QUEUE_ITEM_SIZE - 8,
  },
  queueItemEmoji: {
    fontSize: 18,
  },
});
