import { useState, useEffect } from 'react';
import type { PetPose } from '@/constants/pet';
import { NEUTRAL_POSE_OPTIONS } from '@/constants/pet';
import { randInt } from '../shared/utils';

const NEUTRAL_CYCLE_MIN_MS = 8000;
const NEUTRAL_CYCLE_MAX_MS = 20000;

function pickRandomNeutralPose(): PetPose | null {
  return NEUTRAL_POSE_OPTIONS[Math.floor(Math.random() * NEUTRAL_POSE_OPTIONS.length)];
}

export function useNeutralPoseCycle(active = true): PetPose | null {
  const [pose, setPose] = useState<PetPose | null>(() => pickRandomNeutralPose());

  useEffect(() => {
    if (!active) return;
    let id: ReturnType<typeof setTimeout>;
    const tick = () => {
      setPose(pickRandomNeutralPose());
      id = setTimeout(tick, randInt(NEUTRAL_CYCLE_MIN_MS, NEUTRAL_CYCLE_MAX_MS));
    };
    id = setTimeout(tick, randInt(NEUTRAL_CYCLE_MIN_MS, NEUTRAL_CYCLE_MAX_MS));
    return () => clearTimeout(id);
  }, [active]);

  return pose;
}
