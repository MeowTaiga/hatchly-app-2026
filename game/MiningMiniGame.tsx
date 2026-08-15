/**
 * Strike the vein — mash the ore to crack it open before time runs out.
 * Easiest: 30 taps in 15s. Harder veins need more taps in less time.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Modal } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { CachedImage } from '@/components/ui/CachedImage';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ART_SIZE = Math.min(210, SCREEN_WIDTH * 0.52);
const RING = ART_SIZE + 36;
const CX = RING / 2;
const R_TIMER = (RING - 12) / 2;
const R_PROG = R_TIMER - 11;
const C_TIMER = 2 * Math.PI * R_TIMER;
const C_PROG = 2 * Math.PI * R_PROG;
const CHIP_COLORS = ['#E8C9A0', '#C4A574', '#8A8680', '#FFD27A', '#E8A317', '#FF8A3D'];

interface MiningMiniGameProps {
  label: string;
  imageUrl?: string;
  emoji?: string;
  tapsRequired: number;
  timeLimitMs: number;
  energy?: number;
  energyCap?: number;
  toolImageUrl?: string;
  onComplete: (passed: boolean, taps: number, elapsedMs: number) => void;
  onCancel: () => void;
}

function Spark({ index, burst }: { index: number; burst: SharedValue<number> }) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const op = useSharedValue(0);
  const sc = useSharedValue(0.4);
  const rot = useSharedValue(0);

  useAnimatedReaction(
    () => burst.value,
    (v, prev) => {
      if (prev === null || v === prev) return;
      const angle = (index / 6) * Math.PI * 2 + (v % 7) * 0.37;
      const dist = 58 + (index % 3) * 24;
      x.value = 0;
      y.value = 0;
      op.value = 1;
      sc.value = 1.15;
      rot.value = 0;
      const dur = 240;
      x.value = withTiming(Math.cos(angle) * dist, { duration: dur, easing: Easing.out(Easing.quad) });
      y.value = withTiming(Math.sin(angle) * dist - 16, { duration: dur, easing: Easing.out(Easing.quad) });
      op.value = withTiming(0, { duration: dur });
      sc.value = withTiming(0.12, { duration: dur });
      rot.value = withTiming(index % 2 === 0 ? 70 : -70, { duration: dur });
    },
  );

  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: sc.value },
      { rotate: `${rot.value}deg` },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.chip, { backgroundColor: CHIP_COLORS[index % CHIP_COLORS.length] }, style]}
    />
  );
}

export function MiningMiniGame({
  label,
  imageUrl,
  emoji,
  tapsRequired,
  timeLimitMs,
  energy,
  energyCap,
  toolImageUrl,
  onComplete,
  onCancel,
}: MiningMiniGameProps) {
  const [taps, setTaps] = useState(0);
  const [leftMs, setLeftMs] = useState(timeLimitMs);
  const [banner, setBanner] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<'break' | 'held' | null>(null);
  const tapsRef = useRef(0);
  const startedAt = useRef(Date.now());
  const finishedRef = useRef(false);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hitDir = useRef(1);

  const punch = useSharedValue(1);
  const rockRot = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const flash = useSharedValue(0);
  const ring = useSharedValue(0.7);
  const ringOp = useSharedValue(0);
  const fill = useSharedValue(0);
  const axeRot = useSharedValue(-80);
  const axeOp = useSharedValue(0);
  const comboPop = useSharedValue(1);
  const burst = useSharedValue(0);
  const glow = useSharedValue(0);

  const finish = useCallback(
    (passed: boolean) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setOutcome(passed ? 'break' : 'held');
      if (passed) {
        punch.value = withSequence(
          withTiming(1.16, { duration: 70 }),
          withTiming(0.08, { duration: 220, easing: Easing.in(Easing.quad) }),
        );
        flash.value = withSequence(withTiming(0.95, { duration: 50 }), withTiming(0, { duration: 240 }));
        burst.value = burst.value + 1;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        punch.value = withTiming(0.92, { duration: 180 });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      const tapsNow = tapsRef.current;
      const elapsed = Date.now() - startedAt.current;
      setTimeout(() => onComplete(passed, tapsNow, elapsed), 320);
    },
    [burst, flash, onComplete, punch],
  );

  useEffect(() => {
    const id = setInterval(() => {
      if (finishedRef.current) return;
      const remaining = timeLimitMs - (Date.now() - startedAt.current);
      setLeftMs(Math.max(0, remaining));
      if (remaining <= 0) finish(tapsRef.current >= tapsRequired);
    }, 80);
    return () => clearInterval(id);
  }, [finish, timeLimitMs, tapsRequired]);

  useEffect(() => () => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
  }, []);

  const flashBanner = useCallback((text: string) => {
    setBanner(text);
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 420);
  }, []);

  const handleTap = useCallback(() => {
    if (finishedRef.current) return;
    const next = tapsRef.current + 1;
    tapsRef.current = next;
    setTaps(next);

    const progress = Math.min(1, next / tapsRequired);
    fill.value = withTiming(progress, { duration: 90 });
    glow.value = withTiming(progress, { duration: 120 });

    hitDir.current *= -1;
    const dir = hitDir.current;
    punch.value = withSequence(
      withTiming(0.86, { duration: 38 }),
      withSpring(1, { damping: 7, stiffness: 520 }),
    );
    rockRot.value = withSequence(
      withTiming(dir * 7, { duration: 40 }),
      withSpring(0, { damping: 9, stiffness: 320 }),
    );
    shakeX.value = withSequence(
      withTiming(dir * 11, { duration: 28 }),
      withTiming(dir * -7, { duration: 42 }),
      withSpring(0, { damping: 11, stiffness: 420 }),
    );
    flash.value = 0.62;
    flash.value = withTiming(0, { duration: 110 });
    ring.value = 0.55;
    ringOp.value = 0.75;
    ring.value = withTiming(1.42, { duration: 220, easing: Easing.out(Easing.quad) });
    ringOp.value = withTiming(0, { duration: 220 });
    axeOp.value = 1;
    axeRot.value = -88;
    axeRot.value = withSequence(
      withTiming(28, { duration: 72, easing: Easing.out(Easing.quad) }),
      withTiming(-88, { duration: 150 }),
    );
    axeOp.value = withSequence(withTiming(1, { duration: 30 }), withTiming(0, { duration: 90, easing: Easing.in(Easing.quad) }));
    comboPop.value = 1.38;
    comboPop.value = withSpring(1, { damping: 9, stiffness: 420 });
    burst.value = burst.value + 1;

    const milestone = next / tapsRequired;
    if (next === tapsRequired) {
      flashBanner('BREAK!');
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      finish(true);
      return;
    }
    if (Math.abs(milestone - 0.33) < 1 / tapsRequired || next === Math.round(tapsRequired * 0.33)) {
      flashBanner('CRACK!');
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (Math.abs(milestone - 0.66) < 1 / tapsRequired || next === Math.round(tapsRequired * 0.66)) {
      flashBanner('SPLIT!');
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [axeOp, axeRot, burst, comboPop, fill, finish, flash, flashBanner, glow, punch, ring, ringOp, rockRot, shakeX, tapsRequired]);

  const rockStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shakeX.value },
      { rotate: `${rockRot.value}deg` },
      { scale: punch.value },
    ],
  }));

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  const shockStyle = useAnimatedStyle(() => ({
    opacity: ringOp.value,
    transform: [{ scale: ring.value }],
  }));

  const axeStyle = useAnimatedStyle(() => ({
    opacity: axeOp.value,
    transform: [{ rotate: `${axeRot.value}deg` }, { scale: interpolate(axeOp.value, [0, 1], [0.7, 1.15]) }],
  }));

  const comboStyle = useAnimatedStyle(() => ({
    transform: [{ scale: comboPop.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.round(fill.value * 100)}%`,
  }));

  const emberStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + glow.value * 0.55,
    transform: [{ scale: 0.78 + glow.value * 0.28 }],
  }));

  const progress = Math.min(1, taps / tapsRequired);
  const seconds = Math.ceil(leftMs / 1000);
  const urgent = leftMs < 4000;
  const timerFrac = Math.max(0, leftMs / timeLimitMs);

  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.root}>
        <LinearGradient colors={['#0B0705', '#1A110C', '#2A1810']} style={StyleSheet.absoluteFill} />
        <View style={styles.vignette} pointerEvents="none" />

        <Text style={styles.kicker}>STRIKE THE VEIN</Text>
        <Text style={styles.title} numberOfLines={1}>{label}</Text>
        {energy != null && energyCap != null && (
          <Text style={styles.energy}>⚡ {energy}/{energyCap}</Text>
        )}

        <Pressable onPressIn={handleTap} style={styles.hitArea}>
          <View style={styles.stage} pointerEvents="none">
          <Svg width={RING} height={RING} style={styles.svg}>
            <Circle cx={CX} cy={CX} r={R_TIMER} stroke="rgba(255,255,255,0.08)" strokeWidth={8} fill="transparent" />
            <Circle
              cx={CX}
              cy={CX}
              r={R_TIMER}
              stroke={urgent ? '#FF4D3A' : '#E8A317'}
              strokeWidth={8}
              fill="transparent"
              strokeLinecap="round"
              strokeDasharray={`${C_TIMER} ${C_TIMER}`}
              strokeDashoffset={C_TIMER * (1 - timerFrac)}
              transform={`rotate(-90 ${CX} ${CX})`}
            />
            <Circle cx={CX} cy={CX} r={R_PROG} stroke="rgba(255,210,122,0.14)" strokeWidth={6} fill="transparent" />
            <Circle
              cx={CX}
              cy={CX}
              r={R_PROG}
              stroke="#FFD27A"
              strokeWidth={6}
              fill="transparent"
              strokeLinecap="round"
              strokeDasharray={`${C_PROG} ${C_PROG}`}
              strokeDashoffset={C_PROG * (1 - progress)}
              transform={`rotate(-90 ${CX} ${CX})`}
            />
          </Svg>

          <Animated.View style={[styles.shock, shockStyle]} />
          <Animated.View style={[styles.ember, emberStyle]} />

          <Animated.View style={[styles.artWrap, rockStyle]}>
            {imageUrl ? (
              <CachedImage source={{ uri: imageUrl }} style={styles.art} resizeMode="contain" />
            ) : (
              <Text style={styles.emoji}>{emoji || '⛏️'}</Text>
            )}
            <Animated.View style={[styles.hitFlash, flashStyle]} />
            {progress > 0.18 && <View style={[styles.crack, styles.crackA, { opacity: Math.min(1, (progress - 0.18) * 3) }]} />}
            {progress > 0.4 && <View style={[styles.crack, styles.crackB, { opacity: Math.min(1, (progress - 0.4) * 3) }]} />}
            {progress > 0.62 && <View style={[styles.crack, styles.crackC, { opacity: Math.min(1, (progress - 0.62) * 3) }]} />}
          </Animated.View>

          <Animated.View style={[styles.axe, axeStyle]} pointerEvents="none">
            {toolImageUrl ? (
              <CachedImage source={{ uri: toolImageUrl }} style={styles.axeArt} resizeMode="contain" />
            ) : null}
          </Animated.View>

          {Array.from({ length: 6 }, (_, i) => (
            <Spark key={i} index={i} burst={burst} />
          ))}

          {banner ? (
            <Animated.Text entering={ZoomIn.duration(90)} style={styles.banner}>
              {banner}
            </Animated.Text>
          ) : null}
        </View>

        <Animated.Text style={[styles.combo, comboStyle]}>
          {taps}
          <Text style={styles.comboMax}>/{tapsRequired}</Text>
        </Animated.Text>

        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, fillStyle]} />
        </View>

        <Text style={[styles.timer, urgent && styles.timerUrgent]}>
          {urgent ? 'HURRY  ' : ''}{seconds}s
        </Text>
        </Pressable>

        {outcome === 'break' && (
          <Text style={styles.outcomeGood}>Vein shattered!</Text>
        )}
        {outcome === 'held' && (
          <Text style={styles.outcomeBad}>The vein held</Text>
        )}

        <Pressable onPress={onCancel} hitSlop={12} style={styles.cancelHit}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2.4,
    color: '#E8A317',
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF6E8',
    marginBottom: 4,
    textAlign: 'center',
  },
  energy: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgba(255,210,122,0.85)',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  hitArea: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  stage: {
    width: RING,
    height: RING,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  svg: { position: 'absolute' },
  shock: {
    position: 'absolute',
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: ART_SIZE / 2,
    borderWidth: 4,
    borderColor: 'rgba(255, 210, 122, 0.85)',
  },
  ember: {
    position: 'absolute',
    width: ART_SIZE + 28,
    height: ART_SIZE + 28,
    borderRadius: (ART_SIZE + 28) / 2,
    backgroundColor: '#FF6B2D',
  },
  artWrap: {
    width: ART_SIZE,
    height: ART_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  art: { width: ART_SIZE, height: ART_SIZE },
  emoji: { fontSize: 108 },
  hitFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFF4D0',
    borderRadius: 24,
  },
  crack: {
    position: 'absolute',
    backgroundColor: '#1A0C08',
    borderRadius: 1,
  },
  crackA: { width: 3, height: '62%', top: '18%', left: '46%', transform: [{ rotate: '18deg' }] },
  crackB: { width: 2, height: '48%', top: '28%', left: '38%', transform: [{ rotate: '-28deg' }] },
  crackC: { width: 2, height: '40%', top: '36%', left: '58%', transform: [{ rotate: '42deg' }] },
  axe: {
    position: 'absolute',
    right: -6,
    top: 2,
    width: 78,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  axeArt: { width: 78, height: 78 },
  chip: {
    position: 'absolute',
    width: 10,
    height: 14,
    borderRadius: 2,
  },
  banner: {
    position: 'absolute',
    fontSize: 34,
    fontWeight: '900',
    color: '#FFD27A',
    textShadowColor: '#000',
    textShadowRadius: 8,
    letterSpacing: 1,
  },
  combo: {
    marginTop: 6,
    fontSize: 42,
    fontWeight: '900',
    color: '#FFF6E8',
    fontVariant: ['tabular-nums'],
  },
  comboMax: {
    fontSize: 20,
    fontWeight: '800',
    color: 'rgba(255,246,232,0.45)',
  },
  barTrack: {
    width: '100%',
    maxWidth: 320,
    height: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginTop: 10,
  },
  barFill: {
    height: '100%',
    borderRadius: 10,
    backgroundColor: '#E8A317',
  },
  timer: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '800',
    color: 'rgba(255,246,232,0.7)',
    letterSpacing: 0.6,
  },
  timerUrgent: {
    color: '#FF4D3A',
  },
  outcomeGood: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '900',
    color: '#FFD27A',
  },
  outcomeBad: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '900',
    color: '#FF8A7A',
  },
  cancelHit: { marginTop: 16, padding: 8 },
  cancel: { fontSize: 14, fontWeight: '700', color: 'rgba(255,246,232,0.4)' },
});
