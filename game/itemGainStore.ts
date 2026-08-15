/**
 * Module-level item-gain toast store.
 *
 * Why this exists (not React context):
 * BottomSheetModal portals its children into PortalHost, which sits OUTSIDE
 * GameProvider/ItemGainProvider in the React tree. Context consumers inside
 * the sheet (ShopDrawer toast host AND purchase handlers) therefore see `null`
 * and never show/push gains. A module store is readable from both trees.
 */

import type { ItemGainLine, ItemGainTone, ItemGainLevelUp } from './ItemGainToast';

export type ItemGainStoreState = {
  lines: ItemGainLine[];
  tone: ItemGainTone;
  pulseKey: number;
  visible: boolean;
  levelUp: ItemGainLevelUp | null;
};

export type PushGainInput = {
  itemType: string;
  qty?: number;
  label?: string;
  imageUrl?: string;
  emoji?: string;
};

export type PushGainsOptions = {
  tone?: ItemGainTone;
  levelUp?: ItemGainLevelUp | null;
  /** Hold duration override (ms). Level-ups default longer. */
  holdMs?: number;
  /** Replace current toast lines instead of merging qty (art refresh). */
  replace?: boolean;
};

type PushGainsFn = (gains: PushGainInput[], options?: PushGainsOptions | ItemGainTone) => void;

const EMPTY: ItemGainStoreState = {
  lines: [],
  tone: 'got',
  pulseKey: 0,
  visible: false,
  levelUp: null,
};

let state: ItemGainStoreState = EMPTY;
const listeners = new Set<() => void>();
let pushImpl: PushGainsFn | null = null;

export function getItemGainState(): ItemGainStoreState {
  return state;
}

export function subscribeItemGain(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  listeners.forEach((l) => l());
}

export function setItemGainState(next: ItemGainStoreState) {
  state = next;
  emit();
}

export function clearItemGainState() {
  state = { ...EMPTY, pulseKey: state.pulseKey };
  emit();
}

/** Called by ItemGainProvider so portaled sheets can push without context. */
export function registerItemGainPush(fn: PushGainsFn | null) {
  pushImpl = fn;
}

export function pushItemGains(
  gains: PushGainInput[],
  options?: PushGainsOptions | ItemGainTone,
) {
  pushImpl?.(gains, options);
}
