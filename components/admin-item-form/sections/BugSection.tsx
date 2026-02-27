import React, { useEffect, useState } from 'react';
import { Section, Field, ChipSelect, ChipMultiSelect } from '../FormField';
import { StableFormInput } from '@/components/ui/StableFormInput';
import { RARITY_OPTIONS, TIME_OF_DAY_OPTIONS, BUG_SPAWN_HABITATS } from '../constants';
import { api } from '@/lib/api';
import type { FormState } from '../types';

interface BugSectionProps {
  state: FormState;
  setField: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
  ts: Record<string, object>;
  colors: { textMuted: string };
}

export function BugSection({ state, setField, ts, colors }: BugSectionProps) {
  const [sceneOptions, setSceneOptions] = useState<{ key: string; label: string }[]>([]);

  useEffect(() => {
    api.getScenes().then((res) => {
      setSceneOptions([
        { key: 'farm', label: 'Farm' },
        ...res.scenes.map((s) => ({ key: s.slug, label: s.name || s.slug })),
      ]);
    }).catch(() => setSceneOptions([{ key: 'farm', label: 'Farm' }]));
  }, []);

  const toggleBugScene = (key: string) => {
    const current = state.bugScenes ?? [];
    const next = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key];
    setField('bugScenes', next);
  };

  return (
    <Section label="Bug Settings" sectionLabelStyle={ts.sectionLabel} cardStyle={ts.card}>
      <Field label="Rarity" fieldLabelStyle={ts.fieldLabel}>
        <ChipSelect
          options={RARITY_OPTIONS}
          value={state.bugRarity}
          onSelect={(v) => setField('bugRarity', v)}
          chipStyle={ts.chip}
          chipActiveStyle={ts.chipActive}
          chipTextStyle={ts.chipText}
          chipTextActiveStyle={ts.chipTextActive}
        />
      </Field>
      <Field label="Active Time" fieldLabelStyle={ts.fieldLabel}>
        <ChipSelect
          options={TIME_OF_DAY_OPTIONS}
          value={state.bugActiveTime}
          onSelect={(v) => setField('bugActiveTime', v)}
          chipStyle={ts.chip}
          chipActiveStyle={ts.chipActive}
          chipTextStyle={ts.chipText}
          chipTextActiveStyle={ts.chipTextActive}
        />
      </Field>
      <Field label="Scenes (optional)" fieldLabelStyle={ts.fieldLabel}>
        <ChipMultiSelect
          options={sceneOptions}
          value={state.bugScenes ?? []}
          onToggle={toggleBugScene}
          chipStyle={ts.chip}
          chipActiveStyle={ts.chipActive}
          chipTextStyle={ts.chipText}
          chipTextActiveStyle={ts.chipTextActive}
        />
      </Field>
      <Field label="Spawn On" fieldLabelStyle={ts.fieldLabel}>
        <ChipSelect
          options={BUG_SPAWN_HABITATS}
          value={state.bugSpawnOn?.[0] ?? ''}
          onSelect={(v) => setField('bugSpawnOn', v ? [v] : [])}
          chipStyle={ts.chip}
          chipActiveStyle={ts.chipActive}
          chipTextStyle={ts.chipText}
          chipTextActiveStyle={ts.chipTextActive}
        />
      </Field>
      <Field label="Gems Given on Catch" fieldLabelStyle={ts.fieldLabel}>
        <StableFormInput
          style={ts.input}
          value={state.gemsGiven}
          onChangeText={(v) => setField('gemsGiven', v)}
          placeholder="e.g. 3"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
        />
      </Field>
      <Field label="Min Size" fieldLabelStyle={ts.fieldLabel}>
        <StableFormInput
          style={ts.input}
          value={state.bugSizeMin}
          onChangeText={(v) => setField('bugSizeMin', v)}
          placeholder="e.g. 0.5"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
        />
      </Field>
      <Field label="Max Size" fieldLabelStyle={ts.fieldLabel}>
        <StableFormInput
          style={ts.input}
          value={state.bugSizeMax}
          onChangeText={(v) => setField('bugSizeMax', v)}
          placeholder="e.g. 2.0"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
        />
      </Field>
    </Section>
  );
}
