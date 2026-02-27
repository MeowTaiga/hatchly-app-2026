import React, { useEffect, useMemo } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, Platform, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PetStatsDisplay } from '@/components/ui/PetStatsDisplay';
import { usePetHero } from '@/store/PetHeroProvider';
import { useAuth } from '@/store/AuthProvider';
import { useTheme } from '@/store/ThemeProvider';
import { getPoseForContext, useNeutralPoseCycle } from '@/game/creature/pet';

// ─── Layout Constants ────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const EXPANDED_HEIGHT = 180;
export const COLLAPSED_HEIGHT = 56;

const DIFF = EXPANDED_HEIGHT - COLLAPSED_HEIGHT;

const PET_SIZE_EXPANDED = 100;
const PET_SIZE_COLLAPSED = 36;
const PET_SCALE_RATIO = PET_SIZE_COLLAPSED / PET_SIZE_EXPANDED;
const SCALE_PIVOT_OFFSET = (PET_SIZE_EXPANDED * (1 - PET_SCALE_RATIO)) / 2;

const XP_BAR_HEIGHT = 4;

// ─── Tabs that show the hero ─────────────────────────────────────────────────

const VISIBLE_TABS = new Set([0, 1, 4]);

// ─── Public Component ───────────────────────────────────────────────────────

interface PetHeroBarProps {
  activeTabIndex: number;
}

export function PetHeroBar({ activeTabIndex }: PetHeroBarProps) {
  const { collapsed, xpGainEvent, clearXpGainEvent, openPetProfileDrawer } = usePetHero();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pet = user?.pet;

  const visible = VISIBLE_TABS.has(activeTabIndex);
  const neutralPoseOverride = useNeutralPoseCycle(visible);

  const xpProgress = pet ? Math.min(pet.xp / Math.max(pet.xpToNextLevel, 1), 1) : 0;
  const petName = pet?.customName || pet?.name || 'Buddy';
  const petLevel = pet?.level ?? 1;
  const hunger = pet?.hunger ?? 100;
  const happy = pet?.happy ?? 100;
  const mood = pet?.mood ?? 100;

  const petImageUrl = useMemo(() => {
    const poseKey = getPoseForContext(undefined, hunger, happy, mood, 'hero', pet?.pose, {
      neutralPoseOverride,
    });
    return (poseKey && pet?.pose?.[poseKey]) ?? pet?.imageUrl;
  }, [hunger, happy, mood, neutralPoseOverride, pet?.pose, pet?.imageUrl]);

  if (!visible) return null;

  return (
    <PetHeroBarInner
      onPetPress={() => router.push('/(tabs)/game')}
      onStatsPress={openPetProfileDrawer}
      collapsed={collapsed}
      safeTop={insets.top}
      petImageUrl={petImageUrl}
      petName={petName}
      petLevel={petLevel}
      hunger={hunger}
      happy={happy}
      mood={mood}
      xpProgress={xpProgress}
      xpGainEvent={xpGainEvent}
      clearXpGainEvent={clearXpGainEvent}
    />
  );
}

// ─── Inner (memoised, stable hook count) ────────────────────────────────────

const PetHeroBarInner = React.memo(function PetHeroBarInner({
  onPetPress,
  onStatsPress,
  collapsed,
  safeTop,
  petImageUrl,
  petName,
  petLevel,
  hunger,
  happy,
  mood,
  xpProgress,
  xpGainEvent,
  clearXpGainEvent,
}: {
  onPetPress: () => void;
  onStatsPress: () => void;
  collapsed: ReturnType<typeof useSharedValue<number>>;
  safeTop: number;
  petImageUrl?: string;
  petName: string;
  petLevel: number;
  hunger: number;
  happy: number;
  mood: number;
  xpProgress: number;
  xpGainEvent: { amount: number; key: number };
  clearXpGainEvent: () => void;
}) {
  const { theme } = useTheme();
  const { colors, typography } = theme;
  const totalHeight = EXPANDED_HEIGHT + safeTop;

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        clipWrapper: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, overflow: 'hidden' },
        hero: {
          width: '100%',
          ...Platform.select({
            ios: { shadowColor: colors.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
            android: { elevation: 4 },
          }),
        },
        background: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.heroBarBackground ?? colors.background },
        petContainer: { position: 'absolute', width: PET_SIZE_EXPANDED, height: PET_SIZE_EXPANDED },
        petImage: { width: '100%', height: '100%', borderRadius: 12 },
        petFallback: {
          width: '100%',
          height: '100%',
          borderRadius: 12,
          backgroundColor: colors.surface + '99',
          alignItems: 'center',
          justifyContent: 'center',
        },
        petFallbackEmoji: { fontSize: 40 },
        nameRow: { position: 'absolute', left: 0, right: 0, top: 0 },
        nameText: { ...typography.label, fontSize: 15, textAlign: 'center' as const, color: colors.text },
        levelText: { ...typography.caption, fontWeight: '600', color: colors.primaryText ?? colors.primary },
        statsRow: {
          flexDirection: 'row' as const,
          alignItems: 'center',
        },
        statsTopLeft: {
          position: 'absolute' as const,
          left: 12,
          top: 0,
          zIndex: 5,
        },
        xpBarOuter: { position: 'absolute', left: 0, right: 0, bottom: 0, height: XP_BAR_HEIGHT },
        xpBarTrack: {
          flex: 1,
          backgroundColor: colors.primary + '1F',
          overflow: 'hidden',
          borderRadius: XP_BAR_HEIGHT / 2,
        },
        xpBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: XP_BAR_HEIGHT / 2 },
        xpFloat: { position: 'absolute', alignItems: 'center' },
        xpBadge: {
          backgroundColor: colors.primary + '26',
          paddingHorizontal: 16,
          paddingVertical: 6,
          borderRadius: 20,
          borderWidth: 1.5,
          borderColor: colors.primary,
        },
        xpBadgeText: { fontSize: 18, fontWeight: '800', color: colors.primaryText ?? colors.primary, letterSpacing: 0.5 },
      }),
    [colors, typography],
  );

  // ── Precompute positions ──────────────────────────────────────────────────

  const petBaseTop = safeTop + 12;
  const petBaseLeft = (SCREEN_WIDTH - PET_SIZE_EXPANDED) / 2;

  const collapsedPetScreenY = safeTop + (COLLAPSED_HEIGHT - PET_SIZE_COLLAPSED) / 2;
  const collapsedPetScreenX = SCREEN_WIDTH - PET_SIZE_COLLAPSED - 20;

  const petDx = collapsedPetScreenX - petBaseLeft - SCALE_PIVOT_OFFSET;
  const petDy = (collapsedPetScreenY + DIFF) - petBaseTop - SCALE_PIVOT_OFFSET;

  const nameExpandedY = petBaseTop + PET_SIZE_EXPANDED + 8;
  const nameCollapsedY = safeTop + (COLLAPSED_HEIGHT - 18) / 2 + DIFF;

  // ── Animated XP bar ───────────────────────────────────────────────────────

  const xpBarWidth = useSharedValue(xpProgress);

  useEffect(() => {
    xpBarWidth.value = withTiming(xpProgress, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [xpProgress]);

  const xpBarStyle = useAnimatedStyle(() => ({
    width: `${Math.max(xpBarWidth.value * 100, 1)}%`,
  }));

  // ── XP gain animation — big bounce + glow ─────────────────────────────────

  const xpOpacity = useSharedValue(0);
  const xpTranslateY = useSharedValue(0);
  const xpScale = useSharedValue(0.5);
  const petBounce = useSharedValue(0);

  useEffect(() => {
    if (xpGainEvent.amount > 0) {
      // Float up text
      xpTranslateY.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(-60, { duration: 1500, easing: Easing.out(Easing.quad) }),
      );
      // Fade in, hold, fade out
      xpOpacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withDelay(800, withTiming(0, { duration: 500 })),
      );
      // Scale bounce in
      xpScale.value = withSequence(
        withTiming(0.5, { duration: 0 }),
        withSpring(1.2, { damping: 6, stiffness: 200 }),
        withTiming(1, { duration: 200 }),
      );
      // Pet bounce
      petBounce.value = withSequence(
        withTiming(-8, { duration: 120, easing: Easing.out(Easing.quad) }),
        withSpring(0, { damping: 4, stiffness: 300 }),
      );
      // Clear after animation completes. No cleanup — we need clear to run even if
      // user navigates away, so remounting won't replay.
      setTimeout(clearXpGainEvent, 2500);
    }
  }, [xpGainEvent.key, clearXpGainEvent]);

  const xpFloatStyle = useAnimatedStyle(() => ({
    opacity: xpOpacity.value,
    transform: [
      { translateY: xpTranslateY.value },
      { scale: xpScale.value },
    ],
  }));

  // ── Core animated styles ──────────────────────────────────────────────────

  const heroStyle = useAnimatedStyle(() => ({
    transform: [{
      translateY: interpolate(collapsed.value, [0, 1], [0, -DIFF], Extrapolation.CLAMP),
    }],
  }));

  const petStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(collapsed.value, [0, 1], [0, petDx], Extrapolation.CLAMP) },
      { translateY: interpolate(collapsed.value, [0, 1], [0, petDy], Extrapolation.CLAMP) + petBounce.value },
      { scale: interpolate(collapsed.value, [0, 1], [1, PET_SCALE_RATIO], Extrapolation.CLAMP) },
    ],
  }));

  const nameStyle = useAnimatedStyle(() => ({
    transform: [{
      translateY: interpolate(collapsed.value, [0, 1], [nameExpandedY, nameCollapsedY], Extrapolation.CLAMP),
    }],
  }));

  const statsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(collapsed.value, [0, 1], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <View style={[styles.clipWrapper, { height: totalHeight }]} pointerEvents="box-none">
      <Animated.View
        style={[styles.hero, { height: totalHeight }, heroStyle]}
        renderToHardwareTextureAndroid
        shouldRasterizeIOS
      >
        <View style={styles.background} />

        {/* Pet — tappable, opens game tab */}
        <Animated.View
          style={[styles.petContainer, { top: petBaseTop, left: petBaseLeft }, petStyle]}
          renderToHardwareTextureAndroid
          shouldRasterizeIOS
        >
          <Pressable onPress={onPetPress} style={({ pressed }) => [{ width: '100%', height: '100%', opacity: pressed ? 0.9 : 1 }]}>
            {petImageUrl ? (
              <Image source={{ uri: petImageUrl }} style={styles.petImage} resizeMode="contain" />
            ) : (
              <View style={styles.petFallback}>
                <Text style={styles.petFallbackEmoji}>🐣</Text>
              </View>
            )}
          </Pressable>
        </Animated.View>

        {/* +XP floating text */}
        {xpGainEvent.amount > 0 && (
          <Animated.View
            style={[
              styles.xpFloat,
              { top: petBaseTop + 10, left: petBaseLeft - 20, width: PET_SIZE_EXPANDED + 40 },
              xpFloatStyle,
            ]}
            pointerEvents="none"
          >
            <View style={styles.xpBadge}>
              <Text style={styles.xpBadgeText}>+{xpGainEvent.amount} XP ✨</Text>
            </View>
          </Animated.View>
        )}

        {/* Stats — top-left (aligned with game HUD) */}
        <Animated.View style={[styles.statsTopLeft, { top: safeTop + 8 }, statsStyle]}>
          <View style={styles.statsRow}>
            <PetStatsDisplay
              happy={happy}
              hunger={hunger}
              mood={mood}
              colors={{
                text: colors.text,
                textSecondary: colors.textSecondary,
                textMuted: colors.textMuted,
                error: colors.error,
              }}
              iconSize={12}
              fontSize={12}
              gap={16}
              onStatsPress={onStatsPress}
            />
          </View>
        </Animated.View>

        {/* Name + Level — centered below pet when expanded */}
        <Animated.View style={[styles.nameRow, nameStyle]}>
          <Text style={styles.nameText} numberOfLines={1}>
            {petName}
            <Text style={styles.levelText}>  Lv. {petLevel}</Text>
          </Text>
        </Animated.View>

        {/* XP bar — animated fill */}
        <View style={styles.xpBarOuter}>
          <View style={styles.xpBarTrack}>
            <Animated.View style={[styles.xpBarFill, xpBarStyle]} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
});
