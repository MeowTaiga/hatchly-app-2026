/**
 * Drawer for adding/editing an item requirement.
 */

import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { Field } from '../FormField';
import { ItemSearchDropdown } from '@/components/ui/ItemSearchDropdown';
import type { SearchableItem } from '@/components/ui/ItemSearchDropdown';
import type { ItemReq } from '../types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/store/ThemeProvider';
import { createThemedStyles } from '../styles';

interface AddItemRequirementDrawerProps {
  items: SearchableItem[];
  onSave: (item: ItemReq, editIndex?: number) => void;
}

export interface AddItemRequirementDrawerRef {
  open: (initial?: ItemReq | null, editIndex?: number) => void;
}

export const AddItemRequirementDrawer = forwardRef<AddItemRequirementDrawerRef, AddItemRequirementDrawerProps>(
  function AddItemRequirementDrawer({ items, onSave }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const [state, setState] = React.useState<ItemReq>({ itemType: '', qty: '1' });
    const editIndexRef = React.useRef<number | undefined>(undefined);
    const { theme } = useTheme();
    const ts = createThemedStyles(theme);
    const { colors } = theme;

    useImperativeHandle(ref, () => ({
      open: (init?: ItemReq | null, editIndex?: number) => {
        setState(init ?? { itemType: '', qty: '1' });
        editIndexRef.current = editIndex;
        drawerRef.current?.open();
      },
    }));

    const handleSave = () => {
      if (!state.itemType.trim()) return;
      onSave({ itemType: state.itemType.trim(), qty: state.qty || '1' }, editIndexRef.current);
      drawerRef.current?.close();
    };

    return (
      <AppDrawer ref={drawerRef} title="Item Requirement" snapPoints={['90%']}>
        <View style={{ gap: spacing.base }}>
          <Field label="Item">
            <ItemSearchDropdown items={items} value={state.itemType} onSelect={(k) => setState((s) => ({ ...s, itemType: k }))} placeholder="Select item…" />
          </Field>
          <Field label="Quantity">
            <TextInput
              style={ts.input}
              value={state.qty}
              onChangeText={(v) => setState((s) => ({ ...s, qty: v.replace(/\D/g, '') || '1' }))}
              placeholder="1"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />
          </Field>
          <Pressable onPress={handleSave} style={{ backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', color: colors.onPrimary ?? '#fff' }}>Save</Text>
          </Pressable>
        </View>
      </AppDrawer>
    );
  },
);
