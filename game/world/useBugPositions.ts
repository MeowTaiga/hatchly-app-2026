import { useCallback, useEffect, useRef, useState } from 'react';

import type { ActiveBug } from '../types';

interface TileCoord {
  col: number;
  row: number;
}

export interface BugPositions {
  /** Depth-sorting input: bugs pass behind items that are in front of them. */
  positions: Record<string, TileCoord>;
  /** Same data without the render latency, for hit-testing taps. */
  ref: React.RefObject<Map<string, TileCoord>>;
  onPositionChange: (spawnId: string, col: number, row: number) => void;
}

/**
 * Mirrors each bug's animated position into React state.
 *
 * The ref is what taps test against — it's updated synchronously, so catching a
 * bug doesn't depend on a render having landed first.
 */
export function useBugPositions(activeBugs: ActiveBug[]): BugPositions {
  const ref = useRef<Map<string, TileCoord>>(new Map());
  const [positions, setPositions] = useState<Record<string, TileCoord>>({});

  const onPositionChange = useCallback((spawnId: string, col: number, row: number) => {
    ref.current.set(spawnId, { col, row });
    // Only the row affects paint order, so horizontal movement doesn't need to
    // reach React at all — re-rendering the world for it stutters the camera.
    setPositions((prev) => (prev[spawnId]?.row === row ? prev : { ...prev, [spawnId]: { col, row } }));
  }, []);

  useEffect(() => {
    const live = new Set(activeBugs.map((b) => b.spawnId));
    for (const key of ref.current.keys()) {
      if (!live.has(key)) ref.current.delete(key);
    }
    setPositions((prev) => {
      const stale = Object.keys(prev).filter((key) => !live.has(key));
      if (!stale.length) return prev;
      const next = { ...prev };
      for (const key of stale) delete next[key];
      return next;
    });
  }, [activeBugs]);

  return { positions, ref, onPositionChange };
}
