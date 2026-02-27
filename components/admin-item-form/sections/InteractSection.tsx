import React, { useMemo } from 'react';
import { Section, Field, ChipSelect } from '../FormField';
import { ACTION_TYPES } from '../constants';
import { ItemSearchDropdown, type SearchableItem } from '@/components/ui/ItemSearchDropdown';
import type { FormState } from '../types';
import type { ActionType } from '../constants';

interface InteractSectionProps {
  state: FormState;
  setField: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
  ts: Record<string, object>;
  colors: { textMuted: string };
  actionPayloads?: string[];
}

export function InteractSection({ state, setField, ts, colors, actionPayloads = [] }: InteractSectionProps) {
  const payloadOptions: SearchableItem[] = useMemo(() => {
    const items = actionPayloads.map((p) => ({ key: p, label: p }));
    if (state.actionPayload && !items.some((i) => i.key === state.actionPayload)) {
      items.unshift({ key: state.actionPayload, label: `${state.actionPayload} (custom)` });
    }
    return items;
  }, [actionPayloads, state.actionPayload]);

  return (
    <Section label="Interact Action" sectionLabelStyle={ts.sectionLabel} cardStyle={ts.card}>
      <Field label="Action Type" fieldLabelStyle={ts.fieldLabel}>
        <ChipSelect
          options={ACTION_TYPES}
          value={state.actionType}
          onSelect={(v) => setField('actionType', v as ActionType)}
          chipStyle={ts.chip}
          chipActiveStyle={ts.chipActive}
          chipTextStyle={ts.chipText}
          chipTextActiveStyle={ts.chipTextActive}
        />
      </Field>
      {state.actionType !== 'none' && (
        <Field label="Payload" fieldLabelStyle={ts.fieldLabel}>
          <ItemSearchDropdown
            items={payloadOptions}
            value={state.actionPayload}
            onSelect={(key) => setField('actionPayload', key)}
            placeholder="Search or type a payload..."
            allowCustom
          />
        </Field>
      )}
    </Section>
  );
}
