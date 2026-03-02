/**
 * Horizontal scroll of friend avatars (pet photos) with activity labels.
 * Place above AchievementRow on home. Shows "Add friends" CTA when empty.
 */

import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import { useFriends } from '@/store/FriendsProvider';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';
import { useRouter } from 'expo-router';

const AVATAR_SIZE = 44;

export function FriendsActivityRow() {
  const { friends } = useFriends();
  const { theme } = useTheme();
  const router = useRouter();

  const acceptedFriends = useMemo(
    () => friends.filter((f) => f.status === 'accepted'),
    [friends],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
        card: {
          backgroundColor: theme.colors.surface + 'E6',
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingVertical: 14,
        },
        scrollContent: {
          flexDirection: 'row',
          paddingHorizontal: 14,
          gap: 12,
          alignItems: 'center',
        },
        avatarWrap: {
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          borderRadius: AVATAR_SIZE / 2,
          overflow: 'hidden',
          backgroundColor: theme.colors.border + '40',
          alignItems: 'center',
          justifyContent: 'center',
        },
        avatarImg: {
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
        },
        avatarEmoji: { fontSize: 20 },
        friendItem: {
          alignItems: 'center',
          width: 56,
        },
        activityLabel: {
          fontSize: 10,
          color: theme.colors.textMuted,
          marginTop: 4,
          textAlign: 'center',
          maxWidth: 56,
        },
        addFriendsCta: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 20,
          paddingHorizontal: 14,
        },
        addFriendsText: {
          fontSize: 13,
          color: theme.colors.textSecondary,
          textAlign: 'center',
        },
        addFriendsBtn: {
          marginTop: 8,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: radius.full,
          backgroundColor: theme.colors.primary + '26',
          borderWidth: 1,
          borderColor: theme.colors.primary,
        },
        addFriendsBtnText: {
          fontSize: 12,
          fontWeight: '600',
          color: theme.colors.primary,
        },
      }),
    [theme],
  );

  if (acceptedFriends.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Friends</Text>
        <Pressable
          style={styles.card}
          onPress={() => router.push('/settings/friends')}
        >
          <View style={styles.addFriendsCta}>
            <Text style={styles.addFriendsText}>Add friends to see their activity</Text>
            <View style={styles.addFriendsBtn}>
              <Text style={styles.addFriendsBtnText}>Add friends</Text>
            </View>
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Friends</Text>
      <View style={styles.card}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {acceptedFriends.map((entry) => (
            <View key={entry.id} style={styles.friendItem}>
              <View style={styles.avatarWrap}>
                {entry.user.pet?.imageUrl ? (
                  <CachedImage
                    source={{ uri: entry.user.pet.imageUrl }}
                    style={styles.avatarImg}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.avatarEmoji}>🐾</Text>
                )}
              </View>
              <Text style={styles.activityLabel} numberOfLines={2}>
                Recently active
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
