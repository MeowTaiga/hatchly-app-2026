/**
 * Top row of the Game HUD: back button, scene badge, farm info, gems.
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { GemIcon } from '@/components/ui/GemIcon';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import type { QuestHighlight, Scene } from '../types';

interface TopRowProps {
  activeScene: Scene;
  farmName: string;
  farmLevel: number;
  gems: number;
  canUpgrade: boolean;
  topOffset: number;
  styles: ReturnType<typeof import('./styles').createHudStyles>;
  highlightGlowStyle: object;
  isHighlighted: (type: QuestHighlight['type'], target: string) => boolean;
  onBackToFarm: () => void;
  onOpenFarmInfo: () => void;
  colors: { text: string };
  /** Rendered on the right side (space-between). */
  rightSlot?: React.ReactNode;
  /** Rendered below the farm pill (left side). */
  bottomLeftSlot?: React.ReactNode;
}

export function TopRow({
  activeScene,
  farmName,
  farmLevel,
  gems,
  canUpgrade,
  topOffset,
  styles,
  highlightGlowStyle,
  isHighlighted,
  onBackToFarm,
  onOpenFarmInfo,
  colors,
  rightSlot,
  bottomLeftSlot,
}: TopRowProps) {
  return (
    <View style={[styles.topRow, { top: topOffset }]} pointerEvents="box-none">
      <View style={styles.leftColumn} pointerEvents="box-none">
        {rightSlot}
        <View style={styles.topLeft} pointerEvents="box-none">
          {activeScene !== 'farm' && (
            <Pressable style={styles.pill} onPress={onBackToFarm}>
              <Ionicons name="arrow-back" size={16} color={colors.text} />
              <Text style={styles.pillText}>Farm</Text>
            </Pressable>
          )}
          <Animated.View style={[isHighlighted('hud_button', 'farm_info') && highlightGlowStyle]}>
            <Pressable
              style={[styles.pill, isHighlighted('hud_button', 'farm_info') && styles.highlightBorder]}
              onPress={onOpenFarmInfo}
            >
              <Text style={styles.pillText}>{activeScene === 'farm' || activeScene === 'house' ? farmName : activeScene.replace(/_/g, ' ')}</Text>
              <View style={styles.lvlBadge}>
                <Text style={styles.lvlText}>Lv.{farmLevel}</Text>
              </View>
              <View style={styles.pillSep} />
              <GemIcon size={14} />
              <Text style={styles.gemCount}>{gems.toLocaleString()}</Text>
              {canUpgrade && <View style={styles.upgradeDot} />}
            </Pressable>
          </Animated.View>
        </View>
        {bottomLeftSlot}
      </View>
    </View>
  );
}
