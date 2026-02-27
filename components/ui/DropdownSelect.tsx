import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/ThemeProvider';
import { radius, spacing } from '@/constants/theme';

export interface DropdownOption {
  key: string;
  label: string;
}

interface DropdownSelectProps {
  options: DropdownOption[];
  value: string;
  onSelect: (key: string) => void;
  placeholder?: string;
}

export function DropdownSelect({ options, value, onSelect, placeholder = 'Select…' }: DropdownSelectProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => options.find((o) => o.key === value), [options, value]);

  const handleSelect = useCallback((key: string) => {
    onSelect(key);
    setOpen(false);
  }, [onSelect]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        trigger: {
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: colors.surface, borderRadius: radius.md,
          paddingHorizontal: 12, paddingVertical: 9,
          borderWidth: 1, borderColor: colors.border,
        },
        triggerOpen: { borderColor: colors.borderFocused },
        triggerText: { fontSize: 13, fontWeight: '600', color: colors.text },
        triggerPlaceholder: { fontSize: 13, color: colors.textMuted },
        dropdown: {
          backgroundColor: colors.surface, borderRadius: radius.md,
          borderWidth: 1, borderColor: colors.border,
          maxHeight: 220, marginTop: 4,
        },
        row: {
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 12, paddingVertical: 10,
          borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
        },
        rowLabel: { fontSize: 13, color: colors.text },
        rowLabelActive: { fontWeight: '700', color: colors.primary },
      }),
    [colors],
  );

  if (!open) {
    return (
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={selected ? styles.triggerText : styles.triggerPlaceholder}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>
    );
  }

  return (
    <View style={{ position: 'relative', zIndex: 10 }}>
      <Pressable style={[styles.trigger, styles.triggerOpen]} onPress={() => setOpen(false)}>
        <Text style={selected ? styles.triggerText : styles.triggerPlaceholder}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-up" size={16} color={colors.primary} />
      </Pressable>
      <ScrollView
        style={styles.dropdown}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={Platform.OS === 'android'}
      >
        {options.map((item) => (
          <Pressable key={item.key} style={styles.row} onPress={() => handleSelect(item.key)}>
            <Text style={[styles.rowLabel, item.key === value && styles.rowLabelActive]}>
              {item.label}
            </Text>
            {item.key === value && <Ionicons name="checkmark" size={16} color={colors.primary} />}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
