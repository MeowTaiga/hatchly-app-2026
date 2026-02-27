/**
 * Activation requirements: pet level, farm level, required quest.
 */

import React from 'react';
import { FormTextField, Field } from '../FormField';
import { ItemSearchDropdown } from '@/components/ui/ItemSearchDropdown';
import type { SearchableItem } from '@/components/ui/ItemSearchDropdown';
import type { FormState } from '../types';

interface ActivationSectionProps {
  form: FormState;
  updateForm: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  searchableQuests: SearchableItem[];
}

export function ActivationSection({ form, updateForm, searchableQuests }: ActivationSectionProps) {
  return (
    <>
      <FormTextField
        label="Pet Level Min"
        value={form.petLevelMin}
        onChangeText={(v) => updateForm('petLevelMin', v)}
        placeholder="0"
        keyboardType="number-pad"
      />
      <FormTextField
        label="Farm Level Min"
        value={form.farmLevelMin}
        onChangeText={(v) => updateForm('farmLevelMin', v)}
        placeholder="0"
        keyboardType="number-pad"
      />
      <Field label="Required Quest">
        <ItemSearchDropdown
          items={searchableQuests}
          value={form.requiredQuestId}
          onSelect={(key) => updateForm('requiredQuestId', key)}
          placeholder="Select prerequisite quest…"
          allowCustom
        />
      </Field>
    </>
  );
}
