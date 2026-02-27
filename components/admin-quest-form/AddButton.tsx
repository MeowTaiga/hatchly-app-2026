/**
 * Dashed "Add" button for opening drawers.
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/ThemeProvider';
import { createThemedStyles } from './styles';

interface AddButtonProps {
  label: string;
  onPress: () => void;
}

export function AddButton({ label, onPress }: AddButtonProps) {
  const { theme } = useTheme();
  const ts = createThemedStyles(theme);
  return (
    <Pressable onPress={onPress} style={ts.addBtn}>
      <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
      <Text style={ts.addBtnText}>{label}</Text>
    </Pressable>
  );
}
