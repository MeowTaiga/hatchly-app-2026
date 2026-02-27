import { useEffect, useRef, useState, useCallback } from 'react';
import { STATE_EFFECTS, type PetState } from './stateConfig';
import { randInt } from '../shared/utils';
import { getBubbleMood, type BubbleMood } from './PetBubble';

export interface UsePetBubbleOptions {
  behavior: PetState;
  hunger: number;
  happy: number;
  mood: number;
  active: boolean;
}

export interface UsePetBubbleReturn {
  bubbleVisible: boolean;
  bubbleMood: BubbleMood;
}

/**
 * Periodic "thinking" bubble. Uses STATE_EFFECTS[behavior] for chance & timing.
 */
export function usePetBubble({
  behavior,
  hunger,
  happy,
  mood,
  active,
}: UsePetBubbleOptions): UsePetBubbleReturn {
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cfg = STATE_EFFECTS[behavior];
  const bubbleMood = cfg.bubbleMoodOverride ?? getBubbleMood(hunger, happy, mood);

  const scheduleNextRoll = useCallback(() => {
    if (!active) return;

    const [minMs, maxMs] = cfg.bubbleIntervalMs;
    const delay = randInt(minMs, maxMs);

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (!active || cfg.bubbleChance === 0) {
        scheduleNextRoll();
        return;
      }
      if (Math.random() < cfg.bubbleChance) {
        setBubbleVisible(true);
        hideTimerRef.current = setTimeout(() => {
          hideTimerRef.current = null;
          setBubbleVisible(false);
          scheduleNextRoll();
        }, cfg.bubbleDurationMs);
      } else {
        scheduleNextRoll();
      }
    }, delay);
  }, [behavior, active]);

  useEffect(() => {
    if (!active) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      setBubbleVisible(false);
      return;
    }
    scheduleNextRoll();
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [active, behavior, scheduleNextRoll]);

  return { bubbleVisible, bubbleMood };
}
