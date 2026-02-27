import { useState, useEffect } from 'react';

/**
 * Lightweight 1-second tick. Only components that need per-second updates
 * (e.g. countdown text) should call this. Keeps re-renders scoped to the
 * calling component instead of cascading through the entire game context.
 */
export function useGameTick(): number {
  const [tick, setTick] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setTick(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return tick;
}
