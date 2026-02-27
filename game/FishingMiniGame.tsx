/**
 * FishingMiniGame — Compact circular reel-in game.
 * Tap when the orbiting indicator lands in the green zone.
 * Closes immediately on success/failure — the pet bubble shows the result.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Modal, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
  interpolate,
  FadeOut,
  ZoomIn,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { CachedImage } from '@/components/ui/CachedImage';
import { useTheme } from '@/store/ThemeProvider';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CIRCLE_SIZE = Math.min(220, SCREEN_WIDTH * 0.52);
const TRACK_STROKE = 16;
const RADIUS = (CIRCLE_SIZE - TRACK_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const DOT_SIZE = 20;

const GREEN_RATIO = 0.18;
const YELLOW_RATIO = 0.10;
const DIRECTION_CHANGE_CHANCE = 0.4;

const CAP_CORRECTION = 30;

interface FishingMiniGameProps {
  onComplete: (passed: boolean) => void;
  onCancel: () => void;
  fishLabel?: string;
  fishImageUrl?: string;
  difficulty?: number;
  bobberEmoji?: string;
}

type TapResult = 'perfect' | 'good' | 'miss';

function scoreAngle(angle: number): TapResult {
  const greenHalf = Math.PI * GREEN_RATIO;
  const yellowSpan = Math.PI * 2 * YELLOW_RATIO;
  const normalized = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const dist = Math.min(normalized, 2 * Math.PI - normalized);
  if (dist <= greenHalf) return 'perfect';
  if (dist <= greenHalf + yellowSpan) return 'good';
  return 'miss';
}

const RESULT_LABELS: Record<TapResult, string> = {
  perfect: 'Perfect!',
  good: 'Good',
  miss: 'Miss',
};

/** Difficulty 1-5: rounds and base speed (like CookingMiniGame). */
const getDifficultyParams = (difficulty: number) => {
  const d = Math.max(1, Math.min(5, difficulty));
  const totalRounds = d;
  const baseSpeed = 300 + (5 - d) * 150;
  return { totalRounds, baseSpeed };
};

export function FishingMiniGame({ onComplete, onCancel, fishLabel, fishImageUrl, difficulty = 2 }: FishingMiniGameProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const { totalRounds, baseSpeed } = getDifficultyParams(difficulty);

  const [round, setRound] = useState(0);
  const [results, setResults] = useState<TapResult[]>([]);
  const [finished, setFinished] = useState(false);
  const [lastTap, setLastTap] = useState<TapResult | null>(null);
  const angleRad = useSharedValue(0);
  const activeRef = useRef(true);
  const dirRef = useRef<1 | -1>(1);

  const cardOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(0);
  const pulseOpacity = useSharedValue(0);
  const tapFlash = useSharedValue(0);

  const speed = Math.max(450, baseSpeed - round * 80);

  useEffect(() => {
    cardOpacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) });
  }, []);

  useEffect(() => {
    activeRef.current = true;
    angleRad.value = 0;
    angleRad.value = withRepeat(
      withTiming(dirRef.current * 2 * Math.PI, { duration: speed, easing: Easing.linear }),
      -1,
      false,
    );
    return () => {
      activeRef.current = false;
      cancelAnimation(angleRad);
    };
  }, [round, speed, angleRad]);

  const handleTap = useCallback(() => {
    if (finished || !activeRef.current) return;
    const angle = angleRad.value;

    const tapResult = scoreAngle(angle);
    setLastTap(tapResult);

    Haptics.impactAsync(
      tapResult === 'perfect'
        ? Haptics.ImpactFeedbackStyle.Medium
        : tapResult === 'good'
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Heavy,
    );

    pulseScale.value = 0.6;
    pulseOpacity.value = tapResult === 'miss' ? 0.3 : 0.6;
    pulseScale.value = withTiming(2, { duration: 350, easing: Easing.out(Easing.cubic) });
    pulseOpacity.value = withTiming(0, { duration: 350 });

    tapFlash.value = 1;
    tapFlash.value = withTiming(0, { duration: 200 });

    const newResults = [...results, tapResult];
    setResults(newResults);

    if (newResults.length >= totalRounds) {
      setFinished(true);
      cancelAnimation(angleRad);
      const hasMiss = newResults.some((r) => r === 'miss');
      const passed = !hasMiss;
      setTimeout(() => {
        if (activeRef.current) onComplete(passed);
      }, 200);
    } else {
      setTimeout(() => setLastTap(null), 400);
      if (Math.random() < DIRECTION_CHANGE_CHANCE) {
        dirRef.current = dirRef.current === 1 ? -1 : 1;
      }
      setRound((r) => r + 1);
    }
  }, [finished, angleRad, results, onComplete, pulseScale, pulseOpacity, tapFlash]);

  const cx = CIRCLE_SIZE / 2;

  const dotStyle = useAnimatedStyle(() => {
    const a = angleRad.value - Math.PI / 2;
    return {
      transform: [
        { translateX: cx + RADIUS * Math.cos(a) - DOT_SIZE / 2 },
        { translateY: cx + RADIUS * Math.sin(a) - DOT_SIZE / 2 },
      ],
    };
  });

  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
  }));

  const pulseAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const flashAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tapFlash.value, [0, 1], [0, 0.1]),
  }));

  const greenLen = CIRCUMFERENCE * GREEN_RATIO;
  const yellowLen = CIRCUMFERENCE * YELLOW_RATIO;
  const greenOffset = greenLen / 2 + CAP_CORRECTION;

  const greenColor = colors.success;
  const yellowColor = '#FACC15';
  const missTrackColor = `${colors.text}12`;

  const shadowStyle = Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
    },
    android: { elevation: 8 },
  }) as object;

  const dotColor = (r: TapResult) =>
    r === 'perfect' ? colors.success : r === 'good' ? yellowColor : colors.error;

  return (
    <Modal transparent animationType="none" onRequestClose={onCancel}>
      <Pressable style={st.overlay} onPress={onCancel}>
        <Pressable>
        <Animated.View style={[st.card, { backgroundColor: colors.surface }, shadowStyle, cardAnimStyle]}>
          {/* Circle game area — TAP button is inside */}
          <Pressable
            style={st.circleWrap}
            onPress={handleTap}
            disabled={finished}
          >
            <Animated.View
              style={[st.flashOverlay, flashAnimStyle, { backgroundColor: colors.primary }]}
              pointerEvents="none"
            />

            <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={st.svg}>
              <Defs>
                <LinearGradient id="greenGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={greenColor} />
                  <Stop offset="1" stopColor={colors.successDark ?? greenColor} />
                </LinearGradient>
              </Defs>

              {/* Background track */}
              <Circle
                cx={cx}
                cy={cx}
                r={RADIUS}
                stroke={missTrackColor}
                strokeWidth={TRACK_STROKE}
                fill="transparent"
              />
              {/* Green sweet-spot (centered at top) */}
              <Circle
                cx={cx}
                cy={cx}
                r={RADIUS}
                stroke="url(#greenGrad)"
                strokeWidth={TRACK_STROKE}
                fill="transparent"
                strokeLinecap="round"
                strokeDasharray={`${greenLen} ${CIRCUMFERENCE}`}
                strokeDashoffset={greenOffset}
                transform={`rotate(-90 ${cx} ${cx})`}
              />
              {/* Yellow zone (clockwise after green) */}
              <Circle
                cx={cx}
                cy={cx}
                r={RADIUS}
                stroke={yellowColor}
                strokeWidth={TRACK_STROKE}
                fill="transparent"
                strokeLinecap="round"
                strokeDasharray={`${yellowLen} ${CIRCUMFERENCE}`}
                strokeDashoffset={-greenLen / 2}
                transform={`rotate(-90 ${cx} ${cx})`}
                opacity={0.6}
              />
              {/* Yellow zone (counterclockwise before green) */}
              <Circle
                cx={cx}
                cy={cx}
                r={RADIUS}
                stroke={yellowColor}
                strokeWidth={TRACK_STROKE}
                fill="transparent"
                strokeLinecap="round"
                strokeDasharray={`${yellowLen} ${CIRCUMFERENCE}`}
                strokeDashoffset={greenLen / 2 + yellowLen - CIRCUMFERENCE}
                transform={`rotate(-90 ${cx} ${cx})`}
                opacity={0.6}
              />
            </Svg>

            {/* Pulse ring on tap */}
            <Animated.View
              style={[st.pulseRing, { borderColor: lastTap ? dotColor(lastTap) : colors.primary }, pulseAnimStyle]}
              pointerEvents="none"
            />

            {/* Center content: fish + TAP label */}
            <View style={st.centerDecor} pointerEvents="none">
              {fishImageUrl ? (
                <CachedImage source={{ uri: fishImageUrl }} style={st.centerImage} resizeMode="contain" />
              ) : null}
              {fishLabel && !finished && (
                <Text style={[st.centerLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                  {fishLabel}
                </Text>
              )}
              {lastTap && !finished ? (
                <Animated.Text
                  entering={ZoomIn.duration(120)}
                  exiting={FadeOut.duration(120)}
                  style={[st.tapFeedback, { color: dotColor(lastTap) }]}
                >
                  {RESULT_LABELS[lastTap]}
                </Animated.Text>
              ) : !finished ? (
                <Text style={[st.tapLabel, { color: colors.primary }]}>TAP</Text>
              ) : null}
            </View>

            {/* Orbiting dot */}
            <Animated.View
              style={[st.dot, { backgroundColor: colors.primary, borderColor: colors.surface }, dotStyle]}
              pointerEvents="none"
            />
          </Pressable>

          {/* Progress dots */}
          <View style={st.progressRow}>
            {Array.from({ length: totalRounds }).map((_, i) => {
              const r = results[i];
              const isCurrent = i === results.length && !finished;
              return (
                <View
                  key={i}
                  style={[
                    st.progressDot,
                    {
                      backgroundColor: r ? dotColor(r) : `${colors.border}50`,
                      borderColor: isCurrent ? colors.primary : 'transparent',
                      transform: [{ scale: r ? 1 : isCurrent ? 1.05 : 0.8 }],
                    },
                  ]}
                />
              );
            })}
          </View>

        </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 24,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  circleWrap: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CIRCLE_SIZE / 2,
  },
  pulseRing: {
    position: 'absolute',
    width: CIRCLE_SIZE * 0.4,
    height: CIRCLE_SIZE * 0.4,
    borderRadius: CIRCLE_SIZE * 0.2,
    borderWidth: 2,
  },
  centerDecor: {
    alignItems: 'center',
    justifyContent: 'center',
    width: CIRCLE_SIZE * 0.45,
  },
  centerImage: {
    width: 44,
    height: 44,
  },
  centerLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
    textAlign: 'center',
  },
  tapFeedback: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  tapLabel: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 1,
  },
  dot: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 3,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 3 }
      : { elevation: 4 }),
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  progressDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
});
