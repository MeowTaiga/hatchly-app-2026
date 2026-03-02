import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import type { FriendEntry } from '@/lib/api';
import { useTheme } from '@/store/ThemeProvider';
import { createDrawerContentStyles } from '@/components/ui/drawerStyles';
import { spacing, radius } from '@/constants/theme';

// ─── Types ─────────────────────────────────────────────────────────────────

interface FriendsSectionProps {
  title: string;
  items: FriendEntry[];
  emptyMessage: string;
  onRespondAccept?: (requestId: string) => void;
  onRespondReject?: (requestId: string) => void;
  onRemove?: (userId: string) => void;
  isLoading?: boolean;
}

// ─── Row Component ─────────────────────────────────────────────────────────

function FriendRow({
  entry,
  onRespondAccept,
  onRespondReject,
  onRemove,
  st,
  colors,
}: {
  entry: FriendEntry;
  onRespondAccept?: (id: string) => void;
  onRespondReject?: (id: string) => void;
  onRemove?: (userId: string) => void;
  st: ReturnType<typeof createDrawerContentStyles>;
  colors: any;
}) {
  const { user, id, status } = entry;
  const isReceived = status === 'pending' && onRespondAccept;

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.avatar, { backgroundColor: colors.border + '60' }]}>
        {user.pet?.imageUrl ? (
          <CachedImage source={{ uri: user.pet.imageUrl }} style={styles.avatarImg} />
        ) : (
          <Text style={styles.avatarEmoji}>👤</Text>
        )}
      </View>
      <View style={st.rowBody}>
        <Text style={[st.rowValue, { fontSize: 15 }]} numberOfLines={1}>
          {user.username ?? user.phone}
        </Text>
        {user.username ? (
          <Text style={st.rowLabel} numberOfLines={1}>{user.phone}</Text>
        ) : null}
      </View>
      {isReceived ? (
        <View style={styles.actionRow}>
          <Pressable
            onPress={() => onRespondAccept?.(id)}
            style={({ pressed }) => [styles.acceptBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="checkmark" size={18} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => onRespondReject?.(id)}
            style={({ pressed }) => [styles.rejectBtn, { borderColor: colors.error }, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="close" size={18} color={colors.error} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => onRemove?.(user.id)}
          style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="person-remove-outline" size={18} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

export function FriendsSection({
  title,
  items,
  emptyMessage,
  onRespondAccept,
  onRespondReject,
  onRemove,
  isLoading,
}: FriendsSectionProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const st = useMemo(() => createDrawerContentStyles(theme), [theme]);

  return (
    <View style={styles.section}>
      <Text style={[st.secLabel, { marginBottom: spacing.sm }]}>{title}</Text>
      {isLoading ? (
        <View style={[styles.card, styles.centered, { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border }]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={[styles.card, styles.emptyCard, { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border }]}>
          <Ionicons name="people-outline" size={28} color={colors.textMuted} />
          <Text style={[st.rowLabel, { textAlign: 'center', marginTop: 8 }]}>{emptyMessage}</Text>
        </View>
      ) : (
        <View style={[styles.card, styles.listCard, { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border }]}>
          {items.map((entry, idx) => (
            <FriendRow
              key={entry.id}
              entry={entry}
              onRespondAccept={onRespondAccept}
              onRespondReject={onRespondReject}
              onRemove={onRemove}
              st={st}
              colors={colors}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.xl },
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
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
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarEmoji: { fontSize: 20 },
  actionRow: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#34D399',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: { padding: 8 },
});
