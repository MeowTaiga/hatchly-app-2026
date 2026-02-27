import { useEffect } from 'react';
import {
  useSharedValue,
  withTiming,
  withSequence,
  withRepeat,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { TILE_SIZE } from '../../constants';
import {
  BALLOON_BOB_CYCLE_MS,
  BALLOON_DRIFT_CYCLE_MS,
  BALLOON_BOB_PX,
  BALLOON_DRIFT_PX,
} from './constants';
import { tileToPx } from '../shared/movement';

export interface UseBalloonAIOptions {
  startCol: number;
  startRow: number;
  active: boolean;
  onPositionChange?: (col: number, row: number) => void;
}

export interface UseBalloonAIReturn {
  balloonX: ReturnType<typeof useSharedValue<number>>;
  balloonY: ReturnType<typeof useSharedValue<number>>;
}

/**
 * Gentle float AI for a balloon: vertical bob + horizontal drift.
 * Position stays near spawn point.
 */
export function useBalloonAI({
  startCol,
  startRow,
  active,
  onPositionChange,
}: UseBalloonAIOptions): UseBalloonAIReturn {
  const baseX = tileToPx(startCol);
  const baseY = tileToPx(startRow);

  const balloonX = useSharedValue(baseX);
  const balloonY = useSharedValue(baseY);

  useEffect(() => {
    if (!active) return;
    balloonX.value = withRepeat(
      withSequence(
        withTiming(baseX + BALLOON_DRIFT_PX, {
          duration: BALLOON_DRIFT_CYCLE_MS / 2,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(baseX - BALLOON_DRIFT_PX, {
          duration: BALLOON_DRIFT_CYCLE_MS / 2,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
      -1,
      true,
    );
    balloonY.value = withRepeat(
      withSequence(
        withTiming(baseY - BALLOON_BOB_PX, {
          duration: BALLOON_BOB_CYCLE_MS / 2,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(baseY + BALLOON_BOB_PX, {
          duration: BALLOON_BOB_CYCLE_MS / 2,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
      -1,
      true,
    );
    return () => {
      cancelAnimation(balloonX);
      cancelAnimation(balloonY);
    };
  }, [active, baseX, baseY, balloonX, balloonY]);

  return { balloonX, balloonY };
}
