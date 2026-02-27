import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { TILE_SIZE, WORLD_PADDING } from './constants';
import {
  SCENERY_TREE_COLS,
  SCENERY_TREE_ROWS,
  SCENERY_TREE_SCALE_MIN,
  SCENERY_TREE_SCALE_MAX,
} from './constants';
import { getCachedPlacements, setCachedPlacements, type CachedSceneryPlacement } from './sceneryCache';
import type { ItemDefinition } from './types';

interface SceneryLayerProps {
  farmCols: number;
  farmRows: number;
  worldCols: number;
  worldRows: number;
  itemDefs: Record<string, ItemDefinition>;
  onReady?: () => void;
}

/** Placement shape used in memory and cache; scale is optional (trees only). */
type SceneryPlacement = CachedSceneryPlacement;

/** Deterministic PRNG (mulberry32) — same seed → same sequence every time. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateSceneryPlacements(
  farmCols: number, farmRows: number, worldCols: number, worldRows: number,
  outerBushOccupied?: Set<string>,
): SceneryPlacement[] {
  const rng = mulberry32(farmCols * 1000 + farmRows);
  const placements: SceneryPlacement[] = [];
  const occupied = new Set<string>(outerBushOccupied ?? []);

  const isInFarm = (col: number, row: number, w: number, h: number) => {
    const fL = WORLD_PADDING, fT = WORLD_PADDING;
    const fR = WORLD_PADDING + farmCols, fB = WORLD_PADDING + farmRows;
    for (let dr = 0; dr < h; dr++)
      for (let dc = 0; dc < w; dc++) {
        const c = col + dc, r = row + dr;
        if (c >= fL - 1 && c <= fR && r >= fT - 1 && r <= fB) return true;
      }
    return false;
  };

  const fL = WORLD_PADDING, fT = WORLD_PADDING;
  const fR = WORLD_PADDING + farmCols, fB = WORLD_PADDING + farmRows;
  const TREE_PULL_IN = 8;
  const treeInLeftTopZone = (col: number, row: number) => {
    if (col + treeW <= fL && col < fL - TREE_PULL_IN) return true;
    if (row + treeH <= fT && row < fT - TREE_PULL_IN) return true;
    return false;
  };

  const treeTypes = ['scenery_tree_oak', 'scenery_tree_pine', 'scenery_tree_birch'];
  const treeW = SCENERY_TREE_COLS;
  const treeH = SCENERY_TREE_ROWS;
  const treeScaleRange = SCENERY_TREE_SCALE_MAX - SCENERY_TREE_SCALE_MIN;
  const inBounds = (col: number, row: number, w: number, h: number) =>
    col >= 0 && row >= 0 && col + w <= worldCols && row + h <= worldRows;

  const markOccupied = (col: number, row: number, w: number, h: number) => {
    for (let dr = 0; dr < h; dr++)
      for (let dc = 0; dc < w; dc++) occupied.add(`${col + dc},${row + dr}`);
  };

  const treeOrigins = new Set<string>();
  const TREE_ATTEMPTS = 450;
  for (let i = 0; i < TREE_ATTEMPTS; i++) {
    const col = Math.floor(rng() * worldCols);
    const row = Math.floor(rng() * worldRows);
    if (isInFarm(col, row, treeW, treeH) || !inBounds(col, row, treeW, treeH)) continue;
    if (treeInLeftTopZone(col, row)) continue;
    const originKey = `${col},${row}`;
    if (treeOrigins.has(originKey)) continue;
    treeOrigins.add(originKey);
    const scale = SCENERY_TREE_SCALE_MIN + rng() * treeScaleRange;
    placements.push({ itemType: treeTypes[Math.floor(rng() * treeTypes.length)], worldCol: col, worldRow: row, cols: treeW, rows: treeH, scale, zBoost: 1000 });
    markOccupied(col, row, treeW, treeH);
  }

  return placements;
}

/** Outer wall of bushes (replaces fence); large, overlapping, no gaps. Dedupes corners. */
function generateOuterBushPlacements(farmCols: number, farmRows: number, worldCols: number, worldRows: number): { placements: SceneryPlacement[]; occupied: Set<string> } {
  const rng = mulberry32(farmCols * 2000 + farmRows);
  const bushes: SceneryPlacement[] = [];
  const occupied = new Set<string>();
  const fL = WORLD_PADDING, fT = WORLD_PADDING;
  const fR = WORLD_PADDING + farmCols - 1, fB = WORLD_PADDING + farmRows - 1;
  const scaleMin = 1.7, scaleMax = 2.2;

  const addBush = (col: number, row: number) => {
    if (col < 0 || col >= worldCols || row < 0 || row >= worldRows) return;
    const key = `${col},${row}`;
    if (occupied.has(key)) return;
    occupied.add(key);
    const scale = scaleMin + rng() * (scaleMax - scaleMin);
    bushes.push({ itemType: 'scenery_bush_large', worldCol: col, worldRow: row, cols: 1, rows: 1, scale, zBoost: 500 });
  };

  for (let c = fL - 2; c <= fR + 2; c++) {
    addBush(c, fT - 1);
    addBush(c, fT - 2);
    addBush(c, fB + 1);
    addBush(c, fB + 2);
  }
  for (let r = fT - 1; r <= fB + 1; r++) {
    addBush(fL - 1, r);
    addBush(fL - 2, r);
    addBush(fR + 1, r);
    addBush(fR + 2, r);
  }
  return { placements: bushes, occupied };
}

/**
 * Resolved placement data used to build the cached rendered output.
 * Captures the imageUrl/emoji at resolve-time so itemDef changes
 * only cause a re-render when an image URL actually changes.
 */
interface ResolvedPlacement {
  key: string;
  left: number;
  top: number;
  width: number;
  height: number;
  zIndex: number;
  imageUrl?: string;
  emoji: string;
  fontSize: number;
}

export const SceneryLayer = React.memo(function SceneryLayer({
  farmCols, farmRows, worldCols, worldRows, itemDefs, onReady,
}: SceneryLayerProps) {
  // Generate placements synchronously (deterministic PRNG = same result for same seed)
  const generated = useMemo(() => {
    const { placements: outerBushPlacements, occupied: outerBushOccupied } = generateOuterBushPlacements(farmCols, farmRows, worldCols, worldRows);
    const sceneryPlacements = generateSceneryPlacements(farmCols, farmRows, worldCols, worldRows, outerBushOccupied);
    return [...outerBushPlacements, ...sceneryPlacements];
  }, [farmCols, farmRows, worldCols, worldRows]);

  // Wait for cache check before rendering anything — prevents double-render
  const [placements, setPlacements] = useState<SceneryPlacement[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCachedPlacements(farmCols, farmRows, worldCols, worldRows).then((loaded) => {
      if (cancelled) return;
      if (loaded?.length) {
        setPlacements(loaded);
      } else {
        setPlacements(generated);
        setCachedPlacements(farmCols, farmRows, worldCols, worldRows, generated);
      }
    });
    return () => { cancelled = true; };
  }, [farmCols, farmRows, worldCols, worldRows, generated]);

  const imageKey = useMemo(() => {
    if (!placements) return '';
    return placements.map((p) => itemDefs[p.itemType]?.imageUrl ?? '').join('|');
  }, [placements, itemDefs]);

  const resolved = useMemo<ResolvedPlacement[]>(() => {
    if (!placements) return [];
    return placements.map((p, i) => {
      const def = itemDefs[p.itemType];
      const s = p.scale ?? 1;
      const baseW = TILE_SIZE * p.cols;
      const baseH = TILE_SIZE * p.rows;
      const w = baseW * s;
      const h = baseH * s;
      const isTall = p.rows > 1;
      return {
        key: `s_${i}`,
        left: p.worldCol * TILE_SIZE + (baseW - w) / 2,
        top: isTall
          ? p.worldRow * TILE_SIZE + baseH - h
          : p.worldRow * TILE_SIZE + (baseH - h) / 2,
        width: w,
        height: h,
        zIndex: p.worldRow + p.rows - 1 + (p.zBoost ?? 0),
        imageUrl: def?.imageUrl,
        emoji: def?.emoji ?? '🌳',
        fontSize: TILE_SIZE * 0.6 * Math.max(p.cols, p.rows) * s,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageKey, placements]);

  // --- Image-load tracking via stable ref (no re-renders) ---
  const imageTotal = useMemo(() => resolved.filter((r) => r.imageUrl).length, [resolved]);
  const loadCountRef = useRef(0);
  const readyFiredRef = useRef(false);
  const onReadyRef = useRef(onReady);
  const imageTotalRef = useRef(imageTotal);
  onReadyRef.current = onReady;
  imageTotalRef.current = imageTotal;

  useEffect(() => {
    loadCountRef.current = 0;
    readyFiredRef.current = false;
  }, [resolved]);

  // Stable callback — never changes, so it never causes elements to re-render
  const handleImageLoad = useCallback(() => {
    loadCountRef.current += 1;
    if (readyFiredRef.current) return;
    if (loadCountRef.current < imageTotalRef.current) return;
    readyFiredRef.current = true;
    // All images decoded — but React Native still needs many frames to
    // layout and paint 1000+ absolutely-positioned views. Wait for the
    // interaction queue to drain, then give the compositor a generous
    // window to flush all pending native view creations.
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        requestAnimationFrame(() => {
          onReadyRef.current?.();
        });
      }, 2000);
    });
  }, []);

  const elements = useMemo(() => {
    return resolved.map((r) => (
      <View
        key={r.key}
        style={[styles.item, { left: r.left, top: r.top, width: r.width, height: r.height, zIndex: r.zIndex }]}
        pointerEvents="none"
      >
        {r.imageUrl ? (
          <Image
            source={{ uri: r.imageUrl }}
            style={styles.image}
            contentFit="contain"
            cachePolicy="disk"
            onLoad={handleImageLoad}
          />
        ) : (
          <Text style={[styles.emoji, { fontSize: r.fontSize }]}>{r.emoji}</Text>
        )}
      </View>
    ));
  }, [resolved, handleImageLoad]);

  if (!placements) return null;
  return <View style={styles.container} pointerEvents="none">{elements}</View>;
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  item: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  emoji: {
    textAlign: 'center',
  },
});
