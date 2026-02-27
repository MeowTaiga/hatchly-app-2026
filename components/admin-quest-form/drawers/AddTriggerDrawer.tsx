/**
 * Drawer for adding/editing a quest trigger.
 */

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { Field, SwitchField } from '../FormField';
import { ItemSearchDropdown } from '@/components/ui/ItemSearchDropdown';
import type { SearchableItem } from '@/components/ui/ItemSearchDropdown';
import type { TriggerForm } from '../types';
import { TRIGGER_TYPES } from '../constants';
import { emptyTrigger } from '../converters';
import { useTheme } from '@/store/ThemeProvider';
import { createThemedStyles } from '../styles';

interface AddTriggerDrawerProps {
  searchableQuests: SearchableItem[];
  npcItems: SearchableItem[];
  searchableScenes: SearchableItem[];
  onSave: (item: TriggerForm, editIndex?: number) => void;
}

export interface AddTriggerDrawerRef {
  open: (initial?: TriggerForm | null, editIndex?: number) => void;
}

export const AddTriggerDrawer = forwardRef<AddTriggerDrawerRef, AddTriggerDrawerProps>(
  function AddTriggerDrawer({ searchableQuests, npcItems, searchableScenes, onSave }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const [state, setState] = React.useState<TriggerForm>(() => emptyTrigger());
    const editIndexRef = React.useRef<number | undefined>(undefined);
    const { theme } = useTheme();
    const ts = createThemedStyles(theme);
    const { colors } = theme;

    useImperativeHandle(ref, () => ({
      open: (init?: TriggerForm | null, editIndex?: number) => {
        setState(init ?? emptyTrigger());
        editIndexRef.current = editIndex;
        drawerRef.current?.open();
      },
    }));

    const handleTypeChange = (type: string) => {
      setState((s) => ({ ...emptyTrigger(), type }));
    };

    const handleSave = () => {
      if (!state.type) return;
      if (state.type === 'quest_complete' && !state.questId) return;
      if (state.type === 'talk_to_npc' && !state.npcItemType) return;
      if (state.type === 'enter_scene' && !state.sceneSlug) return;
      onSave(state, editIndexRef.current);
      drawerRef.current?.close();
    };

    return (
      <AppDrawer ref={drawerRef} title="Trigger" snapPoints={['90%']}>
        <View style={{ gap: 16 }}>
          <Field label="Type">
            <View style={ts.chipRow}>
              {TRIGGER_TYPES.map((t) => (
                <Pressable
                  key={t}
                  style={[ts.chip, state.type === t && ts.chipActive]}
                  onPress={() => handleTypeChange(t)}
                >
                  <Text style={[ts.chipText, state.type === t && ts.chipTextActive]}>{t.replace(/_/g, ' ')}</Text>
                </Pressable>
              ))}
            </View>
          </Field>
          {state.type === 'quest_complete' && (
            <Field label="Quest">
              <ItemSearchDropdown items={searchableQuests} value={state.questId} onSelect={(k) => setState((s) => ({ ...s, questId: k }))} placeholder="Quest to complete…" />
            </Field>
          )}
          {state.type === 'talk_to_npc' && (
            <Field label="NPC">
              <ItemSearchDropdown items={npcItems} value={state.npcItemType} onSelect={(k) => setState((s) => ({ ...s, npcItemType: k }))} placeholder="NPC…" />
            </Field>
          )}
          {state.type === 'enter_scene' && (
            <>
              <Field label="Scene">
                <ItemSearchDropdown items={searchableScenes} value={state.sceneSlug} onSelect={(k) => setState((s) => ({ ...s, sceneSlug: k }))} placeholder="Scene slug…" />
              </Field>
              <SwitchField label="First visit only" value={state.firstVisitOnly} onValueChange={(v) => setState((s) => ({ ...s, firstVisitOnly: v }))} />
            </>
          )}
          <Pressable onPress={handleSave} style={{ backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', color: colors.onPrimary ?? '#fff' }}>Save</Text>
          </Pressable>
        </View>
      </AppDrawer>
    );
  },
);
