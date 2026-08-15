import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { CircleRevealOverlay } from '@/components/transitions';
import { useAuth } from '@/store/AuthProvider';
import { useTheme } from '@/store/ThemeProvider';
import { SceneLoadingScreen, pickRandomPoseUrl } from './SceneLoadingScreen';
import { pickLoadingTip } from './loadingTips';
import type { Scene } from './types';

const DURATION = 520;
/** Let the circle expand play before the tip fades in. */
const TIP_DELAY_MS = 330; // 0.33s
/** How long the tip stays up after it appears (also waits for assets). */
const MIN_TIP_VISIBLE_MS = 900;

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Resolves once the tip has been on screen for MIN_TIP_VISIBLE_MS. */
async function waitForTipReadable(tipShownAtRef: React.MutableRefObject<number | null>) {
  while (tipShownAtRef.current == null) {
    await delay(40);
  }
  const left = MIN_TIP_VISIBLE_MS - (Date.now() - tipShownAtRef.current);
  if (left > 0) await delay(left);
}

export interface SceneTransitionProps {
  isTransitioning: boolean;
  targetScene: Scene;
  onConcealComplete: () => void;
  onComplete: () => void;
  /** Returns a promise that resolves when the new scene's assets are rendered. */
  waitForSceneAssets: (targetScene: Scene) => Promise<void>;
}

/**
 * Circle wipe as before. Tip screen mounts immediately (opacity 0) so the pet
 * image can reuse the warm pose cache during the delay, then fades in at 0.33s.
 */
export const SceneTransition = React.memo(function SceneTransition({
  isTransitioning,
  targetScene,
  onConcealComplete,
  onComplete,
  waitForSceneAssets,
}: SceneTransitionProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [tipVisible, setTipVisible] = useState(false);
  const [preload, setPreload] = useState<{ tip: string; poseUrl: string | null; key: number } | null>(null);
  const tipShownAtRef = useRef<number | null>(null);
  const petRef = useRef(user?.pet);
  const onConcealCompleteRef = useRef(onConcealComplete);
  const onCompleteRef = useRef(onComplete);
  const waitForSceneAssetsRef = useRef(waitForSceneAssets);
  const targetSceneRef = useRef(targetScene);
  const tipKeyRef = useRef(0);
  petRef.current = user?.pet;
  onConcealCompleteRef.current = onConcealComplete;
  onCompleteRef.current = onComplete;
  waitForSceneAssetsRef.current = waitForSceneAssets;
  targetSceneRef.current = targetScene;

  useEffect(() => {
    if (!isTransitioning) {
      setTipVisible(false);
      setPreload(null);
      tipShownAtRef.current = null;
      return;
    }

    tipKeyRef.current += 1;
    setPreload({
      tip: pickLoadingTip(),
      poseUrl: pickRandomPoseUrl(petRef.current),
      key: tipKeyRef.current,
    });
    setTipVisible(false);
    tipShownAtRef.current = null;

    const id = setTimeout(() => {
      tipShownAtRef.current = Date.now();
      setTipVisible(true);
    }, TIP_DELAY_MS);

    return () => clearTimeout(id);
  }, [isTransitioning]);

  const handleConcealComplete = useCallback(async () => {
    const destination = targetSceneRef.current;
    // Register the wait *before* applying the scene so ready signals aren't dropped.
    const assetsPromise = waitForSceneAssetsRef.current(destination);
    onConcealCompleteRef.current();

    try {
      await assetsPromise;
      await waitForTipReadable(tipShownAtRef);
    } finally {
      setTipVisible(false);
    }
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
        coverContent={
          preload ? (
            <SceneLoadingScreen
              key={preload.key}
              poseUrl={preload.poseUrl}
              tip={preload.tip}
              visible={tipVisible}
            />
          ) : null
        }
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
});
