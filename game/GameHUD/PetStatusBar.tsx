/**
 * Pet status bar — shows above farm name & gems in the Game HUD.
 * Circle with pet face (bottom clipped, top can overflow), pet name & level,
 * and happiness, hunger, mood bars.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CachedImage } from '@/components/ui/CachedImage';
import { PetStatsDisplay } from '@/components/ui/PetStatsDisplay';
import { useAuth } from '@/store/AuthProvider';
import { usePetHero } from '@/store/PetHeroProvider';
import { useTheme } from '@/store/ThemeProvider';
import { getPoseForContext, useNeutralPoseCycle } from '../creature/pet';
import { HUD_PILL_HEIGHT } from './constants';

const AVATAR_SIZE = 36;

interface PetStatusBarProps {
  /** When true, renders inline (no position wrapper) for use as a slot in a parent row. */
  inline?: boolean;
  topOffset?: number;
  colors: { text: string; textSecondary: string; textMuted: string; primary: string; surface: string; border: string; error?: string };
}

export function PetStatusBar({ inline, topOffset = 0, colors }: PetStatusBarProps) {
  const { user } = useAuth();
  const { openPetProfileDrawer } = usePetHero();
  const { theme } = useTheme();
  const neutralPoseOverride = useNeutralPoseCycle(true);

  const pet = user?.pet;
  const petName = pet?.customName || pet?.name || 'Buddy';
  const petLevel = pet?.level ?? 1;
  const hunger = pet?.hunger ?? 100;
  const happy = pet?.happy ?? 100;
  const mood = pet?.mood ?? 100;

  const petImageUrl = useMemo(() => {
    const poseKey = getPoseForContext(undefined, hunger, happy, mood, 'avatar', pet?.pose, {
      neutralPoseOverride,
    });
    return (poseKey && pet?.pose?.[poseKey]) ?? pet?.imageUrl;
  }, [hunger, happy, mood, neutralPoseOverride, pet?.pose, pet?.imageUrl]);

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
      }),
    [topOffset, colors.border, colors.text, colors.primary, colors.surface, colors.error],
  );

  return (
    <View style={containerStyles.wrap} pointerEvents="box-none">
      <View style={containerStyles.row} pointerEvents="none">
        {/* Circle with pet face — bottom clipped, top can overflow */}
        <View style={containerStyles.avatarWrap}>
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

        <View style={containerStyles.statsPill}>
          <View style={containerStyles.nameRow}>
            <Text style={containerStyles.petName} numberOfLines={1}>
              {petName}
            </Text>
            <Text style={containerStyles.levelText}>Lv.{petLevel}</Text>
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
              onStatsPress={openPetProfileDrawer}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
