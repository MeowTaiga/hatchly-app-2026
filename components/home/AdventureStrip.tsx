/**
 * Adventure strip — live fishing / bugs / cooking / crafting progress tiles.
 */

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGameSummary } from '@/hooks/useGameSummary';
import { useTheme } from '@/store/ThemeProvider';
import { spacing } from '@/constants/theme';

function Tile({
  icon,
  label,
  value,
  sub,
  color,
  onPress,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  sub: string;
  color: string;
  onPress: () => void;
  colors: { text: string; textSecondary: string; textMuted: string; border: string; surface: string };
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.88 },
      ]}
    >
      <View style={[styles.tileIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.tileLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.tileValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.tileSub, { color: colors.text }]}>{sub}</Text>
      </View>
    </Pressable>
  );
}

export function AdventureStrip() {
  const { summary } = useGameSummary();
  const { theme } = useTheme();
  const { colors } = theme;
  const router = useRouter();

  const cardShadow = useMemo(
    () =>
      Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
        android: { elevation: 1 },
      }),
    [],
  );

  const goGame = () => router.push('/(tabs)/game');

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Adventure</Text>
      <View style={[styles.grid, cardShadow]}>
        <Tile
          icon="fish"
          label="Fish"
          value={`${summary.fishCaught}`}
          sub="caught"
          color={colors.accent}
          onPress={goGame}
          colors={colors}
        />
        <Tile
          icon="bug"
          label="Bugs"
          value={`${summary.bugsCaught}`}
          sub="caught"
          color={colors.primary}
          onPress={goGame}
          colors={colors}
        />
        <Tile
          icon="restaurant"
          label="Recipes"
          value={`${summary.recipesDiscovered}`}
          sub="discovered"
          color={colors.secondary}
          onPress={goGame}
          colors={colors}
        />
        <Tile
          icon="hammer"
          label="Crafts"
          value={`${summary.craftsDiscovered}`}
          sub="discovered"
          color={colors.accent}
          onPress={goGame}
          colors={colors}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    marginBottom: spacing.base,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    width: '48%',
    flexGrow: 1,
    minWidth: '46%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  tileIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tileLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  tileValue: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flexWrap: 'wrap',
  },
  tileSub: {
    fontSize: 13,
    fontWeight: '800',
  },
});
