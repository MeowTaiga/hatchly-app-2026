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
  const { cols, rows, worldCols, worldRows } = dims;

  const padCols = Math.floor((worldCols - cols) / 2);
  const padRows = Math.floor((worldRows - rows) / 2);

  const wx = (screenX - translateX) / scale;
  const wy = (screenY - translateY) / scale;

  const col = Math.floor(wx / TILE_SIZE) - padCols;
  const row = Math.floor(wy / TILE_SIZE) - padRows;

  if (col >= 0 && col < cols && row >= 0 && row < rows) {
    return { col, row };
  }
  return null;
}
