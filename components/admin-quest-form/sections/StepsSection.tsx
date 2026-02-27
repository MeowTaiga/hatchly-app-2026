/**
 * Quest steps list with Add Step and Edit opening a drawer.
 */

import React from 'react';
import { View } from 'react-native';
import { ListItemChip } from '../ListItemChip';
import { AddButton } from '../AddButton';
import type { FormState } from '../types';
import type { AdminQuestStep } from '@/lib/api';

interface StepsSectionProps {
  form: FormState;
  updateForm: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onAddStep: () => void;
  onEditStep: (index: number) => void;
}

function stepSummary(step: AdminQuestStep): string {
  const parts: string[] = [];
  if (step.requirements?.items?.length) parts.push(`${step.requirements.items.length} items`);
  if (step.requirements?.buildings?.length) parts.push(`${step.requirements.buildings.length} buildings`);
  if (step.requirements?.actions?.length) parts.push(`${step.requirements.actions.length} actions`);
  return parts.length > 0 ? parts.join(', ') : 'No requirements';
}

export function StepsSection({ form, updateForm, onAddStep, onEditStep }: StepsSectionProps) {
  const steps = form.steps;

  const handleDelete = (index: number) => {
    updateForm('steps', steps.filter((_, i) => i !== index));
  };

  return (
    <View style={{ gap: 8 }}>
      {steps.map((step, i) => (
        <ListItemChip
          key={step.stepId}
          title={step.stepId}
          subtitle={stepSummary(step)}
          onEdit={() => onEditStep(i)}
          onDelete={() => handleDelete(i)}
        />
      ))}
      <AddButton label="Add Step" onPress={onAddStep} />
    </View>
  );
}
