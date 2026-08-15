/**
 * Reel fight — tap to lift the catch bracket, gravity pulls it down.
 * Frame the fish until the bar fills. Slip off too long and it gets away.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Modal } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { CachedImage } from '@/components/ui/CachedImage';
import { useTheme } from '@/store/ThemeProvider';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COL_W = Math.min(188, SCREEN_WIDTH * 0.5);
const COL_H = 292;
const FISH = 88;
const FISH_CROP = 2;

interface FishingMiniGameProps {
  onComplete: (passed: boolean) => void;
  onCancel: () => void;
  fishLabel?: string;
  fishImageUrl?: string;
  difficulty?: number;
  /** Equipped fishing pole art. */
  toolImageUrl?: string;
}

function paramsFor(difficulty: number) {
  const d = Math.max(1, Math.min(5, difficulty));
  return {
    window: 0.46 - (d - 1) * 0.038,
    gravity: 1.28 + (d - 1) * 0.2,
    impulse: 0.68 - (d - 1) * 0.04,
    fillSec: 3.8 + (d - 1) * 0.75,
    drainPerSec: 0.12 + (d - 1) * 0.04,
    fishMoveMs: 860 - (d - 1) * 90,
    dashChance: 0.08 + (d - 1) * 0.07,
    yankChance: d >= 3 ? 0.006 + (d - 3) * 0.004 : 0,
  };
}

export function FishingMiniGame({
  onComplete,
  onCancel,
  fishLabel,
  fishImageUrl,
  difficulty = 2,
  toolImageUrl,
}: FishingMiniGameProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const p = paramsFor(difficulty);

  const [status, setStatus] = useState('Tap to reel');
  const finished = useRef(false);
  const onRef = useRef(true);
  const catcherY = useSharedValue(0.5);
  const fishY = useSharedValue(0.48);
  const fill = useSharedValue(0.3);
  const locked = useSharedValue(1);
  const punch = useSharedValue(1);
  const wiggle = useSharedValue(0);
  const velRef = useRef(0);
  const catcherRef = useRef(0.5);
  const fishRef = useRef(0.48);
  const progressRef = useRef(0.3);
  const lastHaptic = useRef(0);
  const lastTick = useRef(Date.now());

  const finish = useCallback(
    (passed: boolean) => {
      if (finished.current) return;
      finished.current = true;
      setStatus(passed ? 'Caught!' : 'It got away…');
      if (passed) {
        punch.value = withSequence(withTiming(1.14, { duration: 90 }), withSpring(1, { damping: 8, stiffness: 260 }));
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        wiggle.value = withSequence(withTiming(-18, { duration: 80 }), withTiming(18, { duration: 80 }), withTiming(0, { duration: 80 }));
        fishY.value = withTiming(-0.28, { duration: 320, easing: Easing.in(Easing.quad) });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setTimeout(() => onComplete(passed), 400);
    },
    [fishY, onComplete, punch, wiggle],
  );

  useEffect(() => {
    const retarget = () => {
      if (finished.current) return;
      const dash = Math.random() < p.dashChance;
      const next = Math.max(0.1, Math.min(0.9, Math.random()));
      const dir = next < fishRef.current ? -1 : 1;
      fishRef.current = next;
      fishY.value = withTiming(next, {
        duration: dash ? 150 : p.fishMoveMs,
        easing: dash ? Easing.out(Easing.cubic) : Easing.inOut(Easing.sin),
      });
      wiggle.value = withSequence(
        withTiming(dir * (dash ? 16 : 8), { duration: 90 }),
        withSpring(0, { damping: 8, stiffness: 180 }),
      );
    };
    retarget();
    const id = setInterval(retarget, p.fishMoveMs + 100);
    return () => clearInterval(id);
  }, [fishY, p.dashChance, p.fishMoveMs, wiggle]);

  useEffect(() => {
    const id = setInterval(() => {
      if (finished.current) return;
      const now = Date.now();
      const dt = Math.min(0.05, (now - lastTick.current) / 1000);
      lastTick.current = now;

      let vel = velRef.current + p.gravity * dt;
      if (p.yankChance > 0 && Math.random() < p.yankChance) {
        vel += (fishRef.current - catcherRef.current) * 2.2;
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      let y = catcherRef.current + vel * dt;
      const half = p.window / 2;
      if (y < half) {
        y = half;
        vel = Math.abs(vel) * 0.16;
      } else if (y > 1 - half) {
        y = 1 - half;
        vel = -Math.abs(vel) * 0.16;
      }
      velRef.current = vel;
      catcherRef.current = y;
      catcherY.value = y;

      const fishNow = fishY.value;
      fishRef.current = fishNow;
      const on = Math.abs(fishNow - y) <= half;
      locked.value = withTiming(on ? 1 : 0, { duration: 80 });

      if (on !== onRef.current) {
        onRef.current = on;
        setStatus(on ? 'On the line!' : "It's running!");
        if (on) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      if (on) {
        progressRef.current = Math.min(1, progressRef.current + dt / p.fillSec);
        if (now - lastHaptic.current > 200) {
          lastHaptic.current = now;
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } else {
        progressRef.current = Math.max(0, progressRef.current - p.drainPerSec * dt);
      }
      fill.value = progressRef.current;

      if (progressRef.current >= 1) finish(true);
      else if (progressRef.current <= 0) finish(false);
    }, 32);
    return () => clearInterval(id);
  }, [catcherY, fill, finish, fishY, locked, p.drainPerSec, p.fillSec, p.gravity, p.window, p.yankChance]);

  const reel = useCallback(() => {
    if (finished.current) return;
    velRef.current -= p.impulse;
    punch.value = 0.9;
    punch.value = withSpring(1, { damping: 9, stiffness: 400 });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [p.impulse, punch]);

  const lineStyle = useAnimatedStyle(() => ({
    height: Math.max(8, catcherY.value * COL_H - (p.window * COL_H) / 2),
  }));

  const windowStyle = useAnimatedStyle(() => ({
    top: (catcherY.value - p.window / 2) * COL_H,
    borderColor: interpolateColor(locked.value, [0, 1], [colors.border, colors.success]),
    transform: [{ scale: 0.98 + locked.value * 0.04 }],
  }));

  const fishStyle = useAnimatedStyle(() => ({
    top: fishY.value * COL_H - FISH / 2,
    transform: [{ scale: punch.value }, { rotate: `${wiggle.value}deg` }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.round(fill.value * 100)}%`,
    backgroundColor: interpolateColor(locked.value, [0, 1], [colors.primary, colors.success]),
  }));

  const windowPx = p.window * COL_H;

  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.kicker, { color: colors.textMuted }]}>REEL</Text>
          <Text style={[styles.title, { color: colors.text }]}>{fishLabel || 'A fish!'}</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>{status}</Text>

          <Pressable onPressIn={reel} style={styles.stage}>
            <View style={[styles.column, { backgroundColor: colors.border }]}>
              <View style={[styles.water, { backgroundColor: colors.primary + '28' }]} />
              <Animated.View style={[styles.line, { backgroundColor: colors.textMuted }, lineStyle]} />
              <Animated.View style={[styles.fishWrap, fishStyle]}>
                {fishImageUrl ? (
                  <CachedImage source={{ uri: fishImageUrl }} style={styles.fishArt} resizeMode="cover" />
                ) : (
                  <Text style={styles.fishEmoji}>🐟</Text>
                )}
              </Animated.View>
              <Animated.View style={[styles.window, { height: windowPx }, windowStyle]} pointerEvents="none">
                {toolImageUrl ? (
                  <CachedImage source={{ uri: toolImageUrl }} style={styles.toolArt} resizeMode="contain" />
                ) : null}
              </Animated.View>
            </View>
          </Pressable>

          <View style={[styles.bar, { backgroundColor: colors.border }]}>
            <Animated.View style={[styles.fill, fillStyle]} />
          </View>
          <Pressable onPress={onCancel} hitSlop={8}>
            <Text style={[styles.cancel, { color: colors.textMuted }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { fontSize: 20, fontWeight: '800' },
  sub: { fontSize: 13, fontWeight: '600', minHeight: 20 },
  stage: { marginVertical: 6, alignItems: 'center' },
  column: {
    width: COL_W,
    height: COL_H,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  water: { ...StyleSheet.absoluteFillObject },
  line: {
    position: 'absolute',
    top: 0,
    left: COL_W / 2 - 1,
    width: 2,
    opacity: 0.45,
    borderRadius: 1,
  },
  window: {
    position: 'absolute',
    left: 10,
    right: 10,
    borderRadius: 14,
    borderWidth: 3,
    backgroundColor: 'transparent',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingRight: 4,
    paddingTop: 4,
  },
  toolArt: { width: 48, height: 48 },
  fishWrap: {
    position: 'absolute',
    left: (COL_W - FISH) / 2,
    width: FISH,
    height: FISH,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 1,
  },
  fishArt: {
    position: 'absolute',
    top: -FISH_CROP,
    left: -FISH_CROP,
    width: FISH + FISH_CROP * 2,
    height: FISH + FISH_CROP * 2,
  },
  fishEmoji: { fontSize: 64 },
  bar: { width: '100%', height: 14, borderRadius: 8, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 8 },
  cancel: { fontSize: 13, fontWeight: '700', marginTop: 4 },
});
