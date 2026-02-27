/**
 * Drawer for adding/editing an open_modal requirement.
 */

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { Field } from '../FormField';
import { ItemSearchDropdown } from '@/components/ui/ItemSearchDropdown';
import type { SearchableItem } from '@/components/ui/ItemSearchDropdown';
import type { OpenModalReq } from '../types';
import { useTheme } from '@/store/ThemeProvider';
import { createThemedStyles } from '../styles';

interface AddOpenModalDrawerProps {
  payloads: string[];
  onSave: (item: OpenModalReq, editIndex?: number) => void;
}

export interface AddOpenModalDrawerRef {
  open: (initial?: OpenModalReq | null, editIndex?: number) => void;
}

export const AddOpenModalDrawer = forwardRef<AddOpenModalDrawerRef, AddOpenModalDrawerProps>(
  function AddOpenModalDrawer({ payloads, onSave }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const [state, setState] = React.useState<OpenModalReq>({ payload: '', count: '1' });
    const editIndexRef = React.useRef<number | undefined>(undefined);
    const { theme } = useTheme();
    const ts = createThemedStyles(theme);
    const { colors } = theme;
    const payloadItems: SearchableItem[] = payloads.map((p) => ({ key: p, label: p }));

    useImperativeHandle(ref, () => ({
      open: (init?: OpenModalReq | null, editIndex?: number) => {
        setState(init ?? { payload: '', count: '1' });
        editIndexRef.current = editIndex;
        drawerRef.current?.open();
      },
    }));

    const handleSave = () => {
      if (!state.payload.trim()) return;
      onSave({ payload: state.payload.trim(), count: state.count || '1' }, editIndexRef.current);
      drawerRef.current?.close();
    };

    return (
      <AppDrawer ref={drawerRef} title="Open Modal" snapPoints={['90%']}>
        <View style={{ gap: 16 }}>
          <Field label="Payload">
            <ItemSearchDropdown items={payloadItems} value={state.payload} onSelect={(k) => setState((s) => ({ ...s, payload: k }))} placeholder="Select payload…" allowCustom />
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
