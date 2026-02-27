import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import type { AccentColorOption } from '@/constants/accentColors';
import { spacing } from '@/constants/theme';

const DEFAULT_SIZE = 48;
const DEFAULT_GAP = 12;
const DEFAULT_COLS = 5;

interface AccentColorGridProps {
  colors: readonly AccentColorOption[];
  selectedHex: string;
  onSelect: (hex: string) => void;
  size?: number;
  gap?: number;
  columns?: number;
  selectedBorderColor?: string;
}

export function AccentColorGrid({
  colors,
  selectedHex,
  onSelect,
  size = DEFAULT_SIZE,
  gap = DEFAULT_GAP,
  columns = DEFAULT_COLS,
  selectedBorderColor,
}: AccentColorGridProps) {
  return (
    <View style={[styles.grid, { gap }]}>
      {colors.map(({ id, hex }) => {
        const isSelected = selectedHex.toLowerCase() === hex.toLowerCase();
        return (
          <Pressable
            key={id}
            onPress={() => onSelect(hex)}
            style={[
              styles.circle,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: hex,
                borderWidth: 3,
                borderColor: isSelected ? (selectedBorderColor ?? 'transparent') : 'transparent',
              },
              isSelected && styles.circleSelected,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  circle: {},
  circleSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
});
