import React, { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager, View, StyleSheet } from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import { TILE_SIZE } from './constants';
import { SceneryLayer } from './SceneryLayer';
import type { ItemDefinition } from './types';

interface BakedSceneryLayerProps {
  farmCols: number;
  farmRows: number;
  worldCols: number;
  worldRows: number;
  itemDefs: Record<string, ItemDefinition>;
  onReady?: () => void;
  imageUrl: string;
  /** True once the game snapshot has been received (so we know if imageUrl is genuinely empty). */
  snapshotLoaded: boolean;
}

/**
 * Renders a single baked scenery image. Falls back to procedural SceneryLayer
 * only when the image actually fails to load (network error / 404) or the
 * server confirmed no bake exists (snapshotLoaded + empty URL).
 *
 * Keeps the last successful bake on screen while a snapshot reloads so the
 * farm grass underlay never flashes through.
 */
export function BakedSceneryLayer({
  farmCols, farmRows, worldCols, worldRows, itemDefs, onReady, imageUrl,
  snapshotLoaded,
}: BakedSceneryLayerProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  const stickyUrlRef = useRef(imageUrl);
  const prevUrl = useRef(imageUrl);

  // Keep last bake across snapshot reloads; clear only when server confirms none.
  if (imageUrl) stickyUrlRef.current = imageUrl;
  const displayUrl = imageUrl || stickyUrlRef.current;

  useEffect(() => {
    if (snapshotLoaded && !imageUrl) {
      stickyUrlRef.current = '';
    }
  }, [snapshotLoaded, imageUrl]);

  // Reset failure state when URL changes (e.g. admin re-bakes)
  useEffect(() => {
    if (imageUrl && imageUrl !== prevUrl.current) {
      setLoadFailed(false);
    }
    prevUrl.current = imageUrl;
  }, [imageUrl]);

  // Log once when we know the final scenery source
  useEffect(() => {
    if (!snapshotLoaded) return;
    if (!imageUrl) {
      console.log('[Scenery] No baked URL from server — will use procedural');
    } else if (loadFailed) {
      console.log('[Scenery] Baked image failed to load — using procedural fallback');
    }
  }, [snapshotLoaded, imageUrl, loadFailed]);

  const handleError = useCallback(() => {
    setLoadFailed(true);
  }, []);

  const handleLoad = useCallback(() => {
    if (__DEV__) console.log('[Scenery] Baked image loaded:', displayUrl);
    // onLoad fires when decoded, not when painted. Defer until compositor has painted.
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          onReady?.();
        });
      });
    });
  }, [onReady, displayUrl]);

  // Snapshot confirmed empty bake — procedural only.
  if (snapshotLoaded && !imageUrl) {
    return (
      <SceneryLayer
        farmCols={farmCols}
        farmRows={farmRows}
        worldCols={worldCols}
        worldRows={worldRows}
        itemDefs={itemDefs}
        onReady={onReady}
      />
    );
  }

  // Current URL failed — procedural fallback (keep sticky for next URL).
  if (snapshotLoaded && imageUrl && loadFailed) {
    return (
      <SceneryLayer
        farmCols={farmCols}
        farmRows={farmRows}
        worldCols={worldCols}
        worldRows={worldRows}
        itemDefs={itemDefs}
        onReady={onReady}
      />
    );
  }

  // No URL yet (cold start before snapshot) — render nothing under the load overlay.
  if (!displayUrl) {
    return null;
  }

  const width = worldCols * TILE_SIZE;
  const height = worldRows * TILE_SIZE;

  return (
    <View style={[styles.container, { width, height }]} pointerEvents="none">
      <CachedImage
        key={displayUrl}
        source={{ uri: displayUrl }}
        style={StyleSheet.absoluteFill}
        resizeMode="contain"
        onLoad={handleLoad}
        onError={handleError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
