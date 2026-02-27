/**
 * Start/End dialog steps with Add Step opening a drawer.
 * When talk_to_npc is a trigger, shows speaker options (Pet vs NPC).
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Field, ChipSelect } from '../FormField';
import { ListItemChip } from '../ListItemChip';
import { AddButton } from '../AddButton';
import { useTheme } from '@/store/ThemeProvider';
import { createThemedStyles } from '../styles';
import type { FormState, DialogStepForm } from '../types';

const hasTalkToNpcTrigger = (form: FormState) =>
  form.triggers?.some((t) => t.type === 'talk_to_npc' && t.npcItemType) ?? false;

interface DialogSectionProps {
  form: FormState;
  updateForm: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onAddStartStep: () => void;
  onEditStartStep: (index: number) => void;
  onAddEndStep: () => void;
  onEditEndStep: (index: number) => void;
}

function DialogStepsList({
  steps,
  onAdd,
  onEdit,
  onDelete,
}: {
  steps: DialogStepForm[];
  onAdd: () => void;
  onEdit: (i: number) => void;
  onDelete: (i: number) => void;
}) {
  const { theme } = useTheme();
  const ts = createThemedStyles(theme);
  return (
    <View style={{ gap: 6 }}>
      {steps.map((s, i) => (
        <ListItemChip
          key={i}
          title={s.text || '(empty)'}
          subtitle={s.highlightType ? `${s.highlightType}: ${s.highlightTarget}` : undefined}
          onEdit={() => onEdit(i)}
          onDelete={() => onDelete(i)}
        />
      ))}
      <AddButton label="Add Step" onPress={onAdd} />
    </View>
  );
}

export function DialogSection(props: DialogSectionProps) {
  const { form, updateForm } = props;
  const { theme } = useTheme();
  const ts = createThemedStyles(theme);
  const showSpeakerOptions = hasTalkToNpcTrigger(form);

  return (
    <View style={{ gap: 20 }}>
      {showSpeakerOptions && (
        <View style={{ gap: 12 }}>
          <Field label="Start dialog speaker">
            <ChipSelect<'pet' | 'npc'>
              options={[
                { key: 'pet', label: 'Pet' },
                { key: 'npc', label: 'NPC (image/name)' },
              ]}
              value={form.startDialogSpeaker}
              onSelect={(v) => updateForm('startDialogSpeaker', v)}
            />
          </Field>
          <Field label="End dialog speaker">
            <ChipSelect<'pet' | 'npc'>
              options={[
                { key: 'pet', label: 'Pet' },
                { key: 'npc', label: 'NPC (image/name)' },
              ]}
              value={form.endDialogSpeaker}
              onSelect={(v) => updateForm('endDialogSpeaker', v)}
            />
          </Field>
        </View>
      )}
      <View>
        <Text style={ts.sectionLabel}>Start Dialog</Text>
        <DialogStepsList
          steps={form.startDialog}
          onAdd={props.onAddStartStep}
          onEdit={props.onEditStartStep}
          onDelete={(i) => updateForm('startDialog', form.startDialog.filter((_, j) => j !== i))}
        />
      </View>
      <View>
        <Text style={ts.sectionLabel}>End Dialog</Text>
        <DialogStepsList
          steps={form.endDialog}
          onAdd={props.onAddEndStep}
          onEdit={props.onEditEndStep}
          onDelete={(i) => updateForm('endDialog', form.endDialog.filter((_, j) => j !== i))}
        />
      </View>
    </View>
  );
}
