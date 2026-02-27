/**
 * Triggers list with Add Trigger opening a drawer.
 */

import React from 'react';
import { View } from 'react-native';
import { ListItemChip } from '../ListItemChip';
import { AddButton } from '../AddButton';
import type { FormState, TriggerForm } from '../types';
import { TRIGGER_TYPES } from '../constants';

interface TriggersSectionProps {
  form: FormState;
  updateForm: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onAddTrigger: () => void;
  onEditTrigger: (index: number) => void;
}

function triggerLabel(t: TriggerForm): string {
  switch (t.type) {
    case 'quest_complete':
      return `Quest: ${t.questId || '…'}`;
    case 'talk_to_npc':
      return `Talk: ${t.npcItemType || '…'}`;
    case 'enter_scene':
      return `Scene: ${t.sceneSlug || '…'}${t.firstVisitOnly ? ' (first visit)' : ''}`;
    case 'start':
      return 'Start';
    case 'manual':
      return 'Manual';
    default:
      return t.type || '…';
  }
}

export function TriggersSection({ form, updateForm, onAddTrigger, onEditTrigger }: TriggersSectionProps) {
  const triggers = form.triggers;

  const handleDelete = (index: number) => {
    const next = triggers.filter((_, i) => i !== index);
    updateForm('triggers', next);
  };

  return (
    <View style={{ gap: 8 }}>
      {triggers.map((t, i) => (
        <ListItemChip
          key={i}
          title={triggerLabel(t)}
          subtitle={TRIGGER_TYPES.find((x) => x === t.type) ?? t.type}
          onEdit={() => onEditTrigger(i)}
          onDelete={() => handleDelete(i)}
        />
      ))}
      <AddButton label="Add Trigger" onPress={onAddTrigger} />
    </View>
  );
}
