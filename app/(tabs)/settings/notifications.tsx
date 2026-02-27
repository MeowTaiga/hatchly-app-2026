import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { TAB_BAR_TOTAL_HEIGHT } from '@/components/ui/FloatingTabBar';
import { COLLAPSED_HEIGHT } from '@/components/ui/PetHeroBar';
import { useNotifications } from '@/store/NotificationsProvider';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';
import type { ApiNotification, NotificationType } from '@/lib/api';

// ─── Helpers ────────────────────────────────────────────────────────────────

const ICON_MAP: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  friend_request: 'person-add-outline',
  friend_accepted: 'people-outline',
};

function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ─── Notification Row ───────────────────────────────────────────────────────

function NotificationRow({
  item,
  onPress,
}: {
  item: ApiNotification;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const { colors } = theme;
  const icon = ICON_MAP[item.type] ?? 'notifications-outline';
  const unread = !item.readAt;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border },
        unread && { backgroundColor: colors.primary + '08' },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.primary + '18' }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.rowBody}>
        <Text
          style={[styles.rowTitle, { color: colors.text, fontWeight: unread ? '700' : '600' }]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        {item.body ? (
          <Text style={[styles.rowSub, { color: colors.textMuted }]} numberOfLines={2}>
            {item.body}
          </Text>
        ) : null}
        <Text style={[styles.rowTime, { color: colors.textMuted }]}>{relativeTime(item.createdAt)}</Text>
      </View>
      {unread && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
    </Pressable>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { colors, typography } = theme;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    notifications,
    unreadCount,
    hasMore,
    isLoading,
    markRead,
    markAllRead,
    loadMore,
  } = useNotifications();

  const handlePress = useCallback(
    (item: ApiNotification) => {
      if (!item.readAt) markRead(item.id);
    },
    [markRead],
  );

  const st = useMemo(
    () =>
      StyleSheet.create({
        scroll: {
          paddingHorizontal: spacing.xl,
          paddingBottom: TAB_BAR_TOTAL_HEIGHT + spacing.xl,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: spacing.xl,
          marginTop: spacing.xl,
        },
        backBtn: { padding: 4, marginRight: spacing.sm },
        headerTitle: { ...typography.title, flex: 1 },
        markAllBtn: {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: radius.full,
          backgroundColor: colors.primary + '18',
        },
        markAllText: { fontSize: 12, fontWeight: '700', color: colors.primary },
        card: {
          backgroundColor: colors.surfaceElevated,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        },
        emptyCard: {
          backgroundColor: colors.surfaceElevated,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          paddingVertical: spacing['3xl'],
          paddingHorizontal: spacing.xl,
          gap: spacing.base,
        },
        emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
        loadMoreBtn: { alignItems: 'center', paddingVertical: 14 },
        loadMoreText: { fontSize: 13, fontWeight: '600', color: colors.primary },
        loadingWrap: { alignItems: 'center', paddingVertical: spacing['3xl'] },
      }),
    [colors, typography],
  );

  return (
    <GradientBackground bubbleCount={3}>
      <ScrollView
        contentContainerStyle={[
          st.scroll,
          { paddingTop: COLLAPSED_HEIGHT + insets.top + spacing.sm },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={st.header}>
          <Pressable onPress={() => router.back()} style={st.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
          <Text style={st.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Pressable
              onPress={markAllRead}
              style={({ pressed }) => [st.markAllBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={st.markAllText}>Mark all read</Text>
            </Pressable>
          )}
        </View>

        {/* Notification list */}
        {isLoading ? (
          <View style={st.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={st.emptyCard}>
            <Ionicons name="notifications-outline" size={48} color={colors.textMuted} />
            <Text style={st.emptyText}>
              No notifications yet.{'\n'}Friend requests will appear here.
            </Text>
          </View>
        ) : (
          <View style={st.card}>
            {notifications.map((item) => (
              <NotificationRow key={item.id} item={item} onPress={() => handlePress(item)} />
            ))}
            {hasMore && (
              <Pressable
                onPress={loadMore}
                style={({ pressed }) => [st.loadMoreBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={st.loadMoreText}>Load more</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 14, lineHeight: 19 },
  rowSub: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  rowTime: { fontSize: 11, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 8 },
});
