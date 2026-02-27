/**
 * Rewards: gems, xp, items. Items use Add drawer.
 */

import React from 'react';
import { View } from 'react-native';
import { FormTextField, Field } from '../FormField';
import { ListItemChip } from '../ListItemChip';
import { AddButton } from '../AddButton';
import type { FormState, ItemReward } from '../types';

interface RewardsSectionProps {
  form: FormState;
  updateForm: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onAddItem: () => void;
  onEditItem: (index: number) => void;
}

export function RewardsSection({ form, updateForm, onAddItem, onEditItem }: RewardsSectionProps) {
  const items = form.rewItems;

  const handleDelete = (index: number) => {
    updateForm('rewItems', items.filter((_, i) => i !== index));
  };

  return (
    <View style={{ gap: 12 }}>
      <FormTextField
        label="Gems"
        value={form.rewGems}
        onChangeText={(v) => updateForm('rewGems', v)}
        placeholder="0"
        keyboardType="number-pad"
      />
      <FormTextField
        label="XP"
        value={form.rewXp}
        onChangeText={(v) => updateForm('rewXp', v)}
        placeholder="0"
        keyboardType="number-pad"
      />
      <View>
        {items.length > 0 && (
          <View style={{ marginBottom: 8 }}>
            {items.map((r: ItemReward, i) => (
              <View key={i} style={{ marginBottom: 6 }}>
                <ListItemChip
                  title={`${r.itemType} × ${r.qty}`}
                  onEdit={() => onEditItem(i)}
                  onDelete={() => handleDelete(i)}
                />
              </View>
            ))}
          </View>
        )}
        <AddButton label="Add Item Reward" onPress={onAddItem} />
      </View>
    </View>
  );
}
