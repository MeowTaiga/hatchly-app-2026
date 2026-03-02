import { API_BASE_URL } from '@/constants/api';

// ─── Date Helpers ────────────────────────────────────────────────────────────

/**
 * Returns the device-local date as YYYY-MM-DD.
 * Prevents the UTC-based todayStr() on the server from drifting
 * to the next day before the user's local midnight.
 */
export function localDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ─── Achievement Types ──────────────────────────────────────────────────────

export interface UnlockedAchievement {
  achievementId: string;
  title: string;
  description: string;
  message: string;
  icon: string;
  xpReward: number;
}

/**
 * Global achievement listener — set by AchievementProvider.
 * The API client calls this automatically when any response contains
 * newly unlocked achievements. Individual components never call this.
 */
let achievementListener: ((achievements: UnlockedAchievement[]) => void) | null = null;

export function setAchievementListener(listener: ((achievements: UnlockedAchievement[]) => void) | null): void {
  achievementListener = listener;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ApiPet {
  name: string;
  customName: string;
  vibe: string;
  category: string;
  imageUrl: string;
  /** Pose-specific images: { sleeping: url, sitting: url, ... } */
  pose?: Record<string, string>;
  /** 0–100. Low = hungry. Default 100 for legacy users. */
  hunger?: number;
  /** 0–100. Happiness. Default 100 for legacy users. */
  happy?: number;
  /** 0–100. Sours when over-petted. Default 100 for legacy users. */
  mood?: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
}

export interface ApiSubscription {
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';
  plan: 'monthly' | 'yearly';
  currentPeriodEnd: string;
  trialEnd: string | null;
}

export interface ApiUser {
  id: string;
  phone: string;
  username?: string;
  role: string;
  lastLogin: string;
  createdAt: string;
  onboardingComplete: boolean;
  theme?: 'light' | 'dark';
  accentColor?: string;
  pet?: ApiPet;
  subscription?: ApiSubscription | null;
}

// ─── Friends Types ─────────────────────────────────────────────────────────

export interface FriendUser {
  id: string;
  username?: string;
  phone: string;
  pet?: { name: string; customName: string; imageUrl: string };
}

export interface FriendEntry {
  id: string;
  user: FriendUser;
  status: 'pending' | 'accepted';
}

export interface ApiMailEntry {
  _id: string;
  fromUserId: string | null;
  toUserId: string | null;
  subject: string;
  body: string;
  attachedItems: Array<{ itemType: string; qty: number }>;
  sentAt: string;
  claimedAt?: string;
  isBroadcast: boolean;
  fromUsername?: string;
}

// ─── Notifications Types ────────────────────────────────────────────────────

export type NotificationType = 'friend_request' | 'friend_accepted';

export interface ApiNotification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  readAt?: string;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: ApiNotification[];
  unreadCount: number;
  hasMore: boolean;
}

// ─── Food Types ──────────────────────────────────────────────────────────────

export interface FoodItem {
  foodId: string;
  name: string;
  brand?: string;
  description: string;
  type: string;
}

export interface FoodServing {
  servingId: string;
  description: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  sugar?: number;
  fiber?: number;
  saturatedFat?: number;
  transFat?: number;
  addedSugars?: number;
  sodium?: number;
  potassium?: number;
  cholesterol?: number;
  iron?: number;
  calcium?: number;
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
}

export interface FoodDetail {
  foodId: string;
  name: string;
  brand?: string;
  servings: FoodServing[];
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodLogEntry {
  id: string;
  foodId: string;
  foodName: string;
  brandName?: string;
  servingDescription: string;
  numberOfServings: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  sugar?: number;
  fiber?: number;
  saturatedFat?: number;
  transFat?: number;
  addedSugars?: number;
  sodium?: number;
  potassium?: number;
  cholesterol?: number;
  iron?: number;
  calcium?: number;
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
  mealType: MealType;
  loggedAt: string;
}

export interface RecentFood {
  foodId: string;
  foodName: string;
  brandName?: string;
  servingDescription: string;
  numberOfServings: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  sugar?: number;
  fiber?: number;
  saturatedFat?: number;
  transFat?: number;
  addedSugars?: number;
  sodium?: number;
  potassium?: number;
  cholesterol?: number;
  iron?: number;
  calcium?: number;
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
  mealType: MealType;
  lastLogged: string;
}

// ─── Weight Types ────────────────────────────────────────────────────────────

export interface WeightLogEntry {
  id: string;
  weight: number;
  date: string;
}

export interface WeightLogResponse {
  logs: WeightLogEntry[];
  today: WeightLogEntry | null;
  latest: WeightLogEntry | null;
  weeklyChange: number | null;
  onboardingWeight: number | null;
  onboardingGoalWeight: number | null;
}

// ─── Water Types ─────────────────────────────────────────────────────────────

export interface WaterLogEntry {
  id: string;
  amountOz: number;
  date: string;
}

export interface WaterLogResponse {
  logs: WaterLogEntry[];
  totalOz: number;
  goalOz: number;
  goalSourceWeightLbs?: number | null;
  date: string;
}

export interface FoodLogRangeDaily {
  date: string;
  logs: FoodLogEntry[];
  totals: { calories: number; protein: number; fat: number; carbs: number; sugar?: number; fiber?: number; saturatedFat?: number; transFat?: number; addedSugars?: number; sodium?: number; potassium?: number; cholesterol?: number; iron?: number; calcium?: number; vitaminA?: number; vitaminC?: number; vitaminD?: number };
}

export interface FoodLogRangeResponse {
  daily: FoodLogRangeDaily[];
}

export interface WaterLogRangeDaily {
  date: string;
  totalOz: number;
  logs: WaterLogEntry[];
}

export interface WaterLogRangeResponse {
  daily: WaterLogRangeDaily[];
  goalOz: number;
  goalSourceWeightLbs?: number | null;
}

// ─── Weight Goal Types ──────────────────────────────────────────────────────

export interface WeightGoalData {
  id: string;
  targetWeight: number;
  timelineMonths: number;
  targetDate: string;
  tdee: number;
  dailyCalories: number;
  weeklyRateLbs: number;
}

export interface TimelineOption {
  months: number;
  dailyCalories: number;
  weeklyRateLbs: number;
  safe: boolean;
}

export interface RateOption {
  weeklyRateLbs: number;
  dailyCalories: number;
  estimatedWeeks: number;
  safe: boolean;
}

export interface WeightGoalResponse {
  goal: WeightGoalData | null;
  tdee: number;
  currentWeight: number;
  goalWeight: number;
  rateOptions: RateOption[];
}

// ─── Admin Types ────────────────────────────────────────────────────────────

export interface AdminStats {
  date: string;
  food: { logs: number; totalCalories: number };
  water: { logs: number; totalOz: number };
  weight: { logs: number };
  achievements: { unlocked: number };
  users: { total: number; newToday: number };
}

/** Shop section banner — section key, label, optional image, display toggle. */
export interface ShopBanner {
  id: string;
  key: string;
  label: string;
  imageUrl?: string;
  displayImage: boolean;
  sortOrder: number;
  /** Shop section this banner belongs to (e.g. 'fishing_shop'). null/empty = main shop. */
  shopSection?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShopBannerInput {
  key: string;
  label: string;
  imageUrl?: string;
  displayImage?: boolean;
  sortOrder?: number;
  shopSection?: string;
}

export interface ShopConfig {
  banners: ShopBanner[];
}

/** Aggregated collection entry (bugs, fish, fossils). */
export interface CollectionEntry {
  itemType: string;
  count: number;
  bestSize: number;
  lastCaught: string;
}

// ─── Admin Game Item Types ───────────────────────────────────────────────────

export interface AdminGameItemHarvestDrop {
  itemType: string;
  qty: number;
}

export interface AdminGameItemInteractAction {
  type: 'open_scene' | 'open_modal' | 'start_dialog' | 'none';
  payload?: string;
}

export interface AdminDirectionalImages {
  post?: string;
  end?: string;
  straight?: string;
  corner?: string;
  tJunction?: string;
  cross?: string;
}

export type ItemCategory =
  | 'seed' | 'decoration' | 'ingredient' | 'building' | 'scenery'
  | 'flooring' | 'tiled_flooring' | 'fish' | 'bug' | 'equip' | 'soil' | 'food' | 'material' | 'asset'
  | 'npc' | 'tree';

export type BugRarity = 'common' | 'rare' | 'epic' | 'unique' | 'legendary' | 'mythic';
export type BugActiveTime = 'all_day' | 'night' | 'morning' | 'afternoon';

export interface BalloonLootEntry {
  itemType: string;
  rarity: BugRarity;
  weight?: number;
}

export interface FossilLootEntry {
  itemType: string;
  rarity: BugRarity;
  weight?: number;
}

export interface AdminGameItem {
  _id: string;
  itemType: string;
  label: string;
  emoji: string;
  color: string;
  imageUrl?: string;
  category: ItemCategory;
  subCategory?: string;
  placeable: boolean;
  cols: number;
  rows: number;
  growthMs?: number;
  harvestYield: AdminGameItemHarvestDrop[];
  interactAction?: AdminGameItemInteractAction;
  autoConnect?: boolean;
  centerOverflow?: boolean;
  directionalImages?: AdminDirectionalImages;
  buyable?: boolean;
  gemPrice?: number;
  farmLevel?: number;
  petLevel?: number;
  shopSection?: string;
  sellable?: boolean;
  sellPrice?: number;
  availableUntil?: string;
  gemsGiven?: number;
  bugSizeMin?: number;
  bugSizeMax?: number;
  bugRarity?: BugRarity;
  bugActiveTime?: BugActiveTime;
  /** SubCategories this bug spawns on. Empty/undefined = spawn anywhere. */
  bugSpawnOn?: string[];
  /** Scene slugs this bug can spawn in. Empty/undefined = all scenes. */
  bugScenes?: string[];
  fishSizeMin?: number;
  fishSizeMax?: number;
  fishRarity?: BugRarity;
  fishActiveTime?: BugActiveTime;
  /** Spot types where this fish can be caught. Empty/undefined = all spots. */
  fishSpotTypes?: string[];
  lightRadius?: number;
  lightColor?: string;
  lightIntensity?: number;
  foodHunger?: number;
  foodHappiness?: number;
  foodPetXp?: number;
  foodBuffType?: string;
  foodBuffDurationMs?: number;
  /** Dialog steps when subCategory is 'npc'. */
  npcDialog?: { text: string; highlight?: { type: string; target: string } }[];
  /** For fully grown trees: itemType of fruit this tree produces. */
  treeFruit?: string;
  /** For fruit items: tree variant slugs this fruit can grow on. */
  growsOnTrees?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminGameItemInput {
  itemType: string;
  label: string;
  emoji?: string;
  color: string;
  imageUrl?: string;
  category: ItemCategory;
  subCategory?: string | null;
  placeable: boolean;
  cols: number;
  rows: number;
  growthMs?: number;
  harvestYield?: AdminGameItemHarvestDrop[];
  interactAction?: AdminGameItemInteractAction;
  autoConnect?: boolean;
  centerOverflow?: boolean;
  directionalImages?: AdminDirectionalImages;
  buyable?: boolean;
  gemPrice?: number;
  farmLevel?: number | null;
  petLevel?: number | null;
  shopSection?: string | null;
  sellable?: boolean;
  sellPrice?: number | null;
  availableUntil?: string | null;
  gemsGiven?: number | null;
  bugSizeMin?: number | null;
  bugSizeMax?: number | null;
  bugRarity?: BugRarity | null;
  bugActiveTime?: BugActiveTime | null;
  bugSpawnOn?: string[] | null;
  bugScenes?: string[] | null;
  fishSizeMin?: number | null;
  fishSizeMax?: number | null;
  fishRarity?: BugRarity | null;
  fishActiveTime?: BugActiveTime | null;
  fishSpotTypes?: string[] | null;
  lightRadius?: number | null;
  lightColor?: string | null;
  lightIntensity?: number | null;
  foodHunger?: number | null;
  foodHappiness?: number | null;
  foodPetXp?: number | null;
  foodBuffType?: string | null;
  foodBuffDurationMs?: number | null;
  npcDialog?: { text: string }[] | null;
  treeFruit?: string | null;
  growsOnTrees?: string[] | null;
}

// ─── Admin Scene Types ──────────────────────────────────────────────────────

export interface AdminScenePlacement {
  id: string;
  itemType: string;
  x: number;
  y: number;
  scale: number;
  /** Manual layer offset: positive = render on top, negative = render behind. */
  depthOffset?: number;
  /** Rotation in degrees, 0–360 (default 0). */
  rotationDegrees?: number;
}

export interface WalkableRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AdminScene {
  _id: string;
  name: string;
  slug: string;
  cols: number;
  rows: number;
  bgColor: string;
  /** Item type from tiled_flooring category to tile across ground. Null = use bgColor. */
  tiledFlooringItemType?: string | null;
  /** Grass noise 0–0.2, default 0.04. Subtle texture on ground. */
  grassNoiseStrength?: number;
  farmCols: number;
  farmRows: number;
  placements: AdminScenePlacement[];
  /** Multiplayer: rectangular walkable region (pixels). Omit = farm bounds. */
  walkableRect?: WalkableRect | null;
  /** Multiplayer: grid tiles (col, row) that are unwalkable inside the boundary. */
  unwalkableTiles?: Array<{ col: number; row: number }>;
  /** Multiplayer: grid tiles where players can fish (col, row, spotType). */
  fishingTiles?: Array<{ col: number; row: number; spotType?: string }>;
  bakedImageUrl?: string;
  /** Player spawn X coordinate (pixels). */
  spawnX?: number;
  /** Player spawn Y coordinate (pixels). */
  spawnY?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSceneInput {
  name: string;
  slug: string;
  cols: number;
  rows: number;
  bgColor?: string;
  tiledFlooringItemType?: string | null;
  farmCols: number;
  farmRows: number;
}

export interface AdminSceneUpdate {
  name?: string;
  cols?: number;
  rows?: number;
  bgColor?: string;
  tiledFlooringItemType?: string | null;
  grassNoiseStrength?: number;
  farmCols?: number;
  farmRows?: number;
  placements?: AdminScenePlacement[];
  walkableRect?: WalkableRect | null;
  unwalkableTiles?: Array<{ col: number; row: number }>;
  fishingTiles?: Array<{ col: number; row: number; spotType?: string }>;
  spawnX?: number;
  spawnY?: number;
}

// ─── Admin: Quests ──────────────────────────────────────────────────────────

export interface AdminQuestRequirement {
  items?: { itemType: string; qty: number }[];
  buildings?: { itemType: string; count: number }[];
  actions?: { action: string; count: number; itemType?: string }[];
  equips?: { slot: string; itemType?: string; count?: number }[];
  talk_to_npc?: { npcItemType: string; count?: number }[];
  crop_grown?: { itemType: string; count?: number }[];
  open_modal?: { payload: string; count?: number }[];
}

export interface AdminQuestReward {
  items?: { itemType: string; qty: number }[];
  gems?: number;
  xp?: number;
}

export interface AdminDialogHighlight {
  type: 'hud_button' | 'inventory_item' | 'world_item' | 'category_chip' | 'shop_item' | 'shop_category';
  target: string;
}

export interface AdminDialogStep {
  text: string;
  highlight?: AdminDialogHighlight;
  blocking?: boolean;
  /** Override speaker for this step: 'pet' | 'npc'. Falls back to dialog-level speaker if unset. */
  speaker?: 'pet' | 'npc';
}

export interface AdminQuestTrigger {
  type: string;
  questId?: string;
  npcItemType?: string;
  sceneSlug?: string;
  firstVisitOnly?: boolean;
}

export interface AdminQuestStep {
  stepId: string;
  requirements: AdminQuestRequirement;
  dialogBefore?: AdminDialogStep[];
  dialogAfter?: AdminDialogStep[];
  blocking?: boolean;
  rewards?: AdminQuestReward;
  nextStepId?: string;
}

export interface AdminQuestDef {
  questId: string;
  type: 'farm_upgrade' | 'story' | 'daily';
  title: string;
  description: string;
  farmLevel?: number;
  petLevelMin?: number;
  farmLevelMin?: number;
  requiredQuestId?: string;
  requirements: AdminQuestRequirement;
  rewards: AdminQuestReward;
  sortOrder: number;
  startDialog?: AdminDialogStep[];
  endDialog?: AdminDialogStep[];
  startDialogSpeaker?: 'pet' | 'npc';
  endDialogSpeaker?: 'pet' | 'npc';
  autoTrigger?: string;
  triggers?: AdminQuestTrigger[];
  steps?: AdminQuestStep[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminQuestInput {
  questId: string;
  type: 'farm_upgrade' | 'story' | 'daily';
  title: string;
  description?: string;
  farmLevel?: number;
  petLevelMin?: number;
  farmLevelMin?: number;
  requiredQuestId?: string;
  requirements?: AdminQuestRequirement;
  rewards?: AdminQuestReward;
  sortOrder?: number;
  startDialog?: AdminDialogStep[];
  endDialog?: AdminDialogStep[];
  startDialogSpeaker?: 'pet' | 'npc';
  endDialogSpeaker?: 'pet' | 'npc';
  autoTrigger?: string;
  triggers?: AdminQuestTrigger[];
  steps?: AdminQuestStep[];
}

export interface AdminQuestUpdate {
  type?: 'farm_upgrade' | 'story' | 'daily';
  title?: string;
  description?: string;
  farmLevel?: number;
  petLevelMin?: number | null;
  farmLevelMin?: number | null;
  requiredQuestId?: string | null;
  requirements?: AdminQuestRequirement;
  rewards?: AdminQuestReward;
  sortOrder?: number;
  startDialog?: AdminDialogStep[];
  endDialog?: AdminDialogStep[];
  startDialogSpeaker?: 'pet' | 'npc' | null;
  endDialogSpeaker?: 'pet' | 'npc' | null;
  autoTrigger?: string | null;
  triggers?: AdminQuestTrigger[] | null;
  steps?: AdminQuestStep[] | null;
}

// ─── Admin Recipe Types ──────────────────────────────────────────────────────

export interface AdminRecipeIngredient {
  itemType: string;
  qty: number;
}

export interface AdminRecipe {
  _id: string;
  recipeId: string;
  label: string;
  resultItemType: string;
  resultQty: number;
  ingredients: AdminRecipeIngredient[];
  difficulty: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRecipeInput {
  recipeId: string;
  label: string;
  resultItemType: string;
  resultQty?: number;
  ingredients: AdminRecipeIngredient[];
  difficulty?: number;
  sortOrder?: number;
}

export interface AdminRecipeUpdate {
  label?: string;
  resultItemType?: string;
  resultQty?: number;
  ingredients?: AdminRecipeIngredient[];
  difficulty?: number;
  sortOrder?: number;
}

// ─── Recipe Journal Types ───────────────────────────────────────────────────

export interface RecipeJournalEntry {
  recipeId: string;
  label: string;
  resultItemType: string;
  resultQty: number;
  ingredients: AdminRecipeIngredient[];
  difficulty: number;
  discoveredAt?: string;
  timesCrafted?: number;
}

export interface RecipeJournalResponse {
  recipes: RecipeJournalEntry[];
  discoveredCount: number;
  totalCount: number;
}

export interface VerifyCodeResponse {
  token: string;
  user: ApiUser;
  isNewUser: boolean;
}

export interface ApiError {
  success: false;
  message: string;
  code?: string;
  details?: Array<{ field?: string; path?: string; message: string }>;
}

// ─── Chat Types ────────────────────────────────────────────────────────────

export interface ChatMessageSuggest {
  component: string;
  content: string;
  title: string;
}

export interface ChatMessageEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  suggest?: ChatMessageSuggest;
}

interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
}

// ─── ApiClient ──────────────────────────────────────────────────────────────

/**
 * Singleton HTTP client for the Hatchly backend.
 *
 * - Single `request()` method handles auth headers, JSON parsing, error normalisation
 * - Every public method is a thin typed wrapper — zero duplicate fetch logic
 * - Auth token is injected lazily via a getter so it always reads the latest value
 */
class ApiClient {
  private baseUrl: string;
  private getToken: () => string | null;

  constructor(baseUrl: string, tokenGetter: () => string | null) {
    this.baseUrl = baseUrl;
    this.getToken = tokenGetter;
  }

  /**
   * Core request method — every other method delegates here.
   * Handles auth header injection, JSON serialisation, and error normalisation.
   */
  private async request<T>(method: string, path: string, opts?: RequestOptions): Promise<T> {
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...opts?.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      ...(opts?.body !== undefined && { body: JSON.stringify(opts.body) }),
    });

    const json = await res.json();

    if (!res.ok) {
      const err = json as ApiError;
      let message = err.message ?? 'Request failed';
      if (err.details?.length) {
        const fieldErrors = err.details.map((d) => `${d.field ?? d.path ?? '?'}: ${d.message}`).join(', ');
        message = `${message} (${fieldErrors})`;
      }
      throw new ApiRequestError(message, res.status, err.code);
    }

    // Auto-detect newly unlocked achievements in mutating responses.
    // Only fires on POST/PATCH/PUT/DELETE — never on GET (which returns
    // the full achievement list, not newly unlocked ones).
    const data = json.data as any;
    if (method !== 'GET' && data?.achievements?.length && achievementListener) {
      achievementListener(data.achievements as UnlockedAchievement[]);
    }

    return data as T;
  }

  // ── Auth ────────────────────────────────────────────────────────────────

  /** Requests a Twilio SMS verification code for the given phone number. */
  async requestCode(phone: string): Promise<void> {
    await this.request('POST', '/auth/request-code', { body: { phone } });
  }

  /** Verifies the SMS code and returns a JWT + user profile. */
  async verifyCode(phone: string, code: string): Promise<VerifyCodeResponse> {
    return this.request<VerifyCodeResponse>('POST', '/auth/verify-code', {
      body: { phone, code },
    });
  }

  // ── Pets ─────────────────────────────────────────────────────────────────

  /** Generates 3 pet options based on personality. Returns pet metadata + base64 images. */
  async generatePets(personalityVibe: string, companionStyle: string): Promise<{
    pets: Array<{
      name: string;
      vibe: string;
      category: string;
      special: boolean;
      baseColor: string;
      secondaryColor: string;
      image: string | null;
    }>;
  }> {
    return this.request('POST', '/pets/generate', {
      body: { personalityVibe, companionStyle },
    });
  }

  /**
   * Eagerly persists the user's chosen pet so it survives app
   * crashes / force-closes on the subscription page.
   * Does **not** set `onboardingComplete`.
   */
  async savePetDraft(pet: {
    name: string;
    customName: string;
    vibe: string;
    category: string;
    special: boolean;
    baseColor: string;
    secondaryColor: string;
    image: string;
  }): Promise<{ pet: ApiPet }> {
    return this.request('POST', '/pets/save-draft', { body: pet });
  }

  /**
   * Confirms the user's pet selection.
   * Uploads the base64 image to R2 and persists the pet on the user's account.
   * Returns the saved pet with a permanent R2 image URL.
   */
  async selectPet(pet: {
    name: string;
    customName: string;
    vibe: string;
    category: string;
    special: boolean;
    baseColor: string;
    secondaryColor: string;
    image: string;
  }): Promise<{ pet: ApiPet }> {
    return this.request('POST', '/pets/select', { body: pet });
  }

  /**
   * Generates a new pose of the user's pet using the current pet image as reference.
   * Saves result to pet.pose[poseKey]. Admin-only. Keeps style, colors, black outlines.
   * @param posePrompt — e.g. "sleeping", "sitting and waving"
   * @param poseKey — Key under pet.pose, e.g. "sleeping"
   * @param saveAsDefault — If true, also updates the pet's main imageUrl
   */
  async generatePetPose(
    posePrompt: string,
    poseKey: string,
    saveAsDefault = false,
  ): Promise<{ imageUrl: string; poseKey: string; savedAsDefault: boolean }> {
    return this.request('POST', '/pets/generate-pose', {
      body: { posePrompt, poseKey, saveAsDefault },
    });
  }

  /** Saves an image URL to pet.pose[poseKey]. Admin-only. */
  async savePetPose(poseKey: string, imageUrl: string): Promise<{ pet: ApiPet }> {
    return this.request('PATCH', '/pets/me/pose', { body: { poseKey, imageUrl } });
  }

  /** Updates the user's pet image URL (e.g. after selecting a generated pose). */
  async updatePetImage(imageUrl: string): Promise<{ pet: ApiPet }> {
    return this.request('PATCH', '/pets/me/image', { body: { imageUrl } });
  }

  /** Pet interaction. Returns updated pet, xpGained, and overPet (sour). */
  async petPet(): Promise<{ pet: ApiPet; xpGained: number; overPet: boolean }> {
    return this.request('POST', '/pets/me/pet');
  }

  /** Fetches all pets from the onboarding catalog. Admin-only. */
  async getPetCatalog(): Promise<{ pets: Array<{ name: string; vibe: string; category: string }> }> {
    return this.request('GET', '/pets/catalog');
  }

  /** Generates a single pet image for a chosen pet and replaces the user's pet. Admin-only. */
  async generatePetOne(data: {
    name: string;
    vibe: string;
    baseColor: string;
    secondaryColor: string;
    customName?: string;
  }): Promise<{ pet: ApiPet }> {
    return this.request('POST', '/pets/generate-one', { body: data });
  }

  // ── User ────────────────────────────────────────────────────────────────

  /** Fetches the authenticated user's profile. */
  async getMe(): Promise<ApiUser> {
    return this.request<ApiUser>('GET', '/users/me');
  }

  /** Updates the authenticated user's profile fields. */
  async updateProfile(data: Record<string, unknown>): Promise<ApiUser> {
    return this.request<ApiUser>('PATCH', '/users/me', { body: data });
  }

  /**
   * First login of the day: claims daily rewards (fossil holes + AI greeting).
   * Idempotent. Returns greeting if first login today.
   */
  async claimDailyLoginRewards(params?: { timezone?: string }): Promise<{
    placedFossilHoles: boolean;
    greeting?: string;
  }> {
    const timezone = params?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    return this.request('POST', '/users/daily-login-rewards', {
      body: { timezone },
    });
  }

  /** Fetches the saved onboarding profile for hydrating on relaunch. */
  async getOnboardingProgress(): Promise<{
    profile: {
      displayName?: string;
      personalityVibe?: string;
      companionStyle?: string;
      gender?: string;
      birthday?: string;
      heightFeet?: number;
      heightInches?: number;
      currentWeight?: number;
      goalWeight?: number;
      activityLevel?: string;
      goals?: string[];
      dietary?: string[];
      lastStep?: string;
    } | null;
  }> {
    return this.request('GET', '/users/me/onboarding-progress');
  }

  /**
   * Fire-and-forget checkpoint — saves partial onboarding answers + the
   * current step name so we can track where users drop off.
   */
  async saveOnboardingProgress(step: string, data: Record<string, unknown>): Promise<void> {
    await this.request('PATCH', '/users/me/onboarding-progress', {
      body: { step, ...data },
    });
  }

  /** Submits completed onboarding data to the backend. */
  async completeOnboarding(data: Record<string, unknown>): Promise<void> {
    await this.request('POST', '/users/me/onboarding', { body: data });
  }

  // ── Subscription ─────────────────────────────────────────────────────────

  /** Validates an App Store / Play Store receipt with the backend. */
  async validateSubscription(data: {
    platform: string;
    plan: string;
    receipt: string;
    purchaseToken: string;
  }): Promise<void> {
    await this.request('POST', '/subscription/validate', { body: data });
  }

  /** Starts a free trial subscription via the backend. */
  async startTrial(plan: string): Promise<void> {
    await this.request('POST', '/subscription/trial', { body: { plan } });
  }

  // ── Friends ─────────────────────────────────────────────────────────────

  async searchFriends(q: string): Promise<FriendUser[]> {
    return this.request('GET', `/friends/search?q=${encodeURIComponent(q)}`);
  }

  async sendFriendRequest(userId: string): Promise<{ id: string; status: string }> {
    return this.request('POST', '/friends/request', { body: { userId } });
  }

  async getFriends(): Promise<{
    friends: FriendEntry[];
    sent: FriendEntry[];
    received: FriendEntry[];
  }> {
    return this.request('GET', '/friends');
  }

  async respondToFriendRequest(requestId: string, status: 'accepted' | 'rejected'): Promise<{ id: string; status: string }> {
    return this.request('PATCH', `/friends/request/${requestId}`, { body: { status } });
  }

  async removeFriend(userId: string): Promise<{ deleted: number }> {
    return this.request('DELETE', `/friends/${userId}`);
  }

  // ── Mail ─────────────────────────────────────────────────────────────────

  async getMailInbox(): Promise<{ mail: ApiMailEntry[] }> {
    return this.request('GET', '/mail/inbox');
  }

  async sendMail(data: {
    toUserId: string;
    subject: string;
    body: string;
    attachedItems?: Array<{ itemType: string; qty: number }>;
  }): Promise<{ mail: ApiMailEntry }> {
    return this.request('POST', '/mail/send', { body: data });
  }

  async claimMail(mailId: string): Promise<{ success: boolean; inventory?: Record<string, number> }> {
    return this.request('POST', `/mail/${mailId}/claim`);
  }

  // ── Notifications ───────────────────────────────────────────────────────

  async registerPushToken(token: string, platform?: 'ios' | 'android'): Promise<{ registered: boolean }> {
    return this.request('POST', '/users/me/push-token', { body: { token, platform } });
  }

  async getNotifications(params?: { limit?: number; before?: string }): Promise<NotificationsResponse> {
    const q = new URLSearchParams();
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.before) q.set('before', params.before);
    const suffix = q.toString() ? `?${q}` : '';
    return this.request('GET', `/notifications${suffix}`);
  }

  async markNotificationRead(id: string): Promise<{ read: boolean }> {
    return this.request('PATCH', `/notifications/${id}/read`);
  }

  async markAllNotificationsRead(): Promise<{ read: boolean }> {
    return this.request('PATCH', '/notifications/read-all');
  }

  // ── Food ────────────────────────────────────────────────────────────────

  async searchFood(query: string, page = 0): Promise<{ foods: FoodItem[]; total: number; page: number }> {
    return this.request('GET', `/food/search?q=${encodeURIComponent(query)}&page=${page}`);
  }

  async getFoodDetail(id: string): Promise<{ food: FoodDetail }> {
    return this.request('GET', `/food/${id}`);
  }

  async getFoodByBarcode(barcode: string): Promise<{ food: FoodDetail }> {
    return this.request('GET', `/food/barcode/${encodeURIComponent(barcode)}`);
  }

  async logFood(data: {
    foodId: string;
    foodName: string;
    brandName?: string;
    servingDescription: string;
    numberOfServings: number;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    sugar?: number;
    fiber?: number;
    saturatedFat?: number;
    transFat?: number;
    addedSugars?: number;
    sodium?: number;
    potassium?: number;
    cholesterol?: number;
    iron?: number;
    calcium?: number;
    vitaminA?: number;
    vitaminC?: number;
    vitaminD?: number;
    mealType: MealType;
  }): Promise<{ log: FoodLogEntry; pet: ApiPet | null; xpGained: number; gemsAwarded?: number; achievements?: UnlockedAchievement[] }> {
    return this.request('POST', '/food/log', { body: { ...data, date: localDateStr() } });
  }

  async getFoodLog(date?: string): Promise<{
    logs: FoodLogEntry[];
    totals: { calories: number; protein: number; fat: number; carbs: number; sugar?: number; fiber?: number; saturatedFat?: number; transFat?: number; addedSugars?: number; sodium?: number; potassium?: number; cholesterol?: number; iron?: number; calcium?: number; vitaminA?: number; vitaminC?: number; vitaminD?: number };
    date: string;
  }> {
    const d = date ?? localDateStr();
    return this.request('GET', `/food/log?date=${d}`);
  }

  async getFoodLogRange(start: string, end: string): Promise<FoodLogRangeResponse> {
    return this.request('GET', `/food/log/range?start=${start}&end=${end}`);
  }

  async getRecentFoods(): Promise<{ foods: RecentFood[] }> {
    return this.request('GET', '/food/log/recent');
  }

  async createRecipe(data: {
    name: string;
    ingredients: Array<{
      foodId: string; foodName: string; servingDescription: string;
      numberOfServings: number; calories: number; protein: number;
      fat: number; carbs: number;
      sugar?: number; fiber?: number; sodium?: number; potassium?: number;
    }>;
    servings: number;
  }): Promise<any> {
    return this.request('POST', '/food/recipe', { body: data });
  }

  async getRecipes(): Promise<any> {
    return this.request('GET', '/food/recipes');
  }

  async deleteFoodLog(id: string): Promise<{ deleted: boolean }> {
    return this.request('DELETE', `/food/log/${id}`);
  }

  async updateFoodLog(id: string, data: { mealType?: MealType }): Promise<{ log: FoodLogEntry }> {
    return this.request('PATCH', `/food/log/${id}`, { body: data });
  }

  async getMacroGoals(): Promise<{ goals: Partial<Record<string, number>> | null }> {
    return this.request('GET', '/food/macro-goals');
  }

  async updateMacroGoals(goals: Partial<Record<string, number>>): Promise<{ goals: Partial<Record<string, number>> }> {
    return this.request('PATCH', '/food/macro-goals', { body: goals });
  }

  // ── Weight ─────────────────────────────────────────────────────────────

  async logWeight(weight: number): Promise<{ log: WeightLogEntry; pet: ApiPet | null; xpGained: number; gemsAwarded?: number; achievements?: UnlockedAchievement[] }> {
    return this.request('POST', '/weight/log', { body: { weight, date: localDateStr() } });
  }

  async getWeightLog(): Promise<WeightLogResponse> {
    return this.request('GET', `/weight/log?date=${localDateStr()}`);
  }

  async updateTodayWeight(weight: number): Promise<{ log: WeightLogEntry }> {
    return this.request('PATCH', '/weight/log/today', { body: { weight, date: localDateStr() } });
  }

  // ── Water ──────────────────────────────────────────────────────────────

  async logWater(amountOz: number): Promise<{ log: WaterLogEntry; pet: ApiPet | null; xpGained: number; gemsAwarded?: number; achievements?: UnlockedAchievement[] }> {
    return this.request('POST', '/water/log', { body: { amountOz, date: localDateStr() } });
  }

  async getWaterLog(date?: string): Promise<WaterLogResponse> {
    const d = date ?? localDateStr();
    return this.request('GET', `/water/log?date=${d}`);
  }

  async getWaterLogRange(start: string, end: string): Promise<WaterLogRangeResponse> {
    return this.request('GET', `/water/log/range?start=${start}&end=${end}`);
  }

  // ── Weight Goal ────────────────────────────────────────────────────────

  async getWeightGoal(): Promise<WeightGoalResponse> {
    return this.request('GET', '/weight/goal');
  }

  async setWeightGoal(params: { weeklyRateLbs: number } | { dailyCalories: number }): Promise<{ goal: WeightGoalData }> {
    return this.request('POST', '/weight/goal', { body: params });
  }

  // ── Achievements ────────────────────────────────────────────────────────

  /** Fetches all achievements with unlock status for the current user. */
  async getAchievements(): Promise<{ achievements: Array<{
    achievementId: string;
    title: string;
    description: string;
    category: string;
    icon: string;
    xpReward: number;
    unlocked: boolean;
    unlockedAt: string | null;
  }> }> {
    return this.request('GET', '/achievements');
  }

  // ── Scenes ──────────────────────────────────────────────────────────────

  async getScene(slug: string): Promise<{
    slug: string;
    name: string;
    cols: number;
    rows: number;
    bgColor: string;
    tiledFlooringItemType?: string | null;
    grassNoiseStrength?: number;
    farmCols: number;
    farmRows: number;
    placements: Array<{ id: string; itemType: string; x: number; y: number; scale: number; depthOffset?: number }>;
    walkableRect: { x: number; y: number; w: number; h: number } | null;
    unwalkableTiles: Array<{ col: number; row: number }>;
    fishingTiles: Array<{ col: number; row: number; spotType?: string }>;
    bakedImageUrl: string | null;
    spawnX?: number;
    spawnY?: number;
  }> {
    return this.request('GET', `/game/scenes/${encodeURIComponent(slug)}`);
  }

  // ── Admin ───────────────────────────────────────────────────────────────

  /** Fetches daily aggregate stats. Requires admin role. */
  async getAdminStats(date?: string): Promise<AdminStats> {
    const d = date ?? localDateStr();
    return this.request('GET', `/admin/stats?date=${d}`);
  }

  // ── Admin: Game Items ──────────────────────────────────────────────────

  /** Lists all game item definitions. Requires admin role. */
  async getGameItems(): Promise<AdminGameItem[]> {
    return this.request('GET', '/admin/game-items');
  }

  /** Creates a new game item definition. Requires admin role. */
  async createGameItem(data: AdminGameItemInput): Promise<AdminGameItem> {
    return this.request('POST', '/admin/game-items', { body: data });
  }

  /** Updates an existing game item definition. Requires admin role. */
  async updateGameItem(itemType: string, data: Partial<AdminGameItemInput>): Promise<AdminGameItem> {
    return this.request('PATCH', `/admin/game-items/${itemType}`, { body: data });
  }

  /** Deletes a game item definition. Requires admin role. */
  async deleteGameItem(itemType: string): Promise<{ deleted: boolean }> {
    return this.request('DELETE', `/admin/game-items/${itemType}`);
  }

  /** Balloon loot pool: entries that can drop when popping balloons. Requires admin. */
  async getBalloonLoot(): Promise<{ entries: BalloonLootEntry[] }> {
    return this.request('GET', '/admin/balloon-loot');
  }

  /** Replace balloon loot pool. Requires admin. */
  async updateBalloonLoot(entries: BalloonLootEntry[]): Promise<{ entries: BalloonLootEntry[] }> {
    if (__DEV__) console.log('[BalloonLoot] PUT /admin/balloon-loot, entries:', entries.length);
    return this.request('PUT', '/admin/balloon-loot', { body: { entries } });
  }

  /** Fossil loot pool: entries that can drop when digging fossils. Requires admin. */
  async getFossilLoot(): Promise<{ entries: FossilLootEntry[] }> {
    return this.request('GET', '/admin/fossil-loot');
  }

  /** Replace fossil loot pool. Requires admin. */
  async updateFossilLoot(entries: FossilLootEntry[]): Promise<{ entries: FossilLootEntry[] }> {
    if (__DEV__) console.log('[FossilLoot] PUT /admin/fossil-loot, entries:', entries.length);
    return this.request('PUT', '/admin/fossil-loot', { body: { entries } });
  }

  /** Extracts dominant colors from an item's image. Requires admin. */
  async extractImageColors(itemType: string): Promise<{ colors: string[] }> {
    return this.request('GET', `/admin/extract-image-colors?itemType=${encodeURIComponent(itemType)}`);
  }

  /** Generates an AI image for a game item and uploads to R2. For autoConnect items, generates all 6 directional variants. */
  async generateGameItemImage(
    itemType: string,
    prompt?: string,
    referenceItemType?: string,
  ): Promise<{
    imageUrl: string;
    directionalImages?: AdminDirectionalImages;
    item: AdminGameItem;
  }> {
    const body: { prompt?: string; referenceItemType?: string } = {};
    if (prompt) body.prompt = prompt;
    if (referenceItemType) body.referenceItemType = referenceItemType;
    return this.request('POST', `/admin/game-items/${itemType}/generate-image`, { body });
  }

  // ── Admin: Shop Banners ─────────────────────────────────────────────────

  /** Shop section banner shown in the Shop tab. */
  async getShopBanners(): Promise<ShopBanner[]> {
    return this.request('GET', '/admin/shop-banners');
  }

  /** Creates a shop banner. */
  async createShopBanner(data: ShopBannerInput): Promise<ShopBanner> {
    return this.request('POST', '/admin/shop-banners', { body: data });
  }

  /** Updates a shop banner. */
  async updateShopBanner(id: string, data: Partial<ShopBannerInput>): Promise<ShopBanner> {
    return this.request('PATCH', `/admin/shop-banners/${id}`, { body: data });
  }

  /** Deletes a shop banner. */
  async deleteShopBanner(id: string): Promise<{ deleted: boolean }> {
    return this.request('DELETE', `/admin/shop-banners/${id}`);
  }

  /** Generates an AI image for a shop banner. */
  async generateShopBannerImage(id: string, prompt?: string): Promise<{
    imageUrl: string;
    banner: ShopBanner;
  }> {
    return this.request('POST', `/admin/shop-banners/${id}/generate-image`, {
      body: prompt ? { prompt } : {},
    });
  }

  // ── Admin: Scenery Bake ─────────────────────────────────────────────────

  async getSceneryBakes(): Promise<{
    bakes: Array<{ farmCols: number; farmRows: number; imageUrl: string; updatedAt: string }>;
    farmLevels: Array<{ level: number; xpRequired: number; title: string; emoji: string; cols: number; rows: number }>;
  }> {
    return this.request('GET', '/admin/scenery');
  }

  async bakeScenery(farmCols: number, farmRows: number): Promise<{ imageUrl: string }> {
    return this.request('POST', '/admin/scenery/bake', { body: { farmCols, farmRows } });
  }

  async precomputeSceneryPlacements(
    farmCols: number,
    farmRows: number,
    overrides?: {
      outerBushType?: string;
      treeTypes?: string[];
    },
  ): Promise<{
    placements: AdminScenePlacement[];
    farmCols: number;
    farmRows: number;
  }> {
    return this.request('POST', '/admin/scenery/precompute', {
      body: { farmCols, farmRows, overrides: overrides && Object.keys(overrides).length ? overrides : undefined },
    });
  }

  // ── Admin: Scenes ──────────────────────────────────────────────────────

  async getScenes(): Promise<{
    scenes: AdminScene[];
    farmLevels: Array<{ level: number; xpRequired: number; title: string; emoji: string; cols: number; rows: number }>;
    bakes: Array<{ farmCols: number; farmRows: number; imageUrl: string; updatedAt: Date }>;
  }> {
    return this.request('GET', '/admin/scenes');
  }

  async getAdminScene(slug: string): Promise<AdminScene> {
    return this.request('GET', `/admin/scenes/${slug}`);
  }

  async createScene(data: AdminSceneInput): Promise<AdminScene> {
    return this.request('POST', '/admin/scenes', { body: data });
  }

  async updateScene(slug: string, data: Partial<AdminSceneUpdate>): Promise<AdminScene> {
    return this.request('PATCH', `/admin/scenes/${slug}`, { body: data });
  }

  async deleteScene(slug: string): Promise<{ deleted: boolean }> {
    return this.request('DELETE', `/admin/scenes/${slug}`);
  }

  async bakeScene(slug: string): Promise<{ imageUrl: string }> {
    return this.request('POST', `/admin/scenes/${slug}/bake`);
  }

  // ── Admin: Action Payloads ──────────────────────────────────────────

  async getActionPayloads(): Promise<{ payloads: string[] }> {
    return this.request('GET', '/admin/action-payloads');
  }

  async getQuestActionTypes(): Promise<{ actions: string[] }> {
    return this.request('GET', '/admin/quest-action-types');
  }

  async getQuestEquipSlots(): Promise<{ slots: string[] }> {
    return this.request('GET', '/admin/quest-equip-slots');
  }

  // ── Admin: Quests ─────────────────────────────────────────────────────

  async getQuests(): Promise<{ quests: AdminQuestDef[] }> {
    return this.request('GET', '/admin/quests');
  }

  async createQuest(data: AdminQuestInput): Promise<AdminQuestDef> {
    return this.request('POST', '/admin/quests', { body: data });
  }

  async updateQuest(questId: string, data: AdminQuestUpdate): Promise<AdminQuestDef> {
    return this.request('PATCH', `/admin/quests/${questId}`, { body: data });
  }

  async deleteQuest(questId: string): Promise<{ deleted: boolean }> {
    return this.request('DELETE', `/admin/quests/${questId}`);
  }

  // ── Admin: Recipes ──────────────────────────────────────────────────────

  async getAdminRecipes(): Promise<AdminRecipe[]> {
    return this.request('GET', '/admin/recipes');
  }

  async createAdminRecipe(data: AdminRecipeInput): Promise<AdminRecipe> {
    return this.request('POST', '/admin/recipes', { body: data });
  }

  async updateAdminRecipe(recipeId: string, data: AdminRecipeUpdate): Promise<AdminRecipe> {
    return this.request('PATCH', `/admin/recipes/${recipeId}`, { body: data });
  }

  async deleteAdminRecipe(recipeId: string): Promise<{ deleted: boolean }> {
    return this.request('DELETE', `/admin/recipes/${recipeId}`);
  }


  // ── Admin: My Farm (in-game dev tools) ───────────────────────────────────

  /** Admin: reset current user's quests. Requires admin. */
  async resetMyQuests(): Promise<{ deleted: number }> {
    return this.request('POST', '/admin/my-farm/reset-quests');
  }

  /** Admin: reset current user's farm. Requires admin. */
  async resetMyFarm(): Promise<{ ok: boolean }> {
    return this.request('POST', '/admin/my-farm/reset-farm');
  }

  /** Admin: search users by ID or username. */
  async adminSearchUsers(q: string): Promise<{ id: string; username: string }[]> {
    if (!q.trim()) return [];
    return this.request('GET', `/admin/users/search?q=${encodeURIComponent(q)}`);
  }

  /** Admin: send mail to a user or broadcast to all. toUserId omitted = broadcast. */
  async sendAdminMail(data: {
    toUserId?: string;
    subject: string;
    body: string;
    attachedItems?: Array<{ itemType: string; qty: number }>;
  }): Promise<{ mail: ApiMailEntry }> {
    return this.request('POST', '/admin/mail/send', { body: data });
  }

  /** Admin: update current user's farm (gems, level). Requires admin. */
  async updateMyFarm(data: { gems?: number; farmLevel?: number }): Promise<{
    farmXp: number;
    gems: number;
    farmLevel: number;
  }> {
    return this.request('PATCH', '/admin/my-farm', { body: data });
  }

  /** Admin: add item to current user's inventory for testing. Requires admin. */
  async grantItemToSelf(itemType: string, qty?: number): Promise<{ inventory: Record<string, number> }> {
    return this.request('POST', '/admin/my-farm/grant-item', { body: { itemType, qty: qty ?? 1 } });
  }

  /** Admin: spawn stress test bots into current multiplayer instance. Requires admin, must be in MP scene. */
  async spawnStressTestBots(count?: number): Promise<{ spawned: number }> {
    return this.request('POST', '/admin/multiplayer/stress-test', { body: { count: count ?? 10 } });
  }

  /** Admin: remove all stress test bots from current multiplayer instance. */
  async removeStressTestBots(): Promise<{ removed: number }> {
    return this.request('POST', '/admin/multiplayer/stress-test/remove');
  }

  // ── Game (authenticated) ────────────────────────────────────────────────

  /** Lightweight game summary for home tab: farm level, gems, quest count. */
  async getGameSummary(): Promise<{
    farmLevel: number;
    gems: number;
    questCount: number;
    farmLevelTitle: string;
    farmLevelEmoji: string;
    xpProgress: number;
  }> {
    return this.request('GET', '/game/summary');
  }

  /** Fetches shop config (banners) for the Shop tab. section= missing = main shop, 'fishing_shop' = fishing shop. */
  async getShopConfig(section?: string): Promise<ShopConfig> {
    const q = section ? `?section=${encodeURIComponent(section)}` : '';
    return this.request('GET', `/game/shop-config${q}`);
  }

  /** Fetches the user's collectible catalog (bugs, fish, discoverables). */
  async getCollection(category?: 'bug' | 'fish' | 'discoverables'): Promise<CollectionEntry[]> {
    const q = category ? `?category=${category}` : '';
    return this.request('GET', `/game/collection${q}`);
  }

  /** Fetches the user's recipe journal (discovered + all cooking recipes). */
  async getRecipeJournal(): Promise<RecipeJournalResponse> {
    return this.request('GET', '/game/recipe-journal');
  }

  /** Fetches the user's craft journal (discovered + all crafting recipes). */
  async getCraftJournal(): Promise<RecipeJournalResponse> {
    return this.request('GET', '/game/craft-journal');
  }

  // ── Chat ─────────────────────────────────────────────────────────────────

  /** Fetches the pet chat history (last ~100 messages). */
  async getChatHistory(): Promise<{ messages: ChatMessageEntry[]; needsMoodToday: boolean }> {
    return this.request('GET', '/chat/history');
  }

  /** Logs mood for the day (once/day). Awards xp + gems. */
  async logMood(mood: string): Promise<{
    log: { mood: string; date: string };
    pet: ApiPet | null;
    xpGained: number;
    gemsAwarded: number;
  }> {
    return this.request('POST', '/mood/log', { body: { mood } });
  }

  /** Sends a message to the pet and returns the user message + pet reply. */
  async sendChatMessage(content: string): Promise<{
    message: ChatMessageEntry;
    reply: ChatMessageEntry;
  }> {
    return this.request('POST', '/chat/send', { body: { content } });
  }

  /** Completes a suggestion and claims reward (gems + random balloon item). Max 3/day. */
  async completeSuggestion(messageId: string): Promise<{
    gemsAwarded: number;
    item?: { itemType: string; label: string; imageUrl?: string; emoji?: string; qty: number };
    limitReached: boolean;
  }> {
    return this.request('POST', '/chat/complete-suggestion', { body: { messageId } });
  }

  // ── Health ──────────────────────────────────────────────────────────────

  /** Checks if the backend is reachable. */
  async health(): Promise<{ status: string }> {
    const res = await fetch(`${this.baseUrl}/health`);
    return res.json();
  }
}

// ─── Error class ────────────────────────────────────────────────────────────

/**
 * Structured error thrown by `ApiClient` on non-2xx responses.
 * Contains the HTTP status code and an optional machine-readable `code`.
 */
export class ApiRequestError extends Error {
  public readonly status: number;
  public readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

/**
 * The token getter is set lazily after the auth store initialises.
 * This avoids circular imports between lib/api.ts and store/auth.ts.
 */
let tokenGetter: () => string | null = () => null;

export function setApiTokenGetter(getter: () => string | null): void {
  tokenGetter = getter;
  api = new ApiClient(API_BASE_URL!, tokenGetter);
}

export let api = new ApiClient(API_BASE_URL!, tokenGetter);
