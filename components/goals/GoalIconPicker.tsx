/**
 * Shared vertical icon grid for a goal or a section.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GoalIcon } from '@/components/goals/GoalIcon';
import { useTheme } from '@/store/ThemeProvider';
import { radius } from '@/constants/theme';

interface GoalIconPickerProps {
  icons: string[];
  selected: string;
  art: Record<string, { imageUrl?: string; emoji?: string }>;
  onSelect: (itemType: string) => void;
  onBack: () => void;
}

export function GoalIconPicker({ icons, selected, art, onSelect, onBack }: GoalIconPickerProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={styles.wrap}>
      <Pressable onPress={onBack} style={styles.back} hitSlop={8}>
        <Ionicons name="chevron-back" size={20} color={colors.primary} />
        <Text style={[styles.backText, { color: colors.primary }]}>Back</Text>
      </Pressable>
      <View style={styles.grid}>
        {icons.map((itemType) => {
          const on = selected === itemType;
          const hit = art[itemType];
          return (
            <Pressable
              key={itemType}
              onPress={() => onSelect(itemType)}
              style={[
                styles.cell,
                {
                  borderColor: on ? colors.primary : colors.border,
                  backgroundColor: on ? colors.primary + '18' : colors.surface,
                },
              ]}
            >
              <GoalIcon
                itemType={itemType}
                size={32}
                imageUrl={hit?.imageUrl}
                emoji={hit?.emoji}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backText: { fontSize: 15, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
