/**
 * Unified pose resolver: maps (behavior, stats, context) → PetPose key.
 * PET_POSES from the admin panel are the single source of truth.
 */
import type { PetPose } from '@/constants/pet';
import { getHeroPoseFromStats } from '@/constants/pet';
import { getMoodFromStats } from './moodUtils';
import { STATE_EFFECTS, type PetState } from './stateConfig';

export type PetPoseContext = 'world' | 'hero' | 'dialog' | 'avatar';

export interface GetPoseForContextOptions {
  /** When mood is neutral, use this instead of default hero pose (for variety). */
  neutralPoseOverride?: PetPose | null;
}

/**
 * Resolves the pose key for a given context. Returns null when no pose override
 * (consumer should use pet.imageUrl).
 *
 * @param behavior - Current AI behavior (world context only)
 * @param hunger - 0–100
 * @param happy - 0–100
 * @param mood - 0–100
 * @param context - Where the pet is displayed
 * @param poses - pet.pose map (may be undefined)
 * @param opts - Optional overrides (e.g. neutralPoseOverride)
 */
export function getPoseForContext(
  behavior: PetState | undefined,
  hunger: number,
  happy: number,
  mood: number,
  context: PetPoseContext,
  poses: Record<string, string> | undefined,
  opts?: GetPoseForContextOptions,
): PetPose | null {
  if (!poses) return null;

  const resolveHeroPose = (): PetPose | null => {
    const petMood = getMoodFromStats(hunger, happy, mood);
    if (petMood === 'neutral' && opts?.neutralPoseOverride !== undefined) {
      const override = opts.neutralPoseOverride;
      if (override === null) return null;
      return poses[override] ? override : null;
    }
    const heroPose = getHeroPoseFromStats(hunger, happy, mood);
    return poses[heroPose] ? heroPose : null;
  };

  if (context === 'hero' || context === 'dialog' || context === 'avatar') {
    return resolveHeroPose();
  }

  // world context: active behaviors (walking, eating, sleeping, sleepy) take precedence
  if (behavior) {
    const statePose = STATE_EFFECTS[behavior].pose;
    if (statePose && poses[statePose]) return statePose;
  }

  return resolveHeroPose();
}
