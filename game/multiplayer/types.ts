export interface RemotePlayer {
  userId: string;
  username: string;
  petName: string;
  petImageUrl: string;
  petPose?: Record<string, string>;
  activePose: string | null;
  x: number;
  y: number;
  equippedHandTool?: string;
  equippedBobber?: string;
  equippedChair?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
}

export interface WalkableRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface UnwalkableTile {
  col: number;
  row: number;
}

export interface FishingTile {
  col: number;
  row: number;
  spotType?: string;
}

export interface MiningTile {
  col: number;
  row: number;
  oreType?: string;
}

export interface SceneData {
  slug: string;
  name: string;
  cols: number;
  rows: number;
  bgColor: string;
  tiledFlooringItemType?: string | null;
  tiledFlooringStyle?: SceneColourGrade | null;
  farmCols: number;
  farmRows: number;
  placements: ScenePlacement[];
  walkableRect: WalkableRect | null;
  unwalkableTiles: UnwalkableTile[];
  fishingTiles: FishingTile[];
  miningTiles: MiningTile[];
  bakedImageUrl: string | null;
  spawnX?: number;
  spawnY?: number;
}

export type SceneBlendMode =
  | 'over'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'soft-light'
  | 'darken'
  | 'lighten';

/** Colour / opacity grade shared by placements and the scene tiled floor. */
export interface SceneColourGrade {
  hueDegrees?: number;
  saturation?: number;
  brightness?: number;
  contrast?: number;
  shadowLift?: number;
  highlightCompress?: number;
  warmth?: number;
  opacity?: number;
  blendMode?: SceneBlendMode;
}

export interface ScenePlacement {
  id: string;
  itemType: string;
  x: number;
  y: number;
  scale: number;
  /** Per-axis overrides for unevenly scaled placements; fall back to `scale`. */
  scaleX?: number;
  scaleY?: number;
  depthOffset?: number;
  rotationDegrees?: number;
  flipX?: boolean;
  flipY?: boolean;
  /** Hue rotation in degrees (0 = unchanged). Applied on live sprites. */
  hueDegrees?: number;
  /** Saturation multiplier (1 = unchanged). */
  saturation?: number;
  /** Brightness multiplier (1 = unchanged). */
  brightness?: number;
  /** Contrast multiplier (1 = unchanged). */
  contrast?: number;
  /** Shadow lift 0–100. Softens dark outlines (preview approx). */
  shadowLift?: number;
  /** Highlight pull-down 0–100. Softens hot whites (preview approx). */
  highlightCompress?: number;
  /** Warm↔cool −100…100. */
  warmth?: number;
  /** Opacity 0–1 (1 = opaque). */
  opacity?: number;
  /** Edge fade 0–100 (% of that side). */
  featherTop?: number;
  featherRight?: number;
  featherBottom?: number;
  featherLeft?: number;
  knockoutColor?: string;
  knockoutTolerance?: number;
  /** Composite blend mode. */
  blendMode?: SceneBlendMode;
  /** Omit from bake; depth-sorted sprite so pets can walk behind it. */
  live?: boolean;
}
