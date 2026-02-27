/**
 * Shared mood/stat utilities for pet UI and AI.
 * Single source of truth for hunger/happy/mood thresholds and derived states.
 */

/** Unified mood derived from pet stats. Lower index = higher precedence. */
export type PetMood = 'sour' | 'sad' | 'hungry' | 'happy' | 'neutral';

/**
 * Derives mood from pet stats. Precedence: sour (mood low) → hungry → sad (happy low) → happy → neutral.
 *
 * @param hunger - 0–100
 * @param happy - 0–100
 * @param mood - 0–100
 */
export function getMoodFromStats(
  hunger: number,
  happy: number,
  mood: number,
): PetMood {
  if (mood < 40) return 'sour';
  if (hunger < 50) return 'hungry';
  if (happy < 40) return 'sad';
  if (happy >= 70 && mood >= 70) return 'happy';
  return 'neutral';
}

/**
 * Returns true when hunger or happiness is critically low (pet should strongly prioritize food).
 *
 * @param hunger - 0–100
 * @param happy - 0–100
 */
export function isStatCritical(hunger: number, happy: number): boolean {
  return hunger < 30 || happy < 30;
}

/**
 * Returns true when pet should prefer food over sleep/wander (e.g. for AI decision logic).
 *
 * @param hunger - 0–100
 * @param happy - 0–100
 */
export function shouldPrioritizeFood(hunger: number, happy: number): boolean {
  return hunger < 50 || happy < 40;
}
