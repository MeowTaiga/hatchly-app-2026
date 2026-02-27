/**
 * Types for the admin quest form.
 */

import type { AdminQuestDef, AdminQuestStep } from '@/lib/api';

export type QuestType = 'farm_upgrade' | 'story' | 'daily';

export interface ItemReq {
  itemType: string;
  qty: string;
}

export interface BuildingReq {
  itemType: string;
  count: string;
}

export interface ActionReq {
  action: string;
  count: string;
  itemType: string;
}

export interface EquipReq {
  slot: string;
  itemType: string;
}

export interface TalkToNpcReq {
  npcItemType: string;
  count: string;
}

export interface CropGrownReq {
  itemType: string;
  count: string;
}

export interface OpenModalReq {
  payload: string;
  count: string;
}

export interface ItemReward {
  itemType: string;
  qty: string;
}

export interface DialogStepForm {
  text: string;
  highlightType: string;
  highlightTarget: string;
  blocking?: boolean;
  /** Override speaker for this step: 'pet' | 'npc'. Falls back to dialog-level speaker if unset. */
  speaker?: 'pet' | 'npc';
}

export interface TriggerForm {
  type: string;
  questId: string;
  npcItemType: string;
  sceneSlug: string;
  firstVisitOnly: boolean;
}

export interface FormState {
  questId: string;
  type: QuestType;
  title: string;
  description: string;
  farmLevel: string;
  petLevelMin: string;
  farmLevelMin: string;
  requiredQuestId: string;
  sortOrder: string;
  reqItems: ItemReq[];
  reqBuildings: BuildingReq[];
  reqActions: ActionReq[];
  reqEquips: EquipReq[];
  reqTalkToNpc: TalkToNpcReq[];
  reqCropGrown: CropGrownReq[];
  reqOpenModal: OpenModalReq[];
  rewItems: ItemReward[];
  rewGems: string;
  rewXp: string;
  startDialog: DialogStepForm[];
  endDialog: DialogStepForm[];
  startDialogSpeaker: 'pet' | 'npc';
  endDialogSpeaker: 'pet' | 'npc';
  autoTrigger: string;
  triggers: TriggerForm[];
  steps: AdminQuestStep[];
}
