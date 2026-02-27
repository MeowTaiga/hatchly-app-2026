import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/ThemeProvider';
import { GemIcon } from '@/components/ui/GemIcon';
import { CachedImage } from '@/components/ui/CachedImage';
import { SUGGESTION_CONFIG } from './suggestions/registry';
import { spacing } from '@/constants/theme';

export interface SuggestionReward {
  gemsAwarded: number;
  item?: { itemType: string; label: string; imageUrl?: string; emoji?: string; qty: number };
}

export interface SuggestionCardProps {
  component: string;
  content: string;
  title: string;
  onDone: () => void;
  completed?: boolean;
  reward?: SuggestionReward | null;
}

/**
 * Renders a suggestion card based on component type.
 * Uses the registry for icon/color — add new types in registry.tsx.
 */
export function SuggestionCard({ component, content, title, onDone, completed, reward }: SuggestionCardProps) {
  const { theme, themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const config = SUGGESTION_CONFIG[component] ?? { icon: 'sparkles-outline', accentColor: theme.colors.primary };
  const accent = config.accentColor ?? theme.colors.primary;

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
        <Ionicons name={config.icon} size={22} color={accent} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.content, { color: theme.colors.textSecondary }]}>{content}</Text>
        {!completed && (
          <Pressable
            style={({ pressed }) => [
              styles.doneBtn,
              { backgroundColor: accent },
              pressed && { opacity: 0.85 },
            ]}
            onPress={onDone}
          >
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={styles.doneText}>I did it</Text>
          </Pressable>
        )}
        {completed && (
          <>
            <View style={[styles.doneBtn, styles.completedBtn, { backgroundColor: theme.colors.success + '30' }]}>
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
              <Text style={[styles.doneText, { color: theme.colors.success }]}>Done</Text>
            </View>
            {reward && (reward.gemsAwarded > 0 || reward.item) && (
              <View style={[styles.rewardsBar, { backgroundColor: isDark ? theme.colors.surfaceElevated ?? theme.colors.surface + '80' : theme.colors.primaryLight + '25' }]}>
                {reward.gemsAwarded > 0 && (
                  <View style={styles.rewardItem}>
                    <GemIcon size={18} />
                    <Text style={[styles.rewardAmount, { color: theme.colors.gemColor ?? theme.colors.success }]}>
                      +{reward.gemsAwarded}
                    </Text>
                  </View>
                )}
                {reward.item && (
                  <View style={[styles.rewardItem, reward.gemsAwarded > 0 && styles.rewardItemWithBorder, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }]}>
                    {reward.item.imageUrl ? (
                      <CachedImage source={{ uri: reward.item.imageUrl }} style={styles.rewardImage} resizeMode="contain" />
                    ) : (
                      <View style={[styles.rewardImagePlaceholder, { backgroundColor: theme.colors.primaryLight + '50' }]}>
                        <Text style={styles.rewardEmoji}>{reward.item.emoji ?? '📦'}</Text>
                      </View>
                    )}
                    <Text style={[styles.rewardLabel, { color: theme.colors.text }]} numberOfLines={1}>
                      {reward.item.label}
                      {reward.item.qty > 1 ? ` ×${reward.item.qty}` : ''}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}
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
  content: { fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  completedBtn: { opacity: 0.9 },
  doneText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  rewardsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardItemWithBorder: {
    paddingLeft: 12,
    borderLeftWidth: 1,
  },
  rewardAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  rewardImage: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  rewardImagePlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardEmoji: {
    fontSize: 12,
  },
  rewardLabel: {
    fontSize: 14,
    fontWeight: '600',
    maxWidth: 140,
  },
});
