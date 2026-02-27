import type { SharedValue } from 'react-native-reanimated';

// ─── Coordinate System ──────────────────────────────────────────────────────

export interface TileCoord {
  col: number;
  row: number;
}

export function tileKey(col: number, row: number): string {
  'worklet';
  return `${col}:${row}`;
}

// ─── Item Catalogue ─────────────────────────────────────────────────────────

export type ItemCategory =
  | 'seed' | 'decoration' | 'ingredient' | 'building' | 'scenery'
  | 'flooring' | 'tiled_flooring' | 'fish' | 'bug' | 'equip' | 'soil' | 'food' | 'material' | 'asset'
  | 'npc';

/** Ionicons name for each category. */
export type CategoryIconName =
  | 'apps' | 'leaf' | 'ribbon' | 'home' | 'cube' | 'images' | 'grid' | 'fish' | 'bug' | 'bag-handle' | 'construct' | 'balloon' | 'person';

/** All filterable categories for the backpack. Single source of truth for chips. Excludes 'npc' from shop via config. */
export const ITEM_CATEGORIES: { key: ItemCategory | 'all'; label: string; ionicon: CategoryIconName }[] = [
  { key: 'all', label: 'All', ionicon: 'apps' },
  { key: 'soil', label: 'Soil', ionicon: 'grid' },
  { key: 'seed', label: 'Seeds', ionicon: 'leaf' },
  { key: 'decoration', label: 'Decorations', ionicon: 'ribbon' },
  { key: 'building', label: 'Buildings', ionicon: 'home' },
  { key: 'ingredient', label: 'Items', ionicon: 'cube' },
  { key: 'material', label: 'Materials', ionicon: 'construct' },
  { key: 'scenery', label: 'Scenery', ionicon: 'images' },
  { key: 'flooring', label: 'Flooring', ionicon: 'grid' },
  { key: 'tiled_flooring', label: 'Tiled Floor', ionicon: 'grid' },
  { key: 'fish', label: 'Fish', ionicon: 'fish' },
  { key: 'bug', label: 'Bugs', ionicon: 'bug' },
  { key: 'equip', label: 'Equipment', ionicon: 'bag-handle' },
  { key: 'food', label: 'Food', ionicon: 'cube' },
  { key: 'asset', label: 'Assets', ionicon: 'balloon' },
  { key: 'npc', label: 'NPCs', ionicon: 'person' },
];

export interface HarvestDrop {
  itemType: string;
  qty: number;
}

// ─── Interact Actions ────────────────────────────────────────────────────────

export type InteractActionType = 'open_scene' | 'open_modal' | 'start_dialog' | 'none';

export interface InteractAction {
  type: InteractActionType;
  payload?: string;
  /** Anchor ID of the tapped item (for modals like food_dish that need it). */
  anchorId?: string;
}

export type FenceVariant = 'post' | 'end' | 'straight' | 'corner' | 'tJunction' | 'cross';

export interface DirectionalImages {
  post?: string;
  end?: string;
  straight?: string;
  corner?: string;
  tJunction?: string;
  cross?: string;
}

export interface ItemDefinition {
  itemType: string;
  label: string;
  emoji: string;
  color: string;
  imageUrl?: string;
  cols: number;
  rows: number;
  placeable: boolean;
  growthMs?: number;
  harvestYield?: HarvestDrop[];
  interactAction?: InteractAction;
  /** When true, adjacent items of the same type auto-connect using directionalImages. */
  autoConnect?: boolean;
  /** When true, item is centered in its tile and overflows upward (depth-sorted with pet). */
  centerOverflow?: boolean;
  /** Image URLs for each fence shape variant. */
  directionalImages?: DirectionalImages;
  /** Whether this item can be purchased in the shop. */
  buyable?: boolean;
  /** Gem cost to purchase one of this item. */
  gemPrice?: number;
  /** Shop section key (e.g. 'seasonal') — item appears in this section. */
  shopSection?: string;
  /** Whether this item can be sold back to the shop for gems. */
  sellable?: boolean;
  /** Gems awarded per item when sold. Undefined = use category-based default (e.g. fish). */
  sellPrice?: number;
  /** ISO date string — when set, item is only available until this date. */
  availableUntil?: string;
  category: ItemCategory;
  /** Sub-category for pet AI (e.g. 'pet_bed' → pet walks there to sleep). */
  subCategory?: string;
  /** Minimum farm level required to purchase this item. */
  farmLevel?: number;
  /** Minimum pet level required to purchase this item. */
  petLevel?: number;
  /** Gems awarded when this crop is harvested (seed-specific). */
  gemsGiven?: number;
  /** SubCategories this bug spawns on. Empty/undefined = spawn anywhere. */
  bugSpawnOn?: string[];
  bugScenes?: string[];
  /** Light emission radius in tiles. */
  lightRadius?: number;
  /** Hex color of emitted light. */
  lightColor?: string;
  /** Base opacity/intensity of the glow (0.1 - 1.0). */
  lightIntensity?: number;
  /** Hunger restored when fed to pet (0-100). */
  foodHunger?: number;
  /** Happiness restored when fed to pet (0-100). */
  foodHappiness?: number;
  /** XP given to pet when consumed. */
  foodPetXp?: number;
  /** Buff type key for future extensibility. */
  foodBuffType?: string;
  /** Duration of the buff in milliseconds. */
  foodBuffDurationMs?: number;
  /** Dialog steps when subCategory is 'npc' — tapping shows dialog with item label + imageUrl as speaker. */
  npcDialog?: DialogStep[];
}

// ─── Placed Items ───────────────────────────────────────────────────────────

export interface PlacedItem {
  id: string;
  itemType: string;
  col: number;
  row: number;
  color: string;
  emoji?: string;
  imageUrl?: string;
  tileCols: number;
  tileRows: number;
  anchorId?: string;
  plantedAt?: number;
  growthMs?: number;
  watered?: boolean;
  /** Stable React key for optimistic items; preserved during server reconciliation to prevent flicker. */
  clientId?: string;
}

/** Active tool the player has selected in the toolbar. */
export type ToolMode = 'none' | 'build' | 'trash';

// ─── Active Bugs ────────────────────────────────────────────────────────────

/** A bug currently alive on the farm (spawned by server). */
export interface ActiveBug {
  spawnId: string;
  itemType: string;
  col: number;
  row: number;
  /** Timestamp when bug was spawned (for lifespan check — avoid "bug already gone" race). */
  spawnedAt?: number;
  /** If set, bug is "on" this item — use subtle drift/rotate AI instead of wander. */
  hostPlacedItemId?: string;
}

/** Result payload from the server when a bug is caught. */
export interface BugCatchResult {
  spawnId: string;
  itemType: string;
  label: string;
  size: number;
  gemsAwarded: number;
  sizeLabel: string;
}

// ─── Active Balloons ─────────────────────────────────────────────────────────

/** A balloon currently alive on the farm (spawned by server). */
export interface ActiveBalloon {
  spawnId: string;
  itemType: string;
  col: number;
  row: number;
}

/** Result payload from the server when a balloon is popped. */
export interface BalloonPopResult {
  spawnId: string;
  itemType: string;
  label: string;
  qty: number;
  gemsAwarded?: number;
}

/** Result payload from the server when a fossil is dug. */
export interface FossilDigResult {
  anchorId: string;
  itemType: string;
  label: string;
  qty: number;
}

// ─── Grid Data ──────────────────────────────────────────────────────────────

/** Multiple items per tile (overlap supported). */
export interface GridData {
  cols: number;
  rows: number;
  items: Map<string, PlacedItem[]>;
}

// ─── Scenes ─────────────────────────────────────────────────────────────────

export type Scene = 'farm' | 'house' | (string & {});

export function isMultiplayerScene(scene: Scene): boolean {
  return scene !== 'farm' && scene !== 'house';
}

// ─── Camera ─────────────────────────────────────────────────────────────────

export interface CameraState {
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
}

export interface VisibleRange {
  startCol: number;
  endCol: number;
  startRow: number;
  endRow: number;
}

// ─── Pet ────────────────────────────────────────────────────────────────────

/** Pet AI states; pose selection lives in creature/pet/stateConfig. */
export type PetBehavior = 'idle' | 'walking' | 'sleepy' | 'sleeping' | 'eating' | 'admiring';

export interface PetState {
  behavior: PetBehavior;
  position: TileCoord;
  target: TileCoord | null;
}

// ─── Inventory ──────────────────────────────────────────────────────────────

export interface InventorySlot {
  itemType: string;
  qty: number;
}

// ─── Pet Dialog ─────────────────────────────────────────────────────────────

export interface PetDialogMessage {
  id: string;
  text: string;
}

// ─── Harvest Effect ─────────────────────────────────────────────────────────

export interface HarvestEffect {
  id: string;
  col: number;
  row: number;
  drops: HarvestDrop[];
  /** Visual data of the crop being harvested, so the animation can render it. */
  cropEmoji?: string;
  cropImageUrl?: string;
  cropColor?: string;
  tileCols: number;
  tileRows: number;
}

// ─── Farm Level ─────────────────────────────────────────────────────────────

export interface FarmLevelDef {
  level: number;
  xpRequired: number;
  title: string;
  emoji: string;
  cols: number;
  rows: number;
}

export interface FarmMeta {
  name: string;
  xp: number;
}

// ─── Dialog / Tutorial ───────────────────────────────────────────────────────

export type DialogHighlightType =
  | 'hud_button'
  | 'inventory_item'
  | 'world_item'
  | 'category_chip'
  | 'shop_item'
  | 'shop_category'
  | 'sell_item'
  | 'cook_item'
  | 'food_dish_item'
  | 'equip_item';

export interface DialogHighlight {
  type: DialogHighlightType;
  target: string;
}

export interface DialogStep {
  text: string;
  highlight?: DialogHighlight;
  /** If false, user can dismiss without completing highlight. Default true. */
  blocking?: boolean;
  /** Override speaker for this step: 'pet' | 'npc'. Falls back to dialog-level speaker if unset. */
  speaker?: 'pet' | 'npc';
}

/** Speaker override for dialog (e.g. NPC). When null/undefined, use pet. */
export interface DialogSpeaker {
  name: string;
  imageUrl?: string | null;
}

export type QuestHighlight = DialogHighlight;

// ─── Quests ──────────────────────────────────────────────────────────────────

export interface QuestRequirement {
  items?: { itemType: string; qty: number }[];
  buildings?: { itemType: string; count: number }[];
  actions?: { action: string; count: number; itemType?: string }[];
  equips?: { slot: string; itemType?: string; count?: number }[];
  talk_to_npc?: { npcItemType: string; count?: number }[];
  crop_grown?: { itemType: string; count?: number }[];
  open_modal?: { payload: string; count?: number }[];
}

export interface QuestReward {
  items?: { itemType: string; qty: number }[];
  gems?: number;
  xp?: number;
}

export interface QuestStep {
  stepId: string;
  requirements: QuestRequirement;
  dialogBefore?: DialogStep[];
  dialogAfter?: DialogStep[];
  blocking?: boolean;
  rewards?: QuestReward;
  nextStepId?: string;
}

export interface QuestTrigger {
  type: string;
  questId?: string;
  npcItemType?: string;
  sceneSlug?: string;
  firstVisitOnly?: boolean;
}

export interface QuestProgress {
  questId: string;
  type: string;
  title: string;
  description: string;
  farmLevel?: number;
  petLevelMin?: number;
  farmLevelMin?: number;
  requiredQuestId?: string;
  triggers?: QuestTrigger[];
  requirements: QuestRequirement;
  rewards: QuestReward;
  status: 'locked' | 'active' | 'completed';
  progress: {
    actions: Record<string, number>;
    buildings: Record<string, number>;
    items: Record<string, number>;
    npcTalks?: Record<string, number>;
    cropsGrown?: Record<string, number>;
    modalsOpened?: Record<string, number>;
  };
  canComplete: boolean;
  startDialog?: DialogStep[];
  endDialog?: DialogStep[];
  startDialogSpeaker?: 'pet' | 'npc';
  endDialogSpeaker?: 'pet' | 'npc';
  autoTrigger?: string;
  startDialogShown?: boolean;
  currentStepId?: string;
  steps?: QuestStep[];
  stepDialogBefore?: DialogStep[];
  stepDialogAfter?: DialogStep[];
  stepBlocking?: boolean;
}

// ─── WebSocket Payloads ─────────────────────────────────────────────────────

export interface EquippedSnapshot {
  handTool?: string;
  bobber?: string;
  bait?: string;
  chair?: string;
}

/** Full game state sent on initial load (game:snapshot). */
export interface GameSnapshot {
  farmName: string;
  farmXp: number;
  gems: number;
  farmLevel: number;
  farmLevels: FarmLevelDef[];
  foodDishQueues?: Record<string, string[]>;
  inventory: Record<string, number>;
  placedItems: {
    id: string;
    itemType: string;
    col: number;
    row: number;
    tileCols: number;
    tileRows: number;
    anchorId?: string;
    plantedAt?: number;
    growthMs?: number;
    watered?: boolean;
  }[];
  equipped?: EquippedSnapshot;
  itemDefs: Record<string, ItemDefinition>;
  gridCols: number;
  gridRows: number;
  /** Server-authoritative pet state (col, row, behavior). */
  petState?: { col: number; row: number; behavior: string };
  /** R2 URL for the baked scenery image (UUID in path = automatic cache invalidation). */
  sceneryUrl?: string;
  /** When farm has a scene with baked image, use these for world size instead of padded procedural dims. */
  sceneWorldCols?: number;
  sceneWorldRows?: number;
  quests: QuestProgress[];
  canUpgrade: boolean;
  /** Pending quest start dialogs bundled with the snapshot (avoids race with separate event). */
  pendingDialogs?: { questId: string; dialog: DialogStep[] }[];
}

/** Result from a cooking attempt (game:cook_result). */
export interface CookResult {
  matched: boolean;
  resultItemType: string;
  resultQty: number;
  isNewDiscovery: boolean;
  recipeId?: string;
  recipeLabel?: string;
}

/** Result from a crafting attempt (game:craft_result). Same shape as CookResult. */
export type CraftResult = CookResult;

/** Delta sent after each server-confirmed action (game:state_update). */
export interface StateUpdate {
  farmXp?: number;
  gems?: number;
  farmLevel?: number;
  inventory?: Record<string, number>;
  equipped?: EquippedSnapshot;
  foodDishQueues?: Record<string, string[]>;
  addedItems?: GameSnapshot['placedItems'];
  removedItemIds?: string[];
  movedItems?: GameSnapshot['placedItems'];
  farmName?: string;
  quests?: QuestProgress[];
  canUpgrade?: boolean;
}
