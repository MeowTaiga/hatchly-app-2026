/**
 * Bottom-center toolbar: backpack, trash (when editMode), shop, bestiary.
 */

import React from 'react';
import { View, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { GameIcon } from '@/assets/icons/GameIcons';
import { Ionicons } from '@expo/vector-icons';
import type { ToolMode, QuestHighlight } from '../types';
import { TOOLS } from './constants';

interface ToolbarProps {
  toolMode: ToolMode;
  editMode: boolean;
  bottomOffset: number;
  styles: ReturnType<typeof import('./styles').createHudStyles>;
  highlightGlowStyle: object;
  toolbarAnimatedStyle: object;
  trashAnimatedStyle: object;
  isHighlighted: (type: QuestHighlight['type'], target: string) => boolean;
  onSetToolMode: (mode: ToolMode) => void;
  onOpenShop: () => void;
  onOpenBestiary?: () => void;
  onOpenEquip?: () => void;
  onGoFishing?: () => void;
  isFarm?: boolean;
  colors: { primary: string; onPrimary?: string; textMuted: string };
}

const trashTool = TOOLS.find((t) => t.mode === 'trash');

export function Toolbar({
  toolMode,
  editMode,
  bottomOffset,
  styles,
  highlightGlowStyle,
  toolbarAnimatedStyle,
  trashAnimatedStyle,
  isHighlighted,
  onSetToolMode,
  onOpenShop,
  onOpenBestiary,
  onOpenEquip,
  onGoFishing,
  isFarm = true,
  colors,
}: ToolbarProps) {
  return (
    <View style={[styles.toolbarWrap, { bottom: bottomOffset }]} pointerEvents="box-none">
      <Animated.View style={[styles.toolbar, toolbarAnimatedStyle]} pointerEvents="box-none">
        <Animated.View style={[styles.highlightWrap, isHighlighted('hud_button', 'backpack') && highlightGlowStyle]}>
          <Pressable
            style={[
              styles.toolBtn,
              toolMode === 'build' && { backgroundColor: colors.primary },
              isHighlighted('hud_button', 'backpack') && styles.highlightBorder,
            ]}
            onPress={() => (toolMode === 'build' ? onSetToolMode('none' as ToolMode) : onSetToolMode('build'))}
          >
            <GameIcon
              name="backpack"
              size={20}
              color={toolMode === 'build' ? colors.onPrimary ?? '#fff' : colors.textMuted}
            />
          </Pressable>
        </Animated.View>

        {trashTool && (
          <Animated.View style={trashAnimatedStyle} pointerEvents={editMode ? 'auto' : 'none'}>
            <Animated.View style={[styles.highlightWrap, isHighlighted('hud_button', 'trash') && highlightGlowStyle]}>
              <Pressable
                style={[
                  styles.toolBtn,
                  toolMode === 'trash' && { backgroundColor: colors.primary },
                  isHighlighted('hud_button', 'trash') && styles.highlightBorder,
                ]}
                onPress={() => onSetToolMode(toolMode === 'trash' ? ('none' as ToolMode) : 'trash')}
              >
                <GameIcon
                  name="trash"
                  variant={toolMode === 'trash' ? 'solid' : 'outline'}
                  size={20}
                  color={toolMode === 'trash' ? colors.onPrimary ?? '#fff' : colors.textMuted}
                />
              </Pressable>
            </Animated.View>
          </Animated.View>
        )}

        <View style={styles.toolSep} />

        <Animated.View style={[styles.highlightWrap, isHighlighted('hud_button', 'shop') && highlightGlowStyle]}>
          <Pressable
            style={[styles.toolBtn, isHighlighted('hud_button', 'shop') && styles.highlightBorder]}
            onPress={onOpenShop}
          >
            <GameIcon name="shop" size={20} color={colors.textMuted} />
          </Pressable>
        </Animated.View>

        <Animated.View style={[styles.highlightWrap, isHighlighted('hud_button', 'bestiary') && highlightGlowStyle]}>
          <Pressable
            style={[styles.toolBtn, isHighlighted('hud_button', 'bestiary') && styles.highlightBorder]}
            onPress={onOpenBestiary ?? (() => {})}
          >
            <Ionicons name="book-outline" size={20} color={colors.textMuted} />
          </Pressable>
        </Animated.View>

        {onOpenEquip && (
          <Animated.View style={[styles.highlightWrap, isHighlighted('hud_button', 'equip') && highlightGlowStyle]}>
            <Pressable
              style={[styles.toolBtn, isHighlighted('hud_button', 'equip') && styles.highlightBorder]}
              onPress={onOpenEquip}
            >
              <Ionicons name="bag-handle-outline" size={20} color={colors.textMuted} />
            </Pressable>
          </Animated.View>
        )}

        {isFarm && onGoFishing && (
          <Pressable style={styles.toolBtn} onPress={onGoFishing}>
            <Ionicons name="fish-outline" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}
