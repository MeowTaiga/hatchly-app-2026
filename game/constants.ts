import type { FarmLevelDef, FenceVariant } from './types';

// ─── Tile Dimensions ────────────────────────────────────────────────────────

export const TILE_SIZE = 48;

// ─── Zoom Bounds ────────────────────────────────────────────────────────────

export const MIN_ZOOM = 0.75;
export const MAX_ZOOM = 1;
export const DEFAULT_ZOOM = 0.75;

// ─── Grid Defaults (used before server snapshot arrives) ────────────────────

export const DEFAULT_FARM_COLS = 16;
export const DEFAULT_FARM_ROWS = 24;
export const DEFAULT_HOUSE_COLS = 16;
export const DEFAULT_HOUSE_ROWS = 16;

// ─── Virtualisation Buffer ──────────────────────────────────────────────────

export const TILE_BUFFER = 3;

// ─── Bugs (match server BugService) ───────────────────────────────────────────

/** Bug lifespan before despawn. Client refuses catch in last 500ms to prevent race. */
export const BUG_LIFESPAN_MS = 60_000;
export const BUG_CATCH_BUFFER_MS = 500;

// ─── Pet AI ─────────────────────────────────────────────────────────────────

export const PET_IDLE_MIN_MS = 2000;
export const PET_IDLE_MAX_MS = 5000;
export const PET_WANDER_RADIUS = 5;
/** Ms per tile for walk — slower = more natural, animal-like pace. */
export const PET_WALK_SPEED_MS = 580;
/** Pet turns to face movement direction before walking. */
export const PET_TURN_DURATION_MS = 140;
export const PET_START_COL = 8;
export const PET_START_ROW = 12;

// ─── World Padding (tiles of scenery border around the farm grid) ────────────

export const WORLD_PADDING = 12;

// ─── Scenery (trees + cache) ─────────────────────────────────────────────────

/** Tree footprint in tiles (larger than before for more presence). */
export const SCENERY_TREE_COLS = 4;
export const SCENERY_TREE_ROWS = 5;
/** Per-tree visual scale range for size variation (applied as transform, footprint unchanged). Old max (1.35) is now min; max is 2.5× that. */
export const SCENERY_TREE_SCALE_MIN = 1.35;
export const SCENERY_TREE_SCALE_MAX = 1.35 * 2.5;
/** Bump to invalidate persisted placement cache when generation logic changes. */
export const SCENERY_CACHE_VERSION = 10;


// ─── Fence Auto-Connect Bitmask → Variant + Rotation ────────────────────────
// Bits: N=1, E=2, S=4, W=8.  16 possible states mapped to 6 base shapes.

export const FENCE_VARIANT_MAP: { variant: FenceVariant; rotation: number }[] = [
  /* 0  none */ { variant: 'post',      rotation: 0 },
  /* 1  N    */ { variant: 'end',       rotation: 0 },
  /* 2  E    */ { variant: 'end',       rotation: 0 },
  /* 3  NE   */ { variant: 'corner',    rotation: -90 },
  /* 4  S    */ { variant: 'end',       rotation: 0 },
  /* 5  NS   */ { variant: 'straight',  rotation: 90 },
  /* 6  ES   */ { variant: 'corner',    rotation: 0 },
  /* 7  NES  */ { variant: 'tJunction', rotation: 0 },
  /* 8  W    */ { variant: 'end',       rotation: 270 },
  /* 9  NW   */ { variant: 'corner',    rotation: 180 },
  /* 10 EW   */ { variant: 'straight',  rotation: 0 },
  /* 11 NEW  */ { variant: 'tJunction', rotation: 270 },
  /* 12 SW   */ { variant: 'corner',    rotation: 90 },
  /* 13 NSW  */ { variant: 'tJunction', rotation: 180 },
  /* 14 ESW  */ { variant: 'tJunction', rotation: 90 },
  /* 15 NESW */ { variant: 'cross',     rotation: 0 },
];

// ─── Colours ────────────────────────────────────────────────────────────────

export const FARM_GRASS_COLOR = '#7EC87E';
export const FARM_GRASS_ALT_COLOR = '#6EBB6E';
export const HOUSE_FLOOR_COLOR = '#F0DFC8';
export const HOUSE_FLOOR_ALT_COLOR = '#E8D4B8';

// ─── Farm Level Helpers (work with server-provided levels) ──────────────────

/** Resolves the current farm level definition from cumulative XP. */
export function getFarmLevel(levels: readonly FarmLevelDef[], xp: number): FarmLevelDef {
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].xpRequired) return levels[i];
  }
  return levels[0];
}

/** Returns XP progress toward the next level as 0-1, plus the next level def. */
export function getFarmProgress(
  levels: readonly FarmLevelDef[],
  xp: number,
): { current: FarmLevelDef; next: FarmLevelDef | null; progress: number } {
  const current = getFarmLevel(levels, xp);
  const idx = levels.findIndex((l) => l.level === current.level);
  if (idx >= levels.length - 1) return { current, next: null, progress: 1 };
  const next = levels[idx + 1];
  const range = next.xpRequired - current.xpRequired;
  const earned = xp - current.xpRequired;
  return { current, next, progress: range > 0 ? earned / range : 1 };
}
