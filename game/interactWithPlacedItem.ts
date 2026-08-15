/**
 * What happens when the player taps a placed item — an NPC, a building, or
 * anything with an interact action. Shared by the farm and multiplayer scenes.
 */

import type { InteractAction, ItemDefinition, PlacedItem } from './types';
import { executeAction } from './actionRegistry';
import {
  evaluateInteractGate,
  type InteractGateContext,
} from './interactGate';

export interface InteractCallbacks {
  /** Reports the conversation. The server replies with whatever the NPC says. */
  talkToNpc: (npcItemType: string) => void;
  switchScene: (scene: string) => void;
  /** Either dispatch (GameProvider) or setPendingInteraction (MultiplayerScene). */
  dispatch?: (action: { type: 'SET_INTERACTION'; action: InteractAction | null }) => void;
  setPendingInteraction?: (action: InteractAction | null) => void;
  clearInteraction: () => void;
  emitQuestModalOpened: (payload: string) => void;
  /** Farm/pet/inventory state for interactAction gates. */
  gateContext?: InteractGateContext;
  /** Shown when a gated action is blocked (e.g. pet dialog). */
  showPetDialog?: (text: string) => void;
  /** Quest dialog: world_item / open_modal highlights advance when the player taps. */
  onInteract?: (itemType: string, modalPayload?: string) => void;
}

/**
 * Handles a tap on a placed item. Returns true when the tap was consumed.
 *
 * Tapping an NPC does exactly one thing: tell the server. The server opens any
 * quest waiting on that NPC, records the talk, and sends back the dialog to
 * show. Previously the client tried to work out which of five possible dialogs
 * to display, guessed whether the server would also send one, and skipped the
 * message entirely when it found nothing — which is why NPCs only answered
 * sometimes.
 */
export function tryInteractWithPlacedItem(
  existing: PlacedItem,
  itemDefs: Record<string, ItemDefinition>,
  callbacks: InteractCallbacks,
): boolean {
  const def = itemDefs[existing.itemType];
  if (!def) return false;

  if (def.category === 'npc') {
    callbacks.talkToNpc(existing.itemType);
    return true;
  }

  const act = def.interactAction;
  if (!act || act.type === 'none') return false;

  if (callbacks.gateContext) {
    const gate = evaluateInteractGate(act, callbacks.gateContext);
    if (!gate.ok) {
      callbacks.showPetDialog?.(gate.message ?? "I can't use that yet…");
      return true;
    }
  }

  const setInteraction = (action: InteractAction) => {
    if (callbacks.setPendingInteraction) callbacks.setPendingInteraction(action);
    else callbacks.dispatch?.({ type: 'SET_INTERACTION', action });
  };

  if (act.type === 'open_scene' && act.payload) {
    // The house is a modal rather than a real scene.
    if (act.payload === 'house') {
      callbacks.emitQuestModalOpened('house');
      setInteraction({ type: 'open_modal', payload: 'house' });
      callbacks.onInteract?.(existing.itemType, 'house');
    } else {
      callbacks.switchScene(act.payload);
      callbacks.onInteract?.(existing.itemType, act.payload);
    }
    return true;
  }

  if (act.type === 'open_modal' && act.payload) {
    callbacks.emitQuestModalOpened(act.payload);
  }

  const action: InteractAction = {
    ...act,
    anchorId: act.payload === 'food_dish' ? (existing.anchorId ?? existing.id) : undefined,
  };
  if (!executeAction(action, callbacks.clearInteraction)) setInteraction(action);
  callbacks.onInteract?.(existing.itemType, act.payload);

  return true;
}
