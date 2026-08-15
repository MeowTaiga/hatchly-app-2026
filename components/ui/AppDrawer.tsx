import React, { forwardRef, useCallback, useMemo, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetView,
  BottomSheetFooter,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';

const ABOVE_SHEET_GAP = 14;

function DrawerAboveOverlay({
  animatedPosition,
  children,
}: {
  animatedPosition: SharedValue<number>;
  children: React.ReactNode;
}) {
  const { height: screenH } = useWindowDimensions();
  const style = useAnimatedStyle(() => ({
    bottom: screenH - animatedPosition.value + ABOVE_SHEET_GAP,
  }));
  return (
    <Animated.View
      pointerEvents="none"
      collapsable={false}
      style={[styles.aboveOverlay, style]}
    >
      {children}
    </Animated.View>
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AppDrawerRef {
  open: () => void;
  close: () => void;
  snapTo: (index: number) => void;
}

export interface AppDrawerProps {
  /** Drawer title shown in the handle bar */
  title?: string;
  /** Snap points — percentage or pixel values (default: ['50%', '90%']) */
  snapPoints?: (string | number)[];
  /** Which snap point to open to (default: 0) */
  initialSnapIndex?: number;
  /** Show a close button in the header (default: true) */
  showCloseButton?: boolean;
  /** Use a scrollable inner container (default: true) */
  scrollable?: boolean;
  /** Sticky footer rendered below the scroll view — keyboard-aware */
  footer?: React.ReactNode;
  /**
   * Remount the sticky footer when this changes (e.g. details → edit).
   * Keep it stable while typing so inputs don’t lose focus.
   */
  footerKey?: string | number;
  /** Optional node to render on the right side of the header (before close) */
  headerRight?: React.ReactNode;
  /**
   * Floats over drawer content (does not scroll). Use for toasts / popups
   * that should sit above the sheet body without blocking touches.
   */
  overlay?: React.ReactNode;
  /**
   * Renders in the sheet portal, pinned just above the handle so rewards
   * stay visible while the drawer is open.
   */
  overlayAbove?: React.ReactNode;
  /** Called when the drawer fully closes */
  onClose?: () => void;
  /** Called when snap index changes */
  onChange?: (index: number) => void;
  /** How the sheet reacts to the keyboard (default: extend). */
  keyboardBehavior?: 'extend' | 'fillParent' | 'interactive';
  children: React.ReactNode;
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Reusable native bottom sheet drawer.
 *
 * Uses `BottomSheetModal` which portals above all other UI (nav bar, hero, etc.)
 * and extends to the full bottom of the screen.
 *
 * - Imperative API: `ref.current.open()` / `.close()` / `.snapTo(index)`
 * - Keyboard-aware: expands upward when keyboard opens
 * - Scrollable content by default
 */
export const AppDrawer = forwardRef<AppDrawerRef, AppDrawerProps>(
  function AppDrawer(
    {
      title,
      snapPoints: snapPointsProp,
      initialSnapIndex = 0,
      showCloseButton = true,
      scrollable = true,
      footer,
      footerKey,
      headerRight,
      overlay,
      overlayAbove,
      onClose,
      onChange,
      keyboardBehavior = 'extend',
      children,
    },
    ref,
  ) {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const snapPointsKey = (snapPointsProp ?? ['50%', '90%']).join('|');
    const snapPoints = useMemo(
      () => snapPointsProp ?? ['50%', '90%'],
      // Identity of the array changes every parent render; key on values only.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [snapPointsKey],
    );

    // ── Sheet ref + imperative handle ─────────────────────────────────────

    const sheetRef = React.useRef<BottomSheetModal>(null);

    React.useImperativeHandle(ref, () => ({
      open: () => sheetRef.current?.present(),
      close: () => sheetRef.current?.dismiss(),
      snapTo: (index: number) => sheetRef.current?.snapToIndex(index),
    }));

    // ── Callbacks ─────────────────────────────────────────────────────────

    const handleDismiss = useCallback(() => {
      onClose?.();
    }, [onClose]);

    const handleChange = useCallback(
      (index: number) => {
        onChange?.(index);
      },
      [onChange],
    );

    // ── Backdrop ──────────────────────────────────────────────────────────

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.35}
          pressBehavior="close"
        />
      ),
      [],
    );

    // ── Content wrapper ───────────────────────────────────────────────────

    const ContentWrapper = scrollable ? BottomSheetScrollView : BottomSheetView;

    // ── Footer (keyboard-aware via BottomSheetFooter) ─────────────────────
    // Keep renderFooter stable so footerComponent reference doesn't change on each keystroke.
    // When footer changes (e.g. query state), we'd otherwise remount the footer and lose input focus.
    const footerRef = useRef(footer);
    footerRef.current = footer;
    const renderFooter = useCallback(
      (props: BottomSheetFooterProps) => (
        <BottomSheetFooter {...props} bottomInset={0}>
          {footerRef.current}
        </BottomSheetFooter>
      ),
      // Identity change remounts the sheet footer. Only do that when the
      // caller says the mode changed — not on every keystroke.
      [footerKey],
    );

    const overlayAboveRef = useRef(overlayAbove);
    overlayAboveRef.current = overlayAbove;
    const animatedPosition = useSharedValue(0);
    const OverlayContainer = useMemo(() => {
      function OverlayContainerInner({ children }: { children?: React.ReactNode }) {
        return (
          <View style={styles.portalWrap} pointerEvents="box-none">
            {children}
            <DrawerAboveOverlay animatedPosition={animatedPosition}>
              {overlayAboveRef.current}
            </DrawerAboveOverlay>
          </View>
        );
      }
      return OverlayContainerInner;
    }, [animatedPosition]);

    return (
      <BottomSheetModal
        ref={sheetRef}
        index={initialSnapIndex}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        footerComponent={footer ? renderFooter : undefined}
        onDismiss={handleDismiss}
        onChange={handleChange}
        handleIndicatorStyle={[styles.handleIndicator, { backgroundColor: theme.colors.border }]}
        backgroundStyle={[styles.sheetBackground, { backgroundColor: theme.colors.surface }]}
        style={styles.sheet}
        keyboardBehavior={keyboardBehavior}
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        enableContentPanningGesture
        enableHandlePanningGesture
        animatedPosition={overlayAbove ? animatedPosition : undefined}
        containerComponent={overlayAbove ? OverlayContainer : undefined}
      >
        <View style={styles.sheetInner}>
          {/* Header */}
          {(title || showCloseButton || headerRight) && (
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
                {title ?? ''}
              </Text>
              <View style={styles.headerRight}>
                {headerRight}
                {showCloseButton && (
                <Pressable
                  onPress={() => sheetRef.current?.dismiss()}
                  hitSlop={12}
                  style={styles.closeButton}
                >
                  <Ionicons name="close-circle" size={28} color={theme.colors.textMuted} />
                </Pressable>
              )}
              </View>
            </View>
          )}

          {/* Body */}
          <View style={styles.bodyWrap}>
            <ContentWrapper
              style={styles.contentContainer}
              contentContainerStyle={[
                styles.contentInner,
                { paddingBottom: footer ? spacing.base : insets.bottom + spacing.xl },
              ]}
              showsVerticalScrollIndicator={false}
              {...(scrollable
                ? {
                    keyboardShouldPersistTaps: 'handled' as const,
                    keyboardDismissMode: 'on-drag' as const,
                    nestedScrollEnabled: true,
                  }
                : {})}
            >
              {scrollable ? (
                children
              ) : (
                <View style={[styles.contentInner, { paddingBottom: footer ? spacing.base : insets.bottom + spacing.xl, flex: 1 }]}>
                  {children}
                </View>
              )}
            </ContentWrapper>
          </View>

          {/* Same window as the sheet — floats like the old Modal, but taps
              on empty space hit shop cards (not the game behind the sheet). */}
          {overlay ? (
            <View style={styles.overlay} pointerEvents="box-none" collapsable={false}>
              {overlay}
            </View>
          ) : null}
        </View>
      </BottomSheetModal>
    );
  },
);

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheet: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: { elevation: 16 },
    }),
  },
  sheetBackground: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 22,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  closeButton: {
    marginLeft: 0,
  },

  sheetInner: {
    flex: 1,
  },
  bodyWrap: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.base,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    paddingTop: spacing.sm,
    zIndex: 1000,
    elevation: 1000,
  },
  portalWrap: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
  },
  aboveOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
});
