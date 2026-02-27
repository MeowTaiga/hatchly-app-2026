/**
 * Compact chip for list items with edit/delete actions.
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/ThemeProvider';
import { createThemedStyles } from './styles';

interface ListItemChipProps {
  title: string;
  subtitle?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ListItemChip({ title, subtitle, onEdit, onDelete }: ListItemChipProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const ts = createThemedStyles(theme);

  return (
    <View style={ts.listItem}>
      <View style={{ flex: 1 }}>
        <Text style={ts.listItemText} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={ts.listItemSub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {onEdit && (
          <Pressable onPress={onEdit} style={ts.iconBtn} hitSlop={8}>
            <Ionicons name="pencil" size={18} color={colors.primary} />
          </Pressable>
        )}
        {onDelete && (
          <Pressable onPress={onDelete} style={ts.iconBtn} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
