/**
 * Client mirror of server skill IDs / display meta.
 * Keep labels in sync with hatchly-server-2026/src/constants/skills.ts
 */

import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export const SKILL_IDS = [
  'farming',
  'fishing',
  'cooking',
  'crafting',
  'mining',
  'social',
  'health',
] as const;

export type SkillId = (typeof SKILL_IDS)[number];

export type SkillIconName = ComponentProps<typeof Ionicons>['name'];

export interface SkillProgress {
  level: number;
  xp: number;
  xpToNextLevel: number;
}

export type SkillsMap = Record<SkillId, SkillProgress>;

export const SKILL_META: Record<
  SkillId,
  { label: string; icon: SkillIconName; description: string; color: string }
> = {
  farming: {
    label: 'Farming',
    icon: 'leaf',
    description: 'Planting, watering, and harvesting crops.',
    color: '#5B8C3E',
  },
  fishing: {
    label: 'Fishing',
    icon: 'fish',
    description: 'Catching fish in town and on the farm.',
    color: '#3B82A8',
  },
  cooking: {
    label: 'Cooking',
    icon: 'restaurant',
    description: 'Cooking meals at the pot.',
    color: '#C4783A',
  },
  crafting: {
    label: 'Crafting',
    icon: 'construct',
    description: 'Crafting tools and furniture.',
    color: '#8B6914',
  },
  mining: {
    label: 'Mining',
    icon: 'hammer',
    description: 'Digging fossils and mining ore.',
    color: '#6B7280',
  },
  social: {
    label: 'Social',
    icon: 'chatbubbles',
    description: 'Petting, chatting, and friendships.',
    color: '#A855A0',
  },
  health: {
    label: 'Health',
    icon: 'fitness',
    description: 'Logging food, water, mood, and wellness.',
    color: '#22A06B',
  },
};

/** Companion / pet level: floor of the mean of every skill (missing skills count as 0). */
export function totalLevelFromSkills(skills?: Partial<SkillsMap> | null): number {
  if (!skills) return 0;
  let total = 0;
  for (const id of SKILL_IDS) {
    total += skills[id]?.level ?? 0;
  }
  return Math.floor(total / SKILL_IDS.length);
}

/** True when any skill has level or XP progress. */
export function skillsHaveProgress(skills?: Partial<SkillsMap> | null): boolean {
  if (!skills) return false;
  for (const id of SKILL_IDS) {
    const s = skills[id];
    if ((s?.level ?? 0) > 0 || (s?.xp ?? 0) > 0) return true;
  }
  return false;
}

/** True when the API included a skills object (including all-zero — that is valid). */
export function hasSkillsPayload(skills?: Partial<SkillsMap> | null): boolean {
  if (!skills || typeof skills !== 'object') return false;
  return SKILL_IDS.some((id) => skills[id] != null);
}

/**
 * Resolve displayed companion level.
 * Skills are the source of truth (average of all skill levels). Stored totals
 * are only used when the skills payload is missing, so a stale summed
 * `pet.level` cannot override the new average.
 */
export function resolveCompanionLevel(opts: {
  totalLevel?: number | null;
  petTotalLevel?: number | null;
  petLevel?: number | null;
  skills?: Partial<SkillsMap> | null;
}): number {
  if (hasSkillsPayload(opts.skills)) {
    return totalLevelFromSkills(opts.skills);
  }
  return Math.max(
    0,
    typeof opts.totalLevel === 'number' ? opts.totalLevel : 0,
    typeof opts.petTotalLevel === 'number' ? opts.petTotalLevel : 0,
    typeof opts.petLevel === 'number' ? opts.petLevel : 0,
  );
}

/** Average fraction of progress toward next level across all skills (0–1). */
export function averageSkillProgress(skills?: Partial<SkillsMap> | null): number {
  if (!skills) return 0;
  let sum = 0;
  let n = 0;
  for (const id of SKILL_IDS) {
    const s = skills[id];
    if (!s) continue;
    sum += s.xp / Math.max(s.xpToNextLevel, 1);
    n += 1;
  }
  return n > 0 ? sum / n : 0;
}

export function emptySkills(): SkillsMap {
  const out = {} as SkillsMap;
  for (const id of SKILL_IDS) {
    out[id] = { level: 0, xp: 0, xpToNextLevel: 40 };
  }
  return out;
}
