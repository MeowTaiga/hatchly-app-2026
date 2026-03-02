/**
 * Types for the Game Provider: context value, state shape, and reducer actions.
 */

import type {
  GridData,
  PlacedItem,
  Scene,
  InventorySlot,
  ToolMode,
  ItemCategory,
  HarvestEffect,
  FarmMeta,
  ItemDefinition,
  FarmLevelDef,
  GameSnapshot,
  StateUpdate,
  EquippedSnapshot,
  InteractAction,
  ActiveBug,
  BugCatchResult,
  ActiveBalloon,
  BalloonPopResult,
  FossilDigResult,
  CookResult,
  CraftResult,
  QuestProgress,
  DialogStep,
  DialogSpeaker,
  QuestHighlight,
} from '../types';

/** Public context value exposed to consumers via useGame(). */
export interface GameContextValue {
  activeScene: Scene;
  /** Target scene during transition (before applySceneChange). */
  targetScene: Scene | undefined;
  activeGrid: GridData;
  farmGrid: GridData;
  houseGrid: GridData;
  selectedTile: string | null;
  isTransitioning: boolean;
  editMode: boolean;
  activeCategory: ItemCategory | 'all';
  inventory: InventorySlot[];
  placeableSlots: InventorySlot[];
  /** All inventory items filtered by active category (includes non-placeable). */
  displaySlots: InventorySlot[];
  selectedItemType: string | null;
  harvestEffects: HarvestEffect[];
  farm: FarmMeta;
  farmLevel: number;
  farmLevels: readonly FarmLevelDef[];
  equipped: EquippedSnapshot | undefined;
  foodDishQueues: Record<string, string[]> | undefined;
  itemDefs: Record<string, ItemDefinition>;
  sceneryUrl: string;
  /** When farm has a scene with baked image, use these for world size instead of padded procedural dims. */
  sceneWorldCols?: number;
  sceneWorldRows?: number;
  /** Scene placements for tap detection when using scene bake. */
  scenePlacements?: Array<{ id: string; itemType: string; x: number; y: number; scale: number; depthOffset?: number }>;
  connected: boolean;
  loading: boolean;
  pendingInteraction: InteractAction | null;
  /** Anchor ID of the item currently being moved, or null. */
  movingItemId: string | null;
  /** When set, drag-ended item stays visually at drop spot until server confirms. Cleared on STATE_UPDATE. */
  pendingDropTarget: { anchorId: string; newCol: number; newRow: number } | null;
  /** Anchor ID of tree playing tap-shake animation; null when idle. */
  shakingTreeAnchorId: string | null;
  /** Shake trigger (changes each tap) so animation can replay. */
  shakeTrigger: number;
  toolMode: ToolMode;
  gems: number;
  activeBugs: ActiveBug[];
  lastCatchResult: BugCatchResult | null;
  activeBalloons: ActiveBalloon[];
  lastBalloonPopResult: BalloonPopResult | null;
  lastFossilDigResult: FossilDigResult | null;
  quests: QuestProgress[];
  canUpgrade: boolean;
  currentQuestDialog: DialogStep[] | null;
  questDialogIndex: number;
  activeHighlight: QuestHighlight | null;
  /** When non-null, use instead of pet for dialog speaker. */
  currentDialogSpeaker: DialogSpeaker | null;
  /** Rewards shown on last step of current quest dialog. */
  currentDialogRewards: import('../types').QuestReward | null;
  /** When false, user can tap to dismiss without completing highlight. */
  currentDialogBlocking: boolean;

  placeItem: (col: number, row: number) => void;
  placeItemAt: (itemType: string, col: number, row: number) => boolean;
  removeItem: (col: number, row: number) => void;
  moveItem: (itemId: string, col: number, row: number) => boolean;
  setPendingDropTarget: (target: { anchorId: string; newCol: number; newRow: number } | null) => void;
  selectTile: (col: number, row: number) => void;
  selectInventoryItem: (itemType: string | null) => void;
  switchScene: (target: Scene) => void;
  /** Called when conceal completes; applies the pending scene change before reveal. */
  applySceneChange: () => void;
  completeTransition: () => void;
  toggleEditMode: () => void;
  setCategory: (cat: ItemCategory | 'all') => void;
  harvestCrop: (col: number, row: number) => HarvestEffect | null;
  dismissHarvestEffect: (id: string) => void;
  setFarmName: (name: string) => void;
  clearInteraction: () => void;
  setPendingInteraction: (action: InteractAction | null) => void;
  startMoveItem: () => void;
  cancelMove: () => void;
  storeSelectedItem: () => void;
  storeItemByAnchorId: (anchorId: string) => void;
  destroySelectedItem: () => void;
  setToolMode: (mode: ToolMode) => void;
  showPetDialog: (text: string) => void;
  waterTile: (col: number, row: number) => void;
  purchaseItem: (itemType: string) => void;
  sellItem: (itemType: string, qty?: number) => void;
  sellItemsBatch: (items: Array<{ itemType: string; qty: number }>) => void;
  addToFoodDish: (anchorId: string, items: Array<{ itemType: string; qty: number }>) => void;
  equipItem: (slot: 'handTool' | 'bobber' | 'bait' | 'chair', itemType: string | null) => void;
  catchBug: (spawnId: string) => void;
  dismissCatchResult: () => void;
  popBalloon: (spawnId: string) => void;
  dismissBalloonPopResult: () => void;
  digFossil: (anchorId: string) => void;
  shakeTree: (anchorId: string) => void;
  dismissFossilDigResult: () => void;
  completeQuest: (questId: string) => void;
  emitQuestActivateByNpc: (npcItemType: string) => void;
  emitQuestActivateByScene: (sceneSlug: string) => void;
  emitQuestModalOpened: (payload: string) => void;
  advanceQuestDialog: () => void;
  queueNpcDialog: (steps: DialogStep[], speaker?: DialogSpeaker, npcItemType?: string, blocking?: boolean, questIdToComplete?: string) => void;
  /** Store pending NPC dialog to show if no quest activates. Called before emitQuestActivateByNpc. */
  setPendingNpcDialog: (info: { steps: DialogStep[]; speaker?: DialogSpeaker; npcItemType: string } | null) => void;
  /** Optimistically mark a locked quest as active (for immediate icon update before server confirms). */
  optimisticallyActivateQuest: (questId: string) => void;
  tryAutoAdvanceDialog: (action: string, itemType?: string) => void;
  refreshGame: () => void;
  setShopOpen: (open: boolean) => void;
  setSellBoxOpen: (open: boolean) => void;
  setCookingOpen: (open: boolean) => void;
  setFoodDishOpen: (open: boolean) => void;
  setEquipOpen: (open: boolean) => void;
  onShopCategorySelect: (categoryKey: string) => void;
  cookResult: CookResult | null;
  emitCook: (ingredients: { itemType: string; qty: number }[], minigamePassed: boolean) => void;
  craftResult: CraftResult | null;
  emitCraft: (materials: { itemType: string; qty: number }[], minigamePassed: boolean) => void;
  emitFeedPet: (anchorId: string, foodItemType: string) => void;
  emitConsumeFromFoodDish: (anchorId: string) => void;
  emitPetBehavior: (state: string) => void;
  emitPetActionComplete: (targetCol: number, targetRow: number) => void;
  emitCollectWater: (wellSlug: string) => void;
  collectWaterResult: { success: boolean; waterQty?: number; nextAvailableAt?: string; onCooldown?: boolean; message?: string } | null;
  clearCollectWaterResult: () => void;
  petBehaviorSync: string | null;
  petState: { col: number; row: number; behavior: string; targetCol?: number; targetRow?: number; interactionType?: string; interactionTarget?: string; interactionItemType?: string } | null;
  clearPetBehaviorSync: () => void;
  clearCookResult: () => void;
  clearCraftResult: () => void;
  /** Ref for pet to react to decoration placement. Set by WorldRenderer. */
  decorationReactionRef: React.MutableRefObject<((col: number, row: number, itemType: string) => void) | null>;
}

/** Internal reducer state. */
export interface GameState {
  activeScene: Scene;
  targetScene?: Scene;
  farmGrid: GridData;
  houseGrid: GridData;
  selectedTile: string | null;
  selectedItemType: string | null;
  isTransitioning: boolean;
  editMode: boolean;
  activeCategory: ItemCategory | 'all';
  inventory: Record<string, number>;
  harvestEffects: HarvestEffect[];
  farmName: string;
  farmXp: number;
  farmLevel: number;
  farmLevels: readonly FarmLevelDef[];
  equipped: EquippedSnapshot | undefined;
  foodDishQueues: Record<string, string[]> | undefined;
  itemDefs: Record<string, ItemDefinition>;
  sceneryUrl: string;
  /** When farm has a scene with baked image, use these for world size instead of padded procedural dims. */
  sceneWorldCols?: number;
  sceneWorldRows?: number;
  /** Scene placements for tap detection when using scene bake. */
  scenePlacements?: Array<{ id: string; itemType: string; x: number; y: number; scale: number; depthOffset?: number }>;
  pendingInteraction: InteractAction | null;
  movingItemId: string | null;
  pendingDropTarget: { anchorId: string; newCol: number; newRow: number } | null;
  /** Last optimistic placement; reverted when server rejects (e.g. out of bounds). */
  lastOptimisticPlace: { anchorId: string; itemType: string } | null;
  toolMode: ToolMode;
  gems: number;
  activeBugs: ActiveBug[];
  lastCatchResult: BugCatchResult | null;
  activeBalloons: ActiveBalloon[];
  lastBalloonPopResult: BalloonPopResult | null;
  lastFossilDigResult: FossilDigResult | null;
  quests: QuestProgress[];
  canUpgrade: boolean;
  questDialogQueue: Array<{ steps: DialogStep[]; speaker?: DialogSpeaker; npcItemType?: string; blocking?: boolean; rewards?: import('../types').QuestReward; questIdToComplete?: string }>;
  currentQuestDialog: DialogStep[] | null;
  questDialogIndex: number;
  currentDialogSpeaker: DialogSpeaker | null;
  currentNpcItemType: string | null;
  /** When set, completing this dialog (last step advance) should call quest:complete for this quest. */
  currentQuestIdToComplete: string | null;
  /** Rewards for the current dialog (shown on last step when present). */
  currentDialogRewards: import('../types').QuestReward | null;
  /** When false, user can tap to dismiss without completing highlight. */
  currentDialogBlocking: boolean;
  shopOpen: boolean;
  sellBoxOpen: boolean;
  cookingOpen: boolean;
  foodDishOpen: boolean;
  equipOpen: boolean;
  /** Server-forced behavior correction; cleared after usePetAI applies. */
  petBehaviorSync: string | null;
  /** Server-authoritative pet state (col, row, behavior, target). */
  petState: { col: number; row: number; behavior: string; targetCol?: number; targetRow?: number; interactionType?: string; interactionTarget?: string; interactionItemType?: string } | null;
  /** Items we optimistically sold; used to ignore stale STATE_UPDATE that would revert. */
  pendingSellItems: Array<{ itemType: string; qty: number }> | null;
  /** When OPTIMISTIC_SELL was applied; we keep protection for a few seconds. */
  pendingSellAt: number | null;
  /** Anchor ID of tree currently playing tap-shake animation; cleared after animation. */
  shakingTreeAnchorId: string | null;
  /** Increments on each shake so the same tree can animate again. */
  shakeTrigger: number;
}

/** All dispatchable reducer actions. */
export type GameAction =
  | { type: 'SNAPSHOT'; payload: GameSnapshot }
  | { type: 'STATE_UPDATE'; payload: StateUpdate }
  | { type: 'OPTIMISTIC_PLACE'; items: PlacedItem[]; keys: string[]; itemType: string; skipInventory?: boolean }
  | { type: 'REVERT_PLACEMENT' }
  | { type: 'OPTIMISTIC_REMOVE'; anchorId: string; itemType: string }
  | { type: 'OPTIMISTIC_REMOVE_KEYS'; keys: string[] }
  | { type: 'OPTIMISTIC_HARVEST'; anchorId: string; effect: HarvestEffect }
  | { type: 'OPTIMISTIC_SELL'; items: Array<{ itemType: string; qty: number }> }
  | { type: 'OPTIMISTIC_ADD_TO_FOOD_DISH'; items: Array<{ itemType: string; qty: number }> }
  | { type: 'OPTIMISTIC_WATER'; col: number; row: number }
  | { type: 'SELECT_TILE'; key: string | null }
  | { type: 'SELECT_ITEM'; itemType: string | null }
  | { type: 'SWITCH_SCENE'; target: Scene }
  | { type: 'APPLY_SCENE' }
  | { type: 'COMPLETE_TRANSITION' }
  | { type: 'TOGGLE_EDIT' }
  | { type: 'SET_CATEGORY'; cat: ItemCategory | 'all' }
  | { type: 'DISMISS_EFFECT'; id: string }
  | { type: 'SET_FARM_NAME'; name: string }
  | { type: 'SET_INTERACTION'; action: InteractAction | null }
  | { type: 'START_MOVE'; anchorId: string }
  | { type: 'CANCEL_MOVE' }
  | { type: 'SET_PENDING_DROP'; target: { anchorId: string; newCol: number; newRow: number } | null }
  | { type: 'UPDATE_ITEM_DEFS'; defs: Record<string, ItemDefinition> }
  | { type: 'SET_TOOL_MODE'; mode: ToolMode }
  | { type: 'ADD_BUG'; bug: ActiveBug }
  | { type: 'REMOVE_BUG'; spawnId: string }
  | { type: 'CLEAR_BUGS' }
  | { type: 'SET_CATCH_RESULT'; result: BugCatchResult | null }
  | { type: 'ADD_BALLOON'; balloon: ActiveBalloon }
  | { type: 'REMOVE_BALLOON'; spawnId: string }
  | { type: 'SET_BALLOON_POP_RESULT'; result: BalloonPopResult | null }
  | { type: 'SET_FOSSIL_DIG_RESULT'; result: FossilDigResult | null }
  | { type: 'SET_SCENERY_URL'; url: string; farmCols: number; farmRows: number }
  | { type: 'SET_QUESTS'; quests: QuestProgress[]; canUpgrade: boolean }
  | { type: 'OPTIMISTIC_QUEST_ACTIVATE'; questId: string }
  | { type: 'QUEUE_QUEST_DIALOG'; dialogs: Array<{ steps: DialogStep[]; speaker?: DialogSpeaker; npcItemType?: string; rewards?: import('../types').QuestReward }> }
  | { type: 'QUEUE_NPC_DIALOG'; steps: DialogStep[]; speaker?: DialogSpeaker; npcItemType?: string; blocking?: boolean; questIdToComplete?: string }
  | { type: 'SHOW_PET_DIALOG'; text: string }
  | { type: 'ADVANCE_QUEST_DIALOG' }
  | { type: 'SET_SHOP_OPEN'; open: boolean }
  | { type: 'SET_SELL_BOX_OPEN'; open: boolean }
  | { type: 'SET_COOKING_OPEN'; open: boolean }
  | { type: 'SET_FOOD_DISH_OPEN'; open: boolean }
  | { type: 'SET_EQUIP_OPEN'; open: boolean }
  | { type: 'SET_PET_BEHAVIOR_SYNC'; state: string }
  | { type: 'CLEAR_PET_BEHAVIOR_SYNC' }
  | { type: 'SET_PET_STATE'; payload: { col: number; row: number; behavior: string; targetCol?: number; targetRow?: number; interactionType?: string; interactionTarget?: string } }
  | { type: 'TREE_SHAKE'; anchorId: string; trigger: number }
  | { type: 'CLEAR_TREE_SHAKE' };
