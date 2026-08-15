import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';

const DEFAULT_DURATION = 480;
const EASING = Easing.bezier(0.4, 0, 0.2, 1);

export type CircleRevealVariant = 'reveal' | 'conceal';

interface CircleRevealOverlayBaseProps {
  variant: CircleRevealVariant;
  backgroundColor: string;
  duration?: number;
  onComplete: () => void;
  children?: React.ReactNode;
}

interface CircleRevealOverlaySeqProps {
  mode: 'conceal-then-reveal';
  backgroundColor: string;
  duration?: number;
  /** Called when conceal finishes. May return a Promise; reveal waits for it before starting. */
  onConcealComplete: () => void | Promise<void>;
  onComplete: () => void;
  children?: React.ReactNode;
  /** Rendered above the solid circle (e.g. loading tip while waiting on assets). */
  coverContent?: React.ReactNode;
}

type CircleRevealOverlayProps = CircleRevealOverlayBaseProps | CircleRevealOverlaySeqProps;

function isSeqProps(p: CircleRevealOverlayProps): p is CircleRevealOverlaySeqProps {
  return 'mode' in p && p.mode === 'conceal-then-reveal';
}

/**
 * GPU-accelerated circle wipe transition using a single Animated.View
 * with transform: scale. No SVG, no masking — runs entirely on the GPU
 * via native transform compositing.
 *
 * - Conceal: solid circle grows from center, covering content.
 * - Reveal: solid circle shrinks to center, revealing content.
 * - conceal-then-reveal: both phases in sequence without remount.
 */
export function CircleRevealOverlay(props: CircleRevealOverlayProps) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const diameter = useMemo(
    () => Math.ceil(Math.sqrt(screenW ** 2 + screenH ** 2)),
    [screenW, screenH],
  );
  const duration = props.duration ?? DEFAULT_DURATION;

  const circleScale = useSharedValue(isSeqProps(props) ? 0 : (props as CircleRevealOverlayBaseProps).variant === 'reveal' ? 1 : 0);

  const onConceal = isSeqProps(props) ? props.onConcealComplete : () => {};
  const onComplete = props.onComplete;

  useEffect(() => {
    cancelAnimation(circleScale);

    if (isSeqProps(props)) {
      circleScale.value = 0;
      const runConcealComplete = () => {
        const result = onConceal();
        if (result instanceof Promise) {
          result.then(() => {
            circleScale.value = withTiming(0, { duration, easing: EASING }, (f) => {
              if (f) runOnJS(onComplete)();
            });
          });
        } else {
          circleScale.value = withTiming(0, { duration, easing: EASING }, (f) => {
            if (f) runOnJS(onComplete)();
          });
        }
      };
      circleScale.value = withTiming(1, { duration, easing: EASING }, (f) => {
        if (f) runOnJS(runConcealComplete)();
      });
      return;
    }

    const variant = (props as CircleRevealOverlayBaseProps).variant;
    if (variant === 'reveal') {
      circleScale.value = 1;
      circleScale.value = withTiming(0, { duration, easing: EASING }, (f) => {
        if (f) runOnJS(onComplete)();
      });
    } else {
      circleScale.value = 0;
      circleScale.value = withTiming(1, { duration, easing: EASING }, (f) => {
        if (f) runOnJS(onComplete)();
      });
    }
  }, [isSeqProps(props) ? 'seq' : (props as CircleRevealOverlayBaseProps).variant, duration, onConceal, onComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
    opacity: circleScale.value > 0 ? 1 : 0,
  }));

  const circleStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      width: diameter,
      height: diameter,
      borderRadius: diameter / 2,
      left: (screenW - diameter) / 2,
      top: (screenH - diameter) / 2,
    }),
    [diameter, screenW, screenH],
  );

  const coverContent = isSeqProps(props) ? props.coverContent : undefined;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {'children' in props && props.children != null && (
        <View style={styles.content}>{props.children}</View>
      )}
      <Animated.View
        style={[circleStyle, { backgroundColor: props.backgroundColor }, animatedStyle]}
        renderToHardwareTextureAndroid
      />
      {coverContent != null ? (
        <View style={styles.cover} pointerEvents="auto">
          {coverContent}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  cover: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    elevation: 2,
  },
});
