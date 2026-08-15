import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Modal } from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/store/ThemeProvider';
import { TAB_BAR_TOTAL_HEIGHT } from '@/components/ui/FloatingTabBar';
import type { PetDialogMessage } from '../../types';

const AUTO_DISMISS_MS = 4500;

interface PetDialogProps {
  message: PetDialogMessage | null;
  petName: string;
  petImageUrl: string | null;
  onDismiss: () => void;
}

/**
 * Chat-style popup with the pet delivering a message via speech bubble.
 */
export function PetDialog({ message, petName, petImageUrl, onDismiss }: PetDialogProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const insets = useSafeAreaInsets();
  const bgOpacity = useSharedValue(0);
  const bubbleSlideY = useSharedValue(30);
  const bubbleOpacity = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (message) {
      bgOpacity.value = withTiming(1, { duration: 250 });
      bubbleOpacity.value = withTiming(1, { duration: 280 });
      bubbleSlideY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.back(1.1)) });

      timerRef.current = setTimeout(() => {
        dismiss();
      }, AUTO_DISMISS_MS);

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    } else {
      bgOpacity.value = 0;
      bubbleOpacity.value = 0;
      bubbleSlideY.value = 30;
    }
  }, [message?.id]);

  const dismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    bgOpacity.value = withTiming(0, { duration: 220 });
    bubbleOpacity.value = withTiming(0, { duration: 200 });
    bubbleSlideY.value = withTiming(30, { duration: 250, easing: Easing.in(Easing.quad) }, (done) => {
      if (done) runOnJS(onDismiss)();
    });
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bubbleSlideY.value }],
    opacity: bubbleOpacity.value,
  }));

  if (!message) return null;

  const themeStyles = {
    avatarPlaceholder: { backgroundColor: colors.primaryLight },
    bubble: { backgroundColor: colors.surface },
    bubbleTail: { borderRightColor: colors.surface },
    petName: { color: colors.primary },
    messageText: { color: colors.text },
  };

  return (
    <Modal transparent animationType="fade" statusBarTranslucent visible>
      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View style={[styles.backdrop, backdropStyle]} pointerEvents="auto">
          <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        </Animated.View>

        <Animated.View
          style={[
            styles.contentWrap,
            { bottom: TAB_BAR_TOTAL_HEIGHT + 20 + insets.bottom },
            contentStyle,
          ]}
          pointerEvents="box-none"
        >
          <Pressable style={styles.container} onPress={dismiss}>
            <View style={styles.avatarWrap}>
              {petImageUrl ? (
                <CachedImage source={{ uri: petImageUrl }} style={styles.avatar} resizeMode="contain" />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder, themeStyles.avatarPlaceholder]}>
                  <Text style={styles.avatarEmoji}>🐾</Text>
                </View>
              )}
            </View>

            <View style={[styles.bubble, themeStyles.bubble]}>
              <View style={[styles.bubbleTail, themeStyles.bubbleTail]} />
              <Text style={[styles.petName, themeStyles.petName]}>{petName}</Text>
              <Text style={[styles.messageText, themeStyles.messageText]}>{message.text}</Text>
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const shadow = Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  android: { elevation: 8 },
}) as object;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  contentWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
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
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 26,
  },
  bubble: {
    flex: 1,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...shadow,
  },
  bubbleTail: {
    position: 'absolute',
    left: -6,
    bottom: 10,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderRightWidth: 8,
    borderBottomWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  petName: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  messageText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});
