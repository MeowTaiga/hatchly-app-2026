/**
 * Bottom-center toolbar: backpack, trash (when editMode), shop, bestiary.
 */

import React from 'react';
import { View, Pressable, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { GameIcon } from '@/assets/icons/GameIcons';
import { Ionicons } from '@expo/vector-icons';
import type { ToolMode, QuestHighlight } from '../types';
import { QuestHighlightGlow } from '../shared/QuestHighlightGlow';
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
  onBackpackPress?: () => void;
  paletteDismissed?: boolean;
  onTogglePalette?: () => void;
  onOpenShop: () => void;
  onOpenBestiary?: () => void;
  onOpenEquip?: () => void;
  colors: { primary: string; onPrimary?: string; textMuted: string; error?: string; surface?: string };
  /** Used / max backpack stacks for the capacity badge. */
  backpackUsed?: number;
  backpackSlots?: number;
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
  onBackpackPress,
  paletteDismissed,
  onTogglePalette,
  onOpenShop,
  onOpenBestiary,
  onOpenEquip,
  colors,
  backpackUsed = 0,
  backpackSlots = 20,
}: ToolbarProps) {
  const backpackFull = backpackUsed >= backpackSlots;
  return (
    <View style={[styles.toolbarWrap, { bottom: bottomOffset }]} pointerEvents="box-none">
      <Animated.View style={[styles.toolbar, toolbarAnimatedStyle]} pointerEvents="box-none">
        <QuestHighlightGlow
          active={isHighlighted('hud_button', 'backpack')}
          glowStyle={highlightGlowStyle}
          style={styles.highlightWrap}
        >
          <Pressable
            style={[
              styles.toolBtn,
              toolMode === 'build' && { backgroundColor: colors.primary },
              isHighlighted('hud_button', 'backpack') ? styles.highlightBorder : styles.highlightClear,
            ]}
            onPress={onBackpackPress ?? (() => (toolMode === 'build' ? onSetToolMode('none' as ToolMode) : onSetToolMode('build')))}
          >
            <GameIcon
              name="backpack"
              size={20}
              color={toolMode === 'build' ? colors.onPrimary ?? '#fff' : colors.textMuted}
            />
            <View
              style={[
                styles.backpackBadge,
                {
                  backgroundColor: backpackFull
                    ? colors.error ?? '#F43F5E'
                    : colors.surface ?? '#fff',
                  borderColor: backpackFull ? colors.error ?? '#F43F5E' : colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.backpackBadgeText,
                  {
                    color: backpackFull
                      ? '#fff'
                      : toolMode === 'build'
                        ? colors.primary
                        : colors.textMuted,
                  },
                ]}
              >
                {backpackUsed}/{backpackSlots}
              </Text>
            </View>
          </Pressable>
        </QuestHighlightGlow>

        {trashTool && (
          <Animated.View style={trashAnimatedStyle} pointerEvents={editMode ? 'auto' : 'none'}>
            <View style={styles.trashRow}>
              <QuestHighlightGlow
                active={isHighlighted('hud_button', 'trash')}
                glowStyle={highlightGlowStyle}
                style={styles.highlightWrap}
              >
                <Pressable
                  style={[
                    styles.toolBtn,
                    toolMode === 'trash' && { backgroundColor: colors.primary },
                    isHighlighted('hud_button', 'trash') ? styles.highlightBorder : styles.highlightClear,
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
              </QuestHighlightGlow>
              {onTogglePalette && (
                <Pressable
                  style={styles.toolBtn}
                  onPress={onTogglePalette}
                  hitSlop={8}
                >
                  <Ionicons
                    name={paletteDismissed ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textMuted}
                  />
                </Pressable>
              )}
            </View>
          </Animated.View>
        )}

        <View style={styles.toolSep} />

        <QuestHighlightGlow
          active={isHighlighted('hud_button', 'shop')}
          glowStyle={highlightGlowStyle}
          style={styles.highlightWrap}
        >
          <Pressable
            style={[
              styles.toolBtn,
              isHighlighted('hud_button', 'shop') ? styles.highlightBorder : styles.highlightClear,
            ]}
            onPress={onOpenShop}
          >
            <GameIcon name="shop" size={20} color={colors.textMuted} />
          </Pressable>
        </QuestHighlightGlow>

        <QuestHighlightGlow
          active={isHighlighted('hud_button', 'bestiary')}
          glowStyle={highlightGlowStyle}
          style={styles.highlightWrap}
        >
          <Pressable
            style={[
              styles.toolBtn,
              isHighlighted('hud_button', 'bestiary') ? styles.highlightBorder : styles.highlightClear,
            ]}
            onPress={onOpenBestiary ?? (() => {})}
          >
            <Ionicons name="book-outline" size={20} color={colors.textMuted} />
          </Pressable>
        </QuestHighlightGlow>

        {onOpenEquip && (
          <QuestHighlightGlow
            active={isHighlighted('hud_button', 'equip')}
            glowStyle={highlightGlowStyle}
            style={styles.highlightWrap}
          >
            <Pressable
              style={[
                styles.toolBtn,
                isHighlighted('hud_button', 'equip') ? styles.highlightBorder : styles.highlightClear,
              ]}
              onPress={onOpenEquip}
            >
              <GameIcon name="pickaxe" size={20} color={colors.textMuted} />
            </Pressable>
          </QuestHighlightGlow>
        )}
      </Animated.View>
    </View>
  );
}
