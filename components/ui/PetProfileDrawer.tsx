/**
 * Pet Profile Drawer — full-screen or bottom-sheet drawer showing pet details.
 * Displays avatar, name, level, mood stats (Hunger, Happy, Mood) with progress bars,
 * XP progress to next level, and optional tips.
 *
 * Triggered by tapping PetStatsDisplay in PetHeroBar or PetStatusBar.
 */

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { useAuth } from '@/store/AuthProvider';
import { useTheme } from '@/store/ThemeProvider';
import { createDrawerContentStyles } from '@/components/ui/drawerStyles';
import { spacing, radius } from '@/constants/theme';

export interface PetProfileDrawerRef {
  open: () => void;
  close: () => void;
}

// ─── Stat bar row ───────────────────────────────────────────────────────────

interface StatBarRowProps {
  icon: 'heart' | 'nutrition' | 'sparkles';
  label: string;
  value: number;
  colors: { text: string; textMuted: string; primary: string; error?: string; border?: string };
}

function StatBarRow({ icon, label, value, colors }: StatBarRowProps) {
  const pct = Math.min(Math.max(value, 0), 100);
  const isLow = value < 50;
  const barColor = isLow ? (colors.error ?? '#EF4444') : colors.primary;
  const trackBg = colors.border ?? 'rgba(0,0,0,0.08)';

  return (
    <View style={statBarStyles.row}>
      <View style={[statBarStyles.iconWrap, { backgroundColor: `${barColor}18` }]}>
        <Ionicons name={icon} size={18} color={barColor} />
      </View>
      <View style={statBarStyles.body}>
        <View style={statBarStyles.labelRow}>
          <Text style={[statBarStyles.label, { color: colors.text }]}>{label}</Text>
          <Text style={[statBarStyles.value, { color: colors.text }]}>{Math.round(value)}</Text>
        </View>
        <View style={[statBarStyles.track, { backgroundColor: trackBg }]}>
          <View
            style={[
              statBarStyles.fill,
              { width: `${pct}%`, backgroundColor: barColor },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const statBarStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: { fontSize: 14, fontWeight: '600' },
  value: { fontSize: 14, fontWeight: '700' },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 3,
  },
});

// ─── Drawer Component ────────────────────────────────────────────────────────

export const PetProfileDrawer = forwardRef<PetProfileDrawerRef, Record<string, never>>(
  function PetProfileDrawer(_, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const { user } = useAuth();
    const { theme } = useTheme();
    const { colors } = theme;
    const st = createDrawerContentStyles(theme);

    useImperativeHandle(ref, () => ({
      open: () => drawerRef.current?.open(),
      close: () => drawerRef.current?.close(),
    }));

    const pet = user?.pet;
    const petName = pet?.customName || pet?.name || 'Buddy';
    const petLevel = pet?.level ?? 1;
    const hunger = pet?.hunger ?? 100;
    const happy = pet?.happy ?? 100;
    const mood = pet?.mood ?? 100;
    const xp = pet?.xp ?? 0;
    const xpToNext = Math.max(pet?.xpToNextLevel ?? 100, 1);
    const xpProgress = Math.min(xp / xpToNext, 1);
    const petImageUrl = pet?.imageUrl;

    return (
      <AppDrawer
        ref={drawerRef}
        title="Pet Profile"
        snapPoints={['60%', '90%']}
        initialSnapIndex={0}
      >
        <View style={st.scrollContent}>
          {/* Avatar + name + level */}
          <View style={[st.card, styles.headerCard]}>
            <View style={styles.avatarWrap}>
              {petImageUrl ? (
                <Image
                  source={{ uri: petImageUrl }}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: colors.border + '40' }]}>
                  <Text style={styles.avatarEmoji}>🐣</Text>
                </View>
              )}
            </View>
            <Text style={[st.rowValue, styles.petName]}>{petName}</Text>
            <Text style={[st.rowLabel, { color: colors.primary, fontWeight: '700' }]}>
              Level {petLevel}
            </Text>
          </View>

          {/* Mood stats */}
          <Text style={st.secLabel}>Mood Stats</Text>
          <View style={st.card}>
            <StatBarRow icon="heart" label="Happy" value={happy} colors={colors} />
            <StatBarRow icon="nutrition" label="Hunger" value={hunger} colors={colors} />
            <StatBarRow icon="sparkles" label="Mood" value={mood} colors={colors} />
          </View>

          {/* XP progress */}
          <Text style={st.secLabel}>XP Progress</Text>
          <View style={st.card}>
            <View style={styles.xpRow}>
              <Text style={[st.rowLabel, { color: colors.textMuted }]}>
                {xp} / {xpToNext} XP to Level {petLevel + 1}
              </Text>
              <Text style={[st.rowValue, { fontSize: 14 }]}>
                {Math.round(xpProgress * 100)}%
              </Text>
            </View>
            <View style={[statBarStyles.track, { marginTop: 8 }]}>
              <View
                style={[
                  statBarStyles.fill,
                  {
                    width: `${xpProgress * 100}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </AppDrawer>
    );
  },
);

const styles = StyleSheet.create({
  headerCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 8,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 40 },
  petName: { fontSize: 20, marginBottom: 2 },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
