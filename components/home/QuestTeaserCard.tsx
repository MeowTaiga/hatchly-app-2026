/**
 * Quest Teaser Card — shows quest count. Tap opens game tab.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameSummary } from '@/hooks/useGameSummary';
import { useTheme } from '@/store/ThemeProvider';
import { spacing } from '@/constants/theme';

export function QuestTeaserCard() {
  const { summary } = useGameSummary();
  const { theme } = useTheme();
  const { colors, typography } = theme;
  const router = useRouter();

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
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary + '20' }]}>
          <Ionicons name="flag" size={20} color={colors.secondary} />
        </View>
        <View style={styles.body}>
          <Text style={[styles.title, typography.label, { color: colors.text }]}>
            {summary.questCount} active quests
          </Text>
          <Text style={[styles.subtitle, typography.subtitle, { color: colors.textSecondary }]}>
            Tap to continue your adventures in the Game tab.
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
