import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/store/ThemeProvider';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BubbleConfig {
  size: number;
  startX: number;
  startY: number;
  driftX: number;
  duration: number;
  delay: number;
  opacity: number;
  color: string;
}

function generateBubbles(count: number, bubbleColors: readonly string[]): BubbleConfig[] {
  return Array.from({ length: count }, (_, i) => ({
    size: 20 + Math.random() * 60,
    startX: Math.random() * SCREEN_WIDTH,
    startY: SCREEN_HEIGHT + 40 + Math.random() * 100,
    driftX: (Math.random() - 0.5) * 80,
    duration: 8000 + Math.random() * 12000,
    delay: Math.random() * 6000,
    opacity: 0.3 + Math.random() * 0.5,
    color: bubbleColors[i % bubbleColors.length],
  }));
}

/**
 * A single animated bubble. Memoised to prevent unnecessary re-renders
 * from parent state changes — each bubble's animation lives entirely
 * on the UI thread via Reanimated shared values.
 */
const Bubble = React.memo(function Bubble({ config, borderColor }: { config: BubbleConfig; borderColor: string }) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(0.6);

  useEffect(() => {
    translateY.value = withDelay(
      config.delay,
      withRepeat(
        withTiming(-SCREEN_HEIGHT - 100, {
          duration: config.duration,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        false,
      ),
    );

    translateX.value = withDelay(
      config.delay,
      withRepeat(
        withTiming(config.driftX, {
          duration: config.duration * 0.5,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true,
      ),
    );

    scale.value = withDelay(
      config.delay,
      withRepeat(
        withTiming(1, {
          duration: config.duration * 0.4,
          easing: Easing.out(Easing.quad),
        }),
        1,
        false,
      ),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          left: config.startX,
          top: config.startY,
          opacity: config.opacity,
          backgroundColor: config.color,
          borderColor,
        },
        animatedStyle,
      ]}
      // Hardware-accelerate each bubble into its own compositing layer
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
    />
  );
});

/**
 * Renders soft, translucent circles that float upward continuously.
 * Placed behind all content inside GradientBackground for a bubbly vibe.
 *
 * Defaults to 8 bubbles — enough for the aesthetic without overloading
 * the animation thread on lower-end devices.
 */
export function FloatingBubbles({ count = 8 }: { count?: number }) {
  const { theme, themeMode } = useTheme();
  const bubbles = useMemo(() => generateBubbles(count, [...theme.bubbleColors]), [count, theme.bubbleColors]);
  const borderColor = themeMode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';

  return (
    <>
      {bubbles.map((config, i) => (
        <Bubble key={i} config={config} borderColor={borderColor} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    borderWidth: 1,
  },
});
