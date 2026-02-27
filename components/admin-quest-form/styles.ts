/**
 * Styles for the admin quest form.
 */

import { StyleSheet } from 'react-native';
import { spacing, radius } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';

export function createThemedStyles(theme: AppTheme) {
  const { colors, typography, shadows } = theme;
  return StyleSheet.create({
    sectionLabel: {
      ...typography.subtitle,
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: spacing.sm,
      letterSpacing: 0.3,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.sm,
      gap: spacing.base,
      marginBottom: spacing.lg,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 4,
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: radius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    chipTextActive: { color: '#fff' },
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 6,
    },
    listItemText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
    listItemSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: radius.md,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: 'dashed',
      backgroundColor: 'transparent',
    },
    addBtnText: { fontSize: 14, fontWeight: '700', color: colors.primary },
    iconBtn: { padding: 6 },
  });
}

export const staticStyles = StyleSheet.create({
  form: { paddingHorizontal: spacing.xl, paddingBottom: 120 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
});
