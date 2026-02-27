import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
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
 * Before the snapshot arrives, imageUrl is '' and snapshotLoaded is false —
 * renders nothing so we don't eagerly mount the heavy procedural layer.
 */
export function BakedSceneryLayer({
  farmCols, farmRows, worldCols, worldRows, itemDefs, onReady, imageUrl,
  snapshotLoaded,
}: BakedSceneryLayerProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  const prevUrl = useRef(imageUrl);

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
    console.log('[Scenery] Baked image loaded:', imageUrl);
    onReady?.();
  }, [onReady, imageUrl]);

  if (!snapshotLoaded) {
    return null;
  }

  if (!imageUrl || loadFailed) {
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

  const width = worldCols * TILE_SIZE;
  const height = worldRows * TILE_SIZE;

  return (
    <View style={[styles.container, { width, height }]} pointerEvents="none">
      <Image
        source={{ uri: imageUrl }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="disk"
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
