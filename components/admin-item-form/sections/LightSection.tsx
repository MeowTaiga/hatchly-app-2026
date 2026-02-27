import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Section, Field, SwitchField } from '../FormField';
import { StableFormInput } from '@/components/ui/StableFormInput';
import type { FormState } from '../types';

const COLOR_PRESETS = [
  { hex: '#FFDD88', label: 'Warm' },
  { hex: '#FFA500', label: 'Orange' },
  { hex: '#88CCFF', label: 'Blue' },
  { hex: '#88FF88', label: 'Green' },
  { hex: '#FFFFFF', label: 'White' },
  { hex: '#FF88DD', label: 'Pink' },
];

interface LightSectionProps {
  state: FormState;
  setField: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
  ts: Record<string, object>;
  colors: { primary: string; border: string; textMuted: string; text: string };
}

export function LightSection({ state, setField, ts, colors }: LightSectionProps) {
  return (
    <Section label="Light Emission" sectionLabelStyle={ts.sectionLabel} cardStyle={ts.card}>
      <SwitchField
        label="Emits Light"
        value={state.lightEnabled}
        onValueChange={(v) => setField('lightEnabled', v)}
        switchLabelStyle={ts.switchLabel}
        primaryColor={colors.primary}
        borderColor={colors.border}
      />

      {state.lightEnabled && (
        <>
          <Field label="Radius (tiles)" fieldLabelStyle={ts.fieldLabel}>
            <StableFormInput
              style={ts.input}
              value={state.lightRadius}
              onChangeText={(v) => setField('lightRadius', v)}
              placeholder="3"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />
          </Field>

          <Field label="Intensity (0.1 – 1.0)" fieldLabelStyle={ts.fieldLabel}>
            <StableFormInput
              style={ts.input}
              value={state.lightIntensity}
              onChangeText={(v) => setField('lightIntensity', v)}
              placeholder="0.5"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />
          </Field>

          <Field label="Color" fieldLabelStyle={ts.fieldLabel}>
            <View style={styles.colorRow}>
              {COLOR_PRESETS.map((preset) => {
                const active = state.lightColor.toUpperCase() === preset.hex.toUpperCase();
                return (
                  <Pressable
                    key={preset.hex}
                    style={[
                      styles.swatch,
                      { backgroundColor: preset.hex },
                      active && { borderColor: colors.primary, borderWidth: 2.5 },
                    ]}
                    onPress={() => setField('lightColor', preset.hex)}
                  >
                    <Text style={[styles.swatchLabel, { color: preset.hex === '#FFFFFF' ? '#333' : '#fff' }]}>
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <StableFormInput
              style={[ts.input as object, { marginTop: 8 }]}
              value={state.lightColor}
              onChangeText={(v) => setField('lightColor', v)}
              placeholder="#FFDD88"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
            />
          </Field>
        </>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  swatch: {
    width: 48,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  swatchLabel: {
    fontSize: 9,
    fontWeight: '700',
  },
});
