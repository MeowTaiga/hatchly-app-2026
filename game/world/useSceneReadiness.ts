import { useCallback, useEffect, useRef, useState } from 'react';

import type { Scene } from '../types';

/** Don't hang a scene wipe forever if an image onLoad never fires. */
const FARM_ASSET_WAIT_TIMEOUT_MS = 8_000;

export interface SceneReadiness {
  /** True once the world can be shown without visible pop-in. */
  worldReady: boolean;
  loadOverlayVisible: boolean;
  onLoadOverlayComplete: () => void;
  /** Pass to BakedSceneryLayer. */
  onSceneryReady: () => void;
  /** Pass to MultiplayerScene. */
  onMPSceneReady: () => void;
  /** Resolves once the target scene's assets have reported in. */
  waitForSceneAssets: (targetScene: Scene) => Promise<void>;
}

/**
 * Tracks whether the current scene's assets have loaded, and drives the load
 * overlay that hides the world until they have.
 *
 * Scene transitions await `waitForSceneAssets` so the wipe stays closed until
 * the incoming scene can render in one piece — farm and multiplayer both wait
 * for a *fresh* ready signal (never short-circuit on a prior visit).
 */
export function useSceneReadiness(activeScene: Scene, snapshotReady: boolean): SceneReadiness {
  // Always start false so tab remounts / cold farm entry wait for scenery paint.
  const [sceneryReady, setSceneryReady] = useState(false);
  const [loadOverlayVisible, setLoadOverlayVisible] = useState(true);

  const prevSceneRef = useRef<Scene | null>(null);
  const farmResolveRef = useRef<(() => void) | null>(null);
  const mpResolveRef = useRef<(() => void) | null>(null);
  /** Bumps whenever we start waiting for farm assets — drops stale onReady callbacks. */
  const farmWaitGenRef = useRef(0);

  // Leaving MP/house unmounts farm scenery; wait for a fresh onReady on return.
  useEffect(() => {
    if (activeScene === 'farm' && prevSceneRef.current !== 'farm') {
      setSceneryReady(false);
    }
    prevSceneRef.current = activeScene;
  }, [activeScene]);

  const onSceneryReady = useCallback(() => {
    setSceneryReady(true);
    farmResolveRef.current?.();
    farmResolveRef.current = null;
  }, []);

  const onMPSceneReady = useCallback(() => {
    mpResolveRef.current?.();
    mpResolveRef.current = null;
  }, []);

  const waitForSceneAssets = useCallback((targetScene: Scene) => {
    // Multiplayer: always park a new Promise; MultiplayerScene resolves via onAssetsReady.
    if (targetScene !== 'farm') {
      return new Promise<void>((resolve) => {
        mpResolveRef.current = resolve;
      });
    }

    // Farm: same contract as MP — never resolve from a stale sceneryReady flag.
    // Invalidate synchronously so worldReady can't flip true mid-wipe before paint.
    setSceneryReady(false);
    const gen = ++farmWaitGenRef.current;

    return new Promise<void>((resolve) => {
      const finish = () => {
        if (gen !== farmWaitGenRef.current) return;
        farmResolveRef.current = null;
        resolve();
      };
      farmResolveRef.current = finish;

      setTimeout(() => {
        if (gen !== farmWaitGenRef.current) return;
        if (farmResolveRef.current === finish) {
          setSceneryReady(true);
          finish();
        }
      }, FARM_ASSET_WAIT_TIMEOUT_MS);
    });
  }, []);

  return {
    worldReady: snapshotReady && (activeScene !== 'farm' || sceneryReady),
    loadOverlayVisible,
    onLoadOverlayComplete: useCallback(() => setLoadOverlayVisible(false), []),
    onSceneryReady,
    onMPSceneReady,
    waitForSceneAssets,
  };
}
