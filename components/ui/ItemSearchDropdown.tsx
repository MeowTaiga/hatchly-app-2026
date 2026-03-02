/**
 * Reusable searchable dropdown for picking items by name.
 * Renders a trigger that opens ItemSearchDrawer (85% height) when tapped.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/ThemeProvider';
import { radius } from '@/constants/theme';
import { ItemSearchDrawer, type SearchableItem } from './ItemSearchDrawer';

export type { SearchableItem };

interface ItemSearchDropdownProps {
  /** Full list of items to search through. */
  items: SearchableItem[];
  /** Currently selected item key (e.g. itemType slug). */
  value: string;
  /** Called when an item is selected. */
  onSelect: (key: string) => void;
  placeholder?: string;
  /** When true, allows the user to submit a custom value not in the list. */
  allowCustom?: boolean;
}

export function ItemSearchDropdown({
  items,
  value,
  onSelect,
  placeholder = 'Search items…',
  allowCustom,
}: ItemSearchDropdownProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const [open, setOpen] = useState(false);

  const selectedItem = useMemo(() => items.find((i) => i.key === value), [items, value]);

  const handleClose = useCallback(() => setOpen(false), []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        inputRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderWidth: 1,
          borderColor: colors.border,
        },
        selectedLabel: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' },
        thumb: { width: 22, height: 22, borderRadius: 4 },
      }),
    [colors],
  );

  return (
    <>
      <Pressable style={styles.inputRow} onPress={() => setOpen(true)}>
        {selectedItem?.imageUrl && <CachedImage source={{ uri: selectedItem.imageUrl }} style={styles.thumb} />}
        <Text style={selectedItem ? styles.selectedLabel : [styles.selectedLabel, { color: colors.textMuted }]}>
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>
      <ItemSearchDrawer
        visible={open}
        onClose={handleClose}
        items={items}
        value={value}
        onSelect={onSelect}
        placeholder={placeholder}
        allowCustom={allowCustom}
      />
    </>
  );
}
