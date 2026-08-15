import React, { useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useTheme } from '@/store/ThemeProvider';

interface HourSliderProps {
  value: number;
  min: number;
  max: number;
  onChange: (hours: number) => void;
}

/**
 * Horizontal hour picker. Uses a native pan gesture so the drawer
 * cannot steal the drag after the first hour change.
 */
export function HourSlider({ value, min, max, onChange }: HourSliderProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const widthRef = useRef(1);
  const minRef = useRef(min);
  const maxRef = useRef(max);
  const onChangeRef = useRef(onChange);
  minRef.current = min;
  maxRef.current = max;
  onChangeRef.current = onChange;

  const applyX = useCallback((x: number) => {
    const width = widthRef.current;
    if (width <= 0) return;
    const lo = minRef.current;
    const hi = maxRef.current;
    const ratio = Math.max(0, Math.min(1, x / width));
    onChangeRef.current(Math.round(lo + ratio * (hi - lo)));
  }, []);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onTouchesDown((e) => {
          const t = e.allTouches[0];
          if (t) runOnJS(applyX)(t.x);
        })
        .onUpdate((e) => {
          runOnJS(applyX)(e.x);
        }),
    [applyX],
  );

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
  }, []);

  const span = max - min;
  const pct = span <= 0 ? 0 : ((value - min) / span) * 100;

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.hit} onLayout={onLayout} collapsable={false}>
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <View style={[styles.fill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
          <View
            style={[
              styles.thumb,
              {
                left: `${pct}%`,
                backgroundColor: colors.primary,
                borderColor: colors.surface,
              },
            ]}
          />
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  hit: {
    height: 44,
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  track: {
    height: 8,
    borderRadius: 4,
    justifyContent: 'center',
    overflow: 'visible',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    marginLeft: -11,
    borderWidth: 3,
    top: -7,
  },
});
