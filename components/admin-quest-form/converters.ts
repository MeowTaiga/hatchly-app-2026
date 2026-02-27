/**
 * Converters between form state and API types.
 */

import type {
  AdminQuestDef,
  AdminQuestInput,
  AdminQuestUpdate,
  AdminQuestTrigger,
  AdminQuestStep,
  AdminDialogStep,
} from '@/lib/api';
import type { FormState, DialogStepForm, TriggerForm } from './types';

export function emptyDialogStep(): DialogStepForm {
  return { text: '', highlightType: '', highlightTarget: '', blocking: true };
}

export function emptyTrigger(): TriggerForm {
  return { type: 'talk_to_npc', questId: '', npcItemType: '', sceneSlug: '', firstVisitOnly: false };
}

export function emptyForm(): FormState {
  return {
    questId: '',
    type: 'farm_upgrade',
    title: '',
    description: '',
    farmLevel: '',
    petLevelMin: '',
    farmLevelMin: '',
    requiredQuestId: '',
    sortOrder: '0',
    reqItems: [],
    reqBuildings: [],
    reqActions: [],
    reqEquips: [],
    reqTalkToNpc: [],
    reqCropGrown: [],
    reqOpenModal: [],
    rewItems: [],
    rewGems: '',
    rewXp: '',
    startDialog: [],
    endDialog: [],
    startDialogSpeaker: 'npc',
    endDialogSpeaker: 'npc',
    autoTrigger: '',
    triggers: [],
    steps: [],
  };
}

export function dialogStepToForm(s: AdminDialogStep): DialogStepForm {
  return {
    text: s.text,
    highlightType: s.highlight?.type ?? '',
    highlightTarget: s.highlight?.target ?? '',
    blocking: s.blocking ?? true,
    speaker: s.speaker,
  };
}

export function formDialogStepToApi(s: DialogStepForm): AdminDialogStep | null {
  if (!s.text.trim()) return null;
  return {
    text: s.text.trim(),
    ...(s.highlightType && s.highlightTarget
      ? { highlight: { type: s.highlightType as any, target: s.highlightTarget } }
      : {}),
    ...(s.blocking === false ? { blocking: false } : {}),
    ...(s.speaker ? { speaker: s.speaker } : {}),
  };
}

export function triggerToForm(t: AdminQuestTrigger): TriggerForm {
  return {
    type: t.type,
    questId: t.questId ?? '',
    npcItemType: t.npcItemType ?? '',
    sceneSlug: t.sceneSlug ?? '',
    firstVisitOnly: t.firstVisitOnly ?? false,
  };
}

export function formTriggerToApi(t: TriggerForm): AdminQuestTrigger | null {
  if (!t.type) return null;
  const out: AdminQuestTrigger = { type: t.type };
  if (t.type === 'quest_complete' && t.questId) out.questId = t.questId;
  if (t.type === 'talk_to_npc' && t.npcItemType) out.npcItemType = t.npcItemType;
  if (t.type === 'enter_scene' && t.sceneSlug) {
    out.sceneSlug = t.sceneSlug;
    if (t.firstVisitOnly) out.firstVisitOnly = true;
  }
  return out;
}

export function defToForm(d: AdminQuestDef): FormState {
  return {
    questId: d.questId,
    type: d.type,
    title: d.title,
    description: d.description,
    farmLevel: d.farmLevel?.toString() ?? '',
    petLevelMin: d.petLevelMin?.toString() ?? '',
    farmLevelMin: d.farmLevelMin?.toString() ?? '',
    requiredQuestId: d.requiredQuestId ?? '',
    sortOrder: d.sortOrder.toString(),
    reqItems: d.requirements.items?.map((i) => ({ itemType: i.itemType, qty: i.qty.toString() })) ?? [],
    reqBuildings: d.requirements.buildings?.map((b) => ({ itemType: b.itemType, count: b.count.toString() })) ?? [],
    reqActions: d.requirements.actions?.map((a) => ({ action: a.action, count: a.count.toString(), itemType: a.itemType ?? '' })) ?? [],
    reqEquips: d.requirements.equips?.map((e) => ({ slot: e.slot, itemType: e.itemType ?? '' })) ?? [],
    reqTalkToNpc: d.requirements.talk_to_npc?.map((n) => ({ npcItemType: n.npcItemType, count: (n.count ?? 1).toString() })) ?? [],
    reqCropGrown: d.requirements.crop_grown?.map((c) => ({ itemType: c.itemType, count: (c.count ?? 1).toString() })) ?? [],
    reqOpenModal: d.requirements.open_modal?.map((m) => ({ payload: m.payload, count: (m.count ?? 1).toString() })) ?? [],
    rewItems: d.rewards.items?.map((i) => ({ itemType: i.itemType, qty: i.qty.toString() })) ?? [],
    rewGems: d.rewards.gems?.toString() ?? '',
    rewXp: d.rewards.xp?.toString() ?? '',
    startDialog: d.startDialog?.map(dialogStepToForm) ?? [],
    endDialog: d.endDialog?.map(dialogStepToForm) ?? [],
    startDialogSpeaker: d.startDialogSpeaker ?? 'npc',
    endDialogSpeaker: d.endDialogSpeaker ?? 'npc',
    autoTrigger: d.autoTrigger ?? '',
    triggers: d.triggers?.map(triggerToForm) ?? [],
    steps: d.steps ?? [],
  };
}

export function formToInput(f: FormState): AdminQuestInput {
  const startDialog = f.startDialog.map(formDialogStepToApi).filter(Boolean) as AdminDialogStep[];
  const endDialog = f.endDialog.map(formDialogStepToApi).filter(Boolean) as AdminDialogStep[];
  const triggers = f.triggers.map(formTriggerToApi).filter(Boolean) as AdminQuestTrigger[];
  return {
    questId: f.questId.trim(),
    type: f.type,
    title: f.title.trim(),
    description: f.description.trim(),
    farmLevel: f.type === 'farm_upgrade' && f.farmLevel ? parseInt(f.farmLevel) : undefined,
    petLevelMin: f.petLevelMin ? parseInt(f.petLevelMin) || undefined : undefined,
    farmLevelMin: f.farmLevelMin ? parseInt(f.farmLevelMin) || undefined : undefined,
    requiredQuestId: f.requiredQuestId.trim() || undefined,
    requirements: {
      items: f.reqItems.filter((i) => i.itemType && i.qty).map((i) => ({ itemType: i.itemType.trim(), qty: parseInt(i.qty) || 1 })),
      buildings: f.reqBuildings.filter((b) => b.itemType && b.count).map((b) => ({ itemType: b.itemType.trim(), count: parseInt(b.count) || 1 })),
      actions: f.reqActions.filter((a) => a.action && a.count).map((a) => ({
        action: a.action.trim(),
        count: parseInt(a.count) || 1,
        ...(a.itemType ? { itemType: a.itemType.trim() } : {}),
      })),
      equips: f.reqEquips.filter((e) => e.slot).map((e) => ({
        slot: e.slot.trim(),
        ...(e.itemType ? { itemType: e.itemType.trim() } : {}),
      })),
      talk_to_npc: f.reqTalkToNpc.filter((n) => n.npcItemType).map((n) => ({ npcItemType: n.npcItemType.trim(), count: parseInt(n.count) || 1 })),
      crop_grown: f.reqCropGrown.filter((c) => c.itemType).map((c) => ({ itemType: c.itemType.trim(), count: parseInt(c.count) || 1 })),
      open_modal: f.reqOpenModal.filter((m) => m.payload).map((m) => ({ payload: m.payload.trim(), count: parseInt(m.count) || 1 })),
    },
    rewards: {
      items: f.rewItems.filter((i) => i.itemType && i.qty).map((i) => ({ itemType: i.itemType.trim(), qty: parseInt(i.qty) || 1 })),
      gems: f.rewGems ? parseInt(f.rewGems) || undefined : undefined,
      xp: f.rewXp ? parseInt(f.rewXp) || undefined : undefined,
    },
    sortOrder: parseInt(f.sortOrder) || 0,
    startDialog: startDialog.length > 0 ? startDialog : undefined,
    endDialog: endDialog.length > 0 ? endDialog : undefined,
    startDialogSpeaker: f.startDialogSpeaker,
    endDialogSpeaker: f.endDialogSpeaker,
    autoTrigger: f.autoTrigger.trim() || undefined,
    triggers: triggers.length > 0 ? triggers : undefined,
    steps: f.steps.length > 0 ? f.steps : undefined,
  };
}

export function formToUpdate(f: FormState): AdminQuestUpdate {
  const input = formToInput(f);
  const { questId: _, ...rest } = input;
  return {
    ...rest,
    autoTrigger: f.autoTrigger.trim() || null,
    startDialogSpeaker: f.startDialogSpeaker,
    endDialogSpeaker: f.endDialogSpeaker,
    petLevelMin: f.petLevelMin ? parseInt(f.petLevelMin) || null : null,
    farmLevelMin: f.farmLevelMin ? parseInt(f.farmLevelMin) || null : null,
    requiredQuestId: f.requiredQuestId.trim() || null,
    triggers: rest.triggers ?? null,
    steps: rest.steps ?? null,
  };
}
