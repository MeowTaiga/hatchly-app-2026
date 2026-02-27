/**
 * Drawer for adding/editing a talk_to_npc requirement.
 */

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { Field } from '../FormField';
import { ItemSearchDropdown } from '@/components/ui/ItemSearchDropdown';
import type { SearchableItem } from '@/components/ui/ItemSearchDropdown';
import type { TalkToNpcReq } from '../types';
import { useTheme } from '@/store/ThemeProvider';
import { createThemedStyles } from '../styles';

interface AddTalkToNpcDrawerProps {
  npcItems: SearchableItem[];
  onSave: (item: TalkToNpcReq, editIndex?: number) => void;
}

export interface AddTalkToNpcDrawerRef {
  open: (initial?: TalkToNpcReq | null, editIndex?: number) => void;
}

export const AddTalkToNpcDrawer = forwardRef<AddTalkToNpcDrawerRef, AddTalkToNpcDrawerProps>(
  function AddTalkToNpcDrawer({ npcItems, onSave }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const [state, setState] = React.useState<TalkToNpcReq>({ npcItemType: '', count: '1' });
    const editIndexRef = React.useRef<number | undefined>(undefined);
    const { theme } = useTheme();
    const ts = createThemedStyles(theme);
    const { colors } = theme;

    useImperativeHandle(ref, () => ({
      open: (init?: TalkToNpcReq | null, editIndex?: number) => {
        setState(init ?? { npcItemType: '', count: '1' });
        editIndexRef.current = editIndex;
        drawerRef.current?.open();
      },
    }));

    const handleSave = () => {
      if (!state.npcItemType.trim()) return;
      onSave({ npcItemType: state.npcItemType.trim(), count: state.count || '1' }, editIndexRef.current);
      drawerRef.current?.close();
    };

    return (
      <AppDrawer ref={drawerRef} title="Talk to NPC" snapPoints={['90%']}>
        <View style={{ gap: 16 }}>
          <Field label="NPC">
            <ItemSearchDropdown items={npcItems} value={state.npcItemType} onSelect={(k) => setState((s) => ({ ...s, npcItemType: k }))} placeholder="Select NPC…" />
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
