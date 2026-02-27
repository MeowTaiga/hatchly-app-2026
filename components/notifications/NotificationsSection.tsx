import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ApiNotification, NotificationType } from '@/lib/api';
import { useTheme } from '@/store/ThemeProvider';
import { createDrawerContentStyles } from '@/components/ui/drawerStyles';
import { spacing, radius } from '@/constants/theme';

// ─── Types ─────────────────────────────────────────────────────────────────

const NOTIFICATION_ICONS: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  friend_request: 'person-add-outline',
  friend_accepted: 'people-outline',
};

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

// ─── Row Component ─────────────────────────────────────────────────────────

function NotificationRow({
  item,
  onPress,
  st,
  colors,
}: {
  item: ApiNotification;
  onPress: () => void;
  st: ReturnType<typeof createDrawerContentStyles>;
  colors: { text: string; textMuted: string; textSecondary: string; primary: string; border: string };
}) {
  const icon = NOTIFICATION_ICONS[item.type] ?? 'notifications-outline';
  const isUnread = !item.readAt;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border, backgroundColor: isUnread ? colors.primary + '08' : undefined },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.primary + '20' }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={st.rowBody}>
        <Text style={[st.rowValue, { fontSize: 14, fontWeight: isUnread ? '700' : '600' }]} numberOfLines={2}>
          {item.title}
        </Text>
        {item.body ? (
          <Text style={[st.rowLabel, { marginTop: 2 }]} numberOfLines={2}>
            {item.body}
          </Text>
        ) : null}
        <Text style={[st.rowLabel, { marginTop: 4, fontSize: 11 }]}>{formatRelativeTime(item.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

// ─── Section ───────────────────────────────────────────────────────────────

interface NotificationsSectionProps {
  notifications: ApiNotification[];
  unreadCount: number;
  hasMore: boolean;
  isLoading: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onLoadMore: () => void;
  onNotificationPress: (item: ApiNotification) => void;
}

export function NotificationsSection({
  notifications,
  unreadCount,
  hasMore,
  isLoading,
  onMarkRead,
  onMarkAllRead,
  onLoadMore,
  onNotificationPress,
}: NotificationsSectionProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const st = useMemo(() => createDrawerContentStyles(theme), [theme]);

  const handlePress = (item: ApiNotification) => {
    if (!item.readAt) onMarkRead(item.id);
    onNotificationPress(item);
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[st.secLabel, { marginBottom: 0 }]}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
        {unreadCount > 0 && (
          <Pressable onPress={onMarkAllRead} hitSlop={8} style={({ pressed }) => [styles.markAll, pressed && { opacity: 0.7 }]}>
            <Text style={[st.rowLabel, { color: colors.primary, fontSize: 12 }]}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View style={[styles.card, styles.centered, { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border }]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={[styles.card, styles.emptyCard, { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border }]}>
          <Ionicons name="notifications-outline" size={28} color={colors.textMuted} />
          <Text style={[st.rowLabel, { textAlign: 'center', marginTop: 8 }]}>
            No notifications yet. Friend requests will appear here.
          </Text>
        </View>
      ) : (
        <View style={[styles.card, styles.listCard, { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border }]}>
          {notifications.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              onPress={() => handlePress(item)}
              st={st}
              colors={colors}
            />
          ))}
          {hasMore && (
            <Pressable onPress={onLoadMore} style={({ pressed }) => [styles.loadMore, pressed && { opacity: 0.7 }]}>
              <Text style={[st.rowLabel, { color: colors.primary }]}>Load more</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  markAll: { marginLeft: 'auto' },
  card: { borderRadius: radius.lg, overflow: 'hidden' },
  listCard: { padding: 0 },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.base,
  },
  centered: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMore: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
});
