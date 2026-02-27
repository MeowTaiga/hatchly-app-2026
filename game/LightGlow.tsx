import { CachedImage } from '@/components/ui/CachedImage';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { TILE_SIZE } from './constants';

const NUM_RINGS = 4;
const MIN_DAY_FACTOR = 0.2;
const MAX_DARKNESS = 0.55;

interface LightGlowProps {
  x: number;
  y: number;
  radius: number;
  color: string;
  intensity: number;
  darkness: number;
  imageUrl?: string;
  itemWidth?: number;
  itemHeight?: number;
}

export const LightGlow = React.memo(function LightGlow({
  x,
  y,
  radius,
  color,
  intensity,
  darkness,
  imageUrl,
  itemWidth,
  itemHeight,
}: LightGlowProps) {
  const sizePx = radius * 2 * TILE_SIZE;
  const halfSize = sizePx / 2;

  const darknessFactor = MIN_DAY_FACTOR + (1 - MIN_DAY_FACTOR) * Math.min(1, darkness / MAX_DARKNESS);
  const effectiveIntensity = intensity * darknessFactor;

  const rings = useMemo(() => buildRings(sizePx, effectiveIntensity), [sizePx, effectiveIntensity]);

  return (
    <View
      style={[styles.container, { left: x - halfSize, top: y - halfSize, width: sizePx, height: sizePx }]}
      pointerEvents="none"
    >
      {rings.map((ring, i) => (
        <SoftRing key={i} ring={ring} color={color} index={i} />
      ))}
      {imageUrl && itemWidth && itemHeight && (
        <CachedImage
          source={{ uri: imageUrl }}
          style={{ position: 'absolute', width: itemWidth, height: itemHeight }}
          resizeMode="contain"
        />
      )}
    </View>
  );
});

interface AnimatedLightGlowProps {
  bugX: SharedValue<number>;
  bugY: SharedValue<number>;
  radius: number;
  color: string;
  intensity: number;
  darkness: number;
  imageUrl?: string | null;
  imageSize?: number;
}

export const AnimatedLightGlow = React.memo(function AnimatedLightGlow({
  bugX,
  bugY,
  radius,
  color,
  intensity,
  darkness,
  imageUrl,
  imageSize,
}: AnimatedLightGlowProps) {
  const sizePx = radius * 2 * TILE_SIZE;
  const halfSize = sizePx / 2;

  const darknessFactor = MIN_DAY_FACTOR + (1 - MIN_DAY_FACTOR) * Math.min(1, darkness / MAX_DARKNESS);
  const effectiveIntensity = intensity * darknessFactor;

  const positionStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: bugX.value - halfSize },
      { translateY: bugY.value - halfSize },
    ],
  }));

  const rings = useMemo(() => buildRings(sizePx, effectiveIntensity), [sizePx, effectiveIntensity]);

  return (
    <Animated.View
      style={[styles.container, { width: sizePx, height: sizePx }, positionStyle]}
      pointerEvents="none"
    >
      {rings.map((ring, i) => (
        <SoftRing key={i} ring={ring} color={color} index={i} />
      ))}
      {imageUrl && imageSize && (
        <CachedImage
          source={{ uri: imageUrl }}
          style={{ position: 'absolute', width: imageSize, height: imageSize }}
          resizeMode="contain"
        />
      )}
    </Animated.View>
  );
});

// ─── Ring data builder ───────────────────────────────────────────────────────

interface RingData {
  size: number;
  baseOpacity: number;
  borderRadius: number;
}

function buildRings(sizePx: number, effectiveIntensity: number): RingData[] {
  const result: RingData[] = [];
  for (let i = 0; i < NUM_RINGS; i++) {
    const t = (i + 1) / NUM_RINGS;
    const ringSize = sizePx * t;
    // Gentle quadratic falloff — keeps outer rings visible while center stays brightest
    const falloff = Math.pow(1 - t * 0.85, 1.3);
    const ringOpacity = effectiveIntensity * falloff;
    result.push({ size: ringSize, baseOpacity: ringOpacity, borderRadius: ringSize / 2 });
  }
  return result;
}

// ─── Soft Ring with staggered pulse ──────────────────────────────────────────

interface SoftRingProps {
  ring: RingData;
  color: string;
  index: number;
}

const PULSE_DURATIONS = [2800, 3400, 2500, 3800, 3000, 2400, 3600, 2700, 3200, 2600];
const PULSE_AMPLITUDES = [0.40, 0.50, 0.35, 0.55, 0.45, 0.42, 0.52, 0.38, 0.48, 0.44];
const PULSE_DELAYS = [0, 300, 120, 500, 200, 420, 80, 280, 460, 160];

const SoftRing = React.memo(function SoftRing({ ring, color, index }: SoftRingProps) {
  const pulse = useSharedValue(0);

  const duration = PULSE_DURATIONS[index % PULSE_DURATIONS.length];
  const amplitude = PULSE_AMPLITUDES[index % PULSE_AMPLITUDES.length];
  const delay = PULSE_DELAYS[index % PULSE_DELAYS.length];

  useEffect(() => {
    pulse.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, [pulse, duration, delay]);

  const animStyle = useAnimatedStyle(() => {
    const opacityMod = 1 - amplitude + amplitude * pulse.value;
    const scaleMod = 1 + pulse.value * 0.10;
    return {
      opacity: ring.baseOpacity * opacityMod,
      transform: [{ scale: scaleMod }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.ring,
        { width: ring.size, height: ring.size, borderRadius: ring.borderRadius, backgroundColor: color },
        animStyle,
      ]}
    />
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
  },
  ring: {
    position: 'absolute',
  },
});
