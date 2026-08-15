import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, ScrollView, Platform } from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { BubbleButton } from '@/components/ui/BubbleButton';
import { TAB_BAR_TOTAL_HEIGHT } from '@/components/ui/FloatingTabBar';
import { COLLAPSED_HEIGHT } from '@/components/ui/PetHeroBar';
import { useAuth } from '@/store/AuthProvider';
import { useFriends } from '@/store/FriendsProvider';
import { useNotifications } from '@/store/NotificationsProvider';
import { useTheme } from '@/store/ThemeProvider';
import { useFasting } from '@/store/FastingProvider';
import { spacing, radius } from '@/constants/theme';
import { getPoseForContext, useNeutralPoseCycle } from '@/game/creature/pet';

// ─── Helpers ────────────────────────────────────────────────────────────────

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 4 ? `***${digits.slice(-4)}` : '***';
}

// ─── Menu Row ───────────────────────────────────────────────────────────────

function MenuRow({
  icon,
  label,
  color,
  badge,
  onPress,
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  badge?: number;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress && !right}
      style={({ pressed }) => [
        styles.menuRow,
        { backgroundColor: colors.surface + 'CC' },
        pressed && onPress && styles.menuPressed,
      ]}
    >
      <View style={[styles.menuIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
      {badge != null && badge > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null)}
    </Pressable>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode } = useTheme();
  const { colors, typography, shadows } = theme;
  const router = useRouter();
  const { user, logout } = useAuth();
  const { friends, received } = useFriends();
  const { unreadCount } = useNotifications();
  const { liveActivityEnabled, setLiveActivityEnabled } = useFasting();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const insets = useSafeAreaInsets();

  const displayName = user?.username ?? (user?.phone ? maskPhone(user.phone) : '');
  const pet = user?.pet;
  const neutralPoseOverride = useNeutralPoseCycle(true);

  const petAvatarUrl = useMemo(() => {
    if (!pet) return null;
    const poseKey = getPoseForContext(
      undefined,
      pet.hunger ?? 100,
      pet.happy ?? 100,
      pet.mood ?? 100,
      'avatar',
      pet.pose,
      { neutralPoseOverride },
    );
    return (poseKey && pet.pose?.[poseKey]) ?? pet.imageUrl ?? null;
  }, [pet?.hunger, pet?.happy, pet?.mood, pet?.pose, pet?.imageUrl, neutralPoseOverride]);

  const st = useMemo(
    () =>
      StyleSheet.create({
        scrollContent: {
          marginTop: spacing.xl,
          paddingHorizontal: spacing.xl,
          paddingBottom: TAB_BAR_TOTAL_HEIGHT + spacing.xl,
        },
        profileCard: {
          width: '100%',
          backgroundColor: colors.surface + 'CC',
          borderRadius: radius.xl,
          padding: spacing.xl,
          marginBottom: spacing.xl,
          alignItems: 'center',
          ...shadows.sm,
        },
        avatar: {
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: colors.border + '60',
          marginBottom: spacing.base,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        },
        avatarImg: { width: '100%', height: '100%' },
        avatarEmoji: { fontSize: 40 },
        profileName: { ...typography.title, marginBottom: 4, textAlign: 'center' as const },
        profilePhone: { ...typography.caption, color: colors.textMuted },
        sectionLabel: {
          fontSize: 11,
          fontWeight: '700',
          color: colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: spacing.sm,
          marginTop: spacing.base,
        },
        menuGroup: {
          borderRadius: radius.xl,
          overflow: 'hidden',
          marginBottom: spacing.base,
        },
        adminCard: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surfaceElevated + 'D9',
          borderRadius: radius.lg,
          padding: spacing.xl,
          marginBottom: spacing.base,
          borderWidth: 1,
          borderColor: (colors.adminAccent ?? colors.primary) + '33',
          ...shadows.sm,
        },
        adminPressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
        adminIconWrap: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: (colors.adminAccent ?? colors.primary) + '1A',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.base,
        },
        adminTextWrap: { flex: 1 },
        adminTitle: { ...typography.label, marginBottom: 2 },
        adminDesc: { ...typography.caption },
        logoutWrap: { width: '100%', marginTop: spacing['2xl'] },
      }),
    [colors, typography, shadows],
  );

  return (
    <GradientBackground bubbleCount={3}>
      <ScrollView
        contentContainerStyle={[
          st.scrollContent,
          { paddingTop: COLLAPSED_HEIGHT + insets.top + spacing.sm },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile */}
        <View style={st.profileCard}>
          <View style={st.avatar}>
            {petAvatarUrl ? (
              <CachedImage source={{ uri: petAvatarUrl }} style={st.avatarImg} resizeMode="contain" />
            ) : (
              <Text style={st.avatarEmoji}>👤</Text>
            )}
          </View>
          <Text style={st.profileName} numberOfLines={1}>{displayName || 'You'}</Text>
          {user?.phone ? <Text style={st.profilePhone}>{maskPhone(user.phone)}</Text> : null}
        </View>

        {/* Social */}
        <Text style={st.sectionLabel}>Social</Text>
        <View style={st.menuGroup}>
          <MenuRow
            icon="people"
            label="Friends"
            color={colors.accent}
            badge={received.length || undefined}
            onPress={() => router.push('/settings/friends')}
          />
          <MenuRow
            icon="notifications"
            label="Notifications"
            color={colors.primary}
            badge={unreadCount || undefined}
            onPress={() => router.push('/settings/notifications')}
          />
        </View>

        {/* Preferences */}
        <Text style={st.sectionLabel}>Preferences</Text>
        <View style={st.menuGroup}>
          <MenuRow
            icon="color-palette"
            label="Accent Color"
            color={colors.primaryText ?? colors.primary}
            onPress={() => router.push('/settings/theme_picker')}
          />
          <MenuRow
            icon="moon"
            label="Dark Mode"
            color={colors.secondary}
            right={
              <Switch
                value={themeMode === 'dark'}
                onValueChange={(v) => setThemeMode(v ? 'dark' : 'light')}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor={colors.surface}
              />
            }
          />
          {Platform.OS === 'ios' ? (
            <MenuRow
              icon="phone-portrait-outline"
              label="Lock Screen widget"
              color={colors.primary}
              onPress={() => {
                void setLiveActivityEnabled(!liveActivityEnabled);
              }}
              right={
                <View pointerEvents="none">
                  <Switch
                    value={liveActivityEnabled}
                    trackColor={{ true: colors.primary, false: colors.border }}
                    thumbColor={colors.surface}
                  />
                </View>
              }
            />
          ) : null}
        </View>

        {/* Admin */}
        {isAdmin && (
          <>
            <Text style={st.sectionLabel}>Admin</Text>
            <Pressable
              style={({ pressed }) => [st.adminCard, pressed && st.adminPressed]}
              onPress={() => router.push('/admin')}
            >
              <View style={st.adminIconWrap}>
                <Ionicons name="shield-checkmark" size={24} color={colors.adminAccent ?? colors.primary} />
              </View>
              <View style={st.adminTextWrap}>
                <Text style={st.adminTitle}>Admin Panel</Text>
                <Text style={st.adminDesc}>View stats and manage the app</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [st.adminCard, pressed && st.adminPressed]}
              onPress={() => router.push('/pet-pose')}
            >
              <View style={st.adminIconWrap}>
                <Ionicons name="color-palette" size={24} color={colors.adminAccent ?? colors.primary} />
              </View>
              <View style={st.adminTextWrap}>
                <Text style={st.adminTitle}>Pet Poses</Text>
                <Text style={st.adminDesc}>Generate poses for the pet creator</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
          </>
        )}

        {/* Logout */}
        <View style={st.logoutWrap}>
          <BubbleButton
            label="Log Out"
            variant="secondary"
            onPress={async () => {
              await logout();
              router.replace('/(onboarding)/welcome');
            }}
          />
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

// ─── Shared menu styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
    gap: 12,
  },
  menuPressed: { opacity: 0.7 },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
});
