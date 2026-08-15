import React, { useEffect, useMemo } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { ActiveWeather } from './types';
import { useWeather } from './useWeather';

const RAIN_SHEET = require('@/assets/weather/rain-sheet.png');

// ─── Rain: one scrolling texture (cheap) + a few ground splashes ─────────────

function RainLayer({
  width,
  height,
  duration,
  delay,
  opacity,
  skew,
}: {
  width: number;
  height: number;
  duration: number;
  delay: number;
  opacity: number;
  skew: number;
}) {
  const t = useSharedValue(0);

  // Small tiles for finer streaks, but enough rows to cover the full screen
  // (plus padding for the 8° tilt). Two identical blocks scroll seamlessly.
  const tileW = Math.ceil(width * 0.42);
  const tileH = Math.ceil(height * 0.38);
  const cols = Math.ceil((width * 1.45) / tileW) + 1;
  const rows = Math.ceil((height * 1.25) / tileH) + 1;
  const blockH = rows * tileH;

  useEffect(() => {
    cancelAnimation(t);
    t.value = 0;
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false),
    );
  }, [delay, duration, t]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: skew },
      { translateY: t.value * blockH - blockH },
      { rotate: '8deg' },
    ],
  }));

  const block = (keyPrefix: string) =>
    Array.from({ length: rows }, (_, r) => (
      <View key={`${keyPrefix}-r${r}`} style={styles.rainRow}>
        {Array.from({ length: cols }, (_, c) => (
          <Image
            key={`${keyPrefix}-${r}-${c}`}
            source={RAIN_SHEET}
            style={{ width: tileW, height: tileH }}
            resizeMode="cover"
          />
        ))}
      </View>
    ));

  return (
    <Animated.View
      style={[styles.rainLayer, { width: tileW * cols, height: blockH * 2, opacity }, style]}
    >
      <View style={{ height: blockH }}>{block('a')}</View>
      <View style={{ height: blockH }}>{block('b')}</View>
    </Animated.View>
  );
}

function RainEffect({ width, height }: { width: number; height: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.rainTint, { backgroundColor: 'rgba(40,70,120,0.07)' }]} />
      <RainLayer width={width} height={height} duration={900} delay={0} opacity={0.38} skew={-width * 0.04} />
      <RainLayer width={width} height={height} duration={1100} delay={200} opacity={0.22} skew={width * 0.02} />
    </View>
  );
}

// ─── Snow / meteors: few particles, still light ───────────────────────────────

function SnowEffect({ width, height }: { width: number; height: number }) {
  const flakes = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        x: (i * 53 + 7) % Math.max(width, 1),
        delay: (i * 180) % 2400,
        duration: 3800 + (i % 5) * 500,
        drift: 30 + (i % 4) * 14,
        size: 3 + (i % 3),
      })),
    [width],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {flakes.map((f) => (
        <SnowFlake key={f.id} {...f} screenH={height} />
      ))}
    </View>
  );
}

function SnowFlake({
  x,
  delay,
  duration,
  drift,
  size,
  screenH,
}: {
  x: number;
  delay: number;
  duration: number;
  drift: number;
  size: number;
  screenH: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(t);
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false),
    );
  }, [delay, duration, t]);

  const style = useAnimatedStyle(() => {
    const sway = Math.sin(t.value * Math.PI * 2) * drift * 0.35;
    return {
      opacity: 0.5 + 0.35 * Math.sin(t.value * Math.PI),
      transform: [
        { translateX: x + sway },
        { translateY: t.value * (screenH + 20) - 10 },
      ],
    };
  });

  return (
    <Animated.View
      style={[styles.snowFlake, { width: size, height: size, borderRadius: size / 2 }, style]}
    />
  );
}

function MeteorEffect({ width, height }: { width: number; height: number }) {
  const meteors = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => ({
        id: i,
        x: (i * 97 + 40) % Math.max(width * 0.8, 1),
        delay: i * 2200,
        duration: 2400,
        drift: width * 0.4,
        size: 56 + i * 10,
      })),
    [width],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {meteors.map((m) => (
        <Meteor key={m.id} {...m} screenH={height} />
      ))}
    </View>
  );
}

function Meteor({
  x,
  delay,
  duration,
  drift,
  size,
  screenH,
}: {
  x: number;
  delay: number;
  duration: number;
  drift: number;
  size: number;
  screenH: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(t);
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false),
    );
  }, [delay, duration, t]);

  const style = useAnimatedStyle(() => {
    const visible = t.value < 0.22;
    const u = visible ? t.value / 0.22 : 0;
    return {
      opacity: visible ? 0.85 * (1 - u) : 0,
      transform: [
        { translateX: x + u * drift },
        { translateY: u * (screenH * 0.5) - 30 },
        { rotate: '28deg' },
      ],
    };
  });

  return <Animated.View style={[styles.meteor, { width: size, height: 2 }, style]} />;
}

export interface WeatherOverlayProps {
  /** Override server weather (preview / tests). */
  weather?: ActiveWeather;
}

/**
 * Screen-space weather. Rain uses a scrolling texture + few splash sprites
 * (not dozens of animated streak views).
 */
export function WeatherOverlay({ weather: weatherProp }: WeatherOverlayProps = {}) {
  const live = useWeather();
  const weather = weatherProp ?? live;
  const { width, height } = useWindowDimensions();

  if (weather.type === 'clear') return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      {weather.type === 'rain' && <RainEffect width={width} height={height} />}
      {weather.type === 'snow' && <SnowEffect width={width} height={height} />}
      {weather.type === 'meteor_shower' && <MeteorEffect width={width} height={height} />}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    overflow: 'hidden',
  },
  rainTint: {
    ...StyleSheet.absoluteFillObject,
  },
  rainLayer: {
    position: 'absolute',
    left: '-10%',
    top: 0,
  },
  rainRow: {
    flexDirection: 'row',
  },
  snowFlake: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  meteor: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(255, 245, 220, 0.95)',
    borderRadius: 2,
  },
});
