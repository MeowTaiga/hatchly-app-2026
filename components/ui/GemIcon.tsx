/**
 * Reusable gem/currency icon using the coin pouch image.
 * Use anywhere gems are displayed (HUD, shop, sell breakdown, rewards, etc.).
 */

import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { CachedImage } from './CachedImage';

const GEM_IMAGE_URL = 'https://images.hatchly.me/game-items/coin_pouch/70f8a691-5abf-4535-8778-95df233f95b5.png';

interface GemIconProps {
  /** Icon size in pixels. Default 14. */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function GemIcon({ size = 14, style }: GemIconProps) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <CachedImage
        source={{ uri: GEM_IMAGE_URL }}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}
