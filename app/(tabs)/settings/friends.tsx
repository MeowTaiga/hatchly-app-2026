import React, { useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { TAB_BAR_TOTAL_HEIGHT } from '@/components/ui/FloatingTabBar';
import { COLLAPSED_HEIGHT } from '@/components/ui/PetHeroBar';
import { AddFriendDrawer, type AddFriendDrawerRef } from '@/components/friends/AddFriendDrawer';
import { useFriends } from '@/store/FriendsProvider';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';
import type { FriendEntry } from '@/lib/api';

// ─── Friend Row ─────────────────────────────────────────────────────────────

function FriendRow({ entry, onRemove }: { entry: FriendEntry; onRemove: (id: string) => void }) {
  const { theme } = useTheme();
  const { colors } = theme;
  const { user } = entry;

  return (
    <View style={[styles.friendRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.avatar, { backgroundColor: colors.border + '60' }]}>
        {user.pet?.imageUrl ? (
          <CachedImage source={{ uri: user.pet.imageUrl }} style={styles.avatarImg} />
        ) : (
          <Text style={styles.avatarEmoji}>👤</Text>
        )}
      </View>
      <View style={styles.friendInfo}>
        <Text style={[styles.friendName, { color: colors.text }]} numberOfLines={1}>
          {user.username ?? user.phone}
        </Text>
        {user.username ? (
          <Text style={[styles.friendSub, { color: colors.textMuted }]} numberOfLines={1}>
            {user.phone}
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={() => onRemove(user.id)}
        hitSlop={8}
        style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.5 }]}
      >
        <Ionicons name="person-remove-outline" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function FriendsScreen() {
  const { theme } = useTheme();
  const { colors, typography } = theme;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { friends, isLoading, removeFriend, refresh } = useFriends();
  const addFriendRef = useRef<AddFriendDrawerRef>(null);

  const onFriendAdded = useCallback(() => refresh(), [refresh]);

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
        addBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          backgroundColor: colors.primary,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: radius.full,
        },
        addBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
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
        countLabel: {
          fontSize: 12,
          fontWeight: '600',
          color: colors.textMuted,
          marginBottom: spacing.sm,
        },
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
          <Text style={st.headerTitle}>Friends</Text>
          <Pressable
            onPress={() => addFriendRef.current?.open()}
            style={({ pressed }) => [st.addBtn, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="person-add" size={16} color="#fff" />
            <Text style={st.addBtnText}>Add</Text>
          </Pressable>
        </View>

        {/* Friends list */}
        {isLoading ? (
          <View style={st.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : friends.length === 0 ? (
          <View style={st.emptyCard}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={st.emptyText}>
              No friends yet.{'\n'}Add friends to start connecting!
            </Text>
          </View>
        ) : (
          <>
            <Text style={st.countLabel}>{friends.length} friend{friends.length !== 1 ? 's' : ''}</Text>
            <View style={st.card}>
              {friends.map((entry) => (
                <FriendRow key={entry.id} entry={entry} onRemove={removeFriend} />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <AddFriendDrawer ref={addFriendRef} onAdd={onFriendAdded} />
    </GradientBackground>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarEmoji: { fontSize: 22 },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 15, fontWeight: '700' },
  friendSub: { fontSize: 12, marginTop: 1 },
  removeBtn: { padding: 8 },
});
