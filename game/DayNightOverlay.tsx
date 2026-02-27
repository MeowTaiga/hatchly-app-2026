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

/**
 * Returns an opacity (0 = full daylight, max ~0.55 = deep night) and a tint
 * color based on the current fractional hour and seasonal sun times.
 *
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

  let t: number;

  if (hour >= dawnEnd && hour <= duskStart) {
    t = 0;
  } else if (hour >= dawnStart && hour < dawnEnd) {
    t = 1 - (hour - dawnStart) / (dawnEnd - dawnStart);
  } else if (hour > duskStart && hour <= duskEnd) {
    t = (hour - duskStart) / (duskEnd - duskStart);
  } else {
    t = 1;
  }

  // Deep night is darkest around 1-4 AM
  let nightBoost = 0;
  if (t >= 1) {
    if (hour < dawnStart) {
      const midNight = (duskEnd + 24 + dawnStart) / 2 - (hour < 12 ? 0 : 24);
      const distFromMid = Math.abs(hour - (midNight < 0 ? midNight + 24 : midNight));
      nightBoost = Math.max(0, 1 - distFromMid / 4) * 0.15;
    }
  }

  const opacity = Math.min(0.55, t * 0.4 + nightBoost);

  // Tint shifts from warm orange at dusk/dawn to cool blue at deep night
  const color = t > 0.5 ? 'rgba(15, 20, 50, 1)' : 'rgba(40, 30, 60, 1)';

  return { opacity, color };
}

function getCurrentHour(): number {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
}

// ─── Exported helpers for light sources ──────────────────────────────────────

/**
 * Returns the current darkness level (0 = full daylight, ~0.55 = deep night).
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
