/**
 * Chat card for a goal the pet just created, or a tap-to-complete offer.
 */

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/ThemeProvider';
import { GoalIcon } from '@/components/goals/GoalIcon';
import { GoalMeta } from '@/components/goals/GoalMeta';
import { spacing } from '@/constants/theme';
import type { ChatGoalCard as ChatGoalCardData } from '@/lib/api';

export interface GoalChatCardProps {
  card: ChatGoalCardData;
  onComplete: () => void;
  completed?: boolean;
  busy?: boolean;
}

export function GoalChatCard({ card, onComplete, completed, busy }: GoalChatCardProps) {
  const { theme, themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const { colors } = theme;
  const done = completed || card.goal.completedToday;
  const canComplete = card.goal.dueToday && !done;
  const kicker = useMemo(() => {
    if (card.kind === 'complete') return done ? 'Checked off' : 'Check off';
    if (card.alreadyExisted) return 'Already on your list';
    return 'Added to your goals';
  }, [card.kind, card.alreadyExisted, done]);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.surface,
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.primary + '20' }]}>
        <GoalIcon
          itemType={card.goal.iconItemType}
          imageUrl={card.goal.iconImageUrl}
          emoji={card.goal.iconEmoji}
          size={28}
        />
      </View>
      <View style={styles.body}>
        <Text style={[styles.kicker, { color: colors.textMuted }]}>{kicker}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{card.goal.title}</Text>
        <View style={styles.metaWrap}>
          <GoalMeta
            repeat={card.goal.repeat}
            repeatDays={card.goal.repeatDays}
            remindAt={card.goal.remindAt}
            notes={card.goal.notes}
            color={colors.textMuted}
            notesColor={colors.textSecondary}
          />
        </View>
        {canComplete ? (
          <Pressable
            style={({ pressed }) => [
              styles.doneBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85 },
            ]}
            onPress={onComplete}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.doneText}>I did it</Text>
              </>
            )}
          </Pressable>
        ) : done ? (
          <View style={[styles.doneBtn, { backgroundColor: colors.success + '30' }]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={[styles.doneText, { color: colors.success }]}>Done</Text>
          </View>
        ) : null}
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
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, marginBottom: 2 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  metaWrap: { marginBottom: 6 },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginTop: 4,
  },
  doneText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
