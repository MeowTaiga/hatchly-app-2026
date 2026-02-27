import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { getAchievementVisual } from '@/constants/achievements';
import { useAchievements, type AchievementEntry } from '@/store/AchievementProvider';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';

const BADGE_SIZE = 48;

function AchievementBadge({
  achievement,
  styles: st,
}: {
  achievement: AchievementEntry;
  styles: ReturnType<typeof createAchievementStyles>;
}) {
  const visual = getAchievementVisual(achievement.achievementId);

  return (
    <View style={st.badgeWrapper}>
      <View style={[st.badgeCircle, { backgroundColor: `${visual.color}14`, borderColor: `${visual.color}40` }]}>
        <Text style={st.badgeEmoji}>{visual.emoji}</Text>
      </View>
      <Text style={st.badgeLabel} numberOfLines={1}>
        {achievement.title}
      </Text>
    </View>
  );
}

function createAchievementStyles(theme: { colors: { textMuted: string; textSecondary: string }; shadows: { sm: object } }, themeMode: 'light' | 'dark') {
  const isDark = themeMode === 'dark';
  return StyleSheet.create({
    container: {
      width: '100%',
      marginBottom: spacing.xl,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    countBadge: {
      backgroundColor: isDark ? 'rgba(174, 174, 178, 0.2)' : 'rgba(167, 139, 186, 0.12)',
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: 10,
    },
    countText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? 'rgba(28, 28, 30, 0.7)' : 'rgba(255, 255, 255, 0.45)',
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.6)',
      paddingVertical: 14,
      ...theme.shadows.sm,
    },
    scrollContent: {
      paddingHorizontal: 14,
      gap: 6,
    },
    badgeWrapper: {
      alignItems: 'center',
      width: 64,
    },
    badgeCircle: {
      width: BADGE_SIZE,
      height: BADGE_SIZE,
      borderRadius: BADGE_SIZE / 2,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 5,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDark ? 0.2 : 0.06,
          shadowRadius: 3,
        },
        android: { elevation: 2 },
      }),
    },
    badgeEmoji: {
      fontSize: 22,
    },
    badgeLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 13,
    },
  });
}

// ─── Public Component ───────────────────────────────────────────────────────

interface AchievementRowProps {
  /** Optional title override */
  title?: string;
  /** Optional: pass achievements directly instead of reading from context */
  achievements?: AchievementEntry[];
}

/**
 * Horizontal scrolling row of unlocked achievement badges.
 *
 * Reusable — drop it anywhere inside an AchievementProvider:
 * ```tsx
 * <AchievementRow />
 * <AchievementRow title="Recent Badges" />
 * <AchievementRow achievements={customList} />
 * ```
 *
 * Renders nothing if the user has no unlocked achievements.
 */
export function AchievementRow({ title = 'Achievements', achievements: propAchievements }: AchievementRowProps) {
  const { theme, themeMode } = useTheme();
  const ctx = useAchievements();
  const list = propAchievements ?? ctx.unlocked;

  const styles = useMemo(
    () => createAchievementStyles(theme, themeMode),
    [theme, themeMode],
  );

  if (list.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{list.length} earned</Text>
        </View>
      </View>

      <View style={styles.card}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {list.map((a) => (
            <AchievementBadge key={a.achievementId} achievement={a} styles={styles} />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
