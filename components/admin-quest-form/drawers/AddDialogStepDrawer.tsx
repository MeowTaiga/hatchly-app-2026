/**
 * Drawer for adding/editing a dialog step.
 */

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { Field, SwitchField, ChipSelect } from '../FormField';
import { ItemSearchDropdown } from '@/components/ui/ItemSearchDropdown';
import type { SearchableItem } from '@/components/ui/ItemSearchDropdown';
import type { DialogStepForm } from '../types';
import { PLACEHOLDERS, HIGHLIGHT_TYPES, HUD_BUTTON_TARGETS } from '../constants';
import { emptyDialogStep } from '../converters';
import { ITEM_CATEGORIES } from '@/game/types';
import { useTheme } from '@/store/ThemeProvider';
import { createThemedStyles } from '../styles';

interface AddDialogStepDrawerProps {
  searchableItems: SearchableItem[];
  buyableSearchableItems: SearchableItem[];
  onSave: (item: DialogStepForm, editIndex?: number) => void;
}

export interface AddDialogStepDrawerRef {
  open: (initial?: DialogStepForm | null, editIndex?: number) => void;
}

export const AddDialogStepDrawer = forwardRef<AddDialogStepDrawerRef, AddDialogStepDrawerProps>(
  function AddDialogStepDrawer({ searchableItems, buyableSearchableItems, onSave }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const [state, setState] = React.useState<DialogStepForm>(() => emptyDialogStep());
    const editIndexRef = React.useRef<number | undefined>(undefined);
    const { theme } = useTheme();
    const ts = createThemedStyles(theme);
    const { colors } = theme;

    useImperativeHandle(ref, () => ({
      open: (init?: DialogStepForm | null, editIndex?: number) => {
        setState(init ?? emptyDialogStep());
        editIndexRef.current = editIndex;
        drawerRef.current?.open();
      },
    }));

    const handleSave = () => {
      if (!state.text.trim()) return;
      onSave(state, editIndexRef.current);
      drawerRef.current?.close();
    };

    return (
      <AppDrawer ref={drawerRef} title="Dialog Step" snapPoints={['90%']}>
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {PLACEHOLDERS.map((p) => (
              <Pressable
                key={p.key}
                style={[ts.chip, { borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', gap: 4 }]}
                onPress={() => setState((s) => ({ ...s, text: s.text + p.key }))}
              >
                <Text style={[ts.chipText, { color: colors.primary }]}>{p.label}</Text>
                <Text style={[ts.chipText, { fontSize: 10 }]}>{p.key}</Text>
              </Pressable>
            ))}
          </View>
          <Field label="Text">
            <TextInput
              style={[ts.input, { minHeight: 80, textAlignVertical: 'top' }]}
              value={state.text}
              onChangeText={(v) => setState((s) => ({ ...s, text: v }))}
              placeholder="Pet dialog text…"
              placeholderTextColor={colors.textMuted}
              multiline
            />
          </Field>
          <SwitchField label="Blocking (must complete to advance)" value={state.blocking !== false} onValueChange={(v) => setState((s) => ({ ...s, blocking: v }))} />
          <Field label="Speaker (optional override)">
            <ChipSelect<'pet' | 'npc' | ''>
              options={[
                { key: '', label: 'Use default' },
                { key: 'pet', label: 'Pet' },
                { key: 'npc', label: 'NPC' },
              ]}
              value={state.speaker ?? ''}
              onSelect={(v) => setState((s) => ({ ...s, speaker: v === '' ? undefined : v }))}
            />
          </Field>
          <Field label="Highlight (optional)">
            <View style={ts.chipRow}>
              {HIGHLIGHT_TYPES.map((ht) => (
                <Pressable
                  key={ht}
                  style={[ts.chip, state.highlightType === ht && ts.chipActive]}
                  onPress={() => setState((s) => ({ ...s, highlightType: s.highlightType === ht ? '' : ht, highlightTarget: '' }))}
                >
                  <Text style={[ts.chipText, state.highlightType === ht && ts.chipTextActive]}>{ht.replace(/_/g, ' ')}</Text>
                </Pressable>
              ))}
            </View>
          </Field>
          {state.highlightType === 'hud_button' && (
            <Field label="Target">
              <View style={ts.chipRow}>
                {HUD_BUTTON_TARGETS.map((btn) => (
                  <Pressable
                    key={btn}
                    style={[ts.chip, state.highlightTarget === btn && ts.chipActive]}
                    onPress={() => setState((s) => ({ ...s, highlightTarget: btn }))}
                  >
                    <Text style={[ts.chipText, state.highlightTarget === btn && ts.chipTextActive]}>{btn}</Text>
                  </Pressable>
                ))}
              </View>
            </Field>
          )}
          {(state.highlightType === 'inventory_item' || state.highlightType === 'world_item' || state.highlightType === 'category_chip') && (
            <Field label="Target">
              <ItemSearchDropdown items={searchableItems} value={state.highlightTarget} onSelect={(k) => setState((s) => ({ ...s, highlightTarget: k }))} placeholder={`Select ${state.highlightType}…`} />
            </Field>
          )}
          {state.highlightType === 'shop_item' && (
            <Field label="Target">
              <ItemSearchDropdown items={buyableSearchableItems} value={state.highlightTarget} onSelect={(k) => setState((s) => ({ ...s, highlightTarget: k }))} placeholder="Select buyable item…" />
            </Field>
          )}
          {state.highlightType === 'shop_category' && (
            <Field label="Target">
              <View style={ts.chipRow}>
                {ITEM_CATEGORIES.map((c) => (
                  <Pressable
                    key={c.key}
                    style={[ts.chip, state.highlightTarget === c.key && ts.chipActive]}
                    onPress={() => setState((s) => ({ ...s, highlightTarget: c.key }))}
                  >
                    <Text style={[ts.chipText, state.highlightTarget === c.key && ts.chipTextActive]}>{c.label}</Text>
                  </Pressable>
                ))}
              </View>
            </Field>
          )}
          {(state.highlightType === 'sell_item' || state.highlightType === 'cook_item' || state.highlightType === 'food_dish_item' || state.highlightType === 'equip_item') && (
            <Field label="Target">
              <ItemSearchDropdown
                items={searchableItems}
                value={state.highlightTarget}
                onSelect={(k) => setState((s) => ({ ...s, highlightTarget: k }))}
                placeholder={`Select ${state.highlightType.replace(/_/g, ' ')}…`}
              />
            </Field>
          )}
          <Pressable onPress={handleSave} style={{ backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', color: colors.onPrimary ?? '#fff' }}>Save</Text>
          </Pressable>
        </View>
      </AppDrawer>
    );
  },
);
