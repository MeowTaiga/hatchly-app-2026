/**
 * Global crop tick — single Date.now() source, updates every 1 second.
 * All crop timers (CropTimerRing, CropVisual, CropInfoDrawer) derive from this.
 * Avoids per-frame/per-render Date.now() calls that cause lag.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

const CropTickContext = createContext<number>(Date.now());

export function CropTickProvider({ children }: { children: React.ReactNode }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <CropTickContext.Provider value={now}>
      {children}
    </CropTickContext.Provider>
  );
}

export function useCropTick(): number {
  return useContext(CropTickContext);
}

/** Derive progress (0–1) and fullyGrown from plantedAt/growthMs using the shared tick. */
export function useCropProgress(plantedAt: number | undefined, growthMs: number | undefined, watered: boolean): { progress: number; fullyGrown: boolean; remainingMs: number } {
  const now = useCropTick();
  if (!plantedAt || !growthMs || !watered) {
    return { progress: 0, fullyGrown: false, remainingMs: growthMs ?? 0 };
  }
  const elapsed = now - plantedAt;
  const progress = Math.min(1, elapsed / growthMs);
  const remainingMs = Math.max(0, growthMs - elapsed);
  const fullyGrown = progress >= 1;
  return { progress, fullyGrown, remainingMs };
}
