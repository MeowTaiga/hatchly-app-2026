import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { CircleRevealOverlay } from '@/components/transitions';
import { useTheme } from '@/store/ThemeProvider';
import type { Scene } from './types';

const DURATION = 520;

export interface SceneTransitionProps {
  isTransitioning: boolean;
  targetScene: Scene;
  onConcealComplete: () => void;
  onComplete: () => void;
}

/**
 * Two-phase circle transition: conceal (circle closes) then reveal (circle opens).
 * Uses a single overlay instance to avoid remount stutter — both phases animate in sequence.
 */
export const SceneTransition = React.memo(function SceneTransition({
  isTransitioning,
  targetScene,
  onConcealComplete,
  onComplete,
}: SceneTransitionProps) {
  const { theme } = useTheme();
  const onConcealCompleteRef = useRef(onConcealComplete);
  const onCompleteRef = useRef(onComplete);
  onConcealCompleteRef.current = onConcealComplete;
  onCompleteRef.current = onComplete;

  if (!isTransitioning) return null;

  return (
    <View style={styles.container} pointerEvents="auto">
      <CircleRevealOverlay
        mode="conceal-then-reveal"
        backgroundColor={theme.colors.background}
        duration={DURATION}
        onConcealComplete={() => onConcealCompleteRef.current()}
        onComplete={() => onCompleteRef.current()}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
});
