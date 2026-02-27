import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/store/ThemeProvider';
import { getAchievementVisual } from '@/constants/achievements';
import type { UnlockedAchievement } from '@/lib/api';

const { width: SCREEN_W } = Dimensions.get('window');
const BADGE_SIZE = 130;
const NUM_RAYS = 14;
const RAY_LENGTH = SCREEN_W * 0.9;

interface Props {
  achievement: UnlockedAchievement;
  onDismiss: () => void;
}

export function AchievementPopup({ achievement, onDismiss }: Props) {
  const { themeMode } = useTheme();
  const insets = useSafeAreaInsets();
  const visual = getAchievementVisual(achievement.achievementId);
  const overlayBg = themeMode === 'dark' ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.8)';

  // ── Animation values ────────────────────────────────────────────────────

  const overlayOpacity = useSharedValue(0);
  const badgeScale = useSharedValue(0);
  const badgeRotate = useSharedValue(-15);
  const raysRotation = useSharedValue(0);
  const raysOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(30);
  const descOpacity = useSharedValue(0);
  const descTranslateY = useSharedValue(20);
  const msgOpacity = useSharedValue(0);
  const msgTranslateY = useSharedValue(15);
  const xpOpacity = useSharedValue(0);
  const xpScale = useSharedValue(0.5);
  const shimmer = useSharedValue(0);
  const hintOpacity = useSharedValue(0);

  useEffect(() => {
    // Overlay fade in
    overlayOpacity.value = withTiming(1, { duration: 300 });

    // Rays spin continuously
    raysOpacity.value = withDelay(150, withTiming(1, { duration: 500 }));
    raysRotation.value = withRepeat(
      withTiming(360, { duration: 10000, easing: Easing.linear }),
      -1,
      false,
    );

    // Badge bounces in
    badgeScale.value = withDelay(
      250,
      withSpring(1, { damping: 8, stiffness: 150, mass: 0.8 }),
    );
    badgeRotate.value = withDelay(
      250,
      withSpring(0, { damping: 10, stiffness: 120 }),
    );

    // Shimmer pulse on badge
    shimmer.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );

    // Title slides up
    titleOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
    titleTranslateY.value = withDelay(500, withSpring(0, { damping: 12, stiffness: 100 }));

    // Description slides up
    descOpacity.value = withDelay(700, withTiming(1, { duration: 400 }));
    descTranslateY.value = withDelay(700, withSpring(0, { damping: 12, stiffness: 100 }));

    // Encouraging message slides up
    msgOpacity.value = withDelay(900, withTiming(1, { duration: 400 }));
    msgTranslateY.value = withDelay(900, withSpring(0, { damping: 12, stiffness: 100 }));

    // XP reward pops
    xpOpacity.value = withDelay(1100, withTiming(1, { duration: 300 }));
    xpScale.value = withDelay(1100, withSpring(1, { damping: 6, stiffness: 200 }));

    // "Tap to continue" fades in last
    hintOpacity.value = withDelay(1400, withTiming(1, { duration: 600 }));
  }, []);

  // ── Animated styles ─────────────────────────────────────────────────────

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const raysStyle = useAnimatedStyle(() => ({
    opacity: raysOpacity.value,
    transform: [{ rotate: `${raysRotation.value}deg` }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: badgeScale.value },
      { rotate: `${badgeRotate.value}deg` },
    ],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0, 0.25]),
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const descStyle = useAnimatedStyle(() => ({
    opacity: descOpacity.value,
    transform: [{ translateY: descTranslateY.value }],
  }));

  const msgStyle = useAnimatedStyle(() => ({
    opacity: msgOpacity.value,
    transform: [{ translateY: msgTranslateY.value }],
  }));

  const xpStyle = useAnimatedStyle(() => ({
    opacity: xpOpacity.value,
    transform: [{ scale: xpScale.value }],
  }));

  const hintStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
  }));

  return (
    <Pressable style={styles.pressable} onPress={onDismiss}>
      <Animated.View style={[styles.overlay, overlayStyle, { backgroundColor: overlayBg }]}>

        {/* ── Top spacer — pushes content to upper-center ── */}
        <View style={{ flex: 3 }} />

        {/* ── Badge + Rays cluster ── */}
        {/* Rays are a sibling inside the same wrapper so they share the badge's center */}
        <View style={styles.badgeCluster}>
          {/* Rays behind the badge */}
          <Animated.View style={[styles.raysContainer, raysStyle]}>
            {Array.from({ length: NUM_RAYS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.ray,
                  {
                    backgroundColor: visual.glowColor,
                    transform: [{ rotate: `${(360 / NUM_RAYS) * i}deg` }],
                  },
                ]}
              />
            ))}
          </Animated.View>

          {/* Badge on top of rays */}
          <Animated.View style={[styles.badgeOuter, badgeStyle]}>
            <View style={[styles.badgeGlow, { shadowColor: visual.glowColor }]}>
              <View style={[styles.badgeRing, { borderColor: visual.color }]}>
                <View style={[styles.badgeInner, { backgroundColor: visual.colorLight }]}>
                  <Text style={styles.badgeEmoji}>{visual.emoji}</Text>
                  <Animated.View style={[styles.badgeShimmer, shimmerStyle]} />
                </View>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* ── Spacer between badge and text ── */}
        <View style={{ height: 28 }} />

        {/* ── Text content ── */}
        <Animated.View style={[styles.labelContainer, titleStyle]}>
          <Text style={styles.unlockedLabel}>Achievement Unlocked!</Text>
          <Text style={[styles.achievementTitle, { color: visual.color }]}>
            {achievement.title}
          </Text>
        </Animated.View>

        <Animated.View style={[styles.descContainer, descStyle]}>
          <Text style={styles.description}>{achievement.description}</Text>
        </Animated.View>

        {!!achievement.message && (
          <Animated.View style={[styles.msgContainer, msgStyle]}>
            <Text style={styles.message}>{achievement.message}</Text>
          </Animated.View>
        )}

        {achievement.xpReward > 0 && (
          <Animated.View style={[styles.xpContainer, xpStyle]}>
            <View style={[styles.xpBadge, { backgroundColor: visual.color }]}>
              <Text style={styles.xpText}>+{achievement.xpReward} XP</Text>
            </View>
          </Animated.View>
        )}

        {/* ── Bottom spacer — balances the layout + dismiss hint ── */}
        <View style={{ flex: 4 }} />

        <Animated.Text
          style={[
            styles.dismissHint,
            { paddingBottom: insets.bottom + 24 },
            hintStyle,
          ]}
        >
          Tap anywhere to continue
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pressable: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
  },

  // Badge + rays wrapper — rays are absolutely centered behind the badge
  badgeCluster: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Rays — absolutely positioned, centered on the badge
  raysContainer: {
    position: 'absolute',
    width: RAY_LENGTH * 2,
    height: RAY_LENGTH * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ray: {
    position: 'absolute',
    width: 2.5,
    height: RAY_LENGTH,
    borderRadius: 2,
    opacity: 0.2,
    bottom: '50%',
    transformOrigin: 'bottom center',
  },

  // Badge
  badgeOuter: {},
  badgeGlow: {
    borderRadius: (BADGE_SIZE + 16) / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
  },
  badgeRing: {
    width: BADGE_SIZE + 16,
    height: BADGE_SIZE + 16,
    borderRadius: (BADGE_SIZE + 16) / 2,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  badgeInner: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  badgeEmoji: {
    fontSize: 56,
  },
  badgeShimmer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: '#FFFFFF',
  },

  // Title
  labelContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  unlockedLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginBottom: 10,
  },
  achievementTitle: {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  // Description
  descContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    paddingHorizontal: 48,
    lineHeight: 20,
  },

  // Encouraging message
  msgContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 36,
  },
  message: {
    fontSize: 17,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
  },

  // XP
  xpContainer: {
    alignItems: 'center',
  },
  xpBadge: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 28,
  },
  xpText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Dismiss hint
  dismissHint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
