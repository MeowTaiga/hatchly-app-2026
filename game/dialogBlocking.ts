/**
 * Whether the dialog currently on screen refuses to be tapped away.
 *
 * A step that points at part of the UI can insist the player actually goes and
 * presses it. That only works if every reader agrees on the rule, so it lives
 * here: the overlay uses it to decide whether taps do anything, and the provider
 * uses it to decide whether to advance.
 */

import type { DialogEntry } from './types';

/**
 * How long a blocking step waits before it offers an escape.
 *
 * Blocking used to be absolute, which meant a highlight the player could not
 * satisfy — a mis-authored target, or an instruction they had already carried
 * out — left the dialog on screen forever with the quest's reward screen stuck
 * behind it. Nothing in a tutorial is worth trapping someone in.
 */
export const DIALOG_SKIP_AFTER_MS = 6000;

export function stepBlocks(dialog: DialogEntry | null, stepIndex: number): boolean {
  const step = dialog?.steps[stepIndex];
  // With nothing highlighted there is nothing to wait for.
  if (!step?.highlight) return false;
  // Either the step or the whole dialog can opt out of blocking.
  if (step.blocking === false) return false;
  return dialog?.blocking !== false;
}
