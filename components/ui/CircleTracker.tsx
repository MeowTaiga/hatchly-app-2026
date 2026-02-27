import React, { useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/ThemeProvider';
import { spacing } from '@/constants/theme';

interface CircleTrackerProps {
  icon: keyof typeof Ionicons.glyphMap;
  label?: string;
  value: number;
  max: number;
  color: string;
  unit?: string;
  displayValue?: string;
  subText?: string;
  subColor?: string;
  hint?: string;
  progress?: number;
  onPress?: () => void;
}

const H_PAD = spacing.xl * 2;
const GAP = spacing.sm;
const STROKE = 4;

function clamp01(v: number) {
  return Math.max(0, Math.min(v, 1));
}

export function CircleTracker({
  icon, value, max, color, unit,
  displayValue, subText, subColor, hint,
  progress, onPress,
}: CircleTrackerProps) {
  const { theme } = useTheme();
  const { colors, typography } = theme;
  const { width: screenWidth } = useWindowDimensions();
  const size = Math.floor((screenWidth - H_PAD - GAP * 3) / 4);
  const r = (size - STROKE) / 2;
  const c = 2 * Math.PI * r;

  const pct = useMemo(() => {
    if (typeof progress === 'number') return clamp01(progress);
    if (max <= 0) return 0;
    return clamp01(value / max);
  }, [progress, max, value]);

  const offset = c * (1 - pct);

  const hintOpacity = useSharedValue(1);
  useEffect(() => {
    if (hint) {
      hintOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 1200 }),
          withTiming(1, { duration: 1200 }),
        ),
        -1,
        false,
      );
    }
  }, [hint]);

  const hintStyle = useAnimatedStyle(() => ({ opacity: hintOpacity.value }));
  const fontSize = Math.max(size * 0.16, 11);
  const shown = displayValue ?? `${value} ${unit ?? ''}`;

  const st = useMemo(
    () =>
      StyleSheet.create({
        wrap: { alignItems: 'center' },
        center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 1 },
        val: { fontWeight: '700', color: colors.text, textAlign: 'center' as const },
        sub: { fontWeight: '600', textAlign: 'center' as const },
        hint: { fontSize: 9, fontWeight: '700', textAlign: 'center' as const, marginTop: 2 },
        pressed: { opacity: 0.7 },
      }),
    [colors, typography],
  );

  const content = (
    <View style={[st.wrap, { width: size }]}>
      <View style={{ width: size, height: size }}>
        {/* Two circles: track + progress. Center is transparent. */}
        <Svg width={size} height={size}>
          {/* Circle 1 — translucent track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={`${color}20`}
            strokeWidth={STROKE}
            fill="transparent"
          />
          {/* Circle 2 — progress fill */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={STROKE}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={`${c}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>

        {/* Center content */}
        <View style={st.center}>
          <Ionicons name={icon} size={Math.max(size * 0.28, 18)} color={color} />
          <Text style={[st.val, { fontSize }]} numberOfLines={1}>{shown}</Text>
          {subText ? (
            <Text
              style={[st.sub, { color: subColor ?? colors.textMuted, fontSize: Math.max(fontSize - 2, 8) }]}
              numberOfLines={1}
            >
              {subText}
            </Text>
          ) : null}
        </View>
      </View>

      {hint ? (
        <Animated.Text style={[st.hint, { color }, hintStyle]} numberOfLines={1}>
          {hint}
        </Animated.Text>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && st.pressed}>
        {content}
      </Pressable>
    );
  }
  return content;
}
