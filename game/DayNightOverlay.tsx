import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

// ─── Seasonal sunrise/sunset approximation ──────────────────────────────────

/**
 * Returns approximate sunrise and sunset hours (fractional, 0-24) for a given
 * day of year, assuming ~40°N latitude (covers most of US/Europe).
 * June 21 (day 172) has longest day; Dec 21 (day 355) has shortest.
 */
function getSunTimes(dayOfYear: number): { sunrise: number; sunset: number } {
  const angle = ((dayOfYear - 172) / 365) * 2 * Math.PI;
  const daylightHours = 12 + 3.5 * Math.cos(angle);
  const midday = 12.5;
  return {
    sunrise: midday - daylightHours / 2,
    sunset: midday + daylightHours / 2,
  };
}

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

// ─── Darkness calculation ───────────────────────────────────────────────────

/** Peak overlay opacity at midnight — properly dark, lights still readable. */
export const MAX_NIGHT_OPACITY = 0.78;
/** Opacity once dusk finishes / just before dawn starts. */
const EDGE_NIGHT_OPACITY = 0.48;

/**
 * Smoothstep 0→1 for softer dusk/dawn ramps.
 */
function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/**
 * Returns an opacity (0 = full daylight, {@link MAX_NIGHT_OPACITY} = midnight)
 * and a tint color based on the current fractional hour and seasonal sun times.
 *
 * Night curve peaks at midnight (00:00), then eases toward dawn.
 * Transition zones:
 *   sunrise-1h .. sunrise+0.5h  (dawn)
 *   sunset-0.5h .. sunset+1h    (dusk)
 */
function getDarkness(hour: number, dayOfYear: number): { opacity: number; color: string } {
  const { sunrise, sunset } = getSunTimes(dayOfYear);

  const dawnStart = sunrise - 1;
  const dawnEnd = sunrise + 0.5;
  const duskStart = sunset - 0.5;
  const duskEnd = sunset + 1;

  let opacity = 0;

  if (hour >= dawnEnd && hour <= duskStart) {
    opacity = 0;
  } else if (hour >= dawnStart && hour < dawnEnd) {
    // Dawn: EDGE_NIGHT → 0
    const t = 1 - (hour - dawnStart) / (dawnEnd - dawnStart);
    opacity = EDGE_NIGHT_OPACITY * smoothstep(t);
  } else if (hour > duskStart && hour <= duskEnd) {
    // Dusk: 0 → EDGE_NIGHT
    const t = (hour - duskStart) / (duskEnd - duskStart);
    opacity = EDGE_NIGHT_OPACITY * smoothstep(t);
  } else if (hour > duskEnd) {
    // Evening night: duskEnd → midnight (24) — climb to peak
    const span = 24 - duskEnd;
    const p = span > 0 ? (hour - duskEnd) / span : 1;
    opacity = EDGE_NIGHT_OPACITY + (MAX_NIGHT_OPACITY - EDGE_NIGHT_OPACITY) * smoothstep(p);
  } else {
    // Pre-dawn night: midnight (0) → dawnStart — fall from peak
    // hour is in [0, dawnStart)
    const span = Math.max(dawnStart, 0.001);
    const p = 1 - hour / span;
    opacity = EDGE_NIGHT_OPACITY + (MAX_NIGHT_OPACITY - EDGE_NIGHT_OPACITY) * smoothstep(p);
  }

  opacity = Math.min(MAX_NIGHT_OPACITY, Math.max(0, opacity));

  // Warm purple at dusk/dawn, deep navy at midnight
  const nightDepth = opacity / MAX_NIGHT_OPACITY;
  const color = nightDepth > 0.55 ? 'rgba(8, 12, 32, 1)' : 'rgba(28, 22, 48, 1)';

  return { opacity, color };
}

function getCurrentHour(): number {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
}

// ─── Exported helpers for light sources ──────────────────────────────────────

/**
 * Returns the current darkness level (0 = full daylight, up to {@link MAX_NIGHT_OPACITY} at midnight).
 * Light sources call this to scale their intensity.
 */
export function getCurrentDarkness(): number {
  return getDarkness(getCurrentHour(), getDayOfYear()).opacity;
}

/**
 * Hook that returns the current darkness level, updating every minute.
 */
export function useDarkness(): number {
  const [darkness, setDarkness] = useState(() => getCurrentDarkness());

  useEffect(() => {
    const id = setInterval(() => setDarkness(getCurrentDarkness()), 60_000);
    return () => clearInterval(id);
  }, []);

  return darkness;
}

// ─── Component ──────────────────────────────────────────────────────────────

const UPDATE_INTERVAL_MS = 60_000;
const TRANSITION_MS = 3000;

export function DayNightOverlay() {
  const [state, setState] = useState(() => getDarkness(getCurrentHour(), getDayOfYear()));
  const animatedOpacity = useSharedValue(state.opacity);

  useEffect(() => {
    function update() {
      const next = getDarkness(getCurrentHour(), getDayOfYear());
      setState(next);
      animatedOpacity.value = withTiming(next.opacity, { duration: TRANSITION_MS });
    }

    update();
    const id = setInterval(update, UPDATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [animatedOpacity]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: animatedOpacity.value,
  }));

  if (state.opacity <= 0) return null;

  return (
    <Animated.View
      style={[styles.overlay, { backgroundColor: state.color }, overlayStyle]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 25,
  },
});
