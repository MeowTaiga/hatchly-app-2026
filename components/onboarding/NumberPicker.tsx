import React, { useState, useRef, useMemo } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';

interface NumberPickerProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /** Smaller layout for side-by-side pickers (e.g. feet + inches) */
  compact?: boolean;
  /** Accent color for +/- buttons and value input. Defaults to theme primary. */
  color?: string;
}

/**
 * A clean number picker with plus/minus buttons for height, weight, and age.
 * Displays the current value prominently with an optional unit label.
 *
 * Tap the number in the center to type a value directly.
 * Supports decimal steps (e.g. step=0.1 for weight).
 * Use `compact` when rendering two pickers in a row.
 */
export function NumberPicker({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  unit,
  compact = false,
  color: colorProp,
}: NumberPickerProps) {
  const { theme } = useTheme();
  const { colors, typography, shadows } = theme;
  const accent = colorProp ?? colors.primary;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<TextInput>(null);

  const st = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: spacing.lg,
        },
        button: {
          borderRadius: radius.full,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: accent,
          ...shadows.sm,
        },
        buttonPressed: {
          backgroundColor: colors.surfaceElevated,
          transform: [{ scale: 0.95 }],
        },
        buttonDisabled: {
          opacity: 0.3,
          borderColor: colors.border,
        },
        buttonText: {
          fontSize: 24,
          fontWeight: '700',
          color: accent,
        },
        buttonTextCompact: {
          fontSize: 20,
        },
        valueContainer: {
          alignItems: 'center',
          minWidth: 80,
        },
        valueContainerCompact: {
          minWidth: 50,
        },
        value: {
          fontWeight: '800',
          color: colors.text,
        },
        valueInput: {
          fontWeight: '800',
          color: accent,
          textAlign: 'center',
          borderBottomWidth: 2,
          borderBottomColor: accent,
          minWidth: 60,
          paddingVertical: 0,
        },
        tapHint: {
          ...typography.caption,
          fontSize: 10,
          color: colors.textMuted,
          marginTop: 2,
        },
        unit: {
          ...typography.caption,
          fontSize: 14,
          marginTop: spacing.xs,
          color: colors.textSecondary,
        },
      }),
    [colors, typography, shadows, accent],
  );

  const isDecimal = step % 1 !== 0;

  const decrement = () => {
    const next = +(value - step).toFixed(1);
    onChange(Math.max(min, next));
  };
  const increment = () => {
    const next = +(value + step).toFixed(1);
    onChange(Math.min(max, next));
  };

  const formatValue = (v: number) =>
    isDecimal ? v.toFixed(1) : String(v);

  const startEditing = () => {
    setDraft(formatValue(value));
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const commitEdit = () => {
    setEditing(false);
    const parsed = parseFloat(draft);
    if (!isNaN(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed));
      onChange(isDecimal ? +(clamped.toFixed(1)) : Math.round(clamped));
    }
  };

  const btnSize = compact ? 40 : 56;
  const fontSize = compact ? 36 : 48;
  const gap = compact ? spacing.base : spacing['2xl'];

  return (
    <View style={[st.container, { gap }]}>
      <Pressable
        onPress={decrement}
        disabled={value <= min}
        style={({ pressed }) => [
          st.button,
          { width: btnSize, height: btnSize },
          pressed && st.buttonPressed,
          value <= min && st.buttonDisabled,
        ]}
      >
        <Text style={[st.buttonText, compact && st.buttonTextCompact]}>−</Text>
      </Pressable>

      <Pressable
        onPress={startEditing}
        style={[st.valueContainer, compact && st.valueContainerCompact]}
      >
        {editing ? (
          <TextInput
            ref={inputRef}
            style={[st.valueInput, { fontSize }]}
            value={draft}
            onChangeText={setDraft}
            onBlur={commitEdit}
            onSubmitEditing={commitEdit}
            keyboardType={isDecimal ? 'decimal-pad' : 'number-pad'}
            selectTextOnFocus
            maxLength={String(max).length + (isDecimal ? 2 : 0)}
          />
        ) : (
          <>
            <Text style={[st.value, { fontSize }]}>{formatValue(value)}</Text>
            <Text style={st.tapHint}>tap to edit</Text>
          </>
        )}
        {unit && <Text style={st.unit}>{unit}</Text>}
      </Pressable>

      <Pressable
        onPress={increment}
        disabled={value >= max}
        style={({ pressed }) => [
          st.button,
          { width: btnSize, height: btnSize },
          pressed && st.buttonPressed,
          value >= max && st.buttonDisabled,
        ]}
      >
        <Text style={[st.buttonText, compact && st.buttonTextCompact]}>+</Text>
      </Pressable>
    </View>
  );
}
