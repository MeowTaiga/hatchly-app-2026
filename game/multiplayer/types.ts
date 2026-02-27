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

export interface SceneData {
  slug: string;
  name: string;
  cols: number;
  rows: number;
  bgColor: string;
  tiledFlooringItemType?: string | null;
  farmCols: number;
  farmRows: number;
  placements: ScenePlacement[];
  walkableRect: WalkableRect | null;
  unwalkableTiles: UnwalkableTile[];
  fishingTiles: FishingTile[];
  bakedImageUrl: string | null;
  spawnX?: number;
  spawnY?: number;
}

export interface ScenePlacement {
  id: string;
  itemType: string;
  x: number;
  y: number;
  scale: number;
  depthOffset?: number;
  rotationDegrees?: number;
}
