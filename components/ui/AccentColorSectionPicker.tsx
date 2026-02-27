import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import type { AccentColorSection } from '@/constants/accentColors';
import { spacing } from '@/constants/theme';

const SWATCH_SIZE = 44;
const SWATCH_GAP = 10;
const SECTION_GAP = 24;

interface AccentColorSectionPickerProps {
  sections: readonly AccentColorSection[];
  selectedHex: string;
  onSelect: (hex: string) => void;
  selectedBorderColor?: string;
  textColor?: string;
  sectionLabelColor?: string;
}

export function AccentColorSectionPicker({
  sections,
  selectedHex,
  onSelect,
  selectedBorderColor = '#FFFFFF',
  textColor = '#1a1a1a',
  sectionLabelColor,
}: AccentColorSectionPickerProps) {
  const mutedColor = sectionLabelColor ?? textColor + '99';

  return (
    <View style={styles.container}>
      {sections.map((section) => (
        <View key={section.id} style={styles.section}>
          <Text style={[styles.sectionLabel, { color: mutedColor }]}>{section.title}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
          >
            {section.colors.map(({ id, hex }) => {
              const isSelected = selectedHex.toLowerCase() === hex.toLowerCase();
              return (
                <Pressable
                  key={id}
                  onPress={() => onSelect(hex)}
                  style={({ pressed }) => [
                    styles.swatch,
                    {
                      backgroundColor: hex,
                      borderColor: isSelected ? selectedBorderColor : 'transparent',
                      opacity: pressed ? 0.85 : 1,
                    },
                    isSelected && styles.swatchSelected,
                  ]}
                />
              );
            })}
          </ScrollView>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SECTION_GAP,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingLeft: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    gap: SWATCH_GAP,
    paddingLeft: spacing.xl,
    paddingRight: spacing.xl,
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE / 2,
    borderWidth: 3,
  },
  swatchSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
