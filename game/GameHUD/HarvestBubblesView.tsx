/**
 * Bridges harvestEffects → shared ItemGainToast.
 *
 * Keeps the spam-safe aggregate behavior of the old top toast, but renders
 * through the modal-hosted ItemGainToast so it also works over drawers.
 */

import React, { useEffect, useRef } from 'react';
import { ITEM_GAIN_HOLD_MS } from '../ItemGainProvider';
import { pushItemGains } from '../itemGainStore';
import type { HarvestEffect, ItemDefinition } from '../types';

interface HarvestBubblesViewProps {
  harvestEffects: HarvestEffect[];
  itemDefs: Record<string, ItemDefinition>;
  topOffset: number;
  onDismissHarvestEffect: (id: string) => void;
}

export function HarvestBubblesView({
  harvestEffects,
  itemDefs: _itemDefs,
  topOffset: _topOffset,
  onDismissHarvestEffect,
}: HarvestBubblesViewProps) {
  const seenIdsRef = useRef<Set<string>>(new Set());
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (harvestEffects.length === 0) {
      seenIdsRef.current.clear();
      return;
    }

    const fresh = harvestEffects.filter((fx) => !seenIdsRef.current.has(fx.id));
    if (fresh.length === 0) return;

    for (const fx of fresh) {
      seenIdsRef.current.add(fx.id);
    }

    const gains = fresh.flatMap((fx) =>
      fx.drops.map((d) => {
        const def = _itemDefs[d.itemType];
        return {
          itemType: d.itemType,
          qty: d.qty,
          label: def?.label,
          imageUrl: def?.imageUrl,
          emoji: def?.emoji,
        };
      }),
    );
    pushItemGains(gains, 'got');

    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    const ids = harvestEffects.map((e) => e.id);
    dismissTimerRef.current = setTimeout(() => {
      dismissTimerRef.current = null;
      for (const id of ids) onDismissHarvestEffect(id);
    }, ITEM_GAIN_HOLD_MS);

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [harvestEffects, onDismissHarvestEffect, _itemDefs]);

  return null;
}
