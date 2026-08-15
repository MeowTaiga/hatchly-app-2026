/**
 * Lightweight item preview cache for UI outside GameProvider
 * (skill unlock rows, level-up toast fallbacks).
 */

import { api } from '@/lib/api';

export type ItemPreview = {
  itemType: string;
  label: string;
  emoji?: string;
  imageUrl?: string;
};

let cache: Map<string, ItemPreview> | null = null;
let inflight: Promise<Map<string, ItemPreview>> | null = null;

export async function ensureItemPreviewCache(): Promise<Map<string, ItemPreview>> {
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const items = await api.getPlayableGameItems();
      const next = new Map<string, ItemPreview>();
      for (const item of items) {
        if (!item?.itemType) continue;
        next.set(item.itemType, {
          itemType: item.itemType,
          label: item.label || item.itemType,
          emoji: item.emoji,
          imageUrl: item.imageUrl,
        });
      }
      cache = next;
      return next;
    } catch {
      return cache ?? new Map();
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function peekItemPreview(itemType: string): ItemPreview | undefined {
  return cache?.get(itemType);
}

/** Merge live game defs into the preview cache (no extra network). */
export function ingestItemPreviews(
  defs: Record<string, { itemType?: string; label?: string; emoji?: string; imageUrl?: string } | undefined>,
): void {
  if (!cache) cache = new Map();
  for (const [key, def] of Object.entries(defs)) {
    if (!def) continue;
    const itemType = def.itemType || key;
    cache.set(itemType, {
      itemType,
      label: def.label || itemType,
      emoji: def.emoji,
      imageUrl: def.imageUrl,
    });
  }
}

export function resolveItemPreview(itemType: string): ItemPreview {
  const hit = peekItemPreview(itemType);
  if (hit) return hit;
  return {
    itemType,
    label: itemType
      .split('_')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
  };
}
