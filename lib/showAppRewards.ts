/**
 * Push wellness / chat rewards into the shared ItemGain toast
 * (same UI as apple harvest / shop buys).
 */

import { pushItemGains, type PushGainInput } from '@/game/itemGainStore';

export type AppRewardItem = {
  itemType: string;
  label: string;
  imageUrl?: string;
  emoji?: string;
  qty?: number;
};

export function showAppRewards(opts: {
  xpGained?: number;
  gemsAwarded?: number;
  item?: AppRewardItem | null;
}): void {
  const gains: PushGainInput[] = [];
  const xp = opts.xpGained ?? 0;
  const gems = opts.gemsAwarded ?? 0;

  if (xp > 0) {
    gains.push({
      itemType: '__xp',
      qty: xp,
      label: 'XP',
      emoji: '⭐',
    });
  }
  if (gems > 0) {
    gains.push({
      itemType: '__gems',
      qty: gems,
      label: 'Gems',
      emoji: '💎',
    });
  }
  if (opts.item) {
    gains.push({
      itemType: opts.item.itemType,
      qty: opts.item.qty ?? 1,
      label: opts.item.label,
      imageUrl: opts.item.imageUrl,
      emoji: opts.item.emoji,
    });
  }

  if (gains.length > 0) {
    pushItemGains(gains, 'got');
  }
}
