/**
 * Mood Card — placeholder for mood log UI. Wire later.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/ThemeProvider';
import { spacing } from '@/constants/theme';

export function MoodCard() {
  const { theme } = useTheme();
  const { colors, typography } = theme;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface + 'CC' }]}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary + '20' }]}>
          <Ionicons name="happy" size={22} color={colors.secondary} />
        </View>
        <View style={styles.body}>
          <Text style={[styles.title, typography.label, { color: colors.text }]}>Mood</Text>
          <Text style={[styles.subtitle, typography.subtitle, { color: colors.textSecondary }]}>
            Track how you feel throughout the day. Coming soon.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 16,
    padding: spacing.xl,
    marginBottom: spacing.base,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  title: { marginBottom: spacing.xs },
  subtitle: { lineHeight: 22, fontSize: 13 },
});
