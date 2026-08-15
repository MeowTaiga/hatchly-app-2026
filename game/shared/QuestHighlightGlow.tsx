/**
 * Quest HUD highlight wrapper.
 *
 * Conditionally applying a Reanimated glow style and then swapping it for a
 * static "clear" style leaves the last shadow values stuck on the view. Mount
 * the animated wrapper only while highlighted so unmount tears the glow down.
 */

import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';

interface QuestHighlightGlowProps {
  active: boolean;
  glowStyle: StyleProp<AnimatedStyle<ViewStyle>>;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function QuestHighlightGlow({
  active,
  glowStyle,
  style,
  children,
}: QuestHighlightGlowProps) {
  if (active) {
    return <Animated.View style={[style, glowStyle]}>{children}</Animated.View>;
  }
  return <View style={style}>{children}</View>;
}
