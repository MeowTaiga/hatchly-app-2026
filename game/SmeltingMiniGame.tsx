/**
 * Crucible Temper — keep molten metal in the gold band while the ingot pours.
 * Heat falls on its own; tap the bellows to stoke. Overheat or freeze and the pour fails.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import { useTheme } from '@/store/ThemeProvider';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SmeltingMiniGameProps {
  label: string;
  difficulty: number;
  onComplete: (passed: boolean) => void;
  onCancel: () => void;
}

function paramsFor(difficulty: number) {
  const d = Math.max(1, Math.min(5, difficulty));
  return {
    bandHalf: 0.16 - (d - 1) * 0.018,
    drainPerSec: 0.22 + (d - 1) * 0.05,
    stoke: 0.085,
    pourNeedSec: 6.5 + (d - 1) * 1.1,
    decayOutOfBand: 0.35 + (d - 1) * 0.08,
  };
}

export function SmeltingMiniGame({ label, difficulty, onComplete, onCancel }: SmeltingMiniGameProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const p = paramsFor(difficulty);
  const heat = useSharedValue(0.5);
  const [heatUi, setHeatUi] = useState(0.5);
  const [pour, setPour] = useState(0);
  const [status, setStatus] = useState('Keep it molten');
  const finished = useRef(false);
  const heatRef = useRef(0.5);
  const pourRef = useRef(0);
  const last = useRef(Date.now());
  const punch = useSharedValue(1);

  const finish = useCallback(
    (passed: boolean) => {
      if (finished.current) return;
      finished.current = true;
      onComplete(passed);
    },
    [onComplete],
  );

  useEffect(() => {
    const id = setInterval(() => {
      if (finished.current) return;
      const now = Date.now();
      const dt = Math.min(0.08, (now - last.current) / 1000);
      last.current = now;

      let h = heatRef.current - p.drainPerSec * dt;
      h = Math.max(0, Math.min(1, h));
      heatRef.current = h;
      heat.value = h;
      setHeatUi(h);

      const inBand = Math.abs(h - 0.55) <= p.bandHalf;
      const overheat = h > 0.55 + p.bandHalf + 0.12;
      const frozen = h < 0.55 - p.bandHalf - 0.12;

      if (overheat) {
        setStatus('Too hot — slag!');
        finish(false);
        return;
      }
      if (frozen) {
        setStatus('Went cold…');
        finish(false);
        return;
      }

      if (inBand) {
        pourRef.current = Math.min(1, pourRef.current + dt / p.pourNeedSec);
        setStatus('Pouring…');
      } else {
        pourRef.current = Math.max(0, pourRef.current - p.decayOutOfBand * dt);
        setStatus(h > 0.55 ? 'Ease off' : 'Stoke the bellows');
      }
      setPour(pourRef.current);
      if (pourRef.current >= 1) finish(true);
    }, 50);
    return () => clearInterval(id);
  }, [finish, heat, p.bandHalf, p.drainPerSec, p.pourNeedSec, p.decayOutOfBand]);

  const stoke = useCallback(() => {
    if (finished.current) return;
    heatRef.current = Math.min(1, heatRef.current + p.stoke);
    heat.value = heatRef.current;
    punch.value = 0.9;
    punch.value = withSpring(1, { damping: 10, stiffness: 380 });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [heat, p.stoke, punch]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: punch.value }],
    backgroundColor: interpolateColor(heat.value, [0, 0.55, 1], ['#4A6FA5', '#FF8A3D', '#FF2D2D']),
  }));

  const needleTop = `${Math.round((1 - heatUi) * 100)}%`;
  const bandTop = (1 - (0.55 + p.bandHalf)) * 100;
  const bandHeight = p.bandHalf * 2 * 100;

  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.kicker, { color: colors.textMuted }]}>CRUCIBLE</Text>
          <Text style={[styles.title, { color: colors.text }]}>{label}</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>{status}</Text>

          <View style={styles.stage}>
            <View style={[styles.thermo, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.band,
                  {
                    top: `${bandTop}%`,
                    height: `${bandHeight}%`,
                    backgroundColor: colors.primary + '55',
                  },
                ]}
              />
              <View style={[styles.needle, { top: needleTop, backgroundColor: colors.text }]} />
            </View>
            <Pressable onPress={stoke} style={styles.bellowsHit}>
              <Animated.View style={[styles.crucible, flameStyle]}>
                <Text style={styles.flame}>🔥</Text>
              </Animated.View>
              <Text style={[styles.hint, { color: colors.textMuted }]}>Tap bellows</Text>
            </Pressable>
          </View>

          <View style={[styles.bar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.fill,
                { width: `${Math.round(pour * 100)}%`, backgroundColor: '#E8A317' },
              ]}
            />
          </View>
          <Text style={[styles.pourLabel, { color: colors.textMuted }]}>Ingot pour</Text>
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
  stage: { flexDirection: 'row', alignItems: 'center', gap: 18, marginVertical: 8 },
  thermo: {
    width: 22,
    height: 160,
    borderRadius: 11,
    overflow: 'hidden',
    position: 'relative',
  },
  band: { position: 'absolute', left: 0, right: 0 },
  needle: { position: 'absolute', left: -4, right: -4, height: 3, marginTop: -1.5, borderRadius: 2 },
  bellowsHit: { alignItems: 'center', gap: 8 },
  crucible: {
    width: Math.min(140, SCREEN_WIDTH * 0.32),
    height: Math.min(140, SCREEN_WIDTH * 0.32),
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flame: { fontSize: 56 },
  hint: { fontSize: 12, fontWeight: '700' },
  bar: { width: '100%', height: 14, borderRadius: 8, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 8 },
  pourLabel: { fontSize: 11, fontWeight: '700' },
  cancel: { fontSize: 13, fontWeight: '700', marginTop: 4 },
});
