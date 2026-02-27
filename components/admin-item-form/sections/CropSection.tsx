import React from 'react';
import { Text, View, Pressable } from 'react-native';
import { StableFormInput } from '@/components/ui/StableFormInput';
import { Ionicons } from '@expo/vector-icons';
import { ItemSearchDropdown } from '@/components/ui/ItemSearchDropdown';
import { Section, Field } from '../FormField';
import { DurationField } from '../DurationField';
import type { FormState } from '../types';
import type { SearchableItem } from '@/components/ui/ItemSearchDropdown';

interface CropSectionProps {
  state: FormState;
  setField: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
  updateHarvestDrop: (idx: number, field: 'itemType' | 'qty', value: string) => void;
  addHarvestDrop: () => void;
  removeHarvestDrop: (idx: number) => void;
  searchableItems: SearchableItem[];
  ts: Record<string, object>;
  colors: { textMuted: string; textSecondary: string; text: string; primary: string; error: string; surfaceElevated: string; border: string };
  s: Record<string, object>;
}

export function CropSection({
  state,
  setField,
  updateHarvestDrop,
  addHarvestDrop,
  removeHarvestDrop,
  searchableItems,
  ts,
  colors,
  s,
}: CropSectionProps) {
  return (
    <Section label="Crop Settings" sectionLabelStyle={ts.sectionLabel} cardStyle={ts.card}>
      <DurationField
        label="Growth Time *"
        valueMs={state.growthMs}
        onChangeMs={(v) => setField('growthMs', v)}
        placeholder="60"
        fieldLabelStyle={ts.fieldLabel}
        inputStyle={ts.input}
        colors={colors}
      />
      <Field label="Gems Given on Harvest" fieldLabelStyle={ts.fieldLabel}>
        <StableFormInput
          style={ts.input}
          value={state.gemsGiven}
          onChangeText={(v) => setField('gemsGiven', v)}
          placeholder="e.g. 5"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
        />
      </Field>
      <Field label="Harvest Yield" fieldLabelStyle={ts.fieldLabel}>
        {state.harvestYield.map((drop, idx) => (
          <View key={idx} style={ts.harvestRow}>
            <View style={{ flex: 2 }}>
              <ItemSearchDropdown
                items={searchableItems}
                value={drop.itemType}
                onSelect={(key) => updateHarvestDrop(idx, 'itemType', key)}
                placeholder="Select item…"
              />
            </View>
            <StableFormInput
              style={[ts.input, { flex: 1, textAlign: 'center' }]}
              value={drop.qty === 0 ? '' : String(drop.qty)}
              onChangeText={(v) => updateHarvestDrop(idx, 'qty', v)}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
            />
            <Pressable onPress={() => removeHarvestDrop(idx)} hitSlop={8}>
              <Ionicons name="remove-circle" size={22} color={colors.error} />
            </Pressable>
          </View>
        ))}
        <Pressable style={s.addDropBtn} onPress={addHarvestDrop}>
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={ts.addDropText}>Add drop</Text>
        </Pressable>
      </Field>
    </Section>
  );
}
