/**
 * Central config for pet state machine, effects, and item interactions.
 */
import type { PetPose } from '@/constants/pet';

// ─── Item Sub-Categories ─────────────────────────────────────────────────────

export const SUB_CATEGORY = {
  PET_BED: 'pet_bed',
  FOOD: 'food',
} as const;

export type SubCategory = (typeof SUB_CATEGORY)[keyof typeof SUB_CATEGORY];

export const PET_WALKABLE_SUBCATEGORIES: readonly string[] = [
  SUB_CATEGORY.PET_BED,
  SUB_CATEGORY.FOOD,
];

// ─── Pet States ─────────────────────────────────────────────────────────────

export const PET_STATES = ['idle', 'walking', 'sleepy', 'sleeping', 'hungry', 'eating', 'admiring', 'digging'] as const;
export type PetState = (typeof PET_STATES)[number];

/** Behaviors during which scheduleNext must not start or override a walk. */
export const SCHEDULE_BLOCKED_BEHAVIORS: readonly PetState[] = [
  'sleeping', 'sleepy', 'eating', 'admiring', 'walking', 'digging',
];

/** Per-state config: pose + effect timings. */
export interface PetStateEffectConfig {
  pose: PetPose | null;
  bubbleChance: number;
  bubbleIntervalMs: [number, number];
  bubbleDurationMs: number;
  bubbleMoodOverride?: import('./PetBubble').BubbleMood;
}

export const STATE_EFFECTS: Record<PetState, PetStateEffectConfig> = {
  idle: {
    pose: null,
    bubbleChance: 0.2,
    bubbleIntervalMs: [6000, 14000],
    bubbleDurationMs: 2500,
  },
  walking: {
    pose: 'walking',
    bubbleChance: 0,
    bubbleIntervalMs: [8000, 12000],
    bubbleDurationMs: 2000,
  },
  sleepy: {
    pose: 'sleepy',
    bubbleChance: 1,
    bubbleIntervalMs: [800, 1200],
    bubbleDurationMs: 2000,
    bubbleMoodOverride: 'sleepy',
  },
  sleeping: {
    pose: 'sleeping',
    bubbleChance: 1,
    bubbleIntervalMs: [1000, 2000],
    bubbleDurationMs: 3000,
    bubbleMoodOverride: 'sleepy',
  },
  hungry: {
    pose: 'hungry',
    bubbleChance: 0.28,
    bubbleIntervalMs: [4000, 9000],
    bubbleDurationMs: 2800,
    bubbleMoodOverride: 'hungry',
  },
  eating: {
    pose: 'eating',
    bubbleChance: 1,
    bubbleIntervalMs: [800, 1200],
    bubbleDurationMs: 2000,
    bubbleMoodOverride: 'happy',
  },
  admiring: {
    pose: 'wow',
    bubbleChance: 0,
    bubbleIntervalMs: [5000, 8000],
    bubbleDurationMs: 2000,
    bubbleMoodOverride: 'happy',
  },
  digging: {
    pose: 'eating',
    bubbleChance: 0,
    bubbleIntervalMs: [5000, 8000],
    bubbleDurationMs: 2000,
  },
};

/** @deprecated Use STATE_EFFECTS[s].pose instead. */
export const STATE_TO_POSE: Record<PetState, PetPose | null> = Object.fromEntries(
  PET_STATES.map((s) => [s, STATE_EFFECTS[s].pose]),
) as Record<PetState, PetPose | null>;

export const SUB_CATEGORY_TO_STATE: Partial<Record<SubCategory, PetState>> = {
  [SUB_CATEGORY.PET_BED]: 'sleepy',
  [SUB_CATEGORY.FOOD]: 'eating',
};

// ─── Behavior Timing ────────────────────────────────────────────────────────

export const PET_SLEEP_CHANCE = 0.15;
export const PET_SLEEPY_DURATION_MS = 2000;
export const PET_SLEEPY_FLIP_COUNT = 3;
export const PET_SLEEP_DURATION_MS = 12000;

export const PET_EAT_CHANCE = 0.35;
export const PET_EATING_DURATION_MS = 3500;

export const PET_ADMIRING_DURATION_MS = 2500;
export const PET_DIGGING_DURATION_MS = 1800;
export const PET_DECORATION_REACTION_CHANCE = 1;
/** Low chance (e.g. 0.08) that pet randomly decides to follow a bug with wow face. */
export const PET_BUG_FOLLOW_CHANCE = 0.08;

// ─── Behavior animation (translateY only, no scale to avoid blur) ──────────────

export const PET_BREATH_AMOUNT_PX = 2.5;
export const PET_BREATH_CYCLE_MS = 1500; // half-cycle (up or down)
export const PET_EAT_BOUNCE_AMOUNT_PX = 5;
export const PET_EAT_BOUNCE_MS = 90;
