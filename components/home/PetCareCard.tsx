/**
 * Pet care panel — Happy / Hunger / Mood bars + level XP.
 * Placed above Friends so needs are always visible on home.
 */

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/AuthProvider';
import { useTheme } from '@/store/ThemeProvider';
import { CachedImage } from '@/components/ui/CachedImage';
import { spacing } from '@/constants/theme';
import { averageSkillProgress, resolveCompanionLevel } from '@/constants/skills';

function StatBar({
  icon,
  label,
  value,
  color,
  track,
  warn,
  textColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color: string;
  track: string;
  warn?: boolean;
  textColor: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  const fill = warn ? '#EF4444' : color;
  return (
    <View style={styles.statRow}>
      <View style={[styles.statIcon, { backgroundColor: fill + '18' }]}>
        <Ionicons name={icon} size={14} color={fill} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.statLabelRow}>
          <Text style={[styles.statLabel, { color: warn ? fill : textColor }]}>{label}</Text>
          <Text style={[styles.statValue, { color: warn ? fill : textColor }]}>{Math.round(value)}</Text>
        </View>
        <View style={[styles.track, { backgroundColor: track }]}>
          <View style={[styles.fill, { width: `${pct}%`, backgroundColor: fill }]} />
        </View>
      </View>
    </View>
  );
}

export function PetCareCard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const pet = user?.pet;

  const cardShadow = useMemo(
    () =>
      Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
        android: { elevation: 2 },
      }),
    [],
  );

  if (!pet) return null;

  const name = pet.customName || pet.name || 'Buddy';
  const happy = pet.happy ?? 100;
  const hunger = pet.hunger ?? 100;
  const mood = pet.mood ?? 100;
  const skills = user?.skills ?? pet.skills;
  const level = resolveCompanionLevel({
    totalLevel: user?.totalLevel,
    petTotalLevel: pet.totalLevel,
    petLevel: pet.level,
    skills,
  });
  const xpPct = Math.min(100, Math.round(averageSkillProgress(skills) * 100));

  const needsCare = hunger < 50 || happy < 50 || mood < 50;
  const tip = hunger < 50
    ? 'Hungry — cook something or feed a treat in the Game tab'
    : happy < 50
      ? 'A little down — pet them or play in the Game tab'
      : mood < 50
        ? 'Mood is sour — give them space, then check in later'
        : 'Feeling good — keep logging wellness to earn care rewards';

  return (
    <Pressable
      onPress={() => router.push('/(tabs)/game')}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        cardShadow,
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={[styles.glow, { backgroundColor: colors.accent + '16' }]} />

      <View style={styles.header}>
        <View style={[styles.avatarWrap, { backgroundColor: colors.border + '40' }]}>
          {pet.imageUrl ? (
            <CachedImage source={{ uri: pet.imageUrl }} style={styles.avatar} resizeMode="cover" />
          ) : (
            <Text style={{ fontSize: 22 }}>🐾</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: colors.textMuted }]}>COMPANION</Text>
          <Text style={[styles.title, { color: colors.text }]}>{name}</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            Lv. {level} · {xpPct}% avg skill progress
          </Text>
        </View>
        <View style={[styles.levelPill, { backgroundColor: colors.primary + '18' }]}>
          <Text style={[styles.levelText, { color: colors.primary }]}>Lv. {level}</Text>
        </View>
      </View>

      <View style={[styles.xpTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.xpFill, { width: `${xpPct}%`, backgroundColor: colors.primary }]} />
      </View>

      <View style={styles.stats}>
        <StatBar
          icon="heart"
          label="Happy"
          value={happy}
          color={colors.primary}
          track={colors.border}
          warn={happy < 50}
          textColor={colors.textSecondary}
        />
        <StatBar
          icon="nutrition"
          label="Hunger"
          value={hunger}
          color={colors.accent}
          track={colors.border}
          warn={hunger < 50}
          textColor={colors.textSecondary}
        />
        <StatBar
          icon="sparkles"
          label="Mood"
          value={mood}
          color={colors.secondary}
          track={colors.border}
          warn={mood < 50}
          textColor={colors.textSecondary}
        />
      </View>

      <View
        style={[
          styles.tip,
          {
            backgroundColor: needsCare ? '#EF444418' : 'rgba(127,127,127,0.08)',
          },
        ]}
      >
        <Ionicons
          name={needsCare ? 'alert-circle' : 'leaf'}
          size={14}
          color={needsCare ? '#EF4444' : colors.textMuted}
        />
        <Text
          style={[
            styles.tipText,
            { color: needsCare ? '#EF4444' : colors.textSecondary },
          ]}
        >
          {tip}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1,
    padding: spacing.xl,
    marginBottom: spacing.base,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    top: -50,
    left: -40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
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
  kicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  title: { fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  sub: { fontSize: 12, marginTop: 1 },
  levelPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  levelText: { fontSize: 12, fontWeight: '800' },
  xpTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 14,
  },
  xpFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
  stats: { gap: 10, marginBottom: 12 },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    padding: 10,
  },
  tipText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  statLabel: { fontSize: 12, fontWeight: '700' },
  statValue: { fontSize: 12, fontWeight: '800' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
});
