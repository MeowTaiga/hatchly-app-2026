/**
 * Minimal “you got stuff” toast — spam-safe qty bumps, soft fade-in.
 * Host via ItemGainToastHost inside the shop drawer, game HUD, or app shell.
 *
 * Enter: fade + slight slide. Exit: reverse (never hard-unmount).
 * Level-ups get a softer pastel wash and a little wave ribbon.
 */

import { CachedImage } from '@/components/ui/CachedImage';
import { GemIcon } from '@/components/ui/GemIcon';
import { useTheme } from '@/store/ThemeProvider';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export type ItemGainTone = 'got' | 'bought' | 'learned';

export interface ItemGainLine {
  itemType: string;
  qty: number;
  label: string;
  imageUrl?: string;
  emoji?: string;
}

export interface ItemGainLevelUp {
  skillLabel: string;
  level: number;
  /** Skill accent for the cute wash (e.g. farming green). */
  color: string;
}

interface ItemGainToastProps {
  lines: ItemGainLine[];
  tone: ItemGainTone;
  /** Bumps whenever a gain is pushed (kept for host API; no bounce). */
  pulseKey: number;
  visible: boolean;
  levelUp?: ItemGainLevelUp | null;
  style?: StyleProp<ViewStyle>;
}

const ENTER_Y = -10;
const ENTER_OPACITY_MS = 160;
const EXIT_MS = 160;
const EXIT_EASING = Easing.in(Easing.quad);
/** Card fill alpha — a light see-through over the world. */
const SURFACE_ALPHA = 'E6'; // ~90%
const LEVEL_SURFACE_ALPHA = 'F2';

function QtyBadge({
  qty,
  accent,
  onAccentText,
}: {
  qty: number;
  accent: string;
  onAccentText: string;
}) {
  return (
    <View style={[styles.qtyBadgeBg, { backgroundColor: `${accent}CC` }]}>
      <Text style={[styles.qtyText, { color: onAccentText }]} allowFontScaling={false}>
        ×{qty}
      </Text>
    </View>
  );
}

function LineIcon({
  line,
  accent,
}: {
  line: ItemGainLine;
  accent: string;
}) {
  if (line.itemType === '__gems') {
    return (
      <View style={[styles.iconWell, { backgroundColor: `${accent}14` }]}>
        <GemIcon size={18} />
      </View>
    );
  }
  if (line.imageUrl) {
    return (
      <View style={[styles.iconWell, { backgroundColor: `${accent}14` }]}>
        <CachedImage
          source={{ uri: line.imageUrl }}
          style={styles.icon}
          resizeMode="contain"
        />
      </View>
    );
  }
  return (
    <View style={[styles.iconWell, { backgroundColor: `${accent}14` }]}>
      <Text style={styles.emoji}>{line.emoji || '🎁'}</Text>
    </View>
  );
}

function withAlpha(hex: string, alpha: string): string {
  if (hex.length === 9) return `${hex.slice(0, 7)}${alpha}`;
  if (hex.length === 7) return `${hex}${alpha}`;
  return hex;
}

function WaveRibbon({ color }: { color: string }) {
  return (
    <View style={styles.waveRow} accessibilityElementsHidden>
      {Array.from({ length: 7 }, (_, i) => (
        <View
          key={i}
          style={[
            styles.waveDot,
            {
              backgroundColor: color,
              opacity: 0.22 + (i % 3) * 0.12,
              transform: [{ translateY: i % 2 === 0 ? -2 : 2 }],
            },
          ]}
        />
      ))}
    </View>
  );
}

export function ItemGainToast({
  lines,
  tone,
  pulseKey: _pulseKey,
  visible,
  levelUp = null,
  style,
}: ItemGainToastProps) {
  const { theme, accentColor } = useTheme();
  const colors = theme.colors;
  const onAccentText = colors.onPrimary ?? colors.primaryText ?? '#fff';

  const [mounted, setMounted] = useState(false);
  const [display, setDisplay] = useState<{
    lines: ItemGainLine[];
    tone: ItemGainTone;
    levelUp: ItemGainLevelUp | null;
  } | null>(null);
  const wasVisibleRef = useRef(false);

  const enterY = useSharedValue(ENTER_Y);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  const finishExit = useCallback(() => {
    setMounted(false);
    setDisplay(null);
  }, []);

  useEffect(() => {
    if (visible && (lines.length > 0 || levelUp)) {
      setDisplay({
        lines: lines.map((l) => ({ ...l })),
        tone,
        levelUp: levelUp ?? null,
      });

      if (!wasVisibleRef.current) {
        wasVisibleRef.current = true;
        setMounted(true);
        enterY.value = ENTER_Y;
        opacity.value = 0;
        scale.value = levelUp ? 0.92 : 1;
        opacity.value = withTiming(1, {
          duration: ENTER_OPACITY_MS,
          easing: Easing.out(Easing.quad),
        });
        enterY.value = withTiming(0, {
          duration: ENTER_OPACITY_MS,
          easing: Easing.out(Easing.quad),
        });
        if (levelUp) {
          scale.value = withSpring(1, { damping: 12, stiffness: 160 });
        }
      }
      return;
    }

    if (!wasVisibleRef.current || !mounted) return;
    wasVisibleRef.current = false;

    opacity.value = withTiming(0, { duration: EXIT_MS, easing: EXIT_EASING }, (finished) => {
      if (finished) runOnJS(finishExit)();
    });
    enterY.value = withTiming(ENTER_Y, { duration: EXIT_MS, easing: EXIT_EASING });
  }, [visible, lines, tone, levelUp, mounted, enterY, opacity, scale, finishExit]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: enterY.value }, { scale: scale.value }],
  }));

  if (!mounted || !display) return null;
  if (display.lines.length === 0 && !display.levelUp) return null;

  const isLevelUp = Boolean(display.levelUp);
  const wash = display.levelUp?.color ?? accentColor;
  const cardBg = isLevelUp
    ? withAlpha(wash, '24')
    : withAlpha(colors.surface, SURFACE_ALPHA);
  const borderCol = isLevelUp ? `${wash}66` : `${accentColor}33`;
  const shopLines = display.lines.filter((l) => l.itemType.startsWith('shop:'));
  const rewardLines = display.lines.filter((l) => !l.itemType.startsWith('shop:'));

  return (
    <View style={[styles.host, style]} pointerEvents="none">
      <Animated.View
        style={[
          styles.card,
          isLevelUp && styles.cardLevelUp,
          {
            backgroundColor: isLevelUp
              ? withAlpha(colors.surface, LEVEL_SURFACE_ALPHA)
              : cardBg,
            borderColor: borderCol,
          },
          cardStyle,
        ]}
      >
        {isLevelUp && display.levelUp ? (
          <View style={[styles.levelBanner, { backgroundColor: `${wash}22` }]}>
            <WaveRibbon color={wash} />
            <Text style={[styles.levelEyebrow, { color: wash }]}>Level up!</Text>
            <Text style={[styles.levelTitle, { color: colors.text }]}>
              {display.levelUp.skillLabel} · Lv {display.levelUp.level}
            </Text>
            <WaveRibbon color={wash} />
          </View>
        ) : null}

        {display.lines.length > 0 ? (
          <View style={styles.lines}>
            {rewardLines.length > 0 ? (
              <>
                {isLevelUp ? (
                  <Text style={[styles.rewardsHint, { color: colors.textMuted }]}>Rewards</Text>
                ) : null}
                {rewardLines.map((line) => (
                  <View key={line.itemType} style={styles.line}>
                    <LineIcon line={line} accent={wash} />
                    <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
                      {line.label}
                    </Text>
                    {display.tone !== 'learned' && !line.itemType.startsWith('unlock:') ? (
                      <QtyBadge qty={line.qty} accent={wash} onAccentText={onAccentText} />
                    ) : null}
                  </View>
                ))}
              </>
            ) : null}

            {shopLines.length > 0 ? (
              <View style={rewardLines.length > 0 ? styles.shopBlock : undefined}>
                <Text style={[styles.rewardsHint, { color: colors.textMuted }]}>
                  Added to the shop
                </Text>
                <View style={[styles.shopRule, { backgroundColor: `${colors.textMuted}44` }]} />
                {shopLines.map((line) => (
                  <View key={line.itemType} style={styles.line}>
                    <LineIcon line={line} accent={wash} />
                    <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
                      {line.label}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    alignItems: 'center',
    zIndex: 400,
  },
  card: {
    minWidth: 168,
    maxWidth: 280,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardLevelUp: {
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  levelBanner: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    alignItems: 'center',
    gap: 2,
  },
  levelEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  levelTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginVertical: 2,
  },
  waveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  rewardsHint: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  shopBlock: {
    marginTop: 8,
  },
  shopRule: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginBottom: 6,
  },
  lines: {
    gap: 6,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWell: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 22,
    height: 22,
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  qtyBadgeBg: {
    minWidth: 28,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 11,
    fontWeight: '800',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
