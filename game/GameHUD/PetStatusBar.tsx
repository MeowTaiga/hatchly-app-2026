/**
 * Pet status bar — shows above farm name & gems in the Game HUD.
 * Circle with pet face (bottom clipped, top can overflow), pet name & level,
 * and happiness, hunger, mood bars.
 */

import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { CachedImage } from '@/components/ui/CachedImage';
import { PetStatsDisplay } from '@/components/ui/PetStatsDisplay';
import { MiningEnergyStat } from './MiningEnergyPill';
import { useAuth } from '@/store/AuthProvider';
import { usePetHero } from '@/store/PetHeroProvider';
import { getPoseForContext, useNeutralPoseCycle } from '../creature/pet';
import { HUD_PILL_HEIGHT } from './constants';
import { resolveCompanionLevel } from '@/constants/skills';

const AVATAR_SIZE = 36;

interface PetStatusBarProps {
  /** When true, renders inline (no position wrapper) for use as a slot in a parent row. */
  inline?: boolean;
  topOffset?: number;
  colors: { text: string; textSecondary: string; textMuted: string; primary: string; surface: string; border: string; error?: string };
}

export function PetStatusBar({ inline, topOffset = 0, colors }: PetStatusBarProps) {
  const { user } = useAuth();
  const { openPetProfileDrawer, xpGainEvent, clearXpGainEvent } = usePetHero();
  const neutralPoseOverride = useNeutralPoseCycle(true);
  const xpOpacity = useSharedValue(0);
  const xpTranslateY = useSharedValue(0);

  const pet = user?.pet;
  const petName = pet?.customName || pet?.name || 'Buddy';
  const petLevel = resolveCompanionLevel({
    totalLevel: user?.totalLevel,
    petTotalLevel: pet?.totalLevel,
    petLevel: pet?.level,
    skills: user?.skills ?? pet?.skills,
  });
  const hunger = pet?.hunger ?? 100;
  const happy = pet?.happy ?? 100;
  const mood = pet?.mood ?? 100;

  const petImageUrl = useMemo(() => {
    const poseKey = getPoseForContext(undefined, hunger, happy, mood, 'avatar', pet?.pose, {
      neutralPoseOverride,
    });
    return (poseKey && pet?.pose?.[poseKey]) ?? pet?.imageUrl;
  }, [hunger, happy, mood, neutralPoseOverride, pet?.pose, pet?.imageUrl]);

  useEffect(() => {
    if (xpGainEvent.amount <= 0) return;
    xpOpacity.value = 0;
    xpTranslateY.value = 8;
    xpOpacity.value = withSequence(
      withTiming(1, { duration: 120 }),
      withTiming(1, { duration: 900 }),
      withTiming(0, { duration: 280 }),
    );
    xpTranslateY.value = withSequence(
      withTiming(-10, { duration: 220 }),
      withTiming(-18, { duration: 900 }),
      withTiming(-24, { duration: 280 }),
    );
    const t = setTimeout(() => clearXpGainEvent(), 1400);
    return () => clearTimeout(t);
  }, [xpGainEvent.key, clearXpGainEvent, xpOpacity, xpTranslateY]);

  const xpFloatStyle = useAnimatedStyle(() => ({
    opacity: xpOpacity.value,
    transform: [{ translateY: xpTranslateY.value }],
  }));

  const containerStyles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          ...(inline ? {} : { position: 'absolute' as const, left: 12, right: 12, top: topOffset, zIndex: 199 }),
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        },
        avatarWrap: {
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          borderRadius: AVATAR_SIZE / 2,
          overflow: 'hidden' as const,
          backgroundColor: colors.surface + 'E6',
          borderWidth: 1,
          borderColor: colors.border,
        },
        avatarImg: {
          width: AVATAR_SIZE,
          height: AVATAR_SIZE * 1.4,
          marginTop: -AVATAR_SIZE * 0.2,
          transform: [{ scaleX: -1 }],
        },
        avatarFallback: {
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          transform: [{ scaleX: -1 }],
        },
        statsPill: {
          flexDirection: 'column',
          alignSelf: 'flex-start',
          minHeight: HUD_PILL_HEIGHT,
          justifyContent: 'center',
          backgroundColor: colors.surface + 'E6',
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 16,
          ...(Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
            android: { elevation: 3 },
          }) as object),
        },
        nameRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap' as const,
        },
        petName: { fontSize: 12, fontWeight: '800' as const, color: colors.text },
        levelText: { fontSize: 10, fontWeight: '700' as const, color: colors.primary },
        statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        xpFloat: {
          position: 'absolute' as const,
          left: AVATAR_SIZE + 10,
          top: -4,
          zIndex: 5,
        },
        xpBadge: {
          backgroundColor: colors.primary,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 10,
        },
        xpBadgeText: {
          color: '#fff',
          fontSize: 11,
          fontWeight: '800' as const,
        },
      }),
    [inline, topOffset, colors.border, colors.text, colors.primary, colors.surface, colors.error],
  );

  return (
    <View style={containerStyles.wrap} pointerEvents="box-none">
      <Pressable
        style={containerStyles.row}
        onPress={() => openPetProfileDrawer()}
        accessibilityRole="button"
        accessibilityLabel="Open companion profile and skills"
      >
        {/* Circle with pet face — bottom clipped, top can overflow */}
        <View style={containerStyles.avatarWrap} pointerEvents="none">
          {petImageUrl ? (
            <CachedImage
              source={{ uri: petImageUrl }}
              style={containerStyles.avatarImg}
              resizeMode="cover"
            />
          ) : (
            <View style={[containerStyles.avatarFallback, { backgroundColor: colors.border + '40' }]}>
              <Text style={{ fontSize: 18 }}>🐾</Text>
            </View>
          )}
        </View>

        <View style={containerStyles.statsPill} pointerEvents="none">
          <View style={containerStyles.nameRow}>
            <Text style={containerStyles.petName} numberOfLines={1}>
              {petName}
            </Text>
            <Text style={containerStyles.levelText}>Lv. {petLevel}</Text>
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
            />
            <MiningEnergyStat tone="stat" iconSize={10} fontSize={10} />
          </View>
        </View>
      </Pressable>

      {xpGainEvent.amount > 0 && (
        <Animated.View style={[containerStyles.xpFloat, xpFloatStyle]} pointerEvents="none">
          <View style={containerStyles.xpBadge}>
            <Text style={containerStyles.xpBadgeText}>
              +{xpGainEvent.amount}
              {xpGainEvent.skillLabel ? ` ${xpGainEvent.skillLabel}` : ''} XP
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}
