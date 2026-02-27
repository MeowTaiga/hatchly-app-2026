import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { TILE_SIZE } from '../../constants';

interface PetHeartEffectProps {
  active: boolean;
  onDone: () => void;
}

const DURATION = 800;

export const PetHeartEffect = React.memo(function PetHeartEffect({
  active,
  onDone,
}: PetHeartEffectProps) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    translateY.value = 0;
    opacity.value = 1;
    opacity.value = withSequence(
      withTiming(1, { duration: 80 }),
      withDelay(DURATION - 240, withTiming(0, { duration: 160, easing: Easing.out(Easing.quad) })),
    );
    translateY.value = withTiming(-TILE_SIZE * 0.8, {
      duration: DURATION,
      easing: Easing.out(Easing.quad),
    });
    const t = setTimeout(onDone, DURATION);
    return () => clearTimeout(t);
  }, [active]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!active) return null;

  return (
    <Animated.View style={[styles.container, style]} pointerEvents="none">
      <Text style={styles.heart}>❤️</Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: '100%',
    alignSelf: 'center',
    marginBottom: -8,
  },
  heart: {
    fontSize: TILE_SIZE * 0.6,
  },
});
