/**
 * Canonical pose keys stored in pet.pose in MongoDB.
 * Includes both poses (body position) and expressions (face/mood).
 * "sleepy" is an expression but lives in the same pose space.
 */
export const PET_POSES = [
  'sleeping',
  'sleepy',
  'sitting',
  'standing',
  'walking',
  'happy',
  'hungry',
  'sad',
  'wow',
  'eating',
] as const;

export type PetPose = (typeof PET_POSES)[number];

/** Expressions (face/mood) — subset of PET_POSES, also stored in pet.pose */
export const PET_EXPRESSIONS = ['sleepy', 'happy', 'hungry', 'sad', 'wow'] as const;

/** Pose keys used by hero bar to reflect pet mood from stats. First match wins. */
export const HERO_MOOD_POSES = ['wow', 'hungry', 'sad', 'happy', 'sleepy'] as const;
export type HeroMoodPose = (typeof HERO_MOOD_POSES)[number];

/** When mood is neutral, cycle randomly through these. null = default image. */
export const NEUTRAL_POSE_OPTIONS: readonly (PetPose | null)[] = ['standing', 'sitting', 'happy', null];

import { getMoodFromStats } from '@/game/creature/pet/moodUtils';

const PET_MOOD_TO_HERO: Record<import('@/game/creature/pet/moodUtils').PetMood, HeroMoodPose> = {
  sour: 'sad',
  sad: 'sad',
  hungry: 'hungry',
  happy: 'happy',
  neutral: 'happy', // neutral = content/okay, not tired; sleepy only for AI sleep behavior
};

/**
 * Derives hero bar pose from pet stats. Delegates to shared moodUtils.
 */
export function getHeroPoseFromStats(
  hunger: number,
  happy: number,
  mood: number,
): HeroMoodPose {
  return PET_MOOD_TO_HERO[getMoodFromStats(hunger, happy, mood)];
}

export type PetExpression = (typeof PET_EXPRESSIONS)[number];

/** Context-specific expression per tab. undefined = use default pet image. */
export const TAB_EXPRESSION: Record<number, PetPose | undefined> = {
  0: undefined, // Home — default
  1: 'happy',   // Health
  4: 'happy',   // Settings
};
