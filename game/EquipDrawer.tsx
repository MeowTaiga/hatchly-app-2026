/**
 * EquipDrawer — Manage equipped hand tool, bobber, bait, and chair.
 * Tabs: Tools (handTool + bobber + bait) | Chairs.
 * handTool = mutually exclusive (fishing pole, bug net, pickaxe, etc.)
 */

import React, { forwardRef, useImperativeHandle, useRef, useMemo, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/ThemeProvider';
import type { InventorySlot, ItemDefinition } from './types';
import type { EquippedSnapshot } from './types';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { spacing, radius } from '@/constants/theme';
import { getSlotForSubCategory, type EquipSlotKey } from './equipConfig';

const TOOLS_SLOTS: {
  key: 'handTool' | 'bobber' | 'bait';
  label: string;
  subCategories: readonly string[];
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'handTool', label: 'Tool', subCategories: ['fishing_poles', 'fishing_pole', 'bug_net', 'bug_nets', 'pickaxe', 'pickaxes', 'shovel', 'shovels'], icon: 'hammer-outline' },
  { key: 'bobber', label: 'Bobber', subCategories: ['fishing_bobber'], icon: 'ellipse-outline' },
  { key: 'bait', label: 'Bait', subCategories: ['bait'], icon: 'leaf-outline' },
];

const CHAIR_SLOT = {
  key: 'chair' as const,
  label: 'Chair',
  subCategories: ['chairs', 'chair'] as const,
  icon: 'bed-outline' as keyof typeof Ionicons.glyphMap,
};

export interface EquipDrawerRef {
  open: () => void;
  close: () => void;
}

interface EquipDrawerProps {
  equipped: EquippedSnapshot | undefined;
  inventory: InventorySlot[];
  itemDefs: Record<string, ItemDefinition>;
  onEquip: (slot: EquipSlotKey, itemType: string | null) => void;
  onClose?: () => void;
  activeHighlight?: import('./types').QuestHighlight | null;
  onOpenChange?: (open: boolean) => void;
  tryAutoAdvanceDialog?: (action: string, itemType?: string) => void;
}

const equipCardHighlight = { borderWidth: 2, borderColor: '#FFD700' };

export const EquipDrawer = forwardRef<EquipDrawerRef, EquipDrawerProps>(
  function EquipDrawer({ equipped, inventory, itemDefs, onEquip, onClose, activeHighlight, onOpenChange, tryAutoAdvanceDialog }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const { theme } = useTheme();
    const colors = theme.colors;
    const [activeTab, setActiveTab] = useState<'tools' | 'chairs'>('tools');

    useImperativeHandle(ref, () => ({
      open: () => drawerRef.current?.open(),
      close: () => drawerRef.current?.close(),
    }));

    const isTools = activeTab === 'tools';
    const slots = isTools ? TOOLS_SLOTS : [CHAIR_SLOT];

    const available = useMemo(() => {
      const subCategories = slots.flatMap((s) => s.subCategories);
      return inventory
        .filter((s) => {
          const d = itemDefs[s.itemType];
          return d?.subCategory && subCategories.includes(d.subCategory) && s.qty > 0;
        })
        .map((s) => ({ ...s, def: itemDefs[s.itemType]! }))
        .filter((s) => s.def);
    }, [inventory, itemDefs, slots]);

    const highlightedItemType =
      activeHighlight?.type === 'equip_item' ? activeHighlight.target : undefined;

    const handleEquip = useCallback(
      (slotKey: EquipSlotKey, itemType: string | null) => {
        if (itemType) tryAutoAdvanceDialog?.('equip', itemType);
        onEquip(slotKey, itemType);
      },
      [onEquip, tryAutoAdvanceDialog],
    );

    const cardShadow = useMemo(
      () =>
        Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
          },
          android: { elevation: 2 },
        }) as object,
      [],
    );

    return (
      <AppDrawer
        ref={drawerRef}
        title="Equipment"
        snapPoints={['65%']}
        showCloseButton
        scrollable
        onClose={onClose}
        onChange={(index) => onOpenChange?.(index >= 0)}
      >
        {/* Tabs: Tools | Chairs */}
        <View style={s.tabRow}>
          <Pressable
            style={[s.tab, { backgroundColor: activeTab === 'tools' ? colors.primary : 'rgba(0,0,0,0.05)' }]}
            onPress={() => setActiveTab('tools')}
          >
            <Ionicons name="hammer-outline" size={18} color={activeTab === 'tools' ? (colors.onPrimary ?? '#fff') : colors.textSecondary} />
            <Text style={[s.tabText, { color: activeTab === 'tools' ? (colors.onPrimary ?? '#fff') : colors.textSecondary }]}>Tools</Text>
          </Pressable>
          <Pressable
            style={[s.tab, { backgroundColor: activeTab === 'chairs' ? colors.primary : 'rgba(0,0,0,0.05)' }]}
            onPress={() => setActiveTab('chairs')}
          >
            <Ionicons name="cube-outline" size={18} color={activeTab === 'chairs' ? (colors.onPrimary ?? '#fff') : colors.textSecondary} />
            <Text style={[s.tabText, { color: activeTab === 'chairs' ? (colors.onPrimary ?? '#fff') : colors.textSecondary }]}>Chairs</Text>
          </Pressable>
        </View>

        {/* Slot row */}
        <View style={s.slotsRow}>
          {slots.map((slot) => {
            const currentItemType = equipped?.[slot.key];
            const def = currentItemType ? itemDefs[currentItemType] : null;
            return (
              <Pressable
                key={slot.key}
                style={[
                  s.slotCard,
                  {
                    backgroundColor: currentItemType ? colors.surfaceElevated : colors.surface,
                    borderColor: currentItemType ? colors.primary : colors.border,
                    borderWidth: currentItemType ? 2 : 1,
                  },
                  cardShadow,
                ]}
                onPress={() => currentItemType && handleEquip(slot.key, null)}
              >
                {currentItemType && def ? (
                  <>
                    <View style={s.slotImageWrap}>
                      {def.imageUrl ? (
                        <CachedImage source={{ uri: def.imageUrl }} style={s.slotImage} resizeMode="contain" />
                      ) : (
                        <Text style={s.slotEmoji}>{def.emoji}</Text>
                      )}
                    </View>
                    <Text style={[s.slotLabel, { color: colors.text }]} numberOfLines={1}>
                      {slot.label}
                    </Text>
                  </>
                ) : (
                  <>
                    <View style={[s.slotEmpty, { backgroundColor: colors.border + '40' }]}>
                      <Ionicons name={slot.icon} size={24} color={colors.textMuted} />
                    </View>
                    <Text style={[s.slotLabel, { color: colors.textMuted }]}>{slot.label}</Text>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Available in backpack */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>In backpack</Text>
          {available.length === 0 ? (
            <View style={[s.emptyState, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Ionicons name="bag-outline" size={32} color={colors.textMuted} />
              <Text style={[s.emptyStateText, { color: colors.textMuted }]}>
                No {isTools ? 'tools' : 'chairs'} in your backpack
              </Text>
              <Text style={[s.emptyStateHint, { color: colors.textMuted }]}>
                {isTools ? 'Acquire tools from the shop' : 'Acquire chairs from the shop or crafting'}
              </Text>
            </View>
          ) : (
            <View style={s.grid}>
              {available.map(({ itemType, qty, def: d }) => {
                const slotKey = getSlotForSubCategory(d!.subCategory!);
                const isEquipped = equipped?.[slotKey] === itemType;
                return (
                  <Pressable
                    key={itemType}
                    style={[
                      s.availableCard,
                      {
                        backgroundColor: isEquipped ? colors.surfaceElevated : colors.surface,
                        borderColor: isEquipped ? colors.primary : colors.border,
                        borderWidth: isEquipped ? 2 : 1,
                      },
                      cardShadow,
                      highlightedItemType === itemType && equipCardHighlight,
                    ]}
                    onPress={() => handleEquip(slotKey, isEquipped ? null : itemType)}
                  >
                    <View style={s.availableImageWrap}>
                      {d!.imageUrl ? (
                        <CachedImage source={{ uri: d!.imageUrl }} style={s.availableImage} resizeMode="contain" />
                      ) : (
                        <Text style={s.availableEmoji}>{d!.emoji}</Text>
                      )}
                      {isEquipped && (
                        <View style={[s.equippedCheck, { backgroundColor: colors.primary }]}>
                          <Ionicons name="checkmark" size={12} color={colors.onPrimary ?? '#fff'} />
                        </View>
                      )}
                    </View>
                    <Text style={[s.availableLabel, { color: colors.text }]} numberOfLines={1}>
                      {d!.label}
                    </Text>
                    <Text style={[s.availableQty, { color: colors.textSecondary }]}>×{qty}</Text>
                    <Text style={[s.equipHint, { color: isEquipped ? colors.primary : colors.textMuted }]}>
                      {isEquipped ? 'Tap to unequip' : 'Tap to equip'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </AppDrawer>
    );
  },
);

const s = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.lg,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  slotsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.xl,
  },
  slotCard: {
    flex: 1,
    minWidth: 80,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  slotImageWrap: {
    marginBottom: 4,
  },
  slotImage: {
    width: 44,
    height: 44,
  },
  slotEmoji: {
    fontSize: 32,
  },
  slotLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  slotEmpty: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  emptyState: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  emptyStateHint: {
    fontSize: 12,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  availableCard: {
    width: '30%',
    minWidth: 90,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  availableImageWrap: {
    position: 'relative',
    marginBottom: 4,
  },
  availableImage: {
    width: 44,
    height: 44,
  },
  availableEmoji: {
    fontSize: 32,
  },
  equippedCheck: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availableLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  availableQty: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  equipHint: {
    fontSize: 9,
    marginTop: 4,
  },
});
