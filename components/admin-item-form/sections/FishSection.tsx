import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Section, Field, ChipSelect } from '../FormField';
import { StableFormInput } from '@/components/ui/StableFormInput';
import { RARITY_OPTIONS, TIME_OF_DAY_OPTIONS, FISH_SPOT_TYPES } from '../constants';
import type { FormState } from '../types';

interface FishSectionProps {
  state: FormState;
  setField: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
  ts: Record<string, object>;
  colors: { textMuted: string };
}

export function FishSection({ state, setField, ts, colors }: FishSectionProps) {
  const spotTypes = state.fishSpotTypes ?? [];
  const toggleSpotType = (key: string) => {
    const next = spotTypes.includes(key)
      ? spotTypes.filter((k) => k !== key)
      : [...spotTypes, key];
    setField('fishSpotTypes', next);
  };

  return (
    <Section label="Fish Settings" sectionLabelStyle={ts.sectionLabel} cardStyle={ts.card}>
      <Field label="Rarity" fieldLabelStyle={ts.fieldLabel}>
        <ChipSelect
          options={RARITY_OPTIONS}
          value={state.fishRarity}
          onSelect={(v) => setField('fishRarity', v)}
          chipStyle={ts.chip}
          chipActiveStyle={ts.chipActive}
          chipTextStyle={ts.chipText}
          chipTextActiveStyle={ts.chipTextActive}
        />
      </Field>
      <Field label="Active Time" fieldLabelStyle={ts.fieldLabel}>
        <ChipSelect
          options={TIME_OF_DAY_OPTIONS}
          value={state.fishActiveTime}
          onSelect={(v) => setField('fishActiveTime', v)}
          chipStyle={ts.chip}
          chipActiveStyle={ts.chipActive}
          chipTextStyle={ts.chipText}
          chipTextActiveStyle={ts.chipTextActive}
        />
      </Field>
      <Field label="Spot Types (empty = all spots)" fieldLabelStyle={ts.fieldLabel}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {FISH_SPOT_TYPES.map((opt) => {
            const active = spotTypes.includes(opt.key);
            return (
              <Pressable
                key={opt.key}
                style={[ts.chip, active && ts.chipActive]}
                onPress={() => toggleSpotType(opt.key)}
              >
                <Text style={[ts.chipText, active && ts.chipTextActive]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
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
          value={state.fishSizeMin}
          onChangeText={(v) => setField('fishSizeMin', v)}
          placeholder="e.g. 0.5"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
        />
      </Field>
      <Field label="Max Size" fieldLabelStyle={ts.fieldLabel}>
        <StableFormInput
          style={ts.input}
          value={state.fishSizeMax}
          onChangeText={(v) => setField('fishSizeMax', v)}
          placeholder="e.g. 2.0"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
        />
      </Field>
    </Section>
  );
}
