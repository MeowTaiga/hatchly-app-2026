/**
 * Tree shake channel.
 *
 * Kept out of the main game context so a tap only re-renders the tree that was
 * shaken. Passing the shake state as props would put it in the WorldRenderer
 * item-list memo, rebuilding and re-sorting every placed item on each tap.
 */

import React, { createContext, useContext } from 'react';

export interface TreeShakeState {
  anchorId: string | null;
  trigger: number;
}

const TreeShakeContext = createContext<TreeShakeState>({ anchorId: null, trigger: 0 });

export const TreeShakeProvider = TreeShakeContext.Provider;

/** Shake trigger for this tree, or undefined when it isn't the one being shaken. */
export function useTreeShakeTrigger(anchorId: string): number | undefined {
  const { anchorId: shakingAnchorId, trigger } = useContext(TreeShakeContext);
  return shakingAnchorId === anchorId ? trigger : undefined;
}
