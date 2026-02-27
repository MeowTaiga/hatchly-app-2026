import { useEffect, useRef, useCallback, useState } from 'react';
import {
  useSharedValue,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  cancelAnimation,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import type { TileCoord } from '../../types';
import type { PlacedItem } from '../../types';
import { tileToPx as tileToPxSingle } from '../shared/movement';
import {
  PET_WALK_SPEED_MS,
  PET_TURN_DURATION_MS,
  PET_START_COL,
  PET_START_ROW,
} from '../../constants';
import {
  PET_WALKABLE_SUBCATEGORIES,
  PET_SLEEP_DURATION_MS,
  PET_SLEEPY_DURATION_MS,
  PET_SLEEPY_FLIP_COUNT,
  PET_EATING_DURATION_MS,
  PET_ADMIRING_DURATION_MS,
  PET_DIGGING_DURATION_MS,
  PET_BREATH_AMOUNT_PX,
  PET_BREATH_CYCLE_MS,
  PET_EAT_BOUNCE_AMOUNT_PX,
  PET_EAT_BOUNCE_MS,
  type PetState,
} from './stateConfig';

export interface PetStateFromServer {
  col: number;
  row: number;
  behavior: string;
  targetCol?: number;
  targetRow?: number;
  interactionType?: string;
  interactionTarget?: string;
  interactionItemType?: string;
}

export interface UsePetAIOptions {
  cols: number;
  rows: number;
  activeGrid: import('../../types').GridData;
  itemDefs: Record<string, import('../../types').ItemDefinition>;
  active: boolean;
  onFeedPet?: (anchorId: string, foodItemType: string) => void;
  onFeedFromDish?: (anchorId: string) => void;
  foodDishQueues?: Record<string, string[]>;
  /** Server-authoritative pet state. Client displays only. */
  petState: PetStateFromServer | null;
  /** Emit behavior to server (legacy; server is now authoritative). */
  emitBehavior?: (state: string) => void;
  /** Emit when walk animation completes so server can advance. */
  emitActionComplete?: (targetCol: number, targetRow: number) => void;
  /** Server-forced correction; apply and clear. */
  petBehaviorSync: string | null;
  clearPetBehaviorSync: () => void;
}

export interface UsePetAIReturn {
  petX: ReturnType<typeof useSharedValue<number>>;
  petY: ReturnType<typeof useSharedValue<number>>;
  facingRight: ReturnType<typeof useSharedValue<number>>;
  bounceOffset: ReturnType<typeof useSharedValue<number>>;
  behaviorOffset: ReturnType<typeof useSharedValue<number>>;
  toolRotationDeg: ReturnType<typeof useSharedValue<number>>;
  jumpOffset: ReturnType<typeof useSharedValue<number>>;
  behavior: PetState;
  position: TileCoord;
  triggerJump: () => void;
  /** No-op: server handles decoration reaction via GAME_PLACE_ITEM. */
  reactToDecorationPlacement: (col: number, row: number, itemType: string) => void;
}

function tileToPxCoord(col: number, row: number): { x: number; y: number } {
  return { x: tileToPxSingle(col), y: tileToPxSingle(row) };
}

export function usePetAI({
  cols,
  rows,
  activeGrid,
  itemDefs,
  active,
  onFeedPet,
  onFeedFromDish,
  foodDishQueues,
  petState,
  emitBehavior,
  emitActionComplete,
  petBehaviorSync,
  clearPetBehaviorSync,
}: UsePetAIOptions): UsePetAIReturn {
  const posRef = useRef<TileCoord>({ col: PET_START_COL, row: PET_START_ROW });
  const [behavior, setBehavior] = useState<PetState>('idle');
  const behaviorRef = useRef<PetState>(behavior);
  behaviorRef.current = behavior;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const petX = useSharedValue(tileToPxCoord(PET_START_COL, PET_START_ROW).x);
  const petY = useSharedValue(tileToPxCoord(PET_START_COL, PET_START_ROW).y);
  const facingRight = useSharedValue(1);
  const bounceOffset = useSharedValue(0);
  const behaviorOffset = useSharedValue(0);
  const toolRotationDeg = useSharedValue(-35);
  const jumpOffset = useSharedValue(0);

  const triggerJump = useCallback(() => {
    const JUMP_PX = 18;
    jumpOffset.value = withSequence(
      withTiming(-JUMP_PX, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 120, easing: Easing.in(Easing.quad) }),
    );
  }, [jumpOffset]);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (flipTimerRef.current) {
      clearTimeout(flipTimerRef.current);
      flipTimerRef.current = null;
    }
  }, []);

  /** Snap pet to server position and cancel all animations. */
  const applyServerState = useCallback(
    (col: number, row: number, beh: PetState) => {
      clearTimers();
      cancelAnimation(petX);
      cancelAnimation(petY);
      cancelAnimation(bounceOffset);
      cancelAnimation(behaviorOffset);
      cancelAnimation(toolRotationDeg);
      const { x, y } = tileToPxCoord(col, row);
      petX.value = x;
      petY.value = y;
      bounceOffset.value = 0;
      behaviorOffset.value = 0;
      toolRotationDeg.value = -35;
      posRef.current = { col, row };
      setBehavior(beh);
    },
    [clearTimers, petX, petY, bounceOffset, behaviorOffset, toolRotationDeg],
  );

  // Sync from petBehaviorSync (legacy) or petState
  useEffect(() => {
    if (petBehaviorSync) {
      const valid: PetState[] = ['idle', 'walking', 'sleepy', 'sleeping', 'eating', 'admiring', 'digging'];
      if (valid.includes(petBehaviorSync as PetState)) {
        applyServerState(posRef.current.col, posRef.current.row, petBehaviorSync as PetState);
        clearPetBehaviorSync();
      }
    }
  }, [petBehaviorSync, clearPetBehaviorSync, applyServerState]);

  const transitionToIdle = useCallback(() => {
    cancelAnimation(behaviorOffset);
    cancelAnimation(toolRotationDeg);
    behaviorOffset.value = withTiming(0, { duration: 100 });
    toolRotationDeg.value = withTiming(-35, { duration: 100 });
    setBehavior('idle');
    emitBehavior?.('idle');
  }, [behaviorOffset, toolRotationDeg, emitBehavior]);

  const startSleepyFlips = useCallback(() => {
    const flipInterval = PET_SLEEPY_DURATION_MS / (PET_SLEEPY_FLIP_COUNT * 2);
    let flip = 0;
    const doFlip = () => {
      facingRight.value = flip % 2 === 0 ? -1 : 1;
      flip++;
      if (flip < PET_SLEEPY_FLIP_COUNT * 2) {
        flipTimerRef.current = setTimeout(doFlip, flipInterval);
      }
    };
    doFlip();
  }, [facingRight]);

  const startSleepSequence = useCallback(() => {
    setBehavior('sleepy');
    emitBehavior?.('sleepy');
    startSleepyFlips();
    timerRef.current = setTimeout(() => {
      setBehavior('sleeping');
      emitBehavior?.('sleeping');
      cancelAnimation(behaviorOffset);
      behaviorOffset.value = withRepeat(
        withSequence(
          withTiming(PET_BREATH_AMOUNT_PX, {
            duration: PET_BREATH_CYCLE_MS,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(0, {
            duration: PET_BREATH_CYCLE_MS,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        true,
      );
      timerRef.current = setTimeout(() => {
        transitionToIdle();
      }, PET_SLEEP_DURATION_MS);
    }, PET_SLEEPY_DURATION_MS);
  }, [startSleepyFlips, transitionToIdle, behaviorOffset, emitBehavior]);

  const startEatSequence = useCallback(
    (anchorId: string, isFoodDish: boolean, foodItemType?: string) => {
      facingRight.value = -1;
      setBehavior('eating');
      emitBehavior?.('eating');
      cancelAnimation(behaviorOffset);
      behaviorOffset.value = withRepeat(
        withSequence(
          withTiming(PET_EAT_BOUNCE_AMOUNT_PX, {
            duration: PET_EAT_BOUNCE_MS,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(0, {
            duration: PET_EAT_BOUNCE_MS,
            easing: Easing.in(Easing.quad),
          }),
        ),
        -1,
        true,
      );
      timerRef.current = setTimeout(() => {
        if (isFoodDish) {
          onFeedFromDish?.(anchorId);
        } else {
          onFeedPet?.(anchorId, foodItemType ?? 'unknown');
        }
        transitionToIdle();
      }, PET_EATING_DURATION_MS);
    },
    [facingRight, transitionToIdle, behaviorOffset, onFeedFromDish, onFeedPet, emitBehavior],
  );

  const startAdmiringSequence = useCallback(() => {
    setBehavior('admiring');
    emitBehavior?.('admiring');
    timerRef.current = setTimeout(() => {
      transitionToIdle();
    }, PET_ADMIRING_DURATION_MS);
  }, [transitionToIdle, emitBehavior]);

  const startDigSequence = useCallback(() => {
    setBehavior('digging');
    emitBehavior?.('digging');
    cancelAnimation(behaviorOffset);
    cancelAnimation(toolRotationDeg);
    // Point shovel into ground (~50°) — stays on fossil tile, no big swing
    toolRotationDeg.value = withSequence(
      withTiming(50, { duration: 120, easing: Easing.out(Easing.quad) }),
      // Small wiggle: ±4° oscillation on the tile
      withRepeat(
        withSequence(
          withTiming(54, { duration: 90, easing: Easing.inOut(Easing.quad) }),
          withTiming(46, { duration: 90, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      ),
    );
    timerRef.current = setTimeout(() => {
      cancelAnimation(toolRotationDeg);
      toolRotationDeg.value = withTiming(-35, { duration: 150 });
      transitionToIdle();
    }, PET_DIGGING_DURATION_MS);
  }, [toolRotationDeg, transitionToIdle, emitBehavior]);

  const emitActionCompleteRef = useRef(emitActionComplete);
  emitActionCompleteRef.current = emitActionComplete;

  const onWalkComplete = useCallback(
    (target: TileCoord) => {
      cancelAnimation(bounceOffset);
      bounceOffset.value = withTiming(0, { duration: 100 });
      posRef.current = target;
      emitActionCompleteRef.current?.(target.col, target.row);
    },
    [bounceOffset],
  );

  const onWalkCompleteRef = useRef(onWalkComplete);
  onWalkCompleteRef.current = onWalkComplete;

  const walkTo = useCallback(
    (target: TileCoord) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setBehavior('walking');
      emitBehavior?.('walking');

      const cur = posRef.current;
      const steps = Math.abs(target.col - cur.col) + Math.abs(target.row - cur.row);
      const baseDuration = steps * PET_WALK_SPEED_MS;
      const duration = baseDuration * (0.92 + Math.random() * 0.16);

      const targetPx = tileToPxCoord(target.col, target.row);
      const newFacing = target.col >= cur.col ? -1 : 1;
      facingRight.value = newFacing;

      const moveEasing = Easing.inOut(Easing.cubic);
      const walkAnimX = withTiming(targetPx.x, { duration, easing: moveEasing });
      const walkAnimY = withTiming(
        targetPx.y,
        { duration, easing: moveEasing },
        (finished) => {
          if (finished) runOnJS(onWalkCompleteRef.current)(target);
        },
      );

      petX.value = withDelay(PET_TURN_DURATION_MS, walkAnimX);
      petY.value = withDelay(PET_TURN_DURATION_MS, walkAnimY);

      bounceOffset.value = withDelay(
        PET_TURN_DURATION_MS,
        withRepeat(
          withSequence(
            withTiming(3, { duration: 115, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 115, easing: Easing.in(Easing.quad) }),
          ),
          -1,
          true,
        ),
      );
    },
    [petX, petY, facingRight, bounceOffset, emitBehavior],
  );

  const prevPetStateRef = useRef<PetStateFromServer | null>(null);

  // React to petState from server
  useEffect(() => {
    if (!active || !petState) return;

    const { col, row, behavior: beh, targetCol, targetRow, interactionType, interactionTarget } = petState;
    const validBeh = beh as PetState;

    // Server forced a sync (e.g. stuck walk correction)
    if (col !== posRef.current.col || row !== posRef.current.row) {
      const isWalkingWithTarget = beh === 'walking' && targetCol != null && targetRow != null;
      if (!isWalkingWithTarget) {
        applyServerState(col, row, validBeh);
      }
    }

    // Walking with target: run walk animation
    if (beh === 'walking' && targetCol != null && targetRow != null) {
      const target = { col: targetCol, row: targetRow };
      const prev = prevPetStateRef.current;
      const sameTarget = prev?.targetCol === targetCol && prev?.targetRow === targetRow;
      if (!sameTarget || posRef.current.col !== target.col || posRef.current.row !== target.row) {
        posRef.current = { col, row };
        const { x, y } = tileToPxCoord(col, row);
        petX.value = x;
        petY.value = y;
        walkTo(target);
      }
    }

    // Eating: run eat sequence (server sent after action_complete)
    if (beh === 'eating' && interactionTarget && behaviorRef.current !== 'eating') {
      const isFoodDish = !petState.interactionItemType;
      startEatSequence(interactionTarget, isFoodDish, petState.interactionItemType);
    }

    // Sleepy: run sleep sequence
    if (beh === 'sleepy' && behaviorRef.current !== 'sleepy' && behaviorRef.current !== 'sleeping') {
      startSleepSequence();
    }

    // Admiring: run admire sequence
    if (beh === 'admiring' && behaviorRef.current !== 'admiring') {
      startAdmiringSequence();
    }

    // Digging: run dig sequence (shovel rotates down, dig bounce)
    if (beh === 'digging' && behaviorRef.current !== 'digging') {
      applyServerState(col, row, 'digging');
      startDigSequence();
    }

    // Idle: just update position if different
    if (beh === 'idle') {
      if (col !== posRef.current.col || row !== posRef.current.row) {
        applyServerState(col, row, 'idle');
      } else {
        setBehavior('idle');
      }
    }

    prevPetStateRef.current = petState;
  }, [petState, active, applyServerState, walkTo, startEatSequence, startSleepSequence, startAdmiringSequence, startDigSequence]);

  // Initial state from snapshot (before first pet:state_update)
  useEffect(() => {
    if (!active || !petState) return;
    const prev = prevPetStateRef.current;
    if (prev) return;
    const { col, row, behavior: beh } = petState;
    posRef.current = { col, row };
    const { x, y } = tileToPxCoord(col, row);
    petX.value = x;
    petY.value = y;
    setBehavior(beh as PetState);
  }, [active, petState, petX, petY]);

  useEffect(() => {
    return clearTimers;
  }, [clearTimers]);

  const reactToDecorationPlacement = useCallback(() => {
    // Server handles decoration reaction via GAME_PLACE_ITEM; no-op on client.
  }, []);

  return {
    petX,
    petY,
    facingRight,
    bounceOffset,
    behaviorOffset,
    toolRotationDeg,
    jumpOffset,
    behavior,
    position: posRef.current,
    triggerJump,
    reactToDecorationPlacement,
  };
}
