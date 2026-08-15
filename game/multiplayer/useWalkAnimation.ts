import { useEffect, useRef } from 'react';
import {
  cancelAnimation,
  Easing,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { TILE_SIZE } from '../constants';
import { PET_WALK_MS_PER_TILE } from './pathfinding';

/** Upward bounce when stepping — visible walk animation */
const BOUNCE_PX = 1.2;
const BOUNCE_HALF_MS = 90;
const BOUNCE_DELAY_MS = 40;

function segDuration(x1: number, y1: number, x2: number, y2: number): number {
  const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  return (dist / TILE_SIZE) * PET_WALK_MS_PER_TILE;
}

export function useWalkAnimation(
  targetX: number,
  targetY: number,
  options?: { snapToTarget?: boolean; path?: Array<{ x: number; y: number }> },
) {
  const animX = useSharedValue(targetX);
  const animY = useSharedValue(targetY);
  const facingRight = useSharedValue(1);
  const bounceOffset = useSharedValue(0);
  const prevPos = useRef({ x: targetX, y: targetY });

  useEffect(() => {
    // Always cancel in-flight animations immediately to prevent stale
    // withSequence chains from interfering with the new path/target.
    cancelAnimation(animX);
    cancelAnimation(animY);
    cancelAnimation(bounceOffset);

    const curX = animX.value;
    const curY = animY.value;

    if (options?.snapToTarget) {
      animX.value = targetX;
      animY.value = targetY;
      bounceOffset.value = 0;
      prevPos.current = { x: targetX, y: targetY };
      return;
    }

    // Path mode: smooth movement with proportional segment duration
    if (options?.path && options.path.length > 1) {
      const path = options.path;
      let startIdx = 0;
      for (let i = 0; i < path.length - 1; i++) {
        const dCur = Math.sqrt((path[i].x - curX) ** 2 + (path[i].y - curY) ** 2);
        const dNext = Math.sqrt((path[i + 1].x - curX) ** 2 + (path[i + 1].y - curY) ** 2);
        if (dNext < dCur) startIdx = i + 1;
      }
      const trim = path.slice(startIdx);
      if (trim.length < 1) return;

      const SNAP_THRESHOLD = TILE_SIZE / 4;
      const distToFirst = Math.sqrt((trim[0].x - curX) ** 2 + (trim[0].y - curY) ** 2);
      const firstSegMs = distToFirst < SNAP_THRESHOLD ? 0 : Math.max(16, Math.min(PET_WALK_MS_PER_TILE * 2, segDuration(curX, curY, trim[0].x, trim[0].y)));

      const segsX: ReturnType<typeof withTiming>[] = [];
      const segsY: ReturnType<typeof withTiming>[] = [];
      let totalDuration = firstSegMs;

      if (firstSegMs > 0) {
        segsX.push(withTiming(trim[0].x, { duration: firstSegMs, easing: Easing.linear }));
        segsY.push(withTiming(trim[0].y, { duration: firstSegMs, easing: Easing.linear }));
      }
      for (let i = 1; i < trim.length; i++) {
        const dur = Math.max(16, segDuration(trim[i - 1].x, trim[i - 1].y, trim[i].x, trim[i].y));
        totalDuration += dur;
        segsX.push(withTiming(trim[i].x, { duration: dur, easing: Easing.linear }));
        segsY.push(withTiming(trim[i].y, { duration: dur, easing: Easing.linear }));
      }

      if (segsX.length === 0) {
        animX.value = trim[0].x;
        animY.value = trim[0].y;
        cancelAnimation(bounceOffset);
        bounceOffset.value = withTiming(0, { duration: 80 });
      } else {
        animX.value = withSequence(...segsX) as number;
        animY.value = withSequence(...segsY) as number;
      }
      prevPos.current = { x: trim[trim.length - 1].x, y: trim[trim.length - 1].y };

      if (trim.length > 1) {
        const dx = (trim[1]?.x ?? trim[0].x) - trim[0].x;
        if (Math.abs(dx) > 4) facingRight.value = dx > 0 ? -1 : 1;
        bounceOffset.value = withDelay(
          BOUNCE_DELAY_MS,
          withRepeat(
            withSequence(
              withTiming(BOUNCE_PX, { duration: BOUNCE_HALF_MS, easing: Easing.inOut(Easing.quad) }),
              withTiming(0, { duration: BOUNCE_HALF_MS, easing: Easing.inOut(Easing.quad) }),
            ),
            -1,
            true,
          ),
        );
        const timer = setTimeout(() => {
          cancelAnimation(bounceOffset);
          bounceOffset.value = withTiming(0, { duration: 80 });
        }, totalDuration);
        return () => clearTimeout(timer);
      }
      return;
    }

    // Single-target mode
    const dx = targetX - curX;
    const dy = targetY - curY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const distPx = Math.sqrt(absDx * absDx + absDy * absDy);
    const duration = Math.max(150, segDuration(curX, curY, targetX, targetY));
    prevPos.current = { x: targetX, y: targetY };

    if (absDx > 8) facingRight.value = dx > 0 ? -1 : 1;

    animX.value = withTiming(targetX, { duration, easing: Easing.out(Easing.quad) });
    animY.value = withTiming(targetY, { duration, easing: Easing.out(Easing.quad) });

    if (distPx <= 2) {
      cancelAnimation(bounceOffset);
      bounceOffset.value = withTiming(0, { duration: 80 });
    } else {
      bounceOffset.value = withDelay(
        BOUNCE_DELAY_MS,
        withRepeat(
          withSequence(
            withTiming(BOUNCE_PX, { duration: BOUNCE_HALF_MS, easing: Easing.inOut(Easing.quad) }),
            withTiming(0, { duration: BOUNCE_HALF_MS, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
          true,
        ),
      );
      const timer = setTimeout(() => {
        cancelAnimation(bounceOffset);
        bounceOffset.value = withTiming(0, { duration: 80 });
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [targetX, targetY, options?.snapToTarget, options?.path]);

  return { animX, animY, facingRight, bounceOffset };
}
