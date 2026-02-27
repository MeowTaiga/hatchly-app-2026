import React from 'react';
import { View, Text, Image } from 'react-native';
import { Section, Field, SwitchField } from '../FormField';
import { StableFormInput } from '@/components/ui/StableFormInput';
import { DIRECTIONAL_VARIANT_KEYS } from '../constants';
import type { FormState } from '../types';

interface GridBehaviorSectionProps {
  state: FormState;
  setField: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
  ts: Record<string, object>;
  colors: { primary: string; border: string; text: string; textMuted: string };
  s: Record<string, object>;
}

export function GridBehaviorSection({ state, setField, ts, colors, s }: GridBehaviorSectionProps) {
  return (
    <Section label="Grid & Behavior" sectionLabelStyle={ts.sectionLabel} cardStyle={ts.card}>
      <View style={s.rowFields}>
        <View style={{ flex: 1 }}>
          <Field label="Columns" fieldLabelStyle={ts.fieldLabel}>
            <StableFormInput
              style={ts.input}
              value={state.cols}
              onChangeText={(v) => setField('cols', v)}
              keyboardType="number-pad"
            />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Rows" fieldLabelStyle={ts.fieldLabel}>
            <StableFormInput
              style={ts.input}
              value={state.rows}
              onChangeText={(v) => setField('rows', v)}
              keyboardType="number-pad"
            />
          </Field>
        </View>
      </View>
      <SwitchField
        label="Placeable"
        value={state.placeable}
        onValueChange={(v) => setField('placeable', v)}
        switchLabelStyle={ts.switchLabel}
        primaryColor={colors.primary}
        borderColor={colors.border}
      />
      {state.subCategory === 'fence' && (
        <SwitchField
          label="Auto-Connect (Fence)"
          value={state.autoConnect}
          onValueChange={(v) => setField('autoConnect', v)}
          switchLabelStyle={ts.switchLabel}
          primaryColor={colors.primary}
          borderColor={colors.border}
        />
      )}
      <SwitchField
        label="Center & Overflow"
        value={state.centerOverflow}
        onValueChange={(v) => setField('centerOverflow', v)}
        switchLabelStyle={ts.switchLabel}
        primaryColor={colors.primary}
        borderColor={colors.border}
      />
      {state.autoConnect && Object.keys(state.directionalImages).length > 0 && (
        <View style={{ gap: 6 }}>
          <Text style={ts.fieldLabel}>Directional Variants</Text>
          <View style={s.dirImagesRow}>
            {DIRECTIONAL_VARIANT_KEYS.map((v) => (
              <View key={v} style={s.dirImageItem}>
                {state.directionalImages[v] ? (
                  <Image source={{ uri: state.directionalImages[v] }} style={ts.dirImageThumb} />
                ) : (
                  <View style={ts.dirImageThumb} />
                )}
                <Text style={ts.dirImageLabel}>{v}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Section>
  );
}
