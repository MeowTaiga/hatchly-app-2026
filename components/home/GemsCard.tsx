/**
 * Gems Card — shows gem count with icon. Tap opens game tab.
 * Subtle bounce/opacity feedback on press.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameSummary } from '@/hooks/useGameSummary';
import { useTheme } from '@/store/ThemeProvider';
import { spacing } from '@/constants/theme';

export function GemsCard() {
  const { summary } = useGameSummary();
  const { theme } = useTheme();
  const { colors, typography } = theme;
  const router = useRouter();
  const gemColor = colors.gemColor ?? colors.primary;

  return (
    <Pressable
      onPress={() => router.push('/(tabs)/game')}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface + 'CC' },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: gemColor + '20' }]}>
          <Ionicons name="diamond" size={22} color={gemColor} />
        </View>
        <View style={styles.body}>
          <Text style={[styles.title, typography.label, { color: colors.text }]}>
            {summary.gems} gems
          </Text>
          <Text style={[styles.subtitle, typography.subtitle, { color: colors.textSecondary }]}>
            Earn more by logging food, water, and weight.
          </Text>
        </View>
      </View>
    </Pressable>
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
