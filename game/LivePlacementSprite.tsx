import { CachedImage } from '@/components/ui/CachedImage';
import React from 'react';
import { Text, View } from 'react-native';

import { TILE_SIZE } from './constants';
import {
  placementColorStyle,
  placementFeatherStyle,
  placementRect,
  placementTransform,
} from './placementRect';
import type { ItemDefinition, ScenePlacement } from './types';

/**
 * Runtime scene sprite (live placements). Pets walk behind these; baked scenery
 * does not include them.
 *
 * Keep the wrapper and image fully transparent — RN `filter` on a View
 * composites into an opaque (usually white) box on iOS/Android.
 */
export function LivePlacementSprite({
  placement,
  def,
  offsetX = 0,
  offsetY = 0,
  zIndex,
}: {
  placement: ScenePlacement;
  def: ItemDefinition;
  offsetX?: number;
  offsetY?: number;
  zIndex?: number;
}) {
  const rect = placementRect(placement, def);
  const stretch = (placement.scaleX ?? placement.scale) !== (placement.scaleY ?? placement.scale);

  return (
    <View
      pointerEvents="none"
      collapsable={false}
      style={[
        {
          position: 'absolute',
          left: rect.left - offsetX,
          top: rect.top - offsetY,
          width: rect.width,
          height: rect.height,
          backgroundColor: 'transparent',
          overflow: 'visible',
          zIndex,
          transform: placementTransform(placement),
        },
        placementColorStyle(placement),
        placementFeatherStyle(placement),
      ]}
    >
      {def.imageUrl ? (
        <CachedImage
          source={{ uri: def.imageUrl }}
          style={{
            width: rect.width,
            height: rect.height,
            backgroundColor: 'transparent',
          }}
          resizeMode={stretch ? 'fill' : 'contain'}
        />
      ) : (
        <Text style={{ fontSize: Math.min(rect.width, rect.height) * 0.7, textAlign: 'center' }}>
          {def.emoji ?? '❔'}
        </Text>
      )}
    </View>
  );
}

/** Pixel Y of the footprint bottom — matches pet feet for walk-behind. */
export function livePlacementZIndex(placement: ScenePlacement, def: ItemDefinition | undefined): number {
  return Math.round(
    placement.y + (def?.rows ?? 1) * TILE_SIZE + (placement.depthOffset ?? 0) * TILE_SIZE,
  );
}
