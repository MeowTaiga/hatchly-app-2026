/**
 * Styles for the admin item form.
 */

import { StyleSheet } from 'react-native';
import { spacing, radius } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';

export function createThemedStyles(theme: AppTheme) {
  const { colors, typography, shadows } = theme;
  return StyleSheet.create({
    headerTitle: { flex: 1, textAlign: 'center', ...typography.title, fontSize: 20 },
    sectionLabel: {
      ...typography.subtitle,
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      marginLeft: 4,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.sm,
      gap: spacing.base,
    },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    input: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.md,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
      color: colors.text,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.surfaceElevated },
    chipActive: { backgroundColor: colors.primary },
    chipText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    chipTextActive: { color: '#fff' },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    switchLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
    noImageBox: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.md,
    },
    noImageText: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
    promptInput: { minHeight: 80, textAlignVertical: 'top' },
    resetPromptText: { fontSize: 12, fontWeight: '600', color: colors.primary },
    genBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    genBtnSecondary: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.primary },
    harvestRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    addDropText: { fontSize: 13, fontWeight: '600', color: colors.primary },
    dirImageThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: colors.surfaceElevated },
    dirImageLabel: { fontSize: 9, fontWeight: '600', color: colors.textMuted },
  });
}

export const staticStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  form: { paddingHorizontal: spacing.xl, paddingBottom: 120 },
  field: { gap: 4 },
  rowFields: { flexDirection: 'row', gap: spacing.base },
  imagePreviewWrap: { alignItems: 'center', position: 'relative' },
  imagePreview: { width: 120, height: 120, borderRadius: 16, backgroundColor: '#f0f0f0' },
  clearImageBtn: { position: 'absolute', top: -6, right: '30%' },
  resetPromptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, alignSelf: 'flex-start' },
  genBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    borderRadius: radius.md,
    paddingVertical: 12,
  },
  genBtnDisabled: { opacity: 0.6 },
  addDropBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  dirImagesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dirImageItem: { alignItems: 'center', gap: 2 },
});
