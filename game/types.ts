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
  | 'npc' | 'tree';

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
  { key: 'tree', label: 'Trees', ionicon: 'leaf' },
];

export interface HarvestDrop {
  itemType: string;
  qty: number;
}

// ─── Interact Actions ────────────────────────────────────────────────────────

export type InteractActionType = 'open_scene' | 'open_modal' | 'start_dialog' | 'none';

/** Live inventory/equip checks for gating an interact (quest-requirement subset). */
export interface InteractRequirements {
  items?: { itemType: string; qty: number }[];
  equips?: { slot: string; itemType?: string }[];
}

export interface InteractAction {
  type: InteractActionType;
  payload?: string;
  /** Anchor ID of the tapped item (for modals like food_dish that need it). */
  anchorId?: string;
  farmLevelMin?: number;
  petLevelMin?: number;
  requirements?: InteractRequirements;
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
  /**
   * Pet equip overlay for hand tools / chairs (admin-configured).
   * Missing fields fall back to client defaults.
   */
  equipOverlay?: {
    x?: number;
    y?: number;
    flipX?: boolean;
    flipY?: boolean;
    rotationDeg?: number;
    scale?: number;
  };
  /** Image URLs for each fence shape variant. */
  directionalImages?: DirectionalImages;
  /** Whether this item can be purchased in the shop. */
  buyable?: boolean;
  /** Gem cost to purchase one of this item. */
  gemPrice?: number;
  /** Shop section key (e.g. 'seasonal') — item appears in this section. */
  shopSection?: string;
  /** Inventory itemType spent instead of gems (e.g. 'candy_corn'). Empty = gems. */
  shopCurrency?: string;
  /** When true, show this item on the HUD next to gems if the player has any. */
  isCurrency?: boolean;
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
  /** Minimum total skill level required to purchase this item. */
  petLevel?: number;
  /** Minimum farming skill level required to purchase this item (shop seeds). */
  farmingSkillLevel?: number;
  /** Gems awarded when this crop is harvested (seed-specific). */
  gemsGiven?: number;
  /** SubCategories this bug spawns on. Empty/undefined = spawn anywhere. */
  bugSpawnOn?: string[];
  bugScenes?: string[];
  /** When this bug is most likely to appear. */
  bugActiveTime?: 'all_day' | 'night' | 'morning' | 'afternoon';
  /** When set to 'rain', this bug only appears during rain. */
  bugWeather?: 'rain';
  /** Soft tags for themed collection sets (e.g. 'haunted'). */
  bugCollectionTags?: string[];
  /** Bug loot rarity for museum sorting. */
  bugRarity?: 'common' | 'rare' | 'epic' | 'unique' | 'legendary' | 'mythic';
  /** Fish loot rarity for museum sorting. */
  fishRarity?: 'common' | 'rare' | 'epic' | 'unique' | 'legendary' | 'mythic';
  /** When this fish is most likely to bite. */
  fishActiveTime?: 'all_day' | 'night' | 'morning' | 'afternoon';
  /** Coarse fishing spots this fish can appear in. */
  fishSpotTypes?: string[];
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
  /** For fully grown trees: itemType of fruit this tree produces (e.g. 'apple'). */
  treeFruit?: string;
  /** For fruit items: tree variant slugs this fruit can grow on. */
  growsOnTrees?: string[];
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
  /** For trees: YYYY-MM-DD when planted or last growth stage advanced. */
  treePlantedDate?: string;
  /** For fully grown fruit trees: 0–3 fruit currently on tree. */
  treeFruitCount?: number;
  /** For fruit trees: YYYY-MM-DD when fruit was last harvested. */
  fruitLastHarvestedDate?: string;
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

/** Result payload from the server when a ground pickup (stone/stick) is collected. */
export interface GroundPickupResult {
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

/**
 * A decoration in a scene, positioned in world pixels rather than tiles.
 * Baked into the scenery PNG unless `live` is set (then drawn as a sprite).
 */
export type SceneBlendMode =
  | 'over'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'soft-light'
  | 'darken'
  | 'lighten';

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
  /** Hex colour punched out of the sprite. */
  knockoutColor?: string;
  knockoutTolerance?: number;
  /** Composite blend mode. */
  blendMode?: SceneBlendMode;
  /** Omit from bake; depth-sorted sprite so pets can walk behind it. */
  live?: boolean;
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
  | 'craft_item'
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

export interface QuestReward {
  items?: { itemType: string; qty: number }[];
  gems?: number;
  xp?: number;
  recipes?: string[];
}

/**
 * One line of a quest's checklist, already resolved by the server. The client
 * used to re-derive these from raw requirements plus a progress map, and its
 * arithmetic drifted from the server's — a quest could read "3/3" and still
 * refuse to complete.
 */
export interface RequirementClause {
  key: string;
  kind: 'item' | 'building' | 'action' | 'equip' | 'talk_to_npc' | 'crop_grown' | 'open_modal' | 'farm_xp';
  /** Ready to render, e.g. "Harvest Wheat". */
  label: string;
  /** Present when the clause concerns a specific item, for showing its sprite. */
  itemType?: string;
  have: number;
  need: number;
  met: boolean;
}

export interface QuestProgress {
  questId: string;
  type: string;
  title: string;
  description: string;
  status: 'locked' | 'active' | 'completed';
  /** For upgrade quests: the level this raises the farm to. */
  farmLevel?: number;
  clauses: RequirementClause[];
  rewards: QuestReward;
  canComplete: boolean;
  startDialog?: DialogStep[];
  endDialog?: DialogStep[];
  startDialogSpeaker?: 'pet' | 'npc';
  endDialogSpeaker?: 'pet' | 'npc';
  startDialogShown: boolean;
  /** NPC this quest hangs off, for quest bubbles above that NPC. */
  npcItemType?: string;
  /** True when only the trigger is outstanding, not a level or prerequisite gate. */
  gatesPass: boolean;
  sortOrder: number;
}

/** A dialog the server wants shown, with everything needed to render it. */
export interface QuestDialog {
  questId: string;
  kind: 'start' | 'end' | 'idle' | 'progress';
  steps: DialogStep[];
  speaker?: 'pet' | 'npc';
  npcItemType?: string;
}

/**
 * A dialog waiting in the queue. The speaker is resolved when the entry is
 * queued rather than when it is shown, so the overlay stays a pure renderer.
 */
export interface DialogEntry {
  steps: DialogStep[];
  speaker?: DialogSpeaker;
  /** False lets the player tap past a step that has a highlight. */
  blocking?: boolean;
  /** The quest this belongs to, so a finished quest can release its own dialog. */
  questId?: string;
  kind?: QuestDialog['kind'];
}

/** A quest that just finished, for the celebration overlay. */
export interface QuestCompletion {
  questId: string;
  title: string;
  type: string;
  /** Only what was actually granted. Absent when the quest paid nothing. */
  rewards?: QuestReward;
  endDialog?: DialogStep[];
  endDialogSpeaker?: 'pet' | 'npc';
  /** Set when this completion raised the farm's level. */
  newFarmLevel?: number;
}

// ─── WebSocket Payloads ─────────────────────────────────────────────────────

export interface EquippedSnapshot {
  handTool?: string;
  bobber?: string;
  bait?: string;
  chair?: string;
}

/** Shared US world weather from the server calendar (not a live weather API). */
export type WeatherType = 'clear' | 'rain' | 'snow' | 'meteor_shower';

export interface ActiveWeather {
  type: WeatherType;
  /** YYYY-MM-DD in America/New_York */
  date: string;
  label?: string;
  endsAt?: string;
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
  /** Farm-wide vault (uncapped). */
  storage?: Record<string, number>;
  /** Max distinct backpack stacks. */
  backpackSlots?: number;
  miningEnergy?: number;
  miningEnergyCap?: number;
  miningEnergyAt?: number;
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
    treePlantedDate?: string;
    treeFruitCount?: number;
    fruitLastHarvestedDate?: string;
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
  /** Scene placements for tap detection when using scene bake (buildings baked into image). */
  scenePlacements?: ScenePlacement[];
  quests: QuestProgress[];
  canUpgrade: boolean;
  /** Dialogs the server wants shown, bundled here to avoid racing a separate event. */
  questDialogs?: QuestDialog[];
  /** Shared world weather (America/New_York calendar). */
  weather?: ActiveWeather;
}

/** Server-authored Spirit Snatch round. Client plays this list; server scores taps. */
export interface SpiritSnatchTarget {
  id: number;
  kind: 'treat' | 'trick';
  xFrac: number;
  spawnAt: number;
  fallMs: number;
  driftFrac: number;
}

export interface SpiritSnatchRound {
  roundId: string;
  roundMs: number;
  catchStart: number;
  catchEnd: number;
  targets: SpiritSnatchTarget[];
}

export interface SpiritSnatchTap {
  id: number;
  atMs: number;
}

export type SpiritSnatchStartResult =
  | { ok: true; round: SpiritSnatchRound }
  | { ok: false; onCooldown: true; nextAvailableAt: string; message: string };

export interface SpiritSnatchResult {
  score: number;
  candyAwarded: number;
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

export interface MineReadyPayload {
  sceneSlug: string;
  col: number;
  row: number;
  oreType: string;
  itemType: string;
  label: string;
  imageUrl?: string;
  emoji?: string;
  tapsRequired: number;
  timeLimitMs: number;
  difficulty: number;
  miningEnergy?: number;
  miningEnergyCap?: number;
  miningEnergyAt?: number;
}

export interface MineOreResult {
  sceneSlug: string;
  col: number;
  row: number;
  oreType: string;
  itemType: string;
  label: string;
  qty: number;
  passed: boolean;
}

/** Skill XP packet folded into game:state_update. */
export interface SkillXpUpdate {
  skill: string;
  amount: number;
  levelsGained: number;
  level: number;
  totalLevel: number;
  skills: import('@/lib/api').ApiSkills;
  /** Crafting journal recipes unlocked by this XP grant. */
  unlockedRecipes?: string[];
  /** Item rewards from skill milestones (e.g. farming soil). */
  itemRewards?: { itemType: string; qty: number }[];
}

/** Delta sent after each server-confirmed action (game:state_update). */
export interface StateUpdate {
  farmXp?: number;
  gems?: number;
  farmLevel?: number;
  inventory?: Record<string, number>;
  storage?: Record<string, number>;
  backpackSlots?: number;
  miningEnergy?: number;
  miningEnergyCap?: number;
  miningEnergyAt?: number;
  equipped?: EquippedSnapshot;
  foodDishQueues?: Record<string, string[]>;
  addedItems?: GameSnapshot['placedItems'];
  removedItemIds?: string[];
  movedItems?: GameSnapshot['placedItems'];
  farmName?: string;
  quests?: QuestProgress[];
  canUpgrade?: boolean;
  /** Quests that finished as a result of this action, for the celebration overlay. */
  questCompletions?: QuestCompletion[];
  /** Dialogs the server wants shown as a result of this action. */
  questDialogs?: QuestDialog[];
  /** Skill XP from this action — sync companion total level + feedback. */
  skillXp?: SkillXpUpdate;
  /** Tree shake result — show jiggle+shrink harvest effect and bubble. */
  shakeResult?: {
    drops: HarvestDrop[];
    col: number;
    row: number;
    tileCols: number;
    tileRows: number;
    cropEmoji?: string;
    cropImageUrl?: string;
  };
}
