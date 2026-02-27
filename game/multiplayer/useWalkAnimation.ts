import { useEffect, useRef } from 'react';
import {
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { TILE_SIZE, PET_WALK_SPEED_MS } from '../constants';

const BOUNCE_PX = 3;
const BOUNCE_HALF_MS = 115;

export function useWalkAnimation(targetX: number, targetY: number, options?: { snapToTarget?: boolean }) {
  const animX = useSharedValue(targetX);
  const animY = useSharedValue(targetY);
  const facingRight = useSharedValue(1);
  const bounceOffset = useSharedValue(0);
  const prevPos = useRef({ x: targetX, y: targetY });

  useEffect(() => {
    const curX = animX.value;
    const curY = animY.value;
    const dx = targetX - curX;
    const dy = targetY - curY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const distPx = Math.sqrt(absDx * absDx + absDy * absDy);
    const tiles = distPx / TILE_SIZE;
    const duration = Math.max(200, tiles * PET_WALK_SPEED_MS);
    prevPos.current = { x: targetX, y: targetY };

    if (absDx > 2) {
      facingRight.value = dx > 0 ? -1 : 1;
    }

    if (options?.snapToTarget) {
      animX.value = targetX;
      animY.value = targetY;
      cancelAnimation(bounceOffset);
      bounceOffset.value = 0;
      return;
    }

    animX.value = withTiming(targetX, { duration, easing: Easing.out(Easing.quad) });
    animY.value = withTiming(targetY, { duration, easing: Easing.out(Easing.quad) });

    if (distPx > 2) {
      bounceOffset.value = withRepeat(
        withSequence(
          withTiming(BOUNCE_PX, { duration: BOUNCE_HALF_MS, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: BOUNCE_HALF_MS, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        true,
      );

      const timer = setTimeout(() => {
        cancelAnimation(bounceOffset);
        bounceOffset.value = withTiming(0, { duration: 100 });
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [targetX, targetY, options?.snapToTarget]);

  return { animX, animY, facingRight, bounceOffset };
}
