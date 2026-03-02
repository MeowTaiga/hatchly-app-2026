/**
 * Reusable item search drawer — 85% height bottom sheet for selecting items.
 * Used by ItemSearchDropdown and can be used standalone with a trigger.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import { StableFormInput } from '@/components/ui/StableFormInput';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/ThemeProvider';
import { radius, spacing } from '@/constants/theme';

export interface SearchableItem {
  key: string;
  label: string;
  imageUrl?: string;
}

export interface ItemSearchDrawerProps {
  /** Whether the drawer is visible. When true, presents the modal. */
  visible: boolean;
  /** Called when the drawer is dismissed. */
  onClose: () => void;
  /** Full list of items to search through. */
  items: SearchableItem[];
  /** Currently selected item key. */
  value: string;
  /** Called when an item is selected. Also closes the drawer. */
  onSelect: (key: string) => void;
  /** Placeholder for the search input. */
  placeholder?: string;
  /** When true, allows submitting a custom value not in the list. */
  allowCustom?: boolean;
  /** Optional title shown in the header. */
  title?: string;
}

const SNAP_POINTS = ['85%'];

export function ItemSearchDrawer({
  visible,
  onClose,
  items,
  value,
  onSelect,
  placeholder = 'Search items…',
  allowCustom = false,
  title,
}: ItemSearchDrawerProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const sheetRef = useRef<BottomSheetModal>(null);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((i) => i.label.toLowerCase().includes(q) || i.key.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => {
    if (visible) {
      setQuery('');
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleSelect = useCallback(
    (key: string) => {
      onSelect(key);
      onClose();
    },
    [onSelect, onClose],
  );

  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.35}
        pressBehavior="close"
      />
    ),
    [],
  );

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        searchRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: spacing.base,
        },
        input: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 4 },
        thumb: { width: 28, height: 28, borderRadius: 6 },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 12,
          paddingVertical: 12,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        rowLabel: { fontSize: 15, color: colors.text, flex: 1 },
        rowSub: { fontSize: 12, color: colors.textMuted },
        empty: { padding: 24, alignItems: 'center' },
        emptyText: { fontSize: 14, color: colors.textMuted },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.xs,
          paddingBottom: spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        headerTitle: { fontSize: 18, fontWeight: '600', color: colors.text, flex: 1 },
        closeButton: { marginLeft: spacing.sm },
      }),
    [colors],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={SNAP_POINTS}
      enablePanDownToClose
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      onDismiss={handleDismiss}
      handleIndicatorStyle={[baseStyles.handleIndicator, { backgroundColor: colors.border }]}
      backgroundStyle={[baseStyles.sheetBackground, { backgroundColor: colors.surface }]}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.headerTitle} numberOfLines={1}>
          {title ?? placeholder}
        </Text>
        <Pressable onPress={handleDismiss} hitSlop={12} style={dynamicStyles.closeButton}>
          <Ionicons name="close-circle" size={28} color={colors.textMuted} />
        </Pressable>
      </View>
      <BottomSheetScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.base, paddingBottom: spacing.xl * 2 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
        <View style={dynamicStyles.searchRow}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <StableFormInput
            style={dynamicStyles.input}
            value={query}
            onChangeText={setQuery}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            autoFocus
            autoCapitalize="none"
          />
        </View>
        {allowCustom && query.trim() && !filtered.some((i) => i.key === query.trim()) && (
          <Pressable style={dynamicStyles.row} onPress={() => handleSelect(query.trim())}>
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[dynamicStyles.rowLabel, { color: colors.primary }]}>Use "{query.trim()}"</Text>
              <Text style={dynamicStyles.rowSub}>Custom value</Text>
            </View>
          </Pressable>
        )}
        {filtered.length === 0 && !allowCustom ? (
          <View style={dynamicStyles.empty}>
            <Text style={dynamicStyles.emptyText}>No items found</Text>
          </View>
        ) : (
          filtered.map((item) => (
            <Pressable key={item.key} style={dynamicStyles.row} onPress={() => handleSelect(item.key)}>
              {item.imageUrl && <CachedImage source={{ uri: item.imageUrl }} style={dynamicStyles.thumb} />}
              <View style={{ flex: 1 }}>
                <Text style={dynamicStyles.rowLabel}>{item.label}</Text>
                <Text style={dynamicStyles.rowSub}>{item.key}</Text>
              </View>
              {item.key === value && <Ionicons name="checkmark" size={20} color={colors.primary} />}
            </Pressable>
          ))
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const baseStyles = StyleSheet.create({
  handleIndicator: { width: 40, height: 4, borderRadius: 2 },
  sheetBackground: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
});
