import React from 'react';
import { View, Pressable, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/ThemeProvider';
import { TILE_SIZE } from './constants';

interface ItemActionBarProps {
  col: number;
  row: number;
  tileCols: number;
  itemType: string;
  /** When true, hide Move button (e.g. fossil holes are immovable). */
  immovable?: boolean;
  onMove: () => void;
  onStore: () => void;
  onDestroy: () => void;
}

export const ItemActionBar = React.memo(function ItemActionBar({
  col,
  row,
  tileCols,
  immovable,
  onMove,
  onStore,
}: ItemActionBarProps) {
  const { theme } = useTheme();
  const centerX = (col + tileCols / 2) * TILE_SIZE;
  const topY = row * TILE_SIZE;

  return (
    <View
      style={[
        styles.container,
        {
          left: centerX,
          top: topY - 48,
          transform: [{ translateX: immovable ? -30 : -60 }],
        },
      ]}
      pointerEvents="box-none"
    >
      {!immovable && (
        <Pressable style={[styles.btn, { backgroundColor: theme.colors.primary }]} onPress={onMove}>
          <Ionicons name="move" size={18} color="#fff" />
          <Text style={styles.btnText}>Move</Text>
        </Pressable>
      )}

      <Pressable style={[styles.btn, styles.storeBtn]} onPress={onStore}>
        <Ionicons name="bag-handle" size={18} color="#fff" />
        <Text style={styles.btnText}>Store</Text>
      </Pressable>
    </View>
  );
});

const shadow = Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  android: { elevation: 4 },
}) as object;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    flexDirection: 'row',
    gap: 8,
    zIndex: 100,
    width: 130,
    justifyContent: 'center',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    ...shadow,
  },
  storeBtn: {
    backgroundColor: '#7C8CF5',
  },
  btnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
});
