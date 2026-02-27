/**
 * Drawer for adding/editing an equip requirement.
 */

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { Field } from '../FormField';
import { ItemSearchDropdown } from '@/components/ui/ItemSearchDropdown';
import type { SearchableItem } from '@/components/ui/ItemSearchDropdown';
import type { EquipReq } from '../types';
import { useTheme } from '@/store/ThemeProvider';
import { createThemedStyles } from '../styles';

interface AddEquipRequirementDrawerProps {
  items: SearchableItem[];
  equipSlots: string[];
  onSave: (item: EquipReq, editIndex?: number) => void;
}

export interface AddEquipRequirementDrawerRef {
  open: (initial?: EquipReq | null, editIndex?: number) => void;
}

export const AddEquipRequirementDrawer = forwardRef<AddEquipRequirementDrawerRef, AddEquipRequirementDrawerProps>(
  function AddEquipRequirementDrawer({ items, equipSlots, onSave }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const [state, setState] = React.useState<EquipReq>({ slot: equipSlots[0] ?? 'handTool', itemType: '' });
    const editIndexRef = React.useRef<number | undefined>(undefined);
    const { theme } = useTheme();
    const ts = createThemedStyles(theme);
    const { colors } = theme;

    useImperativeHandle(ref, () => ({
      open: (init?: EquipReq | null, editIndex?: number) => {
        setState(init ?? { slot: equipSlots[0] ?? 'handTool', itemType: '' });
        editIndexRef.current = editIndex;
        drawerRef.current?.open();
      },
    }));

    const handleSave = () => {
      if (!state.slot.trim()) return;
      onSave({ slot: state.slot.trim(), itemType: state.itemType.trim() }, editIndexRef.current);
      drawerRef.current?.close();
    };

    return (
      <AppDrawer ref={drawerRef} title="Equip Requirement" snapPoints={['90%']}>
        <View style={{ gap: 16 }}>
          <Field label="Slot">
            <View style={ts.chipRow}>
              {equipSlots.map((s) => (
                <Pressable
                  key={s}
                  style={[ts.chip, state.slot === s && ts.chipActive]}
                  onPress={() => setState((prev) => ({ ...prev, slot: s }))}
                >
                  <Text style={[ts.chipText, state.slot === s && ts.chipTextActive]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </Field>
          <Field label="Item (optional)">
            <ItemSearchDropdown items={items} value={state.itemType} onSelect={(k) => setState((s) => ({ ...s, itemType: k }))} placeholder="Specific item" allowCustom />
          </Field>
          <Pressable onPress={handleSave} style={{ backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', color: colors.onPrimary ?? '#fff' }}>Save</Text>
          </Pressable>
        </View>
      </AppDrawer>
    );
  },
);
