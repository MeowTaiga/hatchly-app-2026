/**
 * Game HUD - heads-up display overlaid on the game world.
 *
 * Composes TopRow (scene badge, farm info, gems), Toolbar (backpack, shop, tools),
 * and BuildPalette (category chips + item strip). Manages highlight animations,
 * build palette measurement, and expand/collapse state.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  cancelAnimation,
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

import { ItemGainToastHost } from '../ItemGainToastHost';
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
import type { GameHUDProps, ToolMode } from './types';

/**
 * Memoized because WorldRenderer re-renders on every drag preview and camera
 * snapshot, none of which the HUD cares about.
 */
export const GameHUD = React.memo(function GameHUD(
  props: GameHUDProps & { onRefreshGame?: () => void },
) {
  const {
    activeScene,
    farmName,
    editMode,
    toolMode,
    onOpenBestiary,
    onOpenEquip,
    displaySlots,
    inventorySlots,
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
    onHudAction,
    onBuildPaletteLayout,
    paletteDrag,
    onRefreshGame,
    backpackSlots = 20,
  } = props;

  const [adminPanelVisible, setAdminPanelVisible] = useState(false);

  const { theme } = useTheme();
  const colors = theme.colors;
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const buildPaletteRef = useRef<View>(null);
  const [expanded, setExpanded] = useState(false);
  const [paletteDismissed, setPaletteDismissed] = useState(false);

  const styles = React.useMemo(
    () => createHudStyles(colors, screenWidth),
    [colors, screenWidth],
  );

  const extraCurrencies = useMemo(() => {
    const qtyByType = new Map<string, number>();
    for (const slot of inventorySlots) {
      if (slot.qty > 0) qtyByType.set(slot.itemType, (qtyByType.get(slot.itemType) ?? 0) + slot.qty);
    }
    const out: Array<{ def: (typeof itemDefs)[string]; qty: number }> = [];
    for (const def of Object.values(itemDefs)) {
      if (!def.isCurrency) continue;
      const qty = qtyByType.get(def.itemType) ?? 0;
      if (qty > 0) out.push({ def, qty });
    }
    out.sort((a, b) => a.def.itemType.localeCompare(b.def.itemType));
    return out;
  }, [itemDefs, inventorySlots]);

  const highlightPulse = useSharedValue(0);
  useEffect(() => {
    // Cancel any in-flight pulse first. The glow wrapper unmounts when inactive
    // (see QuestHighlightGlow) so leftover native shadow props cannot stick.
    cancelAnimation(highlightPulse);
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
  }, [activeHighlight?.type, activeHighlight?.target, highlightPulse]);

  const highlightGlowStyle = useAnimatedStyle(() => ({
    shadowColor: '#FFD700',
    shadowOpacity: highlightPulse.value * 0.8,
    shadowRadius: 8 + highlightPulse.value * 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  }));

  const isHighlighted = createIsHighlighted(activeHighlight);

  const handleBackpackPress = useCallback(() => {
    onHudAction?.('backpack');
    if (editMode && paletteDismissed) {
      setPaletteDismissed(false);
    } else {
      onSetToolMode(toolMode === 'build' ? 'none' : 'build');
    }
  }, [editMode, paletteDismissed, toolMode, onSetToolMode, onHudAction]);

  // Every HUD button reports itself so a dialog highlighting one can advance.
  const handleOpenShop = useCallback(() => {
    onHudAction?.('shop');
    onOpenShop();
  }, [onHudAction, onOpenShop]);

  const handleOpenFarmInfo = useCallback(() => {
    onHudAction?.('farm_info');
    onOpenFarmInfo();
  }, [onHudAction, onOpenFarmInfo]);

  const handleOpenBestiary = useCallback(() => {
    onHudAction?.('bestiary');
    onOpenBestiary?.();
  }, [onHudAction, onOpenBestiary]);

  const handleOpenEquip = useCallback(() => {
    onHudAction?.('equip');
    onOpenEquip?.();
  }, [onHudAction, onOpenEquip]);

  const handleSetToolMode = useCallback((mode: ToolMode) => {
    if (mode === 'trash') onHudAction?.('trash');
    onSetToolMode(mode);
  }, [onHudAction, onSetToolMode]);

  useEffect(() => {
    if (!onBuildPaletteLayout) return;
    const paletteVisible = editMode && (toolMode === 'build' || toolMode === 'trash') && !paletteDismissed;
    if (!paletteVisible) {
      onBuildPaletteLayout(null);
      return;
    }
    const timer = setTimeout(() => {
      buildPaletteRef.current?.measureInWindow((x, y, width, height) => {
        onBuildPaletteLayout({ x, y, width, height });
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [editMode, toolMode, paletteDismissed, onBuildPaletteLayout]);

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
    if (!editMode) setPaletteDismissed(false);
  }, [editMode]);

  useEffect(() => {
    const paletteVisible = editMode && (toolMode === 'build' || toolMode === 'trash') && !paletteDismissed;
    if (paletteVisible) {
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
  }, [editMode, toolMode, expanded, paletteDismissed]);

  /** Use withTiming to avoid spring overshoot on width (was causing flicker). Width: trash btn (40) + gap (6) + arrow btn (40) = 86. */
  useEffect(() => {
    if (editMode) {
      trashWidth.value = withTiming(86, { duration: 200 });
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
        extraCurrencies={extraCurrencies}
        canUpgrade={canUpgrade}
        topOffset={insets.top + 8}
        styles={styles}
        highlightGlowStyle={highlightGlowStyle}
        isHighlighted={isHighlighted}
        onBackToFarm={onBackToFarm}
        onOpenFarmInfo={handleOpenFarmInfo}
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
      <ItemGainToastHost
        toneFilter="got"
        style={{
          position: 'absolute',
          top: insets.top + BELOW_TOP_ROW_OFFSET,
          left: 0,
          right: 0,
        }}
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
        onSetToolMode={handleSetToolMode}
        onBackpackPress={handleBackpackPress}
        paletteDismissed={paletteDismissed}
        onTogglePalette={() => setPaletteDismissed((p) => !p)}
        onOpenShop={handleOpenShop}
        onOpenBestiary={handleOpenBestiary}
        onOpenEquip={onOpenEquip ? handleOpenEquip : undefined}
        colors={colors}
        backpackUsed={inventorySlots.filter((s) => s.qty > 0).length}
        backpackSlots={backpackSlots}
      />

      <BuildPalette
        editMode={editMode}
        toolMode={toolMode}
        expanded={expanded}
        displaySlots={displaySlots}
        inventorySlots={inventorySlots}
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
        drag={paletteDrag}
        paletteDismissed={paletteDismissed}
        itemDefs={itemDefs}
        colors={colors}
      />
    </View>
  );
});
