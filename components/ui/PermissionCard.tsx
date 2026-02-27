import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';

interface PermissionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
  color: string;
  /** Icon in the action button. Defaults to `icon`. */
  actionIcon?: keyof typeof Ionicons.glyphMap;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

/**
 * Reusable permission prompt card: icon, title, subtitle, primary action.
 * Optional secondary action (e.g. "Open Settings") shown as outline button.
 */
export function PermissionCard({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  color,
  actionIcon,
  secondaryLabel,
  onSecondary,
}: PermissionCardProps) {
  const btnIcon = actionIcon ?? icon;
  const { theme } = useTheme();
  const st = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.xl,
          gap: spacing.base,
        },
        icon: {
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: `${color}12`,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.sm,
        },
        title: {
          ...theme.typography.title,
          fontSize: 22,
          textAlign: 'center',
          color: theme.colors.text,
        },
        subtitle: {
          ...theme.typography.subtitle,
          textAlign: 'center',
          paddingHorizontal: spacing.base,
          color: theme.colors.textSecondary,
        },
        primaryBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          backgroundColor: color,
          paddingVertical: 14,
          paddingHorizontal: spacing.xl,
          borderRadius: radius.full,
          marginTop: spacing.sm,
          ...theme.shadows.md,
        },
        primaryBtnText: {
          ...theme.typography.button,
          fontSize: 16,
          color: theme.colors.onPrimary ?? '#fff',
        },
        secondaryBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          paddingVertical: 12,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.full,
          marginTop: spacing.sm,
          backgroundColor: theme.colors.surfaceElevated,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        secondaryBtnText: {
          fontSize: 14,
          fontWeight: '600',
          color: theme.colors.textSecondary,
        },
      }),
    [theme, color],
  );

  return (
    <View style={st.card}>
      <View style={st.icon}>
        <Ionicons name={icon} size={44} color={color} />
      </View>
      <Text style={st.title}>{title}</Text>
      <Text style={st.subtitle}>{subtitle}</Text>
      <Pressable onPress={onAction} style={({ pressed }) => [st.primaryBtn, pressed && { opacity: 0.85 }]}>
        <Ionicons name={btnIcon} size={20} color={theme.colors.onPrimary ?? '#fff'} />
        <Text style={st.primaryBtnText}>{actionLabel}</Text>
      </Pressable>
      {secondaryLabel && onSecondary && (
        <Pressable onPress={onSecondary} style={({ pressed }) => [st.secondaryBtn, pressed && { opacity: 0.85 }]}>
          <Ionicons name="open-outline" size={18} color={theme.colors.textSecondary} />
          <Text style={st.secondaryBtnText}>{secondaryLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
