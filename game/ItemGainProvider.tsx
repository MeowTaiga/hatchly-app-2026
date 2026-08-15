/**
 * Item-gain toast controller — harvest, shop buys, and app-wide wellness rewards.
 *
 * Registers `pushItemGains` on a module store so BottomSheet-portaled UI can
 * trigger toasts without React context (PortalHost sits outside this provider).
 *
 * Optional `resolveItem` lets the game supply itemDefs for harvest drops that
 * only pass an itemType; wellness callers should pass label/image themselves.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import type { ItemGainLine, ItemGainTone } from './ItemGainToast';
import {
  clearItemGainState,
  getItemGainState,
  registerItemGainPush,
  setItemGainState,
  type PushGainInput,
  type PushGainsOptions,
} from './itemGainStore';
import { peekItemPreview } from '@/lib/itemPreviewCache';

export type { ItemGainLine, ItemGainTone };

export type ItemGainResolveItem = (itemType: string) => {
  label?: string;
  imageUrl?: string;
  emoji?: string;
} | undefined;

type ItemGainContextValue = {
  pushGains: (gains: PushGainInput[], options?: PushGainsOptions | ItemGainTone) => void;
};

const ItemGainContext = createContext<ItemGainContextValue | null>(null);

const HOLD_MS = 2200;
const LEVEL_UP_HOLD_MS = 3400;

function normalizeOptions(
  options?: PushGainsOptions | ItemGainTone,
): PushGainsOptions {
  if (options == null) return {};
  if (typeof options === 'string') return { tone: options };
  return options;
}

export function ItemGainProvider({
  children,
  resolveItem,
}: {
  children: React.ReactNode;
  /** Optional lookup for harvest/shop pushes that omit label/image. */
  resolveItem?: ItemGainResolveItem;
}) {
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linesRef = useRef<ItemGainLine[]>([]);
  const levelUpRef = useRef<NonNullable<PushGainsOptions['levelUp']> | null>(null);
  const resolveRef = useRef(resolveItem);
  resolveRef.current = resolveItem;

  const scheduleDismiss = useCallback((holdMs: number) => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => {
      linesRef.current = [];
      levelUpRef.current = null;
      clearItemGainState();
    }, holdMs);
  }, []);

  const pushGains = useCallback(
    (gains: PushGainInput[], rawOptions?: PushGainsOptions | ItemGainTone) => {
      const options = normalizeOptions(rawOptions);
      const nextTone = options.tone ?? 'got';
      const incomingLevelUp = options.levelUp === undefined ? undefined : options.levelUp;

      if (!gains.length && !incomingLevelUp) return;

      const map = new Map(
        options.replace ? [] : linesRef.current.map((l) => [l.itemType, { ...l }]),
      );
      for (const g of gains) {
        const lookupKey = g.itemType.startsWith('unlock:')
          ? g.itemType.slice('unlock:'.length)
          : g.itemType.startsWith('shop:')
            ? g.itemType.slice('shop:'.length)
            : g.itemType;
        const resolved =
          resolveRef.current?.(g.itemType) ||
          resolveRef.current?.(lookupKey) ||
          peekItemPreview(lookupKey) ||
          peekItemPreview(g.itemType);
        const existing = map.get(g.itemType);
        const qty = g.qty ?? 1;
        if (existing) {
          existing.qty += qty;
          if (!existing.imageUrl && (g.imageUrl || resolved?.imageUrl)) {
            existing.imageUrl = g.imageUrl || resolved?.imageUrl;
          }
          if (!existing.emoji && (g.emoji || resolved?.emoji)) {
            existing.emoji = g.emoji || resolved?.emoji;
          }
          if ((!existing.label || existing.label === g.itemType) && (g.label || resolved?.label)) {
            existing.label = g.label || resolved?.label || existing.label;
          }
        } else {
          map.set(g.itemType, {
            itemType: g.itemType,
            qty,
            label: g.label || resolved?.label || g.itemType,
            imageUrl: g.imageUrl || resolved?.imageUrl,
            emoji: g.emoji || resolved?.emoji,
          });
        }
      }
      const next = Array.from(map.values());
      linesRef.current = next;

      if (incomingLevelUp) {
        levelUpRef.current = incomingLevelUp;
      } else if (incomingLevelUp === null) {
        levelUpRef.current = null;
      }

      const levelUp = levelUpRef.current;
      const prev = getItemGainState();
      setItemGainState({
        lines: next,
        tone: nextTone,
        pulseKey: prev.pulseKey + 1,
        visible: true,
        levelUp,
      });
      scheduleDismiss(
        options.holdMs ?? (levelUp ? LEVEL_UP_HOLD_MS : HOLD_MS),
      );
    },
    [scheduleDismiss],
  );

  useEffect(() => {
    registerItemGainPush(pushGains);
    return () => registerItemGainPush(null);
  }, [pushGains]);

  const value = useMemo(() => ({ pushGains }), [pushGains]);

  return (
    <ItemGainContext.Provider value={value}>
      {children}
    </ItemGainContext.Provider>
  );
}

export function useItemGain() {
  const ctx = useContext(ItemGainContext);
  if (!ctx) {
    throw new Error('useItemGain must be used within ItemGainProvider');
  }
  return ctx;
}

/** Optional: safe null outside provider. */
export function useItemGainOptional() {
  return useContext(ItemGainContext);
}

export { HOLD_MS as ITEM_GAIN_HOLD_MS, LEVEL_UP_HOLD_MS as ITEM_GAIN_LEVEL_UP_HOLD_MS };
