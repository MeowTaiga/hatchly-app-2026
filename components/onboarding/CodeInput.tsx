import React, { useRef, useState, useMemo } from 'react';
import { View, TextInput, StyleSheet, Pressable, Text } from 'react-native';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';

interface CodeInputProps {
  length?: number;
  value: string;
  onChange: (code: string) => void;
}

/**
 * 6-digit SMS verification code input with individual digit cells.
 * Auto-focuses the next cell as digits are entered, supports backspace navigation.
 * The actual input is a hidden TextInput — the visible cells are just display.
 */
export function CodeInput({ length = 6, value, onChange }: CodeInputProps) {
  const { theme } = useTheme();
  const { colors, shadows } = theme;
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          justifyContent: 'center',
          gap: spacing.sm,
        },
        cell: {
          width: 48,
          height: 56,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          borderWidth: 2,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          ...shadows.sm,
        },
        cellFilled: {
          borderColor: colors.primary,
          backgroundColor: colors.surfaceElevated,
        },
        cellActive: {
          borderColor: colors.primary,
          borderWidth: 2,
        },
        digit: {
          fontSize: 24,
          fontWeight: '700',
          color: colors.textMuted,
        },
        digitFilled: {
          color: colors.text,
        },
        hiddenInput: {
          position: 'absolute',
          opacity: 0,
          height: 0,
          width: 0,
        },
      }),
    [colors, shadows],
  );

  const handleChange = (text: string) => {
    const clean = text.replace(/\D/g, '').slice(0, length);
    onChange(clean);
  };

  const handlePress = () => {
    inputRef.current?.focus();
  };

  return (
    <View>
      <Pressable onPress={handlePress} style={styles.container}>
        {Array.from({ length }, (_, i) => {
          const char = value[i] ?? '';
          const isActive = focused && i === value.length;
          const isFilled = i < value.length;

          return (
            <View
              key={i}
              style={[
                styles.cell,
                isFilled && styles.cellFilled,
                isActive && styles.cellActive,
              ]}
            >
              <Text style={[styles.digit, isFilled && styles.digitFilled]}>
                {char}
              </Text>
            </View>
          );
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus
        style={styles.hiddenInput}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
      />
    </View>
  );
}
