/**
 * Friends section — richer list with pet/farm levels, needs, and last active.
 */

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CachedImage } from '@/components/ui/CachedImage';
import { useFriends } from '@/store/FriendsProvider';
import { useTheme } from '@/store/ThemeProvider';
import { spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import type { FriendEntry } from '@/lib/api';

function formatLastActive(iso?: string): string {
  if (!iso) return 'Offline';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'Just now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 2) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function FriendRow({
  entry,
  colors,
}: {
  entry: FriendEntry;
  colors: {
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    primary: string;
    accent: string;
    secondary: string;
    error?: string;
  };
}) {
  const pet = entry.user.pet;
  const displayName =
    entry.user.username || pet?.customName || pet?.name || 'Friend';
  const petName = pet?.customName || pet?.name;
  const hunger = pet?.hunger ?? 100;
  const happy = pet?.happy ?? 100;
  const mood = pet?.mood ?? 100;
  const needsCare = hunger < 50 || happy < 50 || mood < 50;

  return (
    <View style={[styles.row, { backgroundColor: 'rgba(127,127,127,0.06)' }]}>
      <View style={[styles.avatarWrap, { backgroundColor: colors.border + '40' }]}>
        {pet?.imageUrl ? (
          <CachedImage source={{ uri: pet.imageUrl }} style={styles.avatar} resizeMode="cover" />
        ) : (
          <Text style={styles.avatarEmoji}>🐾</Text>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[styles.active, { color: colors.textMuted }]}>
            {formatLastActive(entry.user.lastLogin)}
          </Text>
        </View>

        {petName && entry.user.username ? (
          <Text style={[styles.petLine, { color: colors.textSecondary }]} numberOfLines={1}>
            with {petName}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          {pet?.level != null ? (
            <View style={[styles.chip, { backgroundColor: colors.primary + '18' }]}>
              <Text style={[styles.chipText, { color: colors.primary }]}>Pet Lv {pet.level}</Text>
            </View>
          ) : null}
          {entry.user.farmLevel != null ? (
            <View style={[styles.chip, { backgroundColor: colors.accent + '18' }]}>
              <Text style={[styles.chipText, { color: colors.accent }]}>
                Farm Lv {entry.user.farmLevel}
              </Text>
            </View>
          ) : null}
          {needsCare ? (
            <View style={[styles.chip, { backgroundColor: (colors.error ?? '#EF4444') + '18' }]}>
              <Text style={[styles.chipText, { color: colors.error ?? '#EF4444' }]}>Needs care</Text>
            </View>
          ) : (
            <View style={[styles.chip, { backgroundColor: colors.secondary + '18' }]}>
              <Text style={[styles.chipText, { color: colors.secondary }]}>Thriving</Text>
            </View>
          )}
        </View>

        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Ionicons name="heart" size={11} color={colors.textMuted} />
            <Text style={[styles.statNum, { color: colors.textSecondary }]}>{Math.round(happy)}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="nutrition" size={11} color={colors.textMuted} />
            <Text style={[styles.statNum, { color: hunger < 50 ? (colors.error ?? '#EF4444') : colors.textSecondary }]}>
              {Math.round(hunger)}
            </Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="sparkles" size={11} color={colors.textMuted} />
            <Text style={[styles.statNum, { color: colors.textSecondary }]}>{Math.round(mood)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export function FriendsActivityRow() {
  const { friends, received } = useFriends();
  const { theme } = useTheme();
  const { colors } = theme;
  const router = useRouter();

  const acceptedFriends = useMemo(
    () => friends.filter((f) => f.status === 'accepted'),
    [friends],
  );

  const pendingCount = received.length;

  const cardShadow = useMemo(
    () =>
      Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
        android: { elevation: 2 },
      }),
    [],
  );

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kicker, { color: colors.textMuted }]}>SOCIAL</Text>
            <Text style={[styles.title, { color: colors.text }]}>Friends</Text>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>
              {acceptedFriends.length === 0
                ? 'Add friends to see their pets & farms'
                : `${acceptedFriends.length} friend${acceptedFriends.length === 1 ? '' : 's'}${
                    pendingCount > 0 ? ` · ${pendingCount} request${pendingCount === 1 ? '' : 's'}` : ''
                  }`}
            </Text>
          </View>
          <Pressable
            onPress={() => router.navigate('/(tabs)/settings/friends')}
            style={({ pressed }) => [styles.manageBtn, { borderColor: colors.border }, pressed && { opacity: 0.75 }]}
          >
            <Text style={[styles.manageText, { color: colors.primary }]}>
              {acceptedFriends.length === 0 ? 'Add' : 'Manage'}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
        </View>

        {acceptedFriends.length === 0 ? (
          <Pressable
            onPress={() => router.navigate('/(tabs)/settings/friends')}
            style={[styles.empty, { backgroundColor: 'rgba(127,127,127,0.06)' }]}
          >
            <Ionicons name="people-outline" size={22} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Invite a friend and compare pet levels, farm progress, and care needs.
            </Text>
          </Pressable>
        ) : (
          <View style={styles.list}>
            {acceptedFriends.slice(0, 5).map((entry) => (
              <FriendRow key={entry.id} entry={entry} colors={colors} />
            ))}
            {acceptedFriends.length > 5 ? (
              <Pressable onPress={() => router.navigate('/(tabs)/settings/friends')}>
                <Text style={[styles.more, { color: colors.primary }]}>
                  View all {acceptedFriends.length} friends
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.base,
  },
  card: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1,
    padding: spacing.xl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  kicker: { fontSize: 11, fontWeight: '900', letterSpacing: 1.1, marginBottom: 2 },
  title: { fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  sub: { fontSize: 12, marginTop: 2 },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  manageText: { fontSize: 12, fontWeight: '700' },
  empty: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  list: { gap: 8 },
  more: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 16,
    padding: 12,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: { width: 52, height: 52 },
  avatarEmoji: { fontSize: 22 },
  body: { flex: 1, gap: 4 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: { flex: 1, fontSize: 15, fontWeight: '800' },
  active: { fontSize: 11, fontWeight: '600' },
  petLine: { fontSize: 12 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  chipText: { fontSize: 10, fontWeight: '800' },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statNum: { fontSize: 11, fontWeight: '700' },
});
