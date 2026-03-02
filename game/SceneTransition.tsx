import React, { useCallback, useRef } from 'react';
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
  /** Returns a promise that resolves when the new scene's assets are rendered. */
  waitForSceneAssets: (targetScene: Scene) => Promise<void>;
}

/**
 * Two-phase circle transition: conceal (full block) → apply scene change →
 * wait for all assets to render → reveal.
 */
export const SceneTransition = React.memo(function SceneTransition({
  isTransitioning,
  targetScene,
  onConcealComplete,
  onComplete,
  waitForSceneAssets,
}: SceneTransitionProps) {
  const { theme } = useTheme();
  const onConcealCompleteRef = useRef(onConcealComplete);
  const onCompleteRef = useRef(onComplete);
  const waitForSceneAssetsRef = useRef(waitForSceneAssets);
  const targetSceneRef = useRef(targetScene);
  onConcealCompleteRef.current = onConcealComplete;
  onCompleteRef.current = onComplete;
  waitForSceneAssetsRef.current = waitForSceneAssets;
  targetSceneRef.current = targetScene;

  const handleConcealComplete = useCallback(() => {
    onConcealCompleteRef.current();
    return waitForSceneAssetsRef.current(targetSceneRef.current);
  }, []);

  const handleComplete = useCallback(() => onCompleteRef.current(), []);

  if (!isTransitioning) return null;

  return (
    <View style={styles.container} pointerEvents="auto">
      <CircleRevealOverlay
        mode="conceal-then-reveal"
        backgroundColor={theme.colors.background}
        duration={DURATION}
        onConcealComplete={handleConcealComplete}
        onComplete={handleComplete}
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
