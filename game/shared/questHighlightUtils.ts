/**
 * Shared utilities for quest highlight logic.
 * Used by both GameHUD (to determine which UI elements to highlight)
 * and GameProvider (for stepped highlight derivation).
 */

import type { QuestHighlight } from '../types';

/**
 * Creates a predicate that checks if a highlight target matches the given type and target key.
 *
 * @param activeHighlight - The current active quest highlight (may be null).
 * @returns A function `(type, target) => boolean` indicating whether that element should be highlighted.
 *
 * @example
 * const isHighlighted = createIsHighlighted(activeHighlight);
 * if (isHighlighted('hud_button', 'shop')) { /* highlight shop button *\/ }
 */
export function createIsHighlighted(activeHighlight: QuestHighlight | null) {
  return (type: QuestHighlight['type'], target: string): boolean =>
    activeHighlight?.type === type && activeHighlight?.target === target;
}
