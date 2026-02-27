/**
 * Game HUD - heads-up display overlaid on the game world.
 *
 * Composes TopRow (scene badge, farm info, gems), Toolbar (backpack, shop, tools),
 * and BuildPalette (category chips + item strip). Manages highlight animations,
 * build palette measurement, and expand/collapse state.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/store/ThemeProvider';
import { TAB_BAR_TOTAL_HEIGHT } from '@/components/ui/FloatingTabBar';

import { PetStatusBar } from './PetStatusBar';
import { TopRow } from './TopRow';
import { HarvestBubblesView } from './HarvestBubblesView';
import { Toolbar } from './Toolbar';
import { BuildPalette } from './BuildPalette';
import { AdminSettingsButton } from './AdminSettingsButton';
import { AdminPanelModal } from './AdminPanelModal';
import { createHudStyles } from './styles';
import {
  BELOW_TOP_ROW_OFFSET,
  BUILD_PALETTE_SLIDE_OFFSET,
  TOOLBAR_LIFT_1_ROW,
  TOOLBAR_LIFT_2_ROW,
  TOOLBAR_LIFT_TRASH,
  SLOT_ROW_HEIGHT,
  TRASH_MESSAGE_HEIGHT,
  SPRING_CONFIG,
  CLOSE_DURATION,
} from './constants';
import { createIsHighlighted } from '../shared/questHighlightUtils';
import type { GameHUDProps } from './types';

export function GameHUD(props: GameHUDProps & { onRefreshGame?: () => void }) {
  const {
    activeScene,
    farmName,
    editMode,
    toolMode,
    onOpenBestiary,
    onOpenEquip,
    onGoFishing,
    displaySlots,
    selectedItemType,
    activeCategory,
    farmLevel,
    gems,
    canUpgrade,
    itemDefs,
    movingItemId,
    activeHighlight,
    harvestEffects,
    onDismissHarvestEffect,
    onBackToFarm,
    onSelectItem,
    onOpenShop,
    onOpenFarmInfo,
    onSetCategory,
    onCancelMove,
    onSetToolMode,
    onBuildPaletteLayout,
  onPaletteDragStart,
  onPaletteDragUpdate,
  onPaletteDragEnd,
  onRefreshGame,
} = props;

  const [adminPanelVisible, setAdminPanelVisible] = useState(false);

  const { theme } = useTheme();
  const colors = theme.colors;
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const buildPaletteRef = useRef<View>(null);
  const [expanded, setExpanded] = useState(false);

  const styles = React.useMemo(
    () => createHudStyles(colors, screenWidth),
    [colors, screenWidth],
  );

  const highlightPulse = useSharedValue(0);
  useEffect(() => {
    if (activeHighlight) {
      highlightPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0.3, { duration: 600 }),
        ),
        -1,
        true,
      );
    } else {
      highlightPulse.value = 0;
    }
  }, [activeHighlight?.type, activeHighlight?.target]);

  const highlightGlowStyle = useAnimatedStyle(() => ({
    shadowColor: '#FFD700',
    shadowOpacity: highlightPulse.value * 0.8,
    shadowRadius: 8 + highlightPulse.value * 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: highlightPulse.value > 0 ? 8 : 0,
  }));

  const isHighlighted = createIsHighlighted(activeHighlight);

  useEffect(() => {
    if (!onBuildPaletteLayout) return;
    if (!editMode || (toolMode !== 'build' && toolMode !== 'trash')) {
      onBuildPaletteLayout(null);
      return;
    }
    const timer = setTimeout(() => {
      buildPaletteRef.current?.measureInWindow((x, y, width, height) => {
        onBuildPaletteLayout({ x, y, width, height });
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [editMode, toolMode, onBuildPaletteLayout]);

  const paletteTranslateY = useSharedValue(BUILD_PALETTE_SLIDE_OFFSET);
  const paletteOpacity = useSharedValue(0);
  const toolbarTranslateY = useSharedValue(0);
  const slotHeight = useSharedValue(SLOT_ROW_HEIGHT);
  /** Width of trash slot: 0 when closed, 46 (btn+gap) when editMode. Animates bar expansion. */
  const trashWidth = useSharedValue(0);
  const trashOpacity = useSharedValue(0);

  useEffect(() => {
    if (!editMode || toolMode !== 'build') {
      setExpanded(false);
    }
  }, [editMode, toolMode]);

  useEffect(() => {
    if (editMode && (toolMode === 'build' || toolMode === 'trash')) {
      paletteTranslateY.value = withSpring(0, SPRING_CONFIG);
      paletteOpacity.value = withSpring(1, SPRING_CONFIG);
      const lift =
        toolMode === 'trash'
          ? TOOLBAR_LIFT_TRASH
          : expanded
            ? TOOLBAR_LIFT_2_ROW
            : TOOLBAR_LIFT_1_ROW;
      toolbarTranslateY.value = withSpring(-lift, SPRING_CONFIG);
      const h =
        toolMode === 'trash'
          ? TRASH_MESSAGE_HEIGHT
          : expanded
            ? SLOT_ROW_HEIGHT * 2
            : SLOT_ROW_HEIGHT;
      slotHeight.value = withSpring(h, SPRING_CONFIG);
    } else {
      paletteTranslateY.value = withTiming(BUILD_PALETTE_SLIDE_OFFSET, { duration: CLOSE_DURATION });
      paletteOpacity.value = withTiming(0, { duration: CLOSE_DURATION });
      toolbarTranslateY.value = withTiming(0, { duration: CLOSE_DURATION });
      slotHeight.value = withTiming(SLOT_ROW_HEIGHT, { duration: CLOSE_DURATION });
    }
  }, [editMode, toolMode, expanded]);

  /** Use withTiming to avoid spring overshoot on width (was causing flicker). */
  useEffect(() => {
    if (editMode) {
      trashWidth.value = withTiming(46, { duration: 200 });
      trashOpacity.value = withTiming(1, { duration: 180 });
    } else {
      trashWidth.value = withTiming(0, { duration: 180 });
      trashOpacity.value = withTiming(0, { duration: 160 });
    }
  }, [editMode]);

  const buildPaletteAnimatedStyle = useAnimatedStyle(() => ({
    opacity: paletteOpacity.value,
    transform: [{ translateY: paletteTranslateY.value }],
  }));
  const toolbarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toolbarTranslateY.value }],
  }));
  const trashAnimatedStyle = useAnimatedStyle(() => ({
    width: Math.max(0, trashWidth.value),
    opacity: trashOpacity.value,
    overflow: 'hidden' as const,
  }));
  const slotWrapperAnimatedStyle = useAnimatedStyle(() => ({
    height: slotHeight.value,
  }));

  return (
    <View style={styles.container} pointerEvents="box-none">
      <AdminPanelModal
        visible={adminPanelVisible}
        onClose={() => setAdminPanelVisible(false)}
        onRefresh={() => {
          onRefreshGame?.();
          setAdminPanelVisible(false);
        }}
      />
      <TopRow
        activeScene={activeScene}
        farmName={farmName}
        farmLevel={farmLevel}
        gems={gems}
        canUpgrade={canUpgrade}
        topOffset={insets.top + 8}
        styles={styles}
        highlightGlowStyle={highlightGlowStyle}
        isHighlighted={isHighlighted}
        onBackToFarm={onBackToFarm}
        onOpenFarmInfo={onOpenFarmInfo}
        colors={colors}
        rightSlot={<PetStatusBar inline colors={colors} />}
        bottomLeftSlot={<AdminSettingsButton inline onPress={() => setAdminPanelVisible(true)} />}
      />

      <HarvestBubblesView
        harvestEffects={harvestEffects}
        itemDefs={itemDefs}
        topOffset={insets.top + BELOW_TOP_ROW_OFFSET}
        onDismissHarvestEffect={onDismissHarvestEffect}
      />

      {movingItemId && (
        <View style={[styles.moveBanner, { top: insets.top + BELOW_TOP_ROW_OFFSET }]}>
          <View style={styles.moveBannerInner}>
            <Ionicons name="move" size={16} color="#fff" />
            <Text style={styles.moveBannerText}>Tap a spot to place</Text>
            <Pressable style={styles.moveCancelBtn} onPress={onCancelMove}>
              <Text style={styles.moveCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      <Toolbar
        toolMode={toolMode}
        editMode={editMode}
        bottomOffset={TAB_BAR_TOTAL_HEIGHT + 12}
        styles={styles}
        highlightGlowStyle={highlightGlowStyle}
        toolbarAnimatedStyle={toolbarAnimatedStyle}
        trashAnimatedStyle={trashAnimatedStyle}
        isHighlighted={isHighlighted}
        onSetToolMode={onSetToolMode}
        onOpenShop={onOpenShop}
        onOpenBestiary={onOpenBestiary}
        onOpenEquip={onOpenEquip}
        onGoFishing={onGoFishing}
        isFarm={activeScene === 'farm'}
        colors={colors}
      />

      <BuildPalette
        editMode={editMode}
        toolMode={toolMode}
        expanded={expanded}
        displaySlots={displaySlots}
        selectedItemType={selectedItemType}
        activeCategory={activeCategory}
        bottomOffset={TAB_BAR_TOTAL_HEIGHT + 10}
        buildPaletteRef={buildPaletteRef}
        styles={styles}
        highlightGlowStyle={highlightGlowStyle}
        buildPaletteAnimatedStyle={buildPaletteAnimatedStyle}
        slotWrapperAnimatedStyle={slotWrapperAnimatedStyle}
        isHighlighted={isHighlighted}
        onSetCategory={onSetCategory}
        onSetExpanded={setExpanded}
        onSelectItem={onSelectItem}
        onPaletteDragStart={onPaletteDragStart}
        onPaletteDragUpdate={onPaletteDragUpdate}
        onPaletteDragEnd={onPaletteDragEnd}
        itemDefs={itemDefs}
        colors={colors}
      />
    </View>
  );
}
