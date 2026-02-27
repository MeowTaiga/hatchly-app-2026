import { useEffect, useRef, useCallback } from 'react';
import {
  useSharedValue,
  withTiming,
  withSequence,
  withRepeat,
  cancelAnimation,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { TILE_SIZE } from '../../constants';
import {
  BUG_IDLE_MIN_MS,
  BUG_IDLE_MAX_MS,
  BUG_WANDER_RADIUS,
  BUG_WALK_SPEED_MS,
  BUG_TURN_DURATION_MS,
  BUG_ON_HOST_DRIFT_PX,
  BUG_ON_HOST_CYCLE_MS,
  BUG_ROTATION_OFFSET_DEG,
} from './constants';
import { tileToPx } from '../shared/movement';
import { randInt, clamp } from '../shared/utils';

/** Angle in degrees to face (curCol, curRow) -> (targetCol, targetRow). 0 = right in grid space. */
function directionAngleDeg(curCol: number, curRow: number, targetCol: number, targetRow: number): number {
  const dx = targetCol - curCol;
  const dy = targetRow - curRow;
  const base = Math.atan2(dy, dx) * (180 / Math.PI);
  return base + BUG_ROTATION_OFFSET_DEG;
}

/** Pick the angle equivalent to target that gives the shortest rotation from current. */
function shortestRotationTarget(currentDeg: number, targetDeg: number): number {
  let d = targetDeg - currentDeg;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return currentDeg + d;
}
import { findPlacedItemById, getItemVisualCenterPx } from '../../gridHelpers';
import type { GridData, ItemDefinition } from '../../types';

export interface UseBugAIOptions {
  cols: number;
  rows: number;
  startCol: number;
  startRow: number;
  active: boolean;
  onPositionChange?: (col: number, row: number) => void;
  hostPlacedItemId?: string;
  activeGrid?: GridData;
  itemDefs?: Record<string, ItemDefinition>;
}

export interface UseBugAIReturn {
  bugX: ReturnType<typeof useSharedValue<number>>;
  bugY: ReturnType<typeof useSharedValue<number>>;
  facingRight: ReturnType<typeof useSharedValue<number>>;
  bounceOffset: ReturnType<typeof useSharedValue<number>>;
}

/**
 * Lightweight AI for a single bug: idle ↔ darting movement, or on-host subtle drift/rotate.
 */
export function useBugAI({
  cols,
  rows,
  startCol,
  startRow,
  active,
  onPositionChange,
  hostPlacedItemId,
  activeGrid,
  itemDefs,
}: UseBugAIOptions): UseBugAIReturn {
  const posRef = useRef({ col: startCol, row: startRow });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;

  const baseX = tileToPx(startCol);
  const baseY = tileToPx(startRow);

  const bugX = useSharedValue(baseX);
  const bugY = useSharedValue(baseY);
  /** Rotation in degrees: 0 = right, 90 = down, 180/-180 = left, -90 = up. */
  const facingRight = useSharedValue(0);
  const bounceOffset = useSharedValue(0);

  const onHostMode = !!(
    hostPlacedItemId &&
    activeGrid &&
    itemDefs &&
    Object.keys(itemDefs).length > 0
  );

  useEffect(() => {
    if (!onHostMode || !active || !hostPlacedItemId || !activeGrid || !itemDefs) return;
    const host = findPlacedItemById(activeGrid, hostPlacedItemId);
    if (!host) return;
    const { x: centerX, y: centerY } = getItemVisualCenterPx(host, TILE_SIZE);
    const drift = BUG_ON_HOST_DRIFT_PX;
    const cycleMs = BUG_ON_HOST_CYCLE_MS;
    bugX.value = withRepeat(
      withSequence(
        withTiming(centerX + drift, { duration: cycleMs / 2, easing: Easing.inOut(Easing.quad) }),
        withTiming(centerX - drift, { duration: cycleMs / 2, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    bugY.value = withRepeat(
      withSequence(
        withTiming(centerY + drift * 0.5, { duration: cycleMs / 2, easing: Easing.inOut(Easing.quad) }),
        withTiming(centerY - drift * 0.5, { duration: cycleMs / 2, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    facingRight.value = withRepeat(
      withSequence(
        withTiming(0, { duration: cycleMs / 2, easing: Easing.inOut(Easing.quad) }),
        withTiming(180, { duration: cycleMs / 2, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    return () => {
      cancelAnimation(bugX);
      cancelAnimation(bugY);
      cancelAnimation(facingRight);
    };
  }, [onHostMode, active, hostPlacedItemId, activeGrid, itemDefs, bugX, bugY, facingRight]);

  const onWalkComplete = useCallback(
    (col: number, row: number) => {
      cancelAnimation(bounceOffset);
      bounceOffset.value = withTiming(0, { duration: 80 });
      posRef.current = { col, row };
      onPositionChangeRef.current?.(col, row);
      scheduleNextRef.current();
    },
    [bounceOffset],
  );

  const onWalkCompleteRef = useRef(onWalkComplete);
  onWalkCompleteRef.current = onWalkComplete;

  const startWalkAfterTurn = useCallback(
    (targetCol: number, targetRow: number, duration: number) => {
      const targetX = tileToPx(targetCol);
      const targetY = tileToPx(targetRow);
      const moveEasing = Easing.inOut(Easing.quad);
      const onComplete = onWalkCompleteRef.current;
      const walkAnimX = withTiming(targetX, { duration, easing: moveEasing });
      const walkAnimY = withTiming(
        targetY,
        { duration, easing: moveEasing },
        (finished) => {
          if (finished) runOnJS(onComplete)(targetCol, targetRow);
        },
      );
      bugX.value = walkAnimX;
      bugY.value = walkAnimY;
      bounceOffset.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 80, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 80, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        true,
      );
    },
    [bugX, bugY, bounceOffset],
  );

  const startWalkAfterTurnRef = useRef(startWalkAfterTurn);
  startWalkAfterTurnRef.current = startWalkAfterTurn;

  const walkTo = useCallback(
    (targetCol: number, targetRow: number) => {
      const cur = posRef.current;
      const steps = Math.abs(targetCol - cur.col) + Math.abs(targetRow - cur.row);
      const duration = steps * BUG_WALK_SPEED_MS * (0.8 + Math.random() * 0.4);

      const targetAngle = directionAngleDeg(cur.col, cur.row, targetCol, targetRow);
      const currentAngle = facingRight.value;
      const targetRotation = shortestRotationTarget(currentAngle, targetAngle);

      const startWalk = startWalkAfterTurnRef.current;
      facingRight.value = withTiming(
        targetRotation,
        {
          duration: BUG_TURN_DURATION_MS,
          easing: Easing.inOut(Easing.quad),
        },
        (finished) => {
          if (finished) {
            runOnJS(startWalk)(targetCol, targetRow, duration);
          }
        },
      );

      onPositionChangeRef.current?.(targetCol, targetRow);
    },
    [facingRight],
  );

  const scheduleNext = useCallback(() => {
    if (!active) return;
    const delay = randInt(BUG_IDLE_MIN_MS, BUG_IDLE_MAX_MS);
    timerRef.current = setTimeout(() => {
      if (!active) return;
      const cur = posRef.current;
      const targetCol = clamp(
        cur.col + randInt(-BUG_WANDER_RADIUS, BUG_WANDER_RADIUS),
        1,
        cols - 2,
      );
      const targetRow = clamp(
        cur.row + randInt(-BUG_WANDER_RADIUS, BUG_WANDER_RADIUS),
        2,
        rows - 2,
      );
      if (targetCol === cur.col && targetRow === cur.row) {
        scheduleNextRef.current();
        return;
      }
      walkTo(targetCol, targetRow);
    }, delay);
  }, [active, cols, rows, walkTo]);

  const scheduleNextRef = useRef(scheduleNext);
  scheduleNextRef.current = scheduleNext;

  useEffect(() => {
    if (active && !onHostMode) scheduleNext();
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [active, onHostMode, scheduleNext]);

  return { bugX, bugY, facingRight, bounceOffset };
}
