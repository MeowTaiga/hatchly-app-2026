import { Platform, type FilterFunction, type ViewStyle } from 'react-native';
import { TILE_SIZE } from './constants';
import { applyCategoryDepth } from './world/depth';
import type { ItemDefinition, SceneBlendMode } from './types';

/** The fields of a scene placement that affect its on-screen box. */
interface Sized {
  x: number;
  y: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
}

interface Footprint {
  cols?: number;
  rows?: number;
  category?: string;
  subCategory?: string;
}

interface DepthSized {
  y: number;
  depthOffset?: number;
}

export interface PlacementRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Where a scene placement actually lands, in world pixels.
 *
 * A placement's stored x/y is the top-left of its *unscaled* footprint, so
 * scaling keeps the item centred horizontally and planted on the footprint's
 * bottom edge — otherwise scaling something up would make it float.
 *
 * The server bake uses the same math, so this is what hit-tests must agree
 * with: the baked PNG is all the player ever sees.
 */
export function placementRect(p: Sized, def: Footprint | undefined): PlacementRect {
  const baseW = (def?.cols ?? 1) * TILE_SIZE;
  const baseH = (def?.rows ?? 1) * TILE_SIZE;
  const scale = p.scale ?? 1;
  const width = baseW * (p.scaleX ?? scale);
  const height = baseH * (p.scaleY ?? scale);
  return {
    left: p.x + (baseW - width) / 2,
    top: p.y + (baseH - height),
    width,
    height,
  };
}

/**
 * Painter's-algorithm depth for a scene placement (footprint bottom + category).
 * Matches admin `computeDepth` / bake ordering.
 */
export function placementDepth(p: DepthSized, def: Footprint | undefined): number {
  const baseH = (def?.rows ?? 1) * TILE_SIZE;
  const baseDepth = (p.y + baseH) / TILE_SIZE;
  return applyCategoryDepth(baseDepth, def as ItemDefinition | undefined) + (p.depthOffset ?? 0);
}

interface FlipRotate {
  flipX?: boolean;
  flipY?: boolean;
  rotationDegrees?: number;
}

/**
 * RN transform for a live scene placement. Applied left→right: flip, then rotate
 * (matches bake + admin CSS).
 */
export function placementTransform(p: FlipRotate):
  | Array<{ scaleX: number } | { scaleY: number } | { rotate: string }>
  | undefined {
  const parts: Array<{ scaleX: number } | { scaleY: number } | { rotate: string }> = [];
  if (p.flipX) parts.push({ scaleX: -1 });
  if (p.flipY) parts.push({ scaleY: -1 });
  if (p.rotationDegrees) parts.push({ rotate: `${p.rotationDegrees}deg` });
  return parts.length ? parts : undefined;
}

interface ColourGraded {
  hueDegrees?: number;
  saturation?: number;
  brightness?: number;
  contrast?: number;
  shadowLift?: number;
  highlightCompress?: number;
  warmth?: number;
  opacity?: number;
  blendMode?: SceneBlendMode | string;
  featherTop?: number;
  featherRight?: number;
  featherBottom?: number;
  featherLeft?: number;
}

/**
 * RN colour grading for live scene placements — mirrors admin `placementCssFilter`
 * plus opacity / mix-blend-mode.
 */
export function placementColorStyle(p: ColourGraded): ViewStyle | undefined {
  const hue = p.hueDegrees ?? 0;
  const sat = p.saturation ?? 1;
  const bri = p.brightness ?? 1;
  const contrast = p.contrast ?? 1;
  const shadowT = Math.max(0, Math.min(100, p.shadowLift ?? 0)) / 100;
  const highlightT = Math.max(0, Math.min(100, p.highlightCompress ?? 0)) / 100;
  const warmthT = Math.max(-100, Math.min(100, p.warmth ?? 0)) / 100;
  const opacity = p.opacity ?? 1;
  const blend = p.blendMode && p.blendMode !== 'over' ? p.blendMode : undefined;

  const filters: FilterFunction[] = [];
  const huePreview = hue + warmthT * 18;
  if (huePreview) filters.push({ hueRotate: `${huePreview}deg` });
  if (sat !== 1) filters.push({ saturate: sat });
  const previewBri = bri * (1 + shadowT * 0.18) * (1 - highlightT * 0.12);
  const previewCon = contrast * (1 - shadowT * 0.12) * (1 - highlightT * 0.08);
  if (previewBri !== 1) filters.push({ brightness: previewBri });
  if (previewCon !== 1) filters.push({ contrast: previewCon });
  if (warmthT > 0) filters.push({ sepia: warmthT * 0.25 });

  if (!filters.length && opacity === 1 && !blend) return undefined;

  const style: ViewStyle = { backgroundColor: 'transparent' };
  // CSS filters / mix-blend-mode on a native View flatten PNG alpha into an
  // opaque white box. Keep them on web only; live sprites still show the art.
  if (Platform.OS === 'web') {
    if (filters.length) style.filter = filters;
    if (blend) style.mixBlendMode = blend as ViewStyle['mixBlendMode'];
  }
  if (opacity !== 1) style.opacity = opacity;
  if (!style.filter && style.opacity === undefined && !style.mixBlendMode) return undefined;
  return style;
}

function feather01(value: number | undefined): number {
  if (!value) return 0;
  return Math.max(0, Math.min(1, value / 100));
}

const FEATHER_HOLD = 1 / 3;

function axisFeatherGradient(
  dir: 'to right' | 'to bottom',
  start: number,
  end: number,
): string | undefined {
  if (!start && !end) return undefined;
  const stops: string[] = [];
  if (start) {
    const hold = start * FEATHER_HOLD * 100;
    const inner = start * 100;
    const ramp = inner - hold;
    stops.push('transparent 0%');
    if (hold > 0.2) stops.push(`transparent ${hold}%`);
    stops.push(
      `rgba(0,0,0,0.06) ${hold + ramp * 0.25}%`,
      `rgba(0,0,0,0.25) ${hold + ramp * 0.5}%`,
      `rgba(0,0,0,0.56) ${hold + ramp * 0.75}%`,
      `#000 ${inner}%`,
    );
  } else {
    stops.push('#000 0%');
  }
  if (end) {
    const inner = (1 - end) * 100;
    const holdStart = (1 - end * FEATHER_HOLD) * 100;
    const ramp = holdStart - inner;
    stops.push(`#000 ${inner}%`);
    stops.push(
      `rgba(0,0,0,0.56) ${inner + ramp * 0.25}%`,
      `rgba(0,0,0,0.25) ${inner + ramp * 0.5}%`,
      `rgba(0,0,0,0.06) ${inner + ramp * 0.75}%`,
      `transparent ${holdStart}%`,
    );
    stops.push('transparent 100%');
  } else {
    stops.push('#000 100%');
  }
  return `linear-gradient(${dir}, ${stops.join(', ')})`;
}

/** CSS edge-fade for live sprites on web. Native live sprites skip this (bake covers most stamps). */
export function placementFeatherStyle(p: ColourGraded): ViewStyle | undefined {
  if (Platform.OS !== 'web') return undefined;
  const top = feather01(p.featherTop);
  const right = feather01(p.featherRight);
  const bottom = feather01(p.featherBottom);
  const left = feather01(p.featherLeft);
  if (!top && !right && !bottom && !left) return undefined;

  const masks = [
    axisFeatherGradient('to right', left, right),
    axisFeatherGradient('to bottom', top, bottom),
  ].filter((g): g is string => !!g);
  const image = masks.join(', ');
  return {
    maskImage: image,
    WebkitMaskImage: image,
    maskSize: '100% 100%',
    WebkitMaskSize: '100% 100%',
    maskRepeat: 'no-repeat',
    ...(masks.length > 1
      ? { maskComposite: 'intersect', WebkitMaskComposite: 'source-in' }
      : {}),
  } as ViewStyle;
}

interface HitTestPlacement extends Sized, FlipRotate {}

/**
 * True when a world-space point lands inside a placement's footprint.
 * Accounts for rotation around the sprite center (flips leave the box unchanged).
 */
export function pointHitsPlacement(
  worldX: number,
  worldY: number,
  p: HitTestPlacement,
  def: Footprint | undefined,
): boolean {
  const rect = placementRect(p, def);
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let lx = worldX - cx;
  let ly = worldY - cy;
  const rot = p.rotationDegrees ?? 0;
  if (rot) {
    const rad = (-rot * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rx = lx * cos - ly * sin;
    const ry = lx * sin + ly * cos;
    lx = rx;
    ly = ry;
  }
  return Math.abs(lx) <= rect.width / 2 && Math.abs(ly) <= rect.height / 2;
}

/** Whether tapping this item definition should open dialog / shop / scene / etc. */
export function isInteractableDef(def: ItemDefinition | undefined): boolean {
  if (!def) return false;
  if (def.category === 'npc') return true;
  const act = def.interactAction;
  return !!act && act.type !== 'none';
}
