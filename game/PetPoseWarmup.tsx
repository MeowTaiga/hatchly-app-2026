import { CachedImage } from '@/components/ui/CachedImage';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SceneLoadingPet } from './SceneLoadingScreen';

/**
 * Keeps every pet pose URL mounted (off-screen) so tip screens / pose swaps
 * can reuse already-decoded bitmaps from expo-image's memory cache.
 */
export function PetPoseWarmup({ pet }: { pet: SceneLoadingPet }) {
  const urls = useMemo(() => {
    const set = new Set<string>();
    if (pet?.imageUrl) set.add(pet.imageUrl);
    if (pet?.pose) {
      for (const url of Object.values(pet.pose)) {
        if (url) set.add(url);
      }
    }
    return [...set];
  }, [pet?.imageUrl, pet?.pose]);

  if (urls.length === 0) return null;

  return (
    <View style={styles.wrap} pointerEvents="none" collapsable={false}>
      {urls.map((uri) => (
        <CachedImage
          key={uri}
          source={{ uri }}
          style={styles.img}
          resizeMode="contain"
          recyclingKey={uri}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: -400,
    top: 0,
    opacity: 0,
    // Keep real layout size so expo-image actually decodes bitmaps.
  },
  img: {
    width: 128,
    height: 128,
  },
});
