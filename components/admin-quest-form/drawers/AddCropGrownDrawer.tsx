/**
 * Drawer for adding/editing a crop_grown requirement.
 */

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { Field } from '../FormField';
import { ItemSearchDropdown } from '@/components/ui/ItemSearchDropdown';
import type { SearchableItem } from '@/components/ui/ItemSearchDropdown';
import type { CropGrownReq } from '../types';
import { useTheme } from '@/store/ThemeProvider';
import { createThemedStyles } from '../styles';

interface AddCropGrownDrawerProps {
  items: SearchableItem[];
  onSave: (item: CropGrownReq, editIndex?: number) => void;
}

export interface AddCropGrownDrawerRef {
  open: (initial?: CropGrownReq | null, editIndex?: number) => void;
}

export const AddCropGrownDrawer = forwardRef<AddCropGrownDrawerRef, AddCropGrownDrawerProps>(
  function AddCropGrownDrawer({ items, onSave }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const [state, setState] = React.useState<CropGrownReq>({ itemType: '', count: '1' });
    const editIndexRef = React.useRef<number | undefined>(undefined);
    const { theme } = useTheme();
    const ts = createThemedStyles(theme);
    const { colors } = theme;

    useImperativeHandle(ref, () => ({
      open: (init?: CropGrownReq | null, editIndex?: number) => {
        setState(init ?? { itemType: '', count: '1' });
        editIndexRef.current = editIndex;
        drawerRef.current?.open();
      },
    }));

    const handleSave = () => {
      if (!state.itemType.trim()) return;
      onSave({ itemType: state.itemType.trim(), count: state.count || '1' }, editIndexRef.current);
      drawerRef.current?.close();
    };

    return (
      <AppDrawer ref={drawerRef} title="Crop Grown" snapPoints={['90%']}>
        <View style={{ gap: 16 }}>
          <Field label="Crop / Seed">
            <ItemSearchDropdown items={items} value={state.itemType} onSelect={(k) => setState((s) => ({ ...s, itemType: k }))} placeholder="Select crop…" />
          </Field>
          <Field label="Count">
            <TextInput
              style={ts.input}
              value={state.count}
              onChangeText={(v) => setState((s) => ({ ...s, count: v.replace(/\D/g, '') || '1' }))}
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
