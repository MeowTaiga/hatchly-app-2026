import React, { useMemo } from 'react';
import { Section, Field, ChipMultiSelect } from '../FormField';
import type { FormState } from '../types';
import type { AdminGameItem } from '@/lib/api';

interface FruitSectionProps {
  state: FormState;
  setField: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
  allItems: AdminGameItem[];
  ts: Record<string, object>;
  colors: { textMuted: string };
}

/** Extract base tree variants from tree_fully_grown_* items (oak, dark_oak, etc.). */
function getTreeVariantOptions(allItems: AdminGameItem[]): { key: string; label: string }[] {
  const trees = allItems.filter(
    (i) => i.category === 'tree' && i.itemType.startsWith('tree_fully_grown_'),
  );
  const fruitTypes = allItems
    .filter((i) => i.subCategory === 'fruit')
    .map((i) => i.itemType);
  const bases = new Set<string>();
  for (const t of trees) {
    const suffix = t.itemType.replace(/^tree_fully_grown_/, '');
    let base = suffix;
    for (const f of fruitTypes) {
      if (suffix.endsWith('_' + f)) {
        base = suffix.slice(0, -(f.length + 1));
        break;
      }
    }
    bases.add(base);
  }
  return Array.from(bases)
    .sort()
    .map((v) => ({
      key: v,
      label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    }));
}

export function FruitSection({ state, setField, allItems, ts, colors }: FruitSectionProps) {
  const treeOptions = useMemo(() => getTreeVariantOptions(allItems), [allItems]);

  const toggleTree = (key: string) => {
    const current = state.growsOnTrees ?? [];
    const next = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key];
    setField('growsOnTrees', next);
  };

  return (
    <Section label="Fruit Settings" sectionLabelStyle={ts.sectionLabel} cardStyle={ts.card}>
      <Field label="Grows on trees" fieldLabelStyle={ts.fieldLabel}>
        <ChipMultiSelect
          options={treeOptions}
          value={state.growsOnTrees ?? []}
          onToggle={toggleTree}
          chipStyle={ts.chip}
          chipActiveStyle={ts.chipActive}
          chipTextStyle={ts.chipText}
          chipTextActiveStyle={ts.chipTextActive}
        />
      </Field>
    </Section>
  );
}
