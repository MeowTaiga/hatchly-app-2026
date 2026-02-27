/**
 * Basic quest info: ID, type, title, description, farm level, sort order.
 */

import React from 'react';
import { Field, FormTextField, ChipSelect } from '../FormField';
import { QUEST_TYPES } from '../constants';
import type { FormState } from '../types';
import type { QuestType } from '../types';

interface BasicSectionProps {
  form: FormState;
  updateForm: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  isEdit: boolean;
}

export function BasicSection({ form, updateForm, isEdit }: BasicSectionProps) {
  return (
    <>
      <FormTextField
        label="Quest ID"
        value={form.questId}
        onChangeText={(v) => updateForm('questId', v)}
        transform={(v) => v.toLowerCase().replace(/[^a-z0-9_]/g, '')}
        placeholder="e.g. farm_upgrade_2"
        autoCapitalize="none"
        editable={!isEdit}
      />
      <Field label="Type">
        <ChipSelect<QuestType>
          options={QUEST_TYPES}
          value={form.type}
          onSelect={(v) => updateForm('type', v)}
        />
      </Field>
      <FormTextField
        label="Title"
        value={form.title}
        onChangeText={(v) => updateForm('title', v)}
        placeholder="Expand Your Farm"
      />
      <FormTextField
        label="Description"
        value={form.description}
        onChangeText={(v) => updateForm('description', v)}
        placeholder="Optional description"
      />
      {form.type === 'farm_upgrade' && (
        <FormTextField
          label="Farm Level"
          value={form.farmLevel}
          onChangeText={(v) => updateForm('farmLevel', v)}
          placeholder="0"
          keyboardType="number-pad"
        />
      )}
      <FormTextField
        label="Sort Order"
        value={form.sortOrder}
        onChangeText={(v) => updateForm('sortOrder', v)}
        placeholder="0"
        keyboardType="number-pad"
      />
    </>
  );
}
