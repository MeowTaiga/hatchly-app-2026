import React from 'react';
import { View, Pressable, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/store/ThemeProvider';

// ─── Layout Constants ────────────────────────────────────────────────────────

/** Total height of the floating pill (excluding center overflow) */
export const TAB_BAR_HEIGHT = 62;

/** How far the center button rises above the pill */
const CENTER_RISE = 14;

/** Center button diameter */
const CENTER_SIZE = 56;

/** Horizontal margin from screen edges */
const SIDE_MARGIN = 16;

/** Distance from the bottom of the safe area */
const BOTTOM_MARGIN = 10;

// ─── Icons by tab position (order: Home, Health, Game, Navigation, Settings) ─
// Index 2 is the center paw button; others use this array.

const TAB_ICONS: { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }[] = [
  { active: 'home', inactive: 'home-outline' },       // 0: Home (house)
  { active: 'heart', inactive: 'heart-outline' },    // 1: Health (heart)
  { active: 'paw', inactive: 'paw-outline' },        // 2: Game (center)
  { active: 'chatbubble', inactive: 'chatbubble-outline' },// 3: Chat (diary)
  { active: 'settings', inactive: 'settings-outline' },// 4: Settings (gear)
];

/** Tab order: Home, Health, Game, Navigation, Settings. Expo Router may return routes in a different order. */
const TAB_ORDER = ['index', 'health', 'game', 'explore', 'settings'] as const;

/** Expo Router uses "health/index" for health/index.tsx; we look up by "health". */
const ROUTE_NAME_ALIASES: Record<string, string> = { 'health': 'health/index' };

// ─── Animated Tab Button ─────────────────────────────────────────────────────

function TabItemInner({
  tabIndex,
  isFocused,
  onPress,
}: {
  tabIndex: number;
  isFocused: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.85, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const { theme } = useTheme();
  const icons = TAB_ICONS[tabIndex] ?? TAB_ICONS[0];
  const iconName = isFocused ? icons.active : icons.inactive;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tab}
      hitSlop={8}
    >
      <Animated.View style={[styles.tabInner, animStyle]}>
        <Ionicons name={iconName} size={26} color={isFocused ? (theme.colors.primaryText ?? theme.colors.primary) : theme.colors.textMuted} />
      </Animated.View>
    </Pressable>
  );
}

// ─── Center Paw Button ───────────────────────────────────────────────────────

function CenterButtonInner({ isFocused, onPress }: { isFocused: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 12, stiffness: 250 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 250 });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.centerWrapper}
    >
      <Animated.View style={animStyle}>
        <LinearGradient
          colors={isFocused ? [theme.colors.primary, theme.colors.primaryDark] : [...theme.gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.centerButton}
        >
          <Ionicons name="paw" size={30} color={theme.colors.onPrimary ?? '#FFFFFF'} />
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

// ─── Floating Tab Bar ────────────────────────────────────────────────────────

/**
 * Floating glass pill-shaped tab bar.
 *
 * - Glassmorphism: BlurView on iOS, semi-transparent fallback on Android
 * - Center paw button elevated above the pill with gradient
 * - Animated press feedback on all tabs
 * - Active indicator dot under focused tab
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme, themeMode } = useTheme();
  const bottomOffset = Math.max(insets.bottom, BOTTOM_MARGIN);
  const isDark = themeMode === 'dark';

  const currentRouteKey = state.routes[state.index]?.key;

  const byName = new Map(state.routes.map((r) => [r.name, r]));
  const sortedRoutes = TAB_ORDER.map((name) => {
    const actualName = ROUTE_NAME_ALIASES[name] ?? name;
    return byName.get(actualName) ?? byName.get(name);
  }).filter(Boolean) as typeof state.routes;

  return (
    <View style={[styles.wrapper, { bottom: bottomOffset }]} pointerEvents="box-none">
      {/* Glass pill background */}
      <View
        style={[
          styles.glassPill,
          {
            backgroundColor: isDark ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.9)',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
            shadowColor: isDark ? '#000' : '#1C1C1E',
          },
        ]}
      />

      {/* Tab items — sorted so Home, Health, Game, Navigation, Settings */}
      <View style={styles.tabRow}>
        {sortedRoutes.map((route, index) => {
          const isFocused = route.key === currentRouteKey;
          const isCenter = index === 2;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (isCenter) {
            return <CenterButtonInner key={route.key} isFocused={isFocused} onPress={onPress} />;
          }

          return (
            <TabItemInner
              key={route.key}
              tabIndex={index}
              isFocused={isFocused}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── Total space the tab bar occupies (for screen bottom padding) ────────────

/**
 * Use this in screen containers as `paddingBottom` so content
 * doesn't get hidden behind the floating tab bar.
 */
export const TAB_BAR_TOTAL_HEIGHT = TAB_BAR_HEIGHT + BOTTOM_MARGIN + 20;

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: SIDE_MARGIN,
    right: SIDE_MARGIN,
    height: TAB_BAR_HEIGHT + CENTER_RISE,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  // ── Glass pill (colors set dynamically) ──────────────────────────────────
  glassPill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },

  // ── Tab layout ──────────────────────────────────────────────────────────
  tabRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: TAB_BAR_HEIGHT + CENTER_RISE,
    paddingBottom: 0,
  },

  // ── Regular tab ─────────────────────────────────────────────────────────
  tab: {
    flex: 1,
    height: TAB_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Center paw button ───────────────────────────────────────────────────
  centerWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: TAB_BAR_HEIGHT + CENTER_RISE,
    paddingTop: 0,
  },
  centerButton: {
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
});
