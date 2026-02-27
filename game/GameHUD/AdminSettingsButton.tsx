/**
 * Admin settings button - visible only to admin/superadmin users.
 * Renders a compact pill matching the HUD style. Place in top row, right-aligned.
 */

import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthProvider';
import { useTheme } from '@/store/ThemeProvider';

interface AdminSettingsButtonProps {
  onPress: () => void;
  /** When false, uses absolute positioning. When true, renders inline for parent layout. */
  inline?: boolean;
  topOffset?: number;
}

export function AdminSettingsButton({ onPress, inline, topOffset = 0 }: AdminSettingsButtonProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const colors = theme.colors;

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  if (!isAdmin) return null;

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        wrap: inline
          ? {}
          : {
              position: 'absolute' as const,
              top: topOffset,
              right: 12,
              zIndex: 201,
            },
        pill: {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: (colors.adminAccent ?? colors.primary) + 'E6',
          ...(Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
            android: { elevation: 3 },
          }) as object),
        },
      }),
    [colors, topOffset, inline],
  );

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable style={styles.pill} onPress={onPress}>
        <Ionicons name="construct" size={20} color={colors.onPrimary ?? '#fff'} />
      </Pressable>
    </View>
  );
}
