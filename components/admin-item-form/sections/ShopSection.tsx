import React from 'react';
import { View } from 'react-native';
import { Section, Field, SwitchField } from '../FormField';
import { StableFormInput } from '@/components/ui/StableFormInput';
import type { FormState } from '../types';

interface ShopSectionProps {
  state: FormState;
  setField: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
  ts: Record<string, object>;
  colors: { primary: string; border: string; text: string; textMuted: string };
  s: Record<string, object>;
}

export function ShopSection({ state, setField, ts, colors, s }: ShopSectionProps) {
  return (
    <Section label="Shop" sectionLabelStyle={ts.sectionLabel} cardStyle={ts.card}>
      <SwitchField
        label="Treat as currency"
        value={state.isCurrency}
        onValueChange={(v) => setField('isCurrency', v)}
        switchLabelStyle={ts.switchLabel}
        primaryColor={colors.primary}
        borderColor={colors.border}
      />
      <SwitchField
        label="Buyable in Shop"
        value={state.buyable}
        onValueChange={(v) => setField('buyable', v)}
        switchLabelStyle={ts.switchLabel}
        primaryColor={colors.primary}
        borderColor={colors.border}
      />
      {state.buyable && (
        <>
          <Field label="Price" fieldLabelStyle={ts.fieldLabel}>
            <StableFormInput
              style={ts.input}
              value={state.gemPrice}
              onChangeText={(v) => setField('gemPrice', v)}
              placeholder="e.g. 10"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />
          </Field>
          <Field label="Currency item" fieldLabelStyle={ts.fieldLabel}>
            <StableFormInput
              style={ts.input}
              value={state.shopCurrency}
              onChangeText={(v) => setField('shopCurrency', v)}
              placeholder="Leave empty for gems (e.g. candy_corn)"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
          </Field>
          <View style={s.rowFields}>
            <View style={{ flex: 1 }}>
              <Field label="Farm Level Required" fieldLabelStyle={ts.fieldLabel}>
                <StableFormInput
                  style={ts.input}
                  value={state.farmLevel}
                  onChangeText={(v) => setField('farmLevel', v)}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Pet Level Required" fieldLabelStyle={ts.fieldLabel}>
                <StableFormInput
                  style={ts.input}
                  value={state.petLevel}
                  onChangeText={(v) => setField('petLevel', v)}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
              </Field>
            </View>
          </View>
          <Field label="Shop Section" fieldLabelStyle={ts.fieldLabel}>
            <StableFormInput
              style={ts.input}
              value={state.shopSection}
              onChangeText={(v) => setField('shopSection', v)}
              placeholder="Leave empty for main shop"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
          </Field>
          <Field label="Available Until (ISO date)" fieldLabelStyle={ts.fieldLabel}>
            <StableFormInput
              style={ts.input}
              value={state.availableUntil}
              onChangeText={(v) => setField('availableUntil', v)}
              placeholder="e.g. 2025-04-20T23:59"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
          </Field>
        </>
      )}
    </Section>
  );
}
