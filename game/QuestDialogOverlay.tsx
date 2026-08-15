import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CachedImage } from '@/components/ui/CachedImage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { DialogText } from './DialogText';
import { DIALOG_SKIP_AFTER_MS, stepBlocks } from './dialogBlocking';
import { BELOW_TOP_ROW_OFFSET } from './GameHUD/constants';
import type { DialogEntry, ItemDefinition } from './types';

/** HUD targets that sit in the top band under the dialog bubble. */
const TOP_SCREEN_HUD_TARGETS = new Set(['farm_info']);

interface QuestDialogOverlayProps {
  /** The dialog to show, or null when nobody is speaking. */
  dialog: DialogEntry | null;
  stepIndex: number;
  petName: string;
  petImageUrl: string | null;
  /** Substituted for {playername} in dialog text. */
  playerName?: string;
  /** Item definitions for {item_slug} placeholders. */
  itemDefs?: Record<string, ItemDefinition>;
  onAdvance: () => void;
}

export function QuestDialogOverlay({
  dialog,
  stepIndex,
  petName,
  petImageUrl,
  playerName = 'Player',
  itemDefs = {},
  onAdvance,
}: QuestDialogOverlayProps) {
  const steps = dialog?.steps ?? null;

  // A step can override the dialog's speaker, which is how a pet can chime in
  // mid-conversation with an NPC.
  const speaksAsNpc = (steps?.[stepIndex]?.speaker ?? (dialog?.speaker ? 'npc' : 'pet')) === 'npc';
  const speaker = speaksAsNpc ? dialog?.speaker : undefined;
  const displayName = speaker?.name ?? petName;
  const displayImageUrl = speaker ? speaker.imageUrl : petImageUrl;

  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const topOverlayHeight = Math.min(screenHeight * 0.45, 320);
  const bgOpacity = useSharedValue(0);
  const bubbleSlideY = useSharedValue(-30);
  const bubbleOpacity = useSharedValue(0);

  const currentStep = steps?.[stepIndex] ?? null;
  const isLast = steps ? stepIndex >= steps.length - 1 : true;
  const highlight = currentStep?.highlight;
  const hasHighlight = !!highlight;
  const blocks = stepBlocks(dialog, stepIndex);

  // Only duck the bubble when the highlight is literally under it (top HUD).
  const clearTopBand =
    highlight?.type === 'hud_button' && TOP_SCREEN_HUD_TARGETS.has(highlight.target);

  const bubbleTop = clearTopBand
    ? insets.top + BELOW_TOP_ROW_OFFSET
    : insets.top + 24;

  // A blocking step earns an escape hatch if the player sits on it. Without one
  // an unsatisfiable highlight is a dead end, and anything queued behind the
  // dialog — including the quest's reward screen — never gets its turn.
  const [skippable, setSkippable] = useState(false);
  useEffect(() => {
    if (!blocks) {
      setSkippable(false);
      return;
    }
    setSkippable(false);
    const timer = setTimeout(() => setSkippable(true), DIALOG_SKIP_AFTER_MS);
    return () => clearTimeout(timer);
  }, [blocks, dialog, stepIndex]);

  const canAdvance = !blocks || skippable;

  useEffect(() => {
    if (currentStep) {
      bgOpacity.value = withTiming(hasHighlight ? 0 : 1, { duration: 250 });
      bubbleOpacity.value = withTiming(1, { duration: 280 });
      bubbleSlideY.value = clearTopBand ? 14 : -30;
      bubbleSlideY.value = withSpring(0, { damping: 14, stiffness: 120 });
    } else {
      bgOpacity.value = withTiming(0, { duration: 200 });
      bubbleOpacity.value = withTiming(0, { duration: 180 });
      bubbleSlideY.value = -30;
    }
  }, [currentStep?.text, hasHighlight, clearTopBand]);

  useEffect(() => {
    if (currentStep && stepIndex > 0) {
      bubbleSlideY.value = clearTopBand ? 10 : -12;
      bubbleSlideY.value = withSpring(0, { damping: 14, stiffness: 140 });
      bubbleOpacity.value = 0.7;
      bubbleOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [stepIndex]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bubbleSlideY.value }],
    opacity: bubbleOpacity.value,
  }));

  if (!currentStep) return null;

  const hintText = !canAdvance
    ? 'Complete the action to continue'
    : blocks
      ? 'Tap to skip'
      : isLast
        ? 'Tap to close'
        : 'Tap to continue';

  // Not a Modal — Modal is a separate native window and blocks the whole app
  // even with pointerEvents="box-none". Absolute overlay keeps visual z-index
  // while letting HUD / world receive taps outside the bubble.
  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Visual only — never steal taps from the farm / HUD underneath. */}
      {!hasHighlight && (
        <Animated.View
          style={[styles.backdropTop, { height: topOverlayHeight }, backdropStyle]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.25)', 'transparent']}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

      <Animated.View
        style={[styles.contentWrap, { top: bubbleTop }, contentStyle]}
        pointerEvents="box-none"
      >
        {/* Only the bubble captures presses (to advance). Everything else on
            screen stays interactive while the dialog is up. */}
        <Pressable
          style={styles.container}
          onPress={canAdvance ? onAdvance : undefined}
          pointerEvents={canAdvance ? 'auto' : 'none'}
        >
          <View style={styles.avatarWrap} pointerEvents="none">
            {displayImageUrl ? (
              <CachedImage source={{ uri: displayImageUrl }} style={styles.avatar} resizeMode="contain" />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarEmoji}>🐾</Text>
              </View>
            )}
          </View>

          <View style={styles.bubble} pointerEvents="none">
            <View style={styles.bubbleTail} />
            <Text style={styles.petName}>{displayName}</Text>
            <DialogText
              text={currentStep.text}
              playerName={playerName}
              itemDefs={itemDefs}
              textStyle={styles.messageText}
            />
            <Text style={styles.tapHint}>{hintText}</Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const shadow = Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  android: { elevation: 8 },
}) as object;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    // Above GameHUD (200) so the bubble paints on top; box-none lets taps pass.
    zIndex: 300,
  },
  backdropTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  contentWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    ...shadow,
  },
  avatar: {
    width: 56,
    height: 56,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 26,
  },
  bubble: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderTopLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...shadow,
  },
  bubbleTail: {
    position: 'absolute',
    left: -6,
    top: 10,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderRightWidth: 8,
    borderBottomWidth: 6,
    borderTopColor: 'transparent',
    borderRightColor: '#fff',
    borderBottomColor: 'transparent',
  },
  petName: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  messageText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20,
  },
  tapHint: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted ?? '#999',
    marginTop: 6,
    textAlign: 'right',
    letterSpacing: 0.2,
  },
});
