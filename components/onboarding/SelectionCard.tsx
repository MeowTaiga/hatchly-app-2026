import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/store/ThemeProvider';
import { typography, spacing, radius } from '@/constants/theme';

export interface SelectionOption {
  key: string;
  label: string;
  icon?: string;
  description?: string;
}

interface SelectionCardProps {
  options: SelectionOption[];
  /** Currently selected key(s) — string for single-select, string[] for multi */
  selected: string | string[];
  /** Called with the tapped option key */
  onSelect: (key: string) => void;
  /** Set to true for multi-select (checkmarks instead of radio) */
  multi?: boolean;
}

/**
 * Reusable selection card grid for onboarding choice steps.
 * Renders a list of pressable options with icons, labels, and optional descriptions.
 * Supports both single-select and multi-select modes.
 */
export function SelectionCard({ options, selected, onSelect, multi = false }: SelectionCardProps) {
  const { theme, themeMode } = useTheme();
  const { colors, shadows } = theme;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { gap: spacing.md },
        card: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.base,
          borderWidth: 2,
          borderColor: colors.border,
          ...shadows.sm,
        },
        cardActive: {
          borderColor: colors.primary,
          // Light mode: neutral white (no pink tint). Dark mode: surfaceElevated.
          backgroundColor: themeMode === 'light' ? colors.surface : colors.surfaceElevated,
        },
        cardPressed: {
          transform: [{ scale: 0.98 }],
          opacity: 0.9,
        },
        icon: {
          fontSize: 28,
          marginRight: spacing.md,
        },
        textContainer: { flex: 1 },
        label: { ...typography.label, color: colors.text },
        labelActive: { color: colors.primaryText ?? colors.primary },
        description: {
          ...typography.caption,
          color: colors.textSecondary,
          marginTop: 2,
        },
        checkbox: {
          width: 24,
          height: 24,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: spacing.sm,
        },
        checkboxActive: {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
        checkmark: {
          color: colors.onPrimary ?? colors.textInverse,
          fontSize: 14,
          fontWeight: '700',
        },
      }),
    [colors, shadows, themeMode],
  );

  const isSelected = (key: string): boolean => {
    if (Array.isArray(selected)) return selected.includes(key);
    return selected === key;
  };

  return (
    <View style={styles.container}>
      {options.map((option) => {
        const active = isSelected(option.key);
        return (
          <Pressable
            key={option.key}
            onPress={() => onSelect(option.key)}
            style={({ pressed }) => [
              styles.card,
              active && styles.cardActive,
              pressed && styles.cardPressed,
            ]}
          >
            {option.icon && <Text style={styles.icon}>{option.icon}</Text>}
            <View style={styles.textContainer}>
              <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
              {option.description && (
                <Text style={styles.description}>{option.description}</Text>
              )}
            </View>
            {multi && (
              <View style={[styles.checkbox, active && styles.checkboxActive]}>
                {active && <Text style={styles.checkmark}>✓</Text>}
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
