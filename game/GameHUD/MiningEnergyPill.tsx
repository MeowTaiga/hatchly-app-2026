/**
 * Mining energy as icon + number, for embedding in HUD pills (same pattern as heart + happy).
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/ThemeProvider';
import { useGame } from '../GameProvider';
import { liveMiningEnergy } from '@/constants/miningEnergy';

interface MiningEnergyStatProps {
  iconSize?: number;
  fontSize?: number;
  /** `stat` matches heart/hunger/mood; `accent` matches gems in the MP pill. */
  tone?: 'accent' | 'stat';
}

export function MiningEnergyStat({ iconSize = 14, fontSize = 13, tone = 'accent' }: MiningEnergyStatProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const { miningEnergy, miningEnergyCap, miningEnergyAt } = useGame();
  const [now, setNow] = useState(() => Date.now());

  const live = liveMiningEnergy(miningEnergy, miningEnergyCap, miningEnergyAt, now);

  useEffect(() => {
    if (live >= miningEnergyCap) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [live, miningEnergyCap]);

  const empty = live < 1;
  const numColor = empty
    ? (colors.error ?? '#EF4444')
    : tone === 'stat'
      ? colors.textSecondary
      : (colors.gemColor ?? colors.accent);

  return (
    <View style={styles.row}>
      <Ionicons name="flash" size={iconSize} color={empty ? numColor : colors.textMuted} />
      <Text style={[styles.num, { fontSize, color: numColor, fontWeight: tone === 'stat' ? '700' : '800' }]}>{live}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  num: {
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
