/**
 * Reusable form field components for the admin item form.
 */

import React from 'react';
import { View, Text, TextInput, Pressable, Switch, StyleSheet } from 'react-native';

interface FieldProps {
  label: string;
  children: React.ReactNode;
  fieldLabelStyle?: object;
}

export function Field({ label, children, fieldLabelStyle }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={fieldLabelStyle}>{label}</Text>
      {children}
    </View>
  );
}

interface SwitchFieldProps {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  switchLabelStyle?: object;
  primaryColor?: string;
  borderColor?: string;
}

export function SwitchField({ label, value, onValueChange, switchLabelStyle, primaryColor, borderColor }: SwitchFieldProps) {
  return (
    <View style={styles.switchRow}>
      <Text style={switchLabelStyle}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: primaryColor, false: borderColor }}
      />
    </View>
  );
}

interface ChipSelectProps<T extends string> {
  options: { key: T; label: string }[];
  value: T;
  onSelect: (v: T) => void;
  chipStyle?: object;
  chipActiveStyle?: object;
  chipTextStyle?: object;
  chipTextActiveStyle?: object;
}

export function ChipSelect<T extends string>({
  options,
  value,
  onSelect,
  chipStyle,
  chipActiveStyle,
  chipTextStyle,
  chipTextActiveStyle,
}: ChipSelectProps<T>) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <Pressable
            key={opt.key}
            style={[chipStyle, active && chipActiveStyle]}
            onPress={() => onSelect(opt.key)}
          >
            <Text style={[chipTextStyle, active && chipTextActiveStyle]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface ChipMultiSelectProps {
  options: { key: string; label: string }[];
  value: string[];
  onToggle: (key: string) => void;
  chipStyle?: object;
  chipActiveStyle?: object;
  chipTextStyle?: object;
  chipTextActiveStyle?: object;
}

export function ChipMultiSelect({
  options,
  value,
  onToggle,
  chipStyle,
  chipActiveStyle,
  chipTextStyle,
  chipTextActiveStyle,
}: ChipMultiSelectProps) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = value.includes(opt.key);
        return (
          <Pressable
            key={opt.key}
            style={[chipStyle, active && chipActiveStyle]}
            onPress={() => onToggle(opt.key)}
          >
            <Text style={[chipTextStyle, active && chipTextActiveStyle]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface SectionProps {
  label: string;
  children: React.ReactNode;
  sectionLabelStyle?: object;
  cardStyle?: object;
}

export function Section({ label, children, sectionLabelStyle, cardStyle }: SectionProps) {
  return (
    <>
      <Text style={sectionLabelStyle}>{label}</Text>
      <View style={cardStyle}>{children}</View>
    </>
  );
}

interface FormTextFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  fieldLabelStyle?: object;
  inputStyle?: object;
  placeholderColor?: string;
}

export function FormTextField({
  label,
  value,
  onChangeText,
  placeholder = '',
  keyboardType = 'default',
  autoCapitalize,
  multiline,
  fieldLabelStyle,
  inputStyle,
  placeholderColor,
}: FormTextFieldProps) {
  return (
    <Field label={label} fieldLabelStyle={fieldLabelStyle}>
      <TextInput
        style={[inputStyle, multiline && styles.promptInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
      />
    </Field>
  );
}

const styles = StyleSheet.create({
  field: { gap: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  promptInput: { minHeight: 80, textAlignVertical: 'top' },
});
