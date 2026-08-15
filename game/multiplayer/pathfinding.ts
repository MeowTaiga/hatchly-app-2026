import { TILE_SIZE } from '../constants';
import type { WalkableRect } from './types';

/** Ms per tile for multiplayer pet walk — snappier than single-player AI. */
export const PET_WALK_MS_PER_TILE = 340;

// [dc, dr, cost] - cardinal cost 1, diagonal cost sqrt(2)
const NEIGHBORS: ReadonlyArray<[number, number, number]> = [
  [0, -1, 1], [1, 0, 1], [0, 1, 1], [-1, 0, 1],
  [-1, -1, Math.SQRT2], [1, -1, Math.SQRT2], [1, 1, Math.SQRT2], [-1, 1, Math.SQRT2],
];

function isWalkable(
  col: number,
  row: number,
  rect: WalkableRect | null,
  unwalkableSet: Set<string>,
  worldCols: number,
  worldRows: number,
): boolean {
  if (col < 0 || row < 0 || col >= worldCols || row >= worldRows) return false;
  if (unwalkableSet.has(`${col},${row}`)) return false;
  if (rect) {
    const colMin = Math.floor(rect.x / TILE_SIZE);
    const rowMin = Math.floor(rect.y / TILE_SIZE);
    const colMax = Math.ceil((rect.x + rect.w) / TILE_SIZE) - 1;
    const rowMax = Math.ceil((rect.y + rect.h) / TILE_SIZE) - 1;
    if (col < colMin || row < rowMin || col > colMax || row > rowMax) return false;
  }
  return true;
}

/** Get all tiles the line from (col1,row1) to (col2,row2) passes through. */
function getTilesOnLine(
  col1: number,
  row1: number,
  col2: number,
  row2: number,
): Array<{ col: number; row: number }> {
  const tiles: Array<{ col: number; row: number }> = [];
  const dx = col2 - col1;
  const dy = row2 - row1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  let lastCol = -999;
  let lastRow = -999;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const col = Math.round(col1 + dx * t);
    const row = Math.round(row1 + dy * t);
    if (col !== lastCol || row !== lastRow) {
      tiles.push({ col, row });
      lastCol = col;
      lastRow = row;
    }
  }
  return tiles;
}

/** Check if we can walk in a straight line from (col1,row1) to (col2,row2). */
function hasLineOfSight(
  col1: number,
  row1: number,
  col2: number,
  row2: number,
  rect: WalkableRect | null,
  unwalkableSet: Set<string>,
  worldCols: number,
  worldRows: number,
): boolean {
  const tiles = getTilesOnLine(col1, row1, col2, row2);
  for (const { col, row } of tiles) {
    if (!isWalkable(col, row, rect, unwalkableSet, worldCols, worldRows)) return false;
  }
  return true;
}

/** Check line of sight from pixel (x1,y1) to pixel (x2,y2). */
function hasLineOfSightPixels(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rect: WalkableRect | null,
  unwalkableSet: Set<string>,
  worldCols: number,
  worldRows: number,
): boolean {
  const steps = Math.max(1, Math.ceil(Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) / (TILE_SIZE / 2)));
  const seen = new Set<string>();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    const key = `${col},${row}`;
    if (!seen.has(key)) {
      seen.add(key);
      if (!isWalkable(col, row, rect, unwalkableSet, worldCols, worldRows)) return false;
    }
  }
  return true;
}

/**
 * String-pulling: remove intermediate waypoints when we can walk in a straight line.
 * Prefers long straight segments over grid-aligned zigzags.
 */
function smoothPath(
  path: Array<{ col: number; row: number }>,
  rect: WalkableRect | null,
  unwalkableSet: Set<string>,
  worldCols: number,
  worldRows: number,
): Array<{ col: number; row: number }> {
  if (path.length <= 2) return path;
  const smoothed: Array<{ col: number; row: number }> = [path[0]];
  let current = 0;
  while (current < path.length - 1) {
    let furthest = current + 1;
    for (let i = current + 2; i < path.length; i++) {
      const a = path[current];
      const b = path[i];
      if (hasLineOfSight(a.col, a.row, b.col, b.row, rect, unwalkableSet, worldCols, worldRows)) {
        furthest = i;
      }
    }
    smoothed.push(path[furthest]);
    current = furthest;
  }
  return smoothed;
}

/**
 * A* pathfinding. Returns path from (startCol,startRow) to (endCol,endRow) as array of {col,row}.
 * Uses 8-connected grid. Tie-breaker: prefers nodes closer to goal (straight-line bias).
 */
export function findPath(
  startCol: number,
  startRow: number,
  endCol: number,
  endRow: number,
  rect: WalkableRect | null,
  unwalkableSet: Set<string>,
  worldCols: number,
  worldRows: number,
): Array<{ col: number; row: number }> | null {
  if (!isWalkable(endCol, endRow, rect, unwalkableSet, worldCols, worldRows)) return null;
  if (!isWalkable(startCol, startRow, rect, unwalkableSet, worldCols, worldRows)) return null;
  if (startCol === endCol && startRow === endRow) return [{ col: startCol, row: startRow }];

  const key = (c: number, r: number) => `${c},${r}`;
  const open = new Map<string, { col: number; row: number; g: number; f: number; h: number }>();
  const cameFrom = new Map<string, { col: number; row: number }>();
  const gScore = new Map<string, number>();
  gScore.set(key(startCol, startRow), 0);
  const h = (c: number, r: number) => Math.sqrt((c - endCol) ** 2 + (r - endRow) ** 2);
  open.set(key(startCol, startRow), {
    col: startCol,
    row: startRow,
    g: 0,
    f: h(startCol, startRow),
    h: h(startCol, startRow),
  });

  while (open.size > 0) {
    let best: { col: number; row: number; g: number; f: number; h: number } | null = null;
    let bestKey = '';
    for (const [k, v] of open) {
      if (!best || v.f < best.f || (v.f === best.f && v.h < best.h)) {
        best = v;
        bestKey = k;
      }
    }
    if (!best) break;
    open.delete(bestKey);
    const { col: c, row: r, g } = best;

    if (c === endCol && r === endRow) {
      const path: Array<{ col: number; row: number }> = [];
      let cur: { col: number; row: number } | undefined = { col: c, row: r };
      while (cur) {
        path.unshift(cur);
        cur = cameFrom.get(key(cur.col, cur.row));
      }
      return smoothPath(path, rect, unwalkableSet, worldCols, worldRows);
    }

    for (const [dc, dr, cost] of NEIGHBORS) {
      const nc = c + dc;
      const nr = r + dr;
      if (!isWalkable(nc, nr, rect, unwalkableSet, worldCols, worldRows)) continue;
      const nk = key(nc, nr);
      const ng = g + cost;
      const nh = h(nc, nr);
      const nf = ng + nh;
      const existing = gScore.get(nk);
      if (existing != null && ng >= existing) continue;
      gScore.set(nk, ng);
      cameFrom.set(nk, { col: c, row: r });
      open.set(nk, { col: nc, row: nr, g: ng, f: nf, h: nh });
    }
  }
  return null;
}

/** Convert tile path to pixel waypoints. Optionally start from exact (startX,startY) and skip first tile center when we have direct line of sight. */
export function pathToWaypoints(
  path: Array<{ col: number; row: number }>,
  msPerTile: number = PET_WALK_MS_PER_TILE,
  options?: {
    startX?: number;
    startY?: number;
    rect?: WalkableRect | null;
    unwalkableSet?: Set<string>;
    worldCols?: number;
    worldRows?: number;
  },
): Array<{ x: number; y: number; durationMs: number }> {
  const tileWaypoints = path.map(({ col, row }) => ({ x: (col + 0.5) * TILE_SIZE, y: (row + 0.5) * TILE_SIZE }));
  let waypoints: Array<{ x: number; y: number }>;

  if (options?.startX != null && options?.startY != null && options.rect != null && options.unwalkableSet && options.worldCols != null && options.worldRows != null) {
    const start = { x: options.startX, y: options.startY };
    waypoints = [start];
    let current = 0;
    const MAX_ANGLE_DEVIATION = Math.PI / 4; // 45 degrees
    while (current < tileWaypoints.length) {
      let furthest = current;
      const from = waypoints[waypoints.length - 1];
      const isFirstHop = current === 0 && waypoints.length === 1;

      if (isFirstHop && tileWaypoints.length > 1) {
        const dest = tileWaypoints[tileWaypoints.length - 1];
        const directAngle = Math.atan2(dest.y - start.y, dest.x - start.x);
        for (let i = current + 1; i < tileWaypoints.length; i++) {
          const to = tileWaypoints[i];
          if (!hasLineOfSightPixels(from.x, from.y, to.x, to.y, options.rect, options.unwalkableSet, options.worldCols, options.worldRows)) continue;
          const angle = Math.atan2(to.y - from.y, to.x - from.x);
          let angleDiff = Math.abs(angle - directAngle);
          if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
          if (angleDiff <= MAX_ANGLE_DEVIATION && i > furthest) furthest = i;
        }
        if (furthest === current) {
          for (let i = current + 1; i < tileWaypoints.length; i++) {
            const to = tileWaypoints[i];
            if (hasLineOfSightPixels(from.x, from.y, to.x, to.y, options.rect, options.unwalkableSet, options.worldCols, options.worldRows)) furthest = i;
          }
        }
      } else {
        for (let i = current + 1; i < tileWaypoints.length; i++) {
          const to = tileWaypoints[i];
          if (hasLineOfSightPixels(from.x, from.y, to.x, to.y, options.rect, options.unwalkableSet, options.worldCols, options.worldRows)) furthest = i;
        }
      }
      if (furthest === current) break;
      waypoints.push(tileWaypoints[furthest]);
      current = furthest;
    }
  } else {
    waypoints = tileWaypoints;
  }

  const result: Array<{ x: number; y: number; durationMs: number }> = [];
  for (let i = 0; i < waypoints.length; i++) {
    const { x, y } = waypoints[i];
    const distPx = i === 0 ? 0 : Math.sqrt((waypoints[i].x - waypoints[i - 1].x) ** 2 + (waypoints[i].y - waypoints[i - 1].y) ** 2);
    const cost = distPx / TILE_SIZE;
    result.push({ x, y, durationMs: cost * msPerTile });
  }
  return result;
}
