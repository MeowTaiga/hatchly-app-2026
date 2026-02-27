/**
 * Drawer for adding/editing an action requirement.
 */

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { Field } from '../FormField';
import { ItemSearchDropdown } from '@/components/ui/ItemSearchDropdown';
import type { SearchableItem } from '@/components/ui/ItemSearchDropdown';
import type { ActionReq } from '../types';
import { useTheme } from '@/store/ThemeProvider';
import { createThemedStyles } from '../styles';

interface AddActionRequirementDrawerProps {
  items: SearchableItem[];
  actionTypes: string[];
  onSave: (item: ActionReq, editIndex?: number) => void;
}

export interface AddActionRequirementDrawerRef {
  open: (initial?: ActionReq | null, editIndex?: number) => void;
}

export const AddActionRequirementDrawer = forwardRef<AddActionRequirementDrawerRef, AddActionRequirementDrawerProps>(
  function AddActionRequirementDrawer({ items, actionTypes, onSave }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const [state, setState] = React.useState<ActionReq>({ action: 'harvest', count: '1', itemType: '' });
    const editIndexRef = React.useRef<number | undefined>(undefined);
    const { theme } = useTheme();
    const ts = createThemedStyles(theme);
    const { colors } = theme;

    useImperativeHandle(ref, () => ({
      open: (init?: ActionReq | null, editIndex?: number) => {
        setState(init ?? { action: actionTypes[0] ?? 'harvest', count: '1', itemType: '' });
        editIndexRef.current = editIndex;
        drawerRef.current?.open();
      },
    }));

    const handleSave = () => {
      if (!state.action.trim()) return;
      onSave({ action: state.action.trim(), count: state.count || '1', itemType: state.itemType.trim() }, editIndexRef.current);
      drawerRef.current?.close();
    };

    return (
      <AppDrawer ref={drawerRef} title="Action Requirement" snapPoints={['90%']}>
        <View style={{ gap: 16 }}>
          <Field label="Action">
            <View style={ts.chipRow}>
              {actionTypes.map((a) => (
                <Pressable
                  key={a}
                  style={[ts.chip, state.action === a && ts.chipActive]}
                  onPress={() => setState((s) => ({ ...s, action: a }))}
                >
                  <Text style={[ts.chipText, state.action === a && ts.chipTextActive]}>{a}</Text>
                </Pressable>
              ))}
            </View>
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
          <Field label="Specific Item (optional)">
            <ItemSearchDropdown items={items} value={state.itemType} onSelect={(k) => setState((s) => ({ ...s, itemType: k }))} placeholder="Any item" allowCustom />
          </Field>
          <Pressable onPress={handleSave} style={{ backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', color: colors.onPrimary ?? '#fff' }}>Save</Text>
          </Pressable>
        </View>
      </AppDrawer>
    );
  },
);
