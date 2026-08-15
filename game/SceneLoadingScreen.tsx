import { CachedImage } from '@/components/ui/CachedImage';
import { PET_POSES } from '@/constants/pet';
import { useTheme } from '@/store/ThemeProvider';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { pickLoadingTip } from './loadingTips';

const FADE_IN_MS = 140;

export type SceneLoadingPet = {
  imageUrl?: string | null;
  pose?: Record<string, string> | null;
} | null | undefined;

export function pickRandomPoseUrl(pet: SceneLoadingPet, rng: () => number = Math.random): string | null {
  const poses = pet?.pose;
  if (poses) {
    const available = PET_POSES.map((key) => poses[key]).filter((url): url is string => Boolean(url));
    if (available.length > 0) {
      return available[Math.floor(rng() * available.length)]!;
    }
    const extras = Object.values(poses).filter((url): url is string => Boolean(url));
    if (extras.length > 0) {
      return extras[Math.floor(rng() * extras.length)]!;
    }
  }
  return pet?.imageUrl ?? null;
}

export interface SceneLoadingScreenProps {
  pet?: SceneLoadingPet;
  /** Pre-selected pose URL (skips random pick on mount — use after prefetch). */
  poseUrl?: string | null;
  /** Override tip (tests / forced tip). Default: random once per mount. */
  tip?: string;
  style?: StyleProp<ViewStyle>;
  showSpinner?: boolean;
  /**
   * When false, stays mounted at opacity 0 so the pet image can decode/reuse
   * cache before the tip is shown. When true, fades in.
   */
  visible?: boolean;
}

/**
 * Full-screen loading chrome: random pet pose with tip directly underneath.
 * Keep mounted across the tip delay so the image isn't remounted when shown.
 */
export function SceneLoadingScreen({
  pet,
  poseUrl: poseUrlProp,
  tip: tipProp,
  style,
  showSpinner = true,
  visible = true,
}: SceneLoadingScreenProps) {
  const { theme } = useTheme();
  const [tip] = useState(() => tipProp ?? pickLoadingTip());
  const [poseUrl] = useState(() => poseUrlProp ?? pickRandomPoseUrl(pet));
  const opacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, {
      duration: visible ? FADE_IN_MS : 0,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, opacity]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[styles.root, { backgroundColor: theme.colors.background }, style, fadeStyle]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={styles.stack}>
        {poseUrl ? (
          <CachedImage
            source={{ uri: poseUrl }}
            style={styles.pet}
            resizeMode="contain"
            recyclingKey={poseUrl}
          />
        ) : (
          <Text style={styles.fallbackEmoji}>🥚</Text>
        )}
        <Text style={[styles.tipLabel, { color: theme.colors.textMuted }]}>Tip</Text>
        <Text style={[styles.tipText, { color: theme.colors.text }]}>{tip}</Text>
        {showSpinner && (
          <ActivityIndicator size="small" color={theme.colors.primary} style={styles.spinner} />
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  stack: {
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
  },
  pet: {
    width: 128,
    height: 128,
    marginBottom: 16,
  },
  fallbackEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  tipLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
    textAlign: 'center',
  },
  tipText: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    textAlign: 'center',
  },
  spinner: {
    marginTop: 18,
  },
});
