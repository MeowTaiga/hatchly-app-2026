import React, { useMemo } from 'react';
import { TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';

interface OnboardingInputProps extends Omit<TextInputProps, 'style'> {
  /** Optional style overrides */
  style?: TextInputProps['style'];
}

/**
 * Theme-aware text input for onboarding screens.
 * Uses surface, border, text, and textMuted from theme context.
 */
export function OnboardingInput({ style, placeholderTextColor, ...rest }: OnboardingInputProps) {
  const { theme } = useTheme();
  const { colors, shadows } = theme;

  const inputStyle = useMemo(
    () => [
      {
        fontSize: 18,
        fontWeight: '500' as const,
        color: colors.text,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 2,
        borderColor: colors.border,
        paddingHorizontal: spacing.base,
        height: 56,
        textAlign: 'center' as const,
        ...shadows.sm,
      },
      style,
    ],
    [colors, shadows, style],
  );

  return (
    <TextInput
      {...rest}
      style={inputStyle}
      placeholderTextColor={placeholderTextColor ?? colors.textMuted}
    />
  );
}
