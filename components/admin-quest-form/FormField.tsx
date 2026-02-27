/**
 * Reusable form field components for the admin quest form.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, Switch } from 'react-native';
import { useTheme } from '@/store/ThemeProvider';
import { createThemedStyles } from './styles';

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

export function Field({ label, children }: FieldProps) {
  const { theme } = useTheme();
  const ts = createThemedStyles(theme);
  return (
    <View style={{ gap: 4 }}>
      <Text style={ts.fieldLabel}>{label}</Text>
      {children}
    </View>
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
  editable?: boolean;
  /** Optional transform applied on each change (e.g. for quest ID: lowercase, alphanumeric only). Display and blur value are transformed. */
  transform?: (v: string) => string;
}

export function FormTextField({
  label,
  value,
  onChangeText,
  placeholder = '',
  keyboardType = 'default',
  autoCapitalize,
  multiline,
  editable = true,
  transform,
}: FormTextFieldProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const ts = createThemedStyles(theme);
  const isFocused = useRef(false);
  const [localValue, setLocalValue] = useState(value ?? '');

  // Sync from parent when value changes externally (e.g. form load) and we're not focused
  useEffect(() => {
    if (!isFocused.current && value !== localValue) {
      setLocalValue(value ?? '');
    }
  }, [value]);

  const handleChangeText = (v: string) => {
    const next = transform ? transform(v) : v;
    setLocalValue(next);
    onChangeText(next);
  };

  const handleBlur = () => {
    isFocused.current = false;
  };

  const handleFocus = () => {
    isFocused.current = true;
  };

  return (
    <Field label={label}>
      <TextInput
        style={[ts.input, multiline && { minHeight: 80, textAlignVertical: 'top' }, !editable && { opacity: 0.6 }]}
        value={localValue}
        onChangeText={handleChangeText}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        editable={editable}
      />
    </Field>
  );
}

interface ChipSelectProps<T extends string> {
  options: { key: T; label: string }[];
  value: T;
  onSelect: (v: T) => void;
}

export function ChipSelect<T extends string>({ options, value, onSelect }: ChipSelectProps<T>) {
  const { theme } = useTheme();
  const ts = createThemedStyles(theme);
  return (
    <View style={ts.chipRow}>
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <Pressable
            key={opt.key}
            style={[ts.chip, active && ts.chipActive]}
            onPress={() => onSelect(opt.key)}
          >
            <Text style={[ts.chipText, active && ts.chipTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface SwitchFieldProps {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}

export function SwitchField({ label, value, onValueChange }: SwitchFieldProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const ts = createThemedStyles(theme);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={ts.fieldLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.primary, false: colors.border }}
      />
    </View>
  );
}
