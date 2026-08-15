/**
 * Spirit Snatch — candy corn falls into a bottom catch zone. Skip the spiders.
 * Spawn list and score come from the server.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { CachedImage } from '@/components/ui/CachedImage';
import { useTheme } from '@/store/ThemeProvider';
import type { SpiritSnatchRound, SpiritSnatchTap, SpiritSnatchTarget } from './types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SIZE = 58;
const PLAY_TOP = SCREEN_H * 0.2;
const FALL_END = SCREEN_H + 12;
const TRICK_PENALTY = 2;
const BAR_W = SCREEN_W * 0.46;

interface Floater {
  id: number;
  text: string;
  x: number;
  y: number;
  good: boolean;
}

interface SpiritSnatchMiniGameProps {
  round: SpiritSnatchRound;
  treatImageUrl?: string | null;
  trickImageUrl?: string | null;
  onComplete: (taps: SpiritSnatchTap[]) => void;
  onCancel: () => void;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function SpiritTarget({
  target,
  catchStart,
  catchEnd,
  treatImageUrl,
  trickImageUrl,
  onCatch,
  onExpire,
}: {
  target: SpiritSnatchTarget;
  catchStart: number;
  catchEnd: number;
  treatImageUrl?: string | null;
  trickImageUrl?: string | null;
  onCatch: (id: number, kind: 'treat' | 'trick', x: number, y: number) => void;
  onExpire: (id: number) => void;
}) {
  const startX = 12 + target.xFrac * Math.max(24, SCREEN_W - SIZE - 24);
  const y = useSharedValue(PLAY_TOP - SIZE);
  const xOff = useSharedValue(0);
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(target.kind === 'trick' ? -6 : 5);
  const resolved = useSharedValue(false);

  const onCatchRef = useRef(onCatch);
  onCatchRef.current = onCatch;
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const reportCatch = useCallback((tapY: number) => {
    onCatchRef.current(target.id, target.kind, startX + SIZE / 2, tapY);
  }, [startX, target.id, target.kind]);

  const reportExpire = useCallback(() => {
    onExpireRef.current(target.id);
  }, [target.id]);

  useEffect(() => {
    y.value = PLAY_TOP - SIZE;
    xOff.value = 0;
    scale.value = 0.4;
    opacity.value = 0;
    resolved.value = false;

    opacity.value = withTiming(1, { duration: 160 });
    scale.value = withSpring(1, { damping: 16, stiffness: 180 });
    y.value = withTiming(FALL_END, {
      duration: target.fallMs,
      easing: Easing.linear,
    }, (finished) => {
      if (finished && !resolved.value) {
        resolved.value = true;
        runOnJS(reportExpire)();
      }
    });
    xOff.value = withTiming(target.driftFrac * SCREEN_W, {
      duration: target.fallMs,
      easing: Easing.inOut(Easing.sin),
    });
    rotate.value = withTiming(target.kind === 'trick' ? 8 : -6, {
      duration: target.fallMs,
      easing: Easing.inOut(Easing.quad),
    });
  }, [opacity, reportExpire, resolved, rotate, scale, target, xOff, y]);

  const tap = useMemo(() => Gesture.Tap()
    .maxDuration(180)
    .onEnd(() => {
      'worklet';
      if (resolved.value) return;
      const span = FALL_END - (PLAY_TOP - SIZE);
      const p = span <= 0 ? 1 : (y.value - (PLAY_TOP - SIZE)) / span;
      if (p < catchStart || p > catchEnd) return;
      resolved.value = true;
      const tapY = y.value;
      scale.value = withTiming(target.kind === 'treat' ? 1.28 : 0.5, { duration: 120 });
      opacity.value = withTiming(0, { duration: 120 });
      runOnJS(reportCatch)(tapY);
    }), [catchEnd, catchStart, opacity, reportCatch, resolved, scale, target.kind, y]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: startX + xOff.value },
      { translateY: y.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const uri = target.kind === 'treat' ? treatImageUrl : trickImageUrl;

  return (
    <GestureDetector gesture={tap}>
      <Animated.View style={[styles.target, style]}>
        {uri ? (
          <CachedImage source={{ uri }} style={styles.targetImage} resizeMode="contain" />
        ) : (
          <View style={[styles.fallback, target.kind === 'treat' ? styles.treat : styles.trick]}>
            <Text style={styles.fallbackGlyph}>{target.kind === 'treat' ? '+' : '×'}</Text>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

function ScoreFloater({ floater }: { floater: Floater }) {
  const y = useSharedValue(floater.y);
  const opacity = useSharedValue(1);

  useEffect(() => {
    y.value = withTiming(floater.y - 40, { duration: 480, easing: Easing.out(Easing.quad) });
    opacity.value = withTiming(0, { duration: 480 });
  }, [floater.y, opacity, y]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: floater.x - 18 }, { translateY: y.value }],
  }));

  return (
    <Animated.View style={[styles.floater, style]} pointerEvents="none">
      <Text style={[styles.floaterText, floater.good ? styles.floaterGood : styles.floaterBad]}>
        {floater.text}
      </Text>
    </Animated.View>
  );
}

export function SpiritSnatchMiniGame({
  round,
  treatImageUrl,
  trickImageUrl,
  onComplete,
  onCancel,
}: SpiritSnatchMiniGameProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const [score, setScore] = useState(0);
  const [live, setLive] = useState<SpiritSnatchTarget[]>([]);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [finished, setFinished] = useState(false);
  const floaterId = useRef(1);
  const scoreRef = useRef(0);
  const tapsRef = useRef<SpiritSnatchTap[]>([]);
  const alive = useRef(true);
  const startedAt = useRef(Date.now());
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const progress = useSharedValue(1);
  const flash = useSharedValue(0);

  const zoneTop = lerp(PLAY_TOP - SIZE, FALL_END, round.catchStart);
  const zoneBottom = lerp(PLAY_TOP - SIZE, FALL_END, round.catchEnd);

  const finish = useCallback(() => {
    if (!alive.current) return;
    alive.current = false;
    setFinished(true);
    setLive([]);
    setTimeout(() => onCompleteRef.current(tapsRef.current), 1100);
  }, []);

  useEffect(() => {
    alive.current = true;
    startedAt.current = Date.now();
    tapsRef.current = [];
    progress.value = 1;
    progress.value = withTiming(0, { duration: round.roundMs, easing: Easing.linear });

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const target of round.targets) {
      timers.push(setTimeout(() => {
        if (!alive.current) return;
        setLive((prev) => [...prev.slice(-20), target]);
      }, target.spawnAt));
    }
    timers.push(setTimeout(finish, round.roundMs));

    return () => {
      alive.current = false;
      for (const timer of timers) clearTimeout(timer);
    };
  }, [finish, progress, round]);

  const expire = useCallback((id: number) => {
    setLive((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const catchItem = useCallback((id: number, kind: 'treat' | 'trick', x: number, y: number) => {
    if (!alive.current) return;
    setLive((prev) => prev.filter((t) => t.id !== id));
    tapsRef.current.push({ id, atMs: Date.now() - startedAt.current });
    if (kind === 'treat') {
      scoreRef.current += 1;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setFloaters((prev) => [...prev.slice(-8), {
        id: floaterId.current++,
        text: '+1',
        x,
        y,
        good: true,
      }]);
    } else {
      scoreRef.current = Math.max(0, scoreRef.current - TRICK_PENALTY);
      flash.value = 0;
      flash.value = withSequence(
        withTiming(1, { duration: 70 }),
        withTiming(0, { duration: 180 }),
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setFloaters((prev) => [...prev.slice(-8), {
        id: floaterId.current++,
        text: `-${TRICK_PENALTY}`,
        x,
        y,
        good: false,
      }]);
    }
    setScore(scoreRef.current);
  }, [flash]);

  const barStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -(BAR_W / 2) * (1 - progress.value) },
      { scaleX: progress.value },
    ],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flash.value, [0, 1], [0, 0.28]),
  }));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.trickFlash, flashStyle]} pointerEvents="none" />

        <View style={styles.hud}>
          <Text style={[styles.hudLabel, { color: colors.textSecondary }]}>Spirit Snatch</Text>
          <Text style={[styles.score, { color: colors.text }]}>{score}</Text>
          <Text style={[styles.hudSub, { color: colors.textSecondary }]}>
            {finished ? 'Time!' : 'candy corn'}
          </Text>
          <View style={styles.barTrack}>
            <Animated.View style={[styles.barFill, barStyle]} />
          </View>
        </View>

        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Catch candy corn in the glow. Let spiders fall through.
        </Text>

        <View
          pointerEvents="none"
          style={[styles.catchZone, { top: zoneTop, height: Math.max(48, zoneBottom - zoneTop) }]}
        >
          <View style={styles.catchLine} />
          <Text style={styles.catchLabel}>CATCH</Text>
          <View style={[styles.catchLine, styles.catchLineBottom]} />
        </View>

        {live.map((t) => (
          <SpiritTarget
            key={t.id}
            target={t}
            catchStart={round.catchStart}
            catchEnd={round.catchEnd}
            treatImageUrl={treatImageUrl}
            trickImageUrl={trickImageUrl}
            onCatch={catchItem}
            onExpire={expire}
          />
        ))}

        {floaters.map((f) => (
          <ScoreFloater key={f.id} floater={f} />
        ))}

        {finished && (
          <View style={styles.endCard} pointerEvents="none">
            <Text style={[styles.endScore, { color: colors.text }]}>{score}</Text>
            <Text style={[styles.endCaption, { color: colors.textSecondary }]}>
              candy snatched
            </Text>
          </View>
        )}

        {!finished && (
          <Pressable style={styles.cancel} onPress={onCancel} hitSlop={12}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Leave</Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 6, 22, 0.94)',
  },
  trickFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#c23b5a',
  },
  hud: {
    paddingTop: 52,
    alignItems: 'center',
    gap: 2,
    zIndex: 2,
  },
  hudLabel: {
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  score: {
    fontSize: 36,
    fontWeight: '800',
  },
  hudSub: {
    fontSize: 13,
  },
  barTrack: {
    marginTop: 10,
    width: BAR_W,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    width: '100%',
    backgroundColor: '#F1B467',
  },
  hint: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 14,
    zIndex: 2,
  },
  catchZone: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(241, 180, 103, 0.14)',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  catchLine: {
    height: 2,
    marginHorizontal: 10,
    backgroundColor: 'rgba(241, 180, 103, 0.55)',
    borderRadius: 1,
  },
  catchLineBottom: {
    opacity: 0.45,
  },
  catchLabel: {
    textAlign: 'center',
    color: 'rgba(241, 180, 103, 0.9)',
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: '700',
  },
  target: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SIZE,
    height: SIZE,
    zIndex: 3,
  },
  targetImage: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    flex: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  treat: {
    backgroundColor: '#E8A04A',
  },
  trick: {
    backgroundColor: '#5C3A6E',
  },
  fallbackGlyph: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
  },
  floater: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 4,
  },
  floaterText: {
    fontSize: 22,
    fontWeight: '800',
  },
  floaterGood: {
    color: '#F4C56D',
  },
  floaterBad: {
    color: '#FF8AA0',
  },
  endCard: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  endScore: {
    fontSize: 72,
    fontWeight: '800',
  },
  endCaption: {
    fontSize: 16,
    marginTop: 4,
  },
  cancel: {
    position: 'absolute',
    top: 52,
    right: 16,
    padding: 12,
    zIndex: 6,
  },
  cancelText: {
    fontSize: 15,
  },
});
