/**
 * Registry for tile tap handler to avoid passing refs into Reanimated worklets.
 * Worklets serialize captured values; refs must not be passed.
 * This module-level indirection keeps the handler out of worklet scope.
 */
export type TileTapHandler = (col: number, row: number, worldX: number, worldY: number) => void;

let currentHandler: TileTapHandler | null = null;

export function setTileTapHandler(handler: TileTapHandler | null): void {
  currentHandler = handler;
}

/** Called from worklet via runOnJS - must not capture refs. */
export function invokeTileTap(col: number, row: number, worldX: number, worldY: number): void {
  currentHandler?.(col, row, worldX, worldY);
}
