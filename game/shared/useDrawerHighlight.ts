/**
 * Hook for drawer highlight logic: is item highlighted, and onActionComplete callback.
 */

import { useCallback } from 'react';
import type { QuestHighlight } from '../types';
import type { DrawerHighlightType } from './drawerHighlightConfig';

interface UseDrawerHighlightParams {
  activeHighlight: QuestHighlight | null;
  highlightType: DrawerHighlightType;
  tryAutoAdvanceDialog: (action: string, itemType?: string) => void;
}

interface UseDrawerHighlightResult {
  isItemHighlighted: (itemType: string) => boolean;
  onActionComplete: (action: string, itemType: string) => void;
}

export function useDrawerHighlight({
  activeHighlight,
  highlightType,
  tryAutoAdvanceDialog,
}: UseDrawerHighlightParams): UseDrawerHighlightResult {
  const isItemHighlighted = useCallback(
    (itemType: string) =>
      activeHighlight?.type === highlightType && activeHighlight.target === itemType,
    [activeHighlight, highlightType],
  );

  const onActionComplete = useCallback(
    (action: string, itemType: string) => {
      tryAutoAdvanceDialog(action, itemType);
    },
    [tryAutoAdvanceDialog],
  );

  return { isItemHighlighted, onActionComplete };
}
