/**
 * Reusable logic for interacting with placed items (buildings, NPCs, etc.).
 * Used by both farm (grid-based) and multiplayer (placement-based) scenes.
 *
 * When a user taps a placed item with interactAction or NPC dialog,
 * this module handles: open_scene, open_modal, NPC quest dialogs.
 */

import type {
  PlacedItem,
  ItemDefinition,
  InteractAction,
  DialogStep,
  DialogSpeaker,
  QuestProgress,
} from './types';
import { meetsActivationRequirements } from './multiplayer/QuestBubble';
import { executeAction } from './actionRegistry';

export interface InteractCallbacks {
  setPendingNpcDialog: (info: {
    steps: DialogStep[];
    speaker?: DialogSpeaker;
    npcItemType: string;
  } | null) => void;
  queueNpcDialog: (
    steps: DialogStep[],
    speaker?: DialogSpeaker,
    npcItemType?: string,
    blocking?: boolean,
    questIdToComplete?: string,
  ) => void;
  optimisticallyActivateQuest?: (questId: string) => void;
  emitQuestActivateByNpc: (npcItemType: string) => void;
  switchScene: (scene: string) => void;
  /** Either dispatch (for GameProvider) or setPendingInteraction (for MultiplayerScene). */
  dispatch?: (action: { type: string; [k: string]: unknown }) => void;
  setPendingInteraction?: (action: InteractAction | null) => void;
  clearInteraction: () => void;
  emitQuestModalOpened: (payload: string) => void;
}

/**
 * Attempt to interact with a placed item (NPC dialog or interactAction).
 * Returns true if the interaction was handled, false otherwise.
 */
export function tryInteractWithPlacedItem(
  existing: PlacedItem,
  itemDefs: Record<string, ItemDefinition>,
  quests: QuestProgress[] | undefined,
  farmLevel: number,
  petLevel: number,
  callbacks: InteractCallbacks,
): boolean {
  const def = itemDefs[existing.itemType];
  if (!def) return false;

  // NPC: handle quest dialogs
  if (def.category === 'npc') {
    const completableQuestWithEndDialog = quests?.find(
      (q) =>
        q.status === 'active' &&
        q.canComplete &&
        q.triggers?.some((t) => t.type === 'talk_to_npc' && t.npcItemType === existing.itemType) &&
        q.endDialog?.length,
    );
    const activeQuestWithDialog = quests?.find(
      (q) =>
        q.status === 'active' &&
        q.triggers?.some((t) => t.type === 'talk_to_npc' && t.npcItemType === existing.itemType) &&
        q.startDialog?.length &&
        !(q.canComplete && q.endDialog?.length),
    );
    const lockedQuestAvailable = quests?.find(
      (q) =>
        q.status === 'locked' &&
        q.triggers?.some((t) => t.type === 'talk_to_npc' && t.npcItemType === existing.itemType) &&
        q.startDialog?.length &&
        meetsActivationRequirements(q, petLevel, farmLevel, quests ?? []),
    );
    const completedQuestWithEndDialog = quests?.find(
      (q) =>
        q.status === 'completed' &&
        q.triggers?.some((t) => t.type === 'talk_to_npc' && t.npcItemType === existing.itemType) &&
        q.endDialog?.length,
    );
    const steps =
      completableQuestWithEndDialog?.endDialog ??
      activeQuestWithDialog?.startDialog ??
      lockedQuestAvailable?.startDialog ??
      completedQuestWithEndDialog?.endDialog ??
      def.npcDialog ??
      [];
    const useNpcSpeaker = completableQuestWithEndDialog
      ? completableQuestWithEndDialog.endDialogSpeaker !== 'pet'
      : activeQuestWithDialog
        ? activeQuestWithDialog.startDialogSpeaker !== 'pet'
        : lockedQuestAvailable
          ? lockedQuestAvailable.startDialogSpeaker !== 'pet'
          : completedQuestWithEndDialog
            ? completedQuestWithEndDialog.endDialogSpeaker !== 'pet'
            : true;

    if (steps.length) {
      const dialogInfo = {
        steps,
        speaker: useNpcSpeaker ? { name: def.label, imageUrl: def.imageUrl ?? null } : undefined,
        npcItemType: existing.itemType,
      };
      callbacks.setPendingNpcDialog(dialogInfo);
      if (lockedQuestAvailable) {
        callbacks.queueNpcDialog(dialogInfo.steps, dialogInfo.speaker, dialogInfo.npcItemType);
        callbacks.optimisticallyActivateQuest?.(lockedQuestAvailable.questId);
      }
      if (completableQuestWithEndDialog) {
        callbacks.queueNpcDialog(
          dialogInfo.steps,
          dialogInfo.speaker,
          dialogInfo.npcItemType,
          undefined,
          completableQuestWithEndDialog.questId,
        );
      }
      if (!completableQuestWithEndDialog && !completedQuestWithEndDialog) {
        callbacks.emitQuestActivateByNpc(existing.itemType);
      }
    }
    return true;
  }

  // interactAction: open_scene, open_modal, etc.
  const act = def.interactAction;
  if (act && act.type !== 'none') {
    if (act.type === 'open_scene' && act.payload) {
      if (act.payload === 'house') {
        callbacks.emitQuestModalOpened('house');
        const houseAction: InteractAction = { type: 'open_modal', payload: 'house' };
        if (callbacks.setPendingInteraction) {
          callbacks.setPendingInteraction(houseAction);
        } else if (callbacks.dispatch) {
          callbacks.dispatch({ type: 'SET_INTERACTION', action: houseAction });
        }
      } else {
        callbacks.switchScene(act.payload);
      }
    } else {
      const anchId = existing.anchorId ?? existing.id;
      if (act.type === 'open_modal' && act.payload) {
        callbacks.emitQuestModalOpened(act.payload);
      }
      const action: InteractAction = {
        ...act,
        anchorId: act.payload === 'food_dish' ? anchId : undefined,
      };
      if (!executeAction(action, callbacks.clearInteraction)) {
        if (callbacks.setPendingInteraction) {
          callbacks.setPendingInteraction(action);
        } else if (callbacks.dispatch) {
          callbacks.dispatch({ type: 'SET_INTERACTION', action });
        }
      }
    }
    return true;
  }

  return false;
}
