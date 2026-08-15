/**
 * Downsampled alpha masks for sprite hit-testing.
 *
 * Unused on the tap path. Decoding PNGs with upng-js on the JS thread hitchs
 * taps and starves inventory-drag callbacks. Hit-testing uses an ellipse
 * inside the sprite rect instead (see itemPixelHit.ts).
 */

const MASK_SIZE = 48;
const ALPHA_CUTOFF = 28;
const DECODE_YIELD_MS = 48;

export interface ItemAlphaMask {
  bits: Uint8Array;
  size: number;
  srcW: number;
  srcH: number;
}

const cache = new Map<string, ItemAlphaMask | null>();
const queued = new Set<string>();
const queue: string[] = [];
let pumping = false;

export function peekItemAlphaMask(url: string | undefined): ItemAlphaMask | null | undefined {
  if (!url) return null;
  return cache.get(url);
}

/** Queue a mask decode. Safe to call from a tap — does not decode now. */
export function enqueueItemAlphaMask(url: string | undefined): void {
  if (!url || cache.has(url) || queued.has(url)) return;
  queued.add(url);
  queue.push(url);
  if (!pumping) {
    pumping = true;
    setTimeout(pumpQueue, DECODE_YIELD_MS);
  }
}

/** @deprecated Use enqueueItemAlphaMask — kept so callers don't fire parallel fetches. */
export function ensureItemAlphaMask(url: string | undefined): Promise<ItemAlphaMask | null> {
  enqueueItemAlphaMask(url);
  if (!url) return Promise.resolve(null);
  if (cache.has(url)) return Promise.resolve(cache.get(url) ?? null);
  return Promise.resolve(null);
}

export function warmItemAlphaMasks(urls: Iterable<string | undefined>): void {
  for (const url of urls) enqueueItemAlphaMask(url);
}

export function sampleMaskAlpha(
  mask: ItemAlphaMask,
  u: number,
  v: number,
  fit: 'contain' | 'cover',
  destW: number,
  destH: number,
): number {
  if (u < 0 || u > 1 || v < 0 || v > 1) return 0;
  const mapped = mapFitUv(u, v, mask.srcW, mask.srcH, destW, destH, fit);
  if (!mapped) return 0;
  return sampleNearest(mask, mapped.u, mapped.v);
}

async function pumpQueue(): Promise<void> {
  while (queue.length) {
    const url = queue.shift();
    if (!url) continue;
    try {
      await decodeOne(url);
    } catch {
      cache.set(url, null);
    } finally {
      queued.delete(url);
    }
    if (queue.length) {
      await new Promise((r) => setTimeout(r, DECODE_YIELD_MS));
    }
  }
  pumping = false;
}

async function decodeOne(url: string): Promise<void> {
  if (cache.has(url)) return;
  const res = await fetch(url);
  if (!res.ok) {
    cache.set(url, null);
    return;
  }
  const buf = await res.arrayBuffer();
  // Decode after a tick so the fetch callback doesn't also expand the PNG
  // in the same frame as incoming taps / socket messages.
  await new Promise((r) => setTimeout(r, 0));
  const UPNG = (await import('upng-js')).default;
  const img = UPNG.decode(buf);
  const rgba = UPNG.toRGBA8(img)[0];
  if (!rgba) {
    cache.set(url, null);
    return;
  }
  cache.set(url, downsampleAlpha(rgba, img.width, img.height, MASK_SIZE));
}

function mapFitUv(
  u: number,
  v: number,
  srcW: number,
  srcH: number,
  destW: number,
  destH: number,
  fit: 'contain' | 'cover',
): { u: number; v: number } | null {
  if (srcW <= 0 || srcH <= 0 || destW <= 0 || destH <= 0) return { u, v };
  const scale =
    fit === 'contain'
      ? Math.min(destW / srcW, destH / srcH)
      : Math.max(destW / srcW, destH / srcH);
  const contentW = srcW * scale;
  const contentH = srcH * scale;
  const x0 = (destW - contentW) / 2;
  const y0 = (destH - contentH) / 2;
  const px = u * destW;
  const py = v * destH;
  if (fit === 'contain') {
    if (px < x0 || px > x0 + contentW || py < y0 || py > y0 + contentH) return null;
  }
  return {
    u: (px - x0) / contentW,
    v: (py - y0) / contentH,
  };
}

function sampleNearest(mask: ItemAlphaMask, u: number, v: number): number {
  const x = Math.min(mask.size - 1, Math.max(0, Math.floor(u * mask.size)));
  const y = Math.min(mask.size - 1, Math.max(0, Math.floor(v * mask.size)));
  return mask.bits[y * mask.size + x] ? 1 : 0;
}

function downsampleAlpha(
  rgba: ArrayBuffer,
  srcW: number,
  srcH: number,
  size: number,
): ItemAlphaMask {
  const src = new Uint8Array(rgba);
  const bits = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    const srcY = Math.min(srcH - 1, Math.floor(((y + 0.5) / size) * srcH));
    for (let x = 0; x < size; x++) {
      const srcX = Math.min(srcW - 1, Math.floor(((x + 0.5) / size) * srcW));
      const a = src[(srcY * srcW + srcX) * 4 + 3];
      bits[y * size + x] = a >= ALPHA_CUTOFF ? 1 : 0;
    }
  }
  return { bits, size, srcW, srcH };
}
