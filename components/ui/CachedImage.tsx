import React from 'react';
import { Image, type ImageProps } from 'expo-image';
import type { StyleProp, ImageStyle } from 'react-native';

interface CachedImageProps extends Omit<ImageProps, 'source' | 'resizeMode'> {
  source?: { uri: string } | null;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

/**
 * Drop-in replacement for React Native's Image that uses expo-image
 * with memory+disk caching. The URL itself is the cache key -- when the admin
 * regenerates an image the URL changes, automatically invalidating the cache.
 */
export function CachedImage({ source, resizeMode, style, cachePolicy, ...rest }: CachedImageProps) {
  if (!source?.uri) return null;

  return (
    <Image
      source={source}
      style={[{ backgroundColor: 'transparent' }, style]}
      contentFit={resizeMode ?? 'contain'}
      cachePolicy={cachePolicy ?? 'memory-disk'}
      {...rest}
    />
  );
}
