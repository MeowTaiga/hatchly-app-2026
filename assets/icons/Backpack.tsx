import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { GameIcon, type GameIconVariant } from './GameIcons';

export interface BackpackIconProps {
  style?: StyleProp<ViewStyle>;
  variant?: GameIconVariant;
  size?: number;
  color?: string;
}

/**
 * Backpack icon. Prefer using <GameIcon name="backpack" /> for consistency.
 */
export function BackpackIcon({
  style,
  variant = 'outline',
  size = 24,
  color = 'currentColor',
}: BackpackIconProps) {
  return <GameIcon name="backpack" variant={variant} size={size} color={color} style={style} />;
}
