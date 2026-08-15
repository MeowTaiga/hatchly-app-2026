/**
 * Sprite-rect tap picking for placed items and scene placements.
 *
 * Bounding boxes are only a first filter. The winner is the item whose
 * inner ellipse actually covers the finger, so transparent PNG corners
 * (trees, NPCs, buildings) no longer steal taps.
 *
 * Do not decode sprite PNGs here — UPNG on the JS thread hitchs taps and
 * starves inventory-drag callbacks.
 */

import { TILE_SIZE } from './constants';
import { getItemsAt, resolveAnchor } from './gridHelpers';
import { placementRect } from './placementRect';
import type { GridData, ItemDefinition, PlacedItem, ScenePlacement } from './types';
import { applyCategoryDepth } from './world/depth';

/** Matches PlacedItemView — keep in sync. */
const BUILDING_ASPECT_RATIO = 1.35;
const CENTER_OVERFLOW_SCALE = 1.25;
const CROP_OVERFLOW_SCALE = 1.35;
const SEED_SCALE = 0.55;
/** Inner ellipse as a fraction of the sprite box. Tight enough that empty
 *  corners fall through, loose enough that the body is still easy to tap. */
const HIT_ELLIPSE_RATIO = 0.8;
/** Finger kernel in world pixels (~1/3 tile). */
const KERNEL_RADIUS = 10;
const KERNEL_STEPS = 2;

export interface SpriteHitRect {
  left: number;
  top: number;
  width: number;
  height: number;
  imageUrl?: string;
  fit: 'contain' | 'cover';
}

function footprintRect(item: PlacedItem): { left: number; top: number; width: number; height: number } {
  const cols = item.tileCols || 1;
  const rows = item.tileRows || 1;
  return {
    left: item.col * TILE_SIZE,
    top: item.row * TILE_SIZE,
    width: cols * TILE_SIZE,
    height: rows * TILE_SIZE,
  };
}

/** Visual image box in farm-local pixels, matching PlacedItemView. */
export function itemSpriteRect(
  item: PlacedItem,
  def: ItemDefinition | undefined,
): SpriteHitRect {
  const foot = footprintRect(item);
  const imageUrl = item.imageUrl || def?.imageUrl;
  const isBuilding = def?.category === 'building';
  const isFlat = def?.category === 'flooring' || def?.category === 'tiled_flooring' || def?.category === 'soil';
  const isFullyGrownTree = def?.category === 'tree' && item.itemType.startsWith('tree_fully_grown_');
  const isCrop = !!item.growthMs;
  const fullyGrownCrop =
    isCrop &&
    !!item.plantedAt &&
    !!item.watered &&
    Date.now() - (item.plantedAt ?? 0) >= (item.growthMs ?? 0);

  if (isFullyGrownTree) {
    const imgSize = TILE_SIZE * 4;
    return {
      left: foot.left + (foot.width - imgSize) / 2,
      top: foot.top + foot.height - imgSize,
      width: imgSize,
      height: imgSize,
      imageUrl,
      fit: 'contain',
    };
  }

  if (isCrop && imageUrl) {
    if (fullyGrownCrop) {
      const w = foot.width * CROP_OVERFLOW_SCALE;
      const h = foot.height * CROP_OVERFLOW_SCALE;
      return {
        left: foot.left + (foot.width - w) / 2,
        top: foot.top + foot.height / 2 - h,
        width: w,
        height: h,
        imageUrl,
        fit: 'contain',
      };
    }
    const w = TILE_SIZE * SEED_SCALE;
    const h = TILE_SIZE * SEED_SCALE;
    return {
      left: foot.left + (foot.width - w) / 2,
      top: foot.top + (foot.height - h) / 2,
      width: w,
      height: h,
      imageUrl,
      fit: 'contain',
    };
  }

  if (isBuilding) {
    const pxW = foot.width;
    const pxH = pxW * BUILDING_ASPECT_RATIO;
    return {
      left: foot.left,
      top: foot.top + foot.height - pxH,
      width: pxW,
      height: pxH,
      imageUrl,
      fit: 'contain',
    };
  }

  if (def?.centerOverflow) {
    const h = Math.max(foot.height * CENTER_OVERFLOW_SCALE, foot.width * 0.6);
    return {
      left: foot.left,
      top: foot.top + foot.height - h,
      width: foot.width,
      height: h,
      imageUrl,
      fit: 'contain',
    };
  }

  return {
    left: foot.left,
    top: foot.top,
    width: foot.width,
    height: foot.height,
    imageUrl,
    fit: isFlat ? 'cover' : 'contain',
  };
}

function pointInRect(x: number, y: number, r: SpriteHitRect, pad = 0): boolean {
  return x >= r.left - pad && x <= r.left + r.width + pad && y >= r.top - pad && y <= r.top + r.height + pad;
}

function sampleSprite(
  x: number,
  y: number,
  rect: SpriteHitRect,
): number {
  if (rect.width <= 0 || rect.height <= 0) return 0;
  const u = (x - rect.left) / rect.width;
  const v = (y - rect.top) / rect.height;
  if (u < 0 || u > 1 || v < 0 || v > 1) return 0;
  const nx = (u - 0.5) / (HIT_ELLIPSE_RATIO / 2);
  const ny = (v - 0.5) / (HIT_ELLIPSE_RATIO / 2);
  return nx * nx + ny * ny <= 1 ? 1 : 0;
}

function itemDepth(item: PlacedItem, def: ItemDefinition | undefined): number {
  return applyCategoryDepth(item.row + item.tileRows, def);
}

interface HitScore {
  item: PlacedItem;
  depth: number;
  center: number;
  kernel: number;
}

function nearbyAnchors(
  grid: GridData,
  localX: number,
  localY: number,
): PlacedItem[] {
  const tapCol = Math.floor(localX / TILE_SIZE);
  const tapRow = Math.floor(localY / TILE_SIZE);
  const seen = new Set<string>();
  const out: PlacedItem[] = [];
  // Trees/buildings overflow several tiles above the footprint.
  for (let dr = -5; dr <= 2; dr++) {
    for (let dc = -3; dc <= 3; dc++) {
      const col = tapCol + dc;
      const row = tapRow + dr;
      if (col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) continue;
      for (const item of getItemsAt(grid, col, row)) {
        const anchor = item.anchorId ? resolveAnchor(grid, item) ?? item : item;
        if (seen.has(anchor.id)) continue;
        seen.add(anchor.id);
        out.push(anchor);
      }
    }
  }
  return out;
}

/**
 * Pick the placed item whose pixels actually cover the farm-local point.
 * Returns null when the tap lands on empty / transparent space.
 */
export function pickOpaqueItemAt(
  grid: GridData,
  itemDefs: Record<string, ItemDefinition>,
  localX: number,
  localY: number,
): PlacedItem | null {
  const scores: HitScore[] = [];
  for (const item of nearbyAnchors(grid, localX, localY)) {
    const def = itemDefs[item.itemType];
    const rect = itemSpriteRect(item, def);
    if (!pointInRect(localX, localY, rect, KERNEL_RADIUS)) continue;
    const center = sampleSprite(localX, localY, rect);
    let kernel = 0;
    let samples = 0;
    for (let dy = -KERNEL_STEPS; dy <= KERNEL_STEPS; dy++) {
      for (let dx = -KERNEL_STEPS; dx <= KERNEL_STEPS; dx++) {
        const sx = localX + dx * (KERNEL_RADIUS / KERNEL_STEPS);
        const sy = localY + dy * (KERNEL_RADIUS / KERNEL_STEPS);
        samples += 1;
        kernel += sampleSprite(sx, sy, rect);
      }
    }
    if (center <= 0 && kernel <= 0) continue;
    scores.push({
      item,
      depth: itemDepth(item, def),
      center,
      kernel: kernel / Math.max(1, samples),
    });
  }
  if (!scores.length) return null;

  const centerHits = scores.filter((s) => s.center > 0);
  const pool = centerHits.length ? centerHits : scores;
  pool.sort((a, b) => {
    if (centerHits.length) return b.depth - a.depth;
    if (b.kernel !== a.kernel) return b.kernel - a.kernel;
    return b.depth - a.depth;
  });
  return pool[0]?.item ?? null;
}

export function pickOpaquePlacementAt(
  placements: ScenePlacement[],
  itemDefs: Record<string, ItemDefinition>,
  worldX: number,
  worldY: number,
): ScenePlacement | null {
  let best: { p: ScenePlacement; depth: number; center: number; kernel: number } | null = null;
  for (const p of placements) {
    const def = itemDefs[p.itemType];
    const box = placementRect(p, def);
    const rect: SpriteHitRect = {
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
      imageUrl: def?.imageUrl,
      fit: 'contain',
    };
    if (!pointInRect(worldX, worldY, rect, KERNEL_RADIUS)) continue;
    const center = sampleSprite(worldX, worldY, rect);
    let kernel = 0;
    let samples = 0;
    for (let dy = -KERNEL_STEPS; dy <= KERNEL_STEPS; dy++) {
      for (let dx = -KERNEL_STEPS; dx <= KERNEL_STEPS; dx++) {
        samples += 1;
        kernel += sampleSprite(
          worldX + dx * (KERNEL_RADIUS / KERNEL_STEPS),
          worldY + dy * (KERNEL_RADIUS / KERNEL_STEPS),
          rect,
        );
      }
    }
    if (center <= 0 && kernel <= 0) continue;
    const depth = applyCategoryDepth(
      (p.y + (def?.rows ?? 1) * TILE_SIZE) / TILE_SIZE + (p.depthOffset ?? 0),
      def,
    );
    const next = { p, depth, center, kernel: kernel / Math.max(1, samples) };
    if (!best) {
      best = next;
      continue;
    }
    const bestCenter = best.center > 0;
    const nextCenter = next.center > 0;
    if (nextCenter !== bestCenter) {
      if (nextCenter) best = next;
      continue;
    }
    if (nextCenter) {
      if (next.depth > best.depth) best = next;
    } else if (next.kernel > best.kernel || (next.kernel === best.kernel && next.depth > best.depth)) {
      best = next;
    }
  }
  return best?.p ?? null;
}
