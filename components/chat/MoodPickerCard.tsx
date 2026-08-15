/**
 * Reusable mood picker card — happy face grid for daily check-in.
 * Styled like SuggestionCard for consistency.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/ThemeProvider';
import { MOOD_OPTIONS } from './moodOptions';
import { spacing } from '@/constants/theme';

export type MoodId = (typeof MOOD_OPTIONS)[number]['id'];

export interface MoodPickerCardProps {
  title?: string;
  subtitle?: string;
  onSelect: (mood: MoodId) => void;
}

export function MoodPickerCard({
  title = "How are you feeling today?",
  subtitle = "Tap a face — diary rewards every few hours",
  onSelect,
}: MoodPickerCardProps) {
  const { theme, themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const accent = theme.colors.primary;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : theme.colors.surface,
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: accent + '20' }]}>
        <Ionicons name="happy-outline" size={24} color={accent} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
        <View style={styles.grid}>
          {MOOD_OPTIONS.map(({ id, emoji, label }) => (
            <Pressable
              key={id}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                },
                pressed && styles.optionPressed,
              ]}
              onPress={() => onSelect(id)}
            >
              <Text style={styles.emoji}>{emoji}</Text>
              <Text style={[styles.label, { color: theme.colors.text }]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: spacing.sm },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    width: 56,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionPressed: { opacity: 0.8 },
  emoji: { fontSize: 24, marginBottom: 2 },
  label: { fontSize: 11, fontWeight: '600' },
});
