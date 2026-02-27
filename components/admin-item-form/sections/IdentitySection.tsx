import React from 'react';
import { Text } from 'react-native';
import { DropdownSelect } from '@/components/ui/DropdownSelect';
import { ItemSearchDropdown } from '@/components/ui/ItemSearchDropdown';
import { SwitchField } from '../FormField';
import { Section, Field } from '../FormField';
import { StableFormInput } from '@/components/ui/StableFormInput';
import { CATEGORY_OPTIONS, SUB_CATEGORIES } from '../constants';
import type { FormState } from '../types';
import type { ItemCategory } from '@/lib/api';

interface IdentitySectionProps {
  state: FormState;
  setField: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
  ts: Record<string, object>;
  colors: { textMuted: string; primary: string; border: string };
  slug: string;
}

export function IdentitySection({ state, setField, ts, colors, slug }: IdentitySectionProps) {
  return (
    <Section label="Identity" sectionLabelStyle={ts.sectionLabel} cardStyle={ts.card}>
      <Field label="Label" fieldLabelStyle={ts.fieldLabel}>
        <StableFormInput
          style={ts.input}
          value={state.label}
          onChangeText={(v) => setField('label', v)}
          placeholder="Wheat Seed"
          placeholderTextColor={colors.textMuted}
        />
      </Field>
      {slug ? <Text style={[ts.fieldLabel, { marginTop: -4 }]}>Slug: {slug}</Text> : null}
      <Field label="Type" fieldLabelStyle={ts.fieldLabel}>
        <DropdownSelect
          options={CATEGORY_OPTIONS}
          value={state.category}
          onSelect={(v) => setField('category', v as ItemCategory)}
          placeholder="Select type…"
        />
      </Field>
      <Field label="Sub-Category" fieldLabelStyle={ts.fieldLabel}>
        <ItemSearchDropdown
          items={SUB_CATEGORIES}
          value={state.subCategory ?? ''}
          onSelect={(v) => setField('subCategory', v)}
          placeholder="Search subcategories…"
        />
      </Field>
      <Field label="Sell Price (gems)" fieldLabelStyle={ts.fieldLabel}>
        <StableFormInput
          style={ts.input}
          value={state.sellPrice}
          onChangeText={(v) => setField('sellPrice', v)}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
        />
      </Field>
      <SwitchField
        label="Sellable"
        value={state.sellable}
        onValueChange={(v) => setField('sellable', v)}
        switchLabelStyle={ts.switchLabel}
        primaryColor={colors.primary}
        borderColor={colors.border}
      />
    </Section>
  );
}
