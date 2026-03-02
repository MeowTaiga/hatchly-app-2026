/**
 * Build palette: category chips and item strip. Slides up when build mode is active.
 */

import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { ItemCategory, ItemDefinition, QuestHighlight } from '../types';
import { ITEM_CATEGORIES } from '../types';
import { DraggablePaletteSlot } from '../DraggablePaletteSlot';

interface InventorySlot {
  itemType: string;
  qty: number;
}

interface BuildPaletteProps {
  editMode: boolean;
  toolMode: string;
  expanded: boolean;
  displaySlots: InventorySlot[];
  selectedItemType: string | null;
  activeCategory: ItemCategory | 'all';
  bottomOffset: number;
  buildPaletteRef: React.RefObject<View>;
  styles: ReturnType<typeof import('./styles').createHudStyles>;
  highlightGlowStyle: object;
  buildPaletteAnimatedStyle: object;
  slotWrapperAnimatedStyle: object;
  isHighlighted: (type: QuestHighlight['type'], target: string) => boolean;
  onSetCategory: (cat: ItemCategory | 'all') => void;
  onSetExpanded: (expanded: boolean) => void;
  onSelectItem: (itemType: string | null) => void;
  onPaletteDragStart?: (itemType: string, def: ItemDefinition) => void;
  onPaletteDragUpdate?: (x: number, y: number, def: ItemDefinition) => void;
  onPaletteDragEnd?: (itemType: string, x: number, y: number) => void;
  paletteDismissed?: boolean;
  itemDefs: Record<string, ItemDefinition>;
  colors: { onPrimary?: string; textSecondary: string };
}

function ItemSlotRow({
  displaySlots,
  selectedItemType,
  itemDefs,
  styles,
  highlightGlowStyle,
  isHighlighted,
  onSelectItem,
  onPaletteDragStart,
  onPaletteDragUpdate,
  onPaletteDragEnd,
  horizontal,
}: {
  displaySlots: InventorySlot[];
  selectedItemType: string | null;
  itemDefs: Record<string, ItemDefinition>;
  styles: ReturnType<typeof import('./styles').createHudStyles>;
  highlightGlowStyle: object;
  isHighlighted: (type: QuestHighlight['type'], target: string) => boolean;
  onSelectItem: (itemType: string | null) => void;
  onPaletteDragStart?: (itemType: string, def: ItemDefinition) => void;
  onPaletteDragUpdate?: (x: number, y: number, def: ItemDefinition) => void;
  onPaletteDragEnd?: (itemType: string, x: number, y: number) => void;
  horizontal: boolean;
}) {
  const noop = () => {};
  const slotList = displaySlots.map((slot) => {
    const def = itemDefs[slot.itemType];
    if (!def) return null;
    const canPlace = !!def.placeable;
    const isActive = selectedItemType === slot.itemType;
    const hl = isHighlighted('inventory_item', slot.itemType);
    return (
      <DraggablePaletteSlot
        key={slot.itemType}
        itemType={slot.itemType}
        def={def}
        qty={slot.qty}
        isActive={isActive}
        onPress={() => (canPlace ? onSelectItem(isActive ? null : slot.itemType) : undefined)}
        onDragStart={canPlace ? (onPaletteDragStart ?? noop) : noop}
        onDragUpdate={canPlace ? (onPaletteDragUpdate ?? noop) : noop}
        onDragEnd={canPlace ? (onPaletteDragEnd ?? noop) : noop}
      >
        <View
          style={[
            styles.buildSlot,
            isActive && styles.buildSlotActive,
            hl && styles.highlightBorder,
            !canPlace && styles.buildSlotInert,
          ]}
        >
          <View style={styles.buildSlotIconWrap}>
            {def.imageUrl ? (
              <CachedImage source={{ uri: def.imageUrl }} style={styles.buildSlotImage} resizeMode="contain" />
            ) : (
              <Text style={styles.buildSlotEmoji}>{def.emoji}</Text>
            )}
            <View style={[styles.buildQtyBadge, isActive && styles.buildQtyBadgeActive]}>
              <Text style={[styles.buildQtyText, isActive && styles.buildQtyTextActive]}>{slot.qty}</Text>
            </View>
          </View>
          <Text
            style={[styles.buildSlotLabel, isActive && styles.buildSlotLabelActive]}
            numberOfLines={1}
          >
            {def.label}
          </Text>
        </View>
      </DraggablePaletteSlot>
    );
  });

  return (
    <>
      {slotList}
      {displaySlots.length === 0 && <Text style={styles.buildEmptyHint}>No items</Text>}
    </>
  );
}

export function BuildPalette({
  editMode,
  toolMode,
  expanded,
  displaySlots,
  selectedItemType,
  activeCategory,
  bottomOffset,
  buildPaletteRef,
  styles,
  highlightGlowStyle,
  buildPaletteAnimatedStyle,
  slotWrapperAnimatedStyle,
  isHighlighted,
  onSetCategory,
  onSetExpanded,
  onSelectItem,
  onPaletteDragStart,
  onPaletteDragUpdate,
  onPaletteDragEnd,
  paletteDismissed,
  itemDefs,
  colors,
}: BuildPaletteProps) {
  const trashMessageStyles = StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    icon: { flexShrink: 0 },
    text: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      flex: 1,
      lineHeight: 20,
    },
  });

  const slotProps = {
    displaySlots,
    selectedItemType,
    itemDefs,
    styles,
    highlightGlowStyle,
    isHighlighted,
    onSelectItem,
    onPaletteDragStart,
    onPaletteDragUpdate,
    onPaletteDragEnd,
  };

  const isTrashMode = toolMode === 'trash';

  return (
    <Animated.View
      style={[
        styles.buildPalette,
        { bottom: bottomOffset },
        buildPaletteAnimatedStyle,
      ]}
      pointerEvents={editMode && (toolMode === 'build' || toolMode === 'trash') && !paletteDismissed ? 'box-none' : 'none'}
    >
      <View ref={buildPaletteRef} style={styles.buildPaletteInner} pointerEvents="auto" collapsable={false}>
        {isTrashMode ? (
          <Animated.View style={[styles.buildSlotScroll, slotWrapperAnimatedStyle]}>
            <View style={trashMessageStyles.wrap}>
              <Ionicons name="trash-outline" size={28} color={colors.textSecondary} style={trashMessageStyles.icon} />
              <Text style={trashMessageStyles.text}>
                Tap any item on your farm to store it back in your backpack.
              </Text>
            </View>
          </Animated.View>
        ) : (
          <>
            <View style={styles.buildChipRowWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.buildChipScrollContent}
                style={styles.buildChipScroll}
              >
                {ITEM_CATEGORIES.map((cat) => {
                  const active = activeCategory === cat.key;
                  const hl = isHighlighted('category_chip', cat.key);
                  return (
                    <Animated.View key={cat.key} style={[hl && highlightGlowStyle, { borderRadius: 20 }]}>
                      <Pressable
                        style={[
                          styles.buildChip,
                          active && styles.buildChipActive,
                          hl && styles.highlightBorder,
                        ]}
                        onPress={() => onSetCategory(cat.key)}
                      >
                        <Ionicons
                          name={cat.ionicon as any}
                          size={16}
                          color={active ? colors.onPrimary ?? '#fff' : colors.textSecondary}
                        />
                        <Text style={[styles.buildChipText, active && styles.buildChipTextActive]} numberOfLines={1}>
                          {cat.label}
                        </Text>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </ScrollView>
              <Pressable
                style={[styles.buildChip, styles.expandChip, expanded && styles.expandChipActive]}
                onPress={() => onSetExpanded(!expanded)}
              >
                <Ionicons
                  name={!expanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={expanded ? colors.onPrimary ?? '#fff' : colors.textSecondary}
                />
              </Pressable>
            </View>

            <Animated.View style={[styles.buildSlotScroll, slotWrapperAnimatedStyle]}>
              {expanded ? (
                <ScrollView
                  horizontal={false}
                  showsVerticalScrollIndicator
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[styles.buildSlotRow, styles.buildSlotRowWrap]}
                  style={{ flex: 1 }}
                >
                  <ItemSlotRow {...slotProps} horizontal={false} />
                </ScrollView>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.buildSlotRow}
                  style={{ flex: 1 }}
                >
                  <ItemSlotRow {...slotProps} horizontal={true} />
                </ScrollView>
              )}
            </Animated.View>
          </>
        )}
      </View>
    </Animated.View>
  );
}
