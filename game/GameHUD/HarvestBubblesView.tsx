/**
 * Harvest reward toast — slides down from top, shows aggregated drops with
 * a satisfying scale+glow entrance, then slides back up after a hold.
 * Spam-harvest safe: counts update in-place, dismiss timer resets per new harvest.
 */

import { CachedImage } from '@/components/ui/CachedImage';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { HarvestEffect, ItemDefinition } from '../types';

const SLIDE_IN_DURATION = 200;
const HOLD_DURATION = 600;
const SLIDE_OUT_DURATION = 250;

interface HarvestBubblesViewProps {
  harvestEffects: HarvestEffect[];
  itemDefs: Record<string, ItemDefinition>;
  topOffset: number;
  onDismissHarvestEffect: (id: string) => void;
}

/** Aggregate all harvest effects into itemType -> total qty. */
function aggregateDrops(
  harvestEffects: HarvestEffect[],
  itemDefs: Record<string, ItemDefinition>,
): { itemType: string; qty: number; emoji?: string; imageUrl?: string }[] {
  const totals = new Map<string, number>();
  const defs = new Map<string, { emoji?: string; imageUrl?: string }>();

  for (const fx of harvestEffects) {
    for (const d of fx.drops) {
      totals.set(d.itemType, (totals.get(d.itemType) ?? 0) + d.qty);
      if (!defs.has(d.itemType)) {
        const def = itemDefs[d.itemType];
        defs.set(d.itemType, { emoji: def?.emoji, imageUrl: def?.imageUrl });
      }
    }
  }

  return Array.from(totals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([itemType, qty]) => {
      const meta = defs.get(itemType)!;
      return { itemType, qty, emoji: meta.emoji, imageUrl: meta.imageUrl };
    });
}

export function HarvestBubblesView({
  harvestEffects,
  itemDefs,
  topOffset,
  onDismissHarvestEffect,
}: HarvestBubblesViewProps) {
  const translateY = useSharedValue(-60);
  const opacity = useSharedValue(0);
  const popScale = useSharedValue(1);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLengthRef = useRef(0);
  const isDismissingRef = useRef(false);

  const triggerDismiss = useCallback(
    (ids: string[]) => {
      isDismissingRef.current = true;
      for (const id of ids) {
        onDismissHarvestEffect(id);
      }
    },
    [onDismissHarvestEffect],
  );

  const aggregated = useMemo(
    () => aggregateDrops(harvestEffects, itemDefs),
    [harvestEffects, itemDefs],
  );

  useEffect(() => {
    if (harvestEffects.length === 0) {
      prevLengthRef.current = 0;
      isDismissingRef.current = false;
      return;
    }

    if (isDismissingRef.current) {
      return;
    }

    const isFirstHarvest = prevLengthRef.current === 0;
    prevLengthRef.current = harvestEffects.length;

    if (isFirstHarvest) {
      // Slide down into view with spring
      translateY.value = -60;
      translateY.value = withSpring(0, { damping: 14, stiffness: 200 });
      opacity.value = withTiming(1, { duration: SLIDE_IN_DURATION });
      popScale.value = 1;
    } else {
      // Already visible — just pop the scale to show the count updated
      cancelAnimation(translateY);
      cancelAnimation(opacity);
      cancelAnimation(popScale);
      translateY.value = 0;
      opacity.value = 1;
      popScale.value = withSequence(
        withTiming(1.12, { duration: 80, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 100, easing: Easing.out(Easing.back(1.1)) }),
      );
    }

    // Reset dismiss timer
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }

    const ids = harvestEffects.map((e) => e.id);

    fadeTimeoutRef.current = setTimeout(() => {
      fadeTimeoutRef.current = null;
      // Slide up and fade out
      translateY.value = withTiming(-40, {
        duration: SLIDE_OUT_DURATION,
        easing: Easing.in(Easing.quad),
      });
      opacity.value = withTiming(
        0,
        { duration: SLIDE_OUT_DURATION, easing: Easing.in(Easing.quad) },
        (finished) => {
          if (finished) {
            runOnJS(triggerDismiss)(ids);
          }
        },
      );
    }, HOLD_DURATION);

    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, [harvestEffects, onDismissHarvestEffect, triggerDismiss]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: popScale.value },
    ],
    opacity: opacity.value,
  }));

  if (harvestEffects.length === 0) return null;

  return (
    <View style={[styles.container, { top: topOffset }]} pointerEvents="box-none">
      <Animated.View style={[styles.toast, animatedStyle]} pointerEvents="none">
        <Text style={styles.plusSign}>+</Text>
        {aggregated.map((d) => (
          <View key={d.itemType} style={styles.dropItem}>
            {d.imageUrl ? (
              <CachedImage source={{ uri: d.imageUrl }} style={styles.dropIcon} resizeMode="contain" />
            ) : d.emoji ? (
              <Text style={styles.dropEmoji}>{d.emoji}</Text>
            ) : null}
            <Text style={styles.dropQty}>{d.qty}</Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 250,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22,22,24,0.85)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  plusSign: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4ade80',
    marginRight: 2,
  },
  dropItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dropIcon: {
    width: 22,
    height: 22,
  },
  dropEmoji: {
    fontSize: 18,
  },
  dropQty: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
