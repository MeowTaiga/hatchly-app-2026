import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/store/ThemeProvider';
import { radius, spacing } from '@/constants/theme';

interface BubbleButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: ViewStyle;
}

/**
 * Primary CTA button with a cotton-candy gradient, generous radius,
 * and a pink-tinted shadow. Supports primary, secondary, and ghost variants.
 */
export function BubbleButton({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
  style,
}: BubbleButtonProps) {
  const { theme } = useTheme();
  const { colors, gradients, typography, shadows } = theme;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        primary: { height: 56, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', ...shadows.md },
        primaryPressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
        secondary: {
          height: 56,
          borderRadius: radius.xl,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceElevated,
          borderWidth: 2,
          borderColor: colors.primary,
        },
        secondaryPressed: { backgroundColor: colors.border },
        secondaryText: { ...typography.button, color: colors.primary },
        ghost: { height: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.base },
        ghostPressed: { opacity: 0.6 },
        ghostText: { ...typography.label, color: colors.textMuted },
        disabled: { opacity: 0.5 },
        disabledGradient: { opacity: 0.6 },
        disabledText: { opacity: 0.6 },
      }),
    [colors, typography, shadows],
  );

  if (variant === 'ghost') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.ghost,
          pressed && styles.ghostPressed,
          disabled && styles.disabled,
          style,
        ]}
      >
        <Text style={[styles.ghostText, disabled && styles.disabledText]}>{label}</Text>
      </Pressable>
    );
  }

  if (variant === 'secondary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.secondary,
          pressed && styles.secondaryPressed,
          disabled && styles.disabled,
          style,
        ]}
      >
        <Text style={[styles.secondaryText, disabled && styles.disabledText]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        pressed && styles.primaryPressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <LinearGradient
        colors={gradients.primary as unknown as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.primary, disabled && styles.disabledGradient]}
      >
        <Text style={[typography.button, disabled && styles.disabledText]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}
