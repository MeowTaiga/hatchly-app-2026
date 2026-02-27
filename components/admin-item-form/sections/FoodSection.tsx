import React from 'react';
import { Section, Field } from '../FormField';
import { StableFormInput } from '@/components/ui/StableFormInput';
import { DurationField } from '../DurationField';
import type { FormState } from '../types';

interface FoodSectionProps {
  state: FormState;
  setField: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
  ts: Record<string, object>;
  colors: { textMuted: string; textSecondary: string; text: string; primary: string; surfaceElevated: string; border: string };
}

export function FoodSection({ state, setField, ts, colors }: FoodSectionProps) {
  return (
    <Section label="Food Settings" sectionLabelStyle={ts.sectionLabel} cardStyle={ts.card}>
      <Field label="Hunger Restored (0-100)" fieldLabelStyle={ts.fieldLabel}>
        <StableFormInput
          style={ts.input}
          value={state.foodHunger}
          onChangeText={(v) => setField('foodHunger', v)}
          placeholder="e.g. 30"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
        />
      </Field>
      <Field label="Happiness Restored (0-100)" fieldLabelStyle={ts.fieldLabel}>
        <StableFormInput
          style={ts.input}
          value={state.foodHappiness}
          onChangeText={(v) => setField('foodHappiness', v)}
          placeholder="e.g. 20"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
        />
      </Field>
      <Field label="Pet XP Given" fieldLabelStyle={ts.fieldLabel}>
        <StableFormInput
          style={ts.input}
          value={state.foodPetXp}
          onChangeText={(v) => setField('foodPetXp', v)}
          placeholder="e.g. 15"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
        />
      </Field>
      <Field label="Buff Type (future)" fieldLabelStyle={ts.fieldLabel}>
        <StableFormInput
          style={ts.input}
          value={state.foodBuffType}
          onChangeText={(v) => setField('foodBuffType', v)}
          placeholder="e.g. speed, luck"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />
      </Field>
      <DurationField
        label="Buff Duration"
        valueMs={state.foodBuffDurationMs}
        onChangeMs={(v) => setField('foodBuffDurationMs', v)}
        placeholder="60"
        fieldLabelStyle={ts.fieldLabel}
        inputStyle={ts.input}
        colors={colors}
      />
    </Section>
  );
}
