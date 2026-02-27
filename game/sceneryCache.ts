import { File, Paths } from 'expo-file-system';
import { SCENERY_CACHE_VERSION } from './constants';

export interface CachedSceneryPlacement {
  itemType: string;
  worldCol: number;
  worldRow: number;
  cols: number;
  rows: number;
  /** Visual scale; omit = 1. */
  scale?: number;
  /** Extra z-index boost so bushes render above small decorations but below trees. */
  zBoost?: number;
}

function cacheFileName(farmCols: number, farmRows: number, worldCols: number, worldRows: number): string {
  return `scenery_${farmCols}_${farmRows}_${worldCols}_${worldRows}_v${SCENERY_CACHE_VERSION}.json`;
}

/** Use document directory — persists across app restarts; cache dir can be wiped by the OS. */
const SCENERY_STORAGE_DIR = Paths.document;

/**
 * Load persisted scenery placements from device storage. Returns null on miss or error.
 */
export async function getCachedPlacements(
  farmCols: number,
  farmRows: number,
  worldCols: number,
  worldRows: number,
): Promise<CachedSceneryPlacement[] | null> {
  try {
    const file = new File(SCENERY_STORAGE_DIR, cacheFileName(farmCols, farmRows, worldCols, worldRows));
    if (!file.exists) return null;
    const text = await file.text();
    const data = JSON.parse(text) as CachedSceneryPlacement[];
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

/**
 * Persist scenery placements to device cache (fire-and-forget).
 */
export async function setCachedPlacements(
  farmCols: number,
  farmRows: number,
  worldCols: number,
  worldRows: number,
  placements: CachedSceneryPlacement[],
): Promise<void> {
  try {
    const file = new File(SCENERY_STORAGE_DIR, cacheFileName(farmCols, farmRows, worldCols, worldRows));
    file.create({ idempotent: true });
    file.write(JSON.stringify(placements));
  } catch {
    // Non-fatal; next load will regenerate
  }
}
