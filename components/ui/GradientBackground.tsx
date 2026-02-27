import React from 'react';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/store/ThemeProvider';
import { FloatingBubbles } from './FloatingBubbles';

type GradientColors = readonly [ColorValue, ColorValue, ...ColorValue[]];

interface GradientBackgroundProps {
  children: React.ReactNode;
  colors?: GradientColors;
  /** Set to false to hide floating bubbles (e.g. on loading screens) */
  bubbles?: boolean;
  /** Number of floating bubbles (default 8) */
  bubbleCount?: number;
}

/**
 * Full-screen bubbly gradient backdrop with optional floating bubbles.
 * Defaults to the theme's background gradient with ambient animated bubbles.
 */
export function GradientBackground({
  children,
  colors: colorsProp,
  bubbles = true,
  bubbleCount = 8,
}: GradientBackgroundProps) {
  const { theme } = useTheme();
  const colors = (colorsProp ?? theme.gradients.background) as GradientColors;
  return (
    <LinearGradient colors={colors} style={styles.container}>
      {bubbles && (
        <View style={styles.bubblesLayer} pointerEvents="none">
          <FloatingBubbles count={bubbleCount} />
        </View>
      )}
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bubblesLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
});
