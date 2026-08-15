/**
 * Shared drawer content styles.
 * Used by MacroInfoDrawer and other drawer content to ensure consistent UI/UX.
 */
import { StyleSheet } from 'react-native';
import type { AppTheme } from '@/constants/theme';
import { spacing, radius } from '@/constants/theme';

/** Inner content wrapper - matches AppDrawer contentInner padding. Use for all drawer body content. */
export const drawerInner = {
  gap: spacing.base,
  paddingBottom: spacing.base,
};

export function createDrawerContentStyles(theme: AppTheme) {
  const { colors, typography } = theme;
  return StyleSheet.create({
    flex: { flex: 1 },
    scrollContent: { paddingBottom: 100 },

    // Section labels (uppercase, muted)
    secLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 8,
    },

    // Card (surface elevated, rounded)
    card: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.lg,
      padding: 14,
      marginBottom: spacing.base,
    },

    // Row with icon + body (label/value pattern)
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: `${colors.primary}12`,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    rowBody: { flex: 1 },
    rowLabel: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '500',
    },
    rowValue: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginTop: 1,
    },

    // Progress track (matches FoodDrawer nbTrack)
    track: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border,
      overflow: 'hidden' as const,
    },
    trackFill: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      bottom: 0,
      borderRadius: 3,
    },

    // Input + buttons
    input: {
      flex: 1,
      minWidth: 60,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    primaryBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
    },
    primaryBtnText: {
      ...typography.button,
      fontSize: 14,
      color: colors.onPrimary ?? '#fff',
    },
    outlineBtn: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    outlineBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    pressed: { opacity: 0.7 },

    // Body text
    intro: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
      marginBottom: spacing.lg,
    },
    bodyText: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.text,
    },
  });
}
