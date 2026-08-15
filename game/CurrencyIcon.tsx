import { CachedImage } from '@/components/ui/CachedImage';
import { GemIcon } from '@/components/ui/GemIcon';
import React from 'react';
import { Text } from 'react-native';

/** Gems, or an item-currency sprite (candy corn, etc.). */
export function CurrencyIcon({
  def,
  size,
}: {
  def?: { imageUrl?: string | null; emoji?: string } | null;
  size: number;
}) {
  if (def?.imageUrl) {
    return (
      <CachedImage
        source={{ uri: def.imageUrl }}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    );
  }
  if (def?.emoji) {
    return <Text style={{ fontSize: size * 0.9 }}>{def.emoji}</Text>;
  }
  return <GemIcon size={size} />;
}