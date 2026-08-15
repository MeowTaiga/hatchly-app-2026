import { TILE_SIZE } from './constants';

export interface CameraSnapshot {
  translateX: number;
  translateY: number;
  scale: number;
}

export interface GridDimensions {
  cols: number;
  rows: number;
  worldCols: number;
  worldRows: number;
}

/**
 * Where the farm grid's top-left corner sits inside the world, in pixels.
 *
 * The farm is centred in the world and the scenery art is baked against exactly
 * this offset, so layout, hit-testing and dragging all have to agree with it.
 * Two details are easy to get wrong and both put taps on the wrong tile:
 * the vertical offset comes from the *row* difference, and the offset is a whole
 * half tile when that difference is odd, so it must be subtracted in pixels
 * rather than rounded to a tile count.
 */
export function farmOriginX(dims: GridDimensions): number {
  'worklet';
  return ((dims.worldCols - dims.cols) / 2) * TILE_SIZE;
}

export function farmOriginY(dims: GridDimensions): number {
  'worklet';
  return ((dims.worldRows - dims.rows) / 2) * TILE_SIZE;
}

/**
 * Converts screen coordinates to farm/house grid (col, row).
 *
 * @param screenX - X in screen/window coords
 * @param screenY - Y in screen/window coords
 * @param camera - Current camera transform (tx, ty, scale)
 * @param dims - Grid dimensions (cols, rows, worldCols, worldRows)
 * @returns Grid coord or null if outside playable area
 */
export function screenToGrid(
  screenX: number,
  screenY: number,
  camera: CameraSnapshot,
  dims: GridDimensions,
): { col: number; row: number } | null {
  const { translateX, translateY, scale } = camera;
  const { cols, rows } = dims;

  const wx = (screenX - translateX) / scale;
  const wy = (screenY - translateY) / scale;

  const col = Math.floor((wx - farmOriginX(dims)) / TILE_SIZE);
  const row = Math.floor((wy - farmOriginY(dims)) / TILE_SIZE);

  if (col >= 0 && col < cols && row >= 0 && row < rows) {
    return { col, row };
  }
  return null;
}

/**
 * The same conversion, callable from the UI thread, packed into one number.
 *
 * A palette drag needs the target tile on every frame. Handing the finger
 * position to JS to work it out meant a bridge hop and a React render per
 * frame; doing it here means the drag only wakes JS up when the answer
 * actually changes. Packing avoids allocating an object each frame.
 *
 * @returns `row * PACK_STRIDE + col`, or `NO_ANCHOR` when off the grid.
 */
export const NO_ANCHOR = -1;
const PACK_STRIDE = 1024;

export function packedAnchorAt(
  screenX: number,
  screenY: number,
  translateX: number,
  translateY: number,
  scale: number,
  dims: GridDimensions,
  footCols: number,
  footRows: number,
): number {
  'worklet';
  const wx = (screenX - translateX) / scale;
  const wy = (screenY - translateY) / scale;

  const col = Math.floor((wx - farmOriginX(dims)) / TILE_SIZE);
  const row = Math.floor((wy - farmOriginY(dims)) / TILE_SIZE);
  if (col < 0 || col >= dims.cols || row < 0 || row >= dims.rows) return NO_ANCHOR;

  // The finger holds the item's centre, so back off to its top-left and keep
  // the whole footprint on the grid.
  const anchorCol = Math.max(0, Math.min(dims.cols - footCols, col - Math.floor(footCols / 2)));
  const anchorRow = Math.max(0, Math.min(dims.rows - footRows, row - Math.floor(footRows / 2)));
  return anchorRow * PACK_STRIDE + anchorCol;
}

export function unpackAnchor(packed: number): { col: number; row: number } | null {
  if (packed === NO_ANCHOR) return null;
  return { col: packed % PACK_STRIDE, row: Math.floor(packed / PACK_STRIDE) };
}
