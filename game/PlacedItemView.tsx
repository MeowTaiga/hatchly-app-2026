import { CachedImage } from '@/components/ui/CachedImage';
import { useTheme } from '@/store/ThemeProvider';
import React, { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { FENCE_VARIANT_MAP, TILE_SIZE } from './constants';
import { useTreeShakeTrigger } from './treeShake';
import type { ItemDefinition, PlacedItem } from './types';

/** Buildings size by cols width; height = width * this so they extend upward and overlay scenery. */
export const BUILDING_ASPECT_RATIO = 1.35;
const CROP_OVERFLOW_SCALE = 1.35;
const SEED_SCALE = 0.55;
/** Scale for centerOverflow items (garden arch, etc.) — centered and extends upward. */
export const CENTER_OVERFLOW_SCALE = 1.25;

/** Pixel box for an item's sprite, including upward overflow past the tile pad. */
export function itemArtBox(def: ItemDefinition | undefined, item: PlacedItem) {
  const cols = def?.category === 'tree' ? item.tileCols : (def?.cols ?? item.tileCols);
  const rows = def?.category === 'tree' ? item.tileRows : (def?.rows ?? item.tileRows);
  const pxW = TILE_SIZE * (cols ?? 1);
  const footprintH = TILE_SIZE * (rows ?? 1);
  const isBuilding = def?.category === 'building';
  const centerOverflow = def?.centerOverflow ?? false;
  const pxH = isBuilding
    ? pxW * BUILDING_ASPECT_RATIO
    : centerOverflow
      ? Math.max(footprintH * CENTER_OVERFLOW_SCALE, pxW * 0.6)
      : footprintH;
  return {
    pxW,
    pxH,
    footprintH,
    overflowUp: Math.max(0, pxH - footprintH),
  };
}


/**
 * Renders a small image centered in a larger tile area.
 * Used for seeds (1x1 in 2x2 crop footprint).
 */
export function centeredSmallImageStyle(tileW: number, tileH: number, scale = SEED_SCALE) {
  const w = TILE_SIZE * scale;
  const h = TILE_SIZE * scale;
  return {
    position: 'absolute' as const,
    width: w,
    height: h,
    left: (tileW - w) / 2,
    top: (tileH - h) / 2,
  };
}

/**
 * Renders a small image at bottom-center of a larger tile area.
 * Used for tree saplings (1x1 image in 2x2 placement).
 */
export function bottomCenterImageStyle(tileW: number, tileH: number, scale = 1) {
  const w = TILE_SIZE * scale;
  const h = TILE_SIZE * scale;
  return {
    position: 'absolute' as const,
    width: w,
    height: h,
    left: (tileW - w) / 2,
    top: tileH - h,
  };
}

/** @deprecated Use centeredSmallImageStyle */
function seedImage(tileW: number, tileH: number) {
  return centeredSmallImageStyle(tileW, tileH);
}

function overflowCrop(tileW: number, tileH: number) {
  const w = tileW * CROP_OVERFLOW_SCALE;
  const h = tileH * CROP_OVERFLOW_SCALE;
  return {
    position: 'absolute' as const,
    width: w,
    height: h,
    left: (tileW - w) / 2,
    top: tileH / 2 - h,
  };
}

/** Tap-shake for trees. No key = no flicker. Explicit reset + cancel before replay. */
function TreeShakeWrapper({ width, height, anchorId, children }: {
  width: number; height: number; anchorId: string; children: React.ReactNode;
}) {
  const trigger = useTreeShakeTrigger(anchorId);
  const rot = useSharedValue(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const cx = width / 2;
  const cy = height;
  useEffect(() => {
    if (!trigger) return;
    cancelAnimation(rot);
    cancelAnimation(tx);
    cancelAnimation(ty);
    rot.value = 0;
    tx.value = 0;
    ty.value = 0;
    const seq = (mid: number) =>
      withSequence(
        withTiming(mid, { duration: 45, easing: Easing.out(Easing.quad) }),
        withTiming(-mid, { duration: 50, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 45, easing: Easing.in(Easing.quad) }),
      );
    rot.value = seq(-1.8);
    tx.value = seq(1.5);
    ty.value = seq(-0.8);
  }, [trigger]);
  const style = useAnimatedStyle(() => ({
    width,
    height,
    position: 'absolute' as const,
    left: 0,
    top: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    transform: [
      { translateX: cx + tx.value },
      { translateY: cy + ty.value },
      { rotate: `${rot.value}deg` },
      { translateX: -cx },
      { translateY: -cy },
    ],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  item: {
    position: 'absolute',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  itemSelected: {
    borderWidth: 2.5,
    borderColor: '#FFD700',
    borderStyle: 'solid',
    zIndex: 60,
  },
  itemHighlighted: {
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 4,
    shadowColor: '#FFD700',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  itemMoving: {
    opacity: 0.4,
    borderWidth: 2,
    borderStyle: 'dashed',
    zIndex: 60,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  buildingImageWrap: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
  },
  emoji: {
    fontSize: TILE_SIZE * 0.5,
  },
});

const buildingStyles = StyleSheet.create({
  potWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  potEmoji: {
    fontSize: TILE_SIZE * 0.8,
  },
  potLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});


const WATER_INDICATOR_SIZE = TILE_SIZE * 0.5;
const WATER_ICON_SIZE = TILE_SIZE * 0.28;

function NeedsWaterIndicator() {
  const { theme } = useTheme();
  const c = theme.colors;
  const styles = useMemo(
    () => ({
      wrap: {
        position: 'absolute' as const,
        top: -TILE_SIZE * 0.2,
        right: -TILE_SIZE * 0.2,
        width: WATER_INDICATOR_SIZE,
        height: WATER_INDICATOR_SIZE,
        borderRadius: WATER_INDICATOR_SIZE / 2,
        backgroundColor: c.surface,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        borderWidth: 1,
        borderColor: c.border,
        zIndex: 100,
        ...(Platform.select({
          ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 },
          android: { elevation: 3 },
        }) as object),
      },
    }),
    [c.surface, c.border],
  );
  return (
    <View style={styles.wrap}>
      <Ionicons name="water" size={WATER_ICON_SIZE} color="#0EA5E9" />
    </View>
  );
}


// ─── Building Renderers ─────────────────────────────────────────────────────

function CookingPotVisual() {
  return (
    <View style={buildingStyles.potWrap}>
      <Text style={buildingStyles.potEmoji}>🍳</Text>
      <Text style={buildingStyles.potLabel}>Cook</Text>
    </View>
  );
}

const BUILDING_RENDERERS: Record<string, (w: number, h: number) => React.ReactNode> = {
  cooking_pot: () => <CookingPotVisual />,
};

// ─── Fully Grown Crop (scales up from bottom-center on live growth only) ─────

function GrownCropImage({ uri, tileW, tileH, animate }: {
  uri: string; tileW: number; tileH: number; animate: boolean;
}) {
  const w = tileW * CROP_OVERFLOW_SCALE;
  const h = tileH * CROP_OVERFLOW_SCALE;
  const scale = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) return;
    scale.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.back(1.4)),
    });
  }, [animate, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const wrapStyle = useMemo(() => ({
    position: 'absolute' as const,
    width: w,
    height: h,
    left: (tileW - w) / 2,
    top: tileH / 2 - h,
    transformOrigin: 'center bottom' as const,
  }), [w, h, tileW, tileH]);

  const imgStyle = useMemo(() => ({ width: w, height: h }), [w, h]);

  return (
    <Animated.View style={[wrapStyle, animStyle]}>
      <CachedImage
        source={{ uri }}
        style={imgStyle}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

// ─── CropVisual (pure props, no context, no animation infra) ─────────────────

interface CropVisualProps {
  item: PlacedItem;
  def?: import('./types').ItemDefinition;
  itemDefs?: Record<string, import('./types').ItemDefinition>;
  isGrowing: boolean;
  needsWater: boolean;
}

/**
 * Isolated seed image — never re-renders when watered/isGrowing change.
 * The seed picture is identical before and after watering, so there is
 * zero reason for this component to update during that transition.
 */
const SeedImage = React.memo(function SeedImage({
  uri,
  tileW,
  tileH,
}: {
  uri: string;
  stableKey: string;
  tileW: number;
  tileH: number;
}) {
  const style = useMemo(() => seedImage(tileW, tileH), [tileW, tileH]);
  return (
    <CachedImage
      source={{ uri }}
      style={style}
      resizeMode="contain"
    />
  );
}, (prev, next) =>
  prev.uri === next.uri &&
  prev.tileW === next.tileW &&
  prev.tileH === next.tileH &&
  prev.stableKey === next.stableKey
);

const CropVisual = React.memo(function CropVisual({ item, def, itemDefs, isGrowing, needsWater }: CropVisualProps) {
  // Compute fullyGrown with a one-shot setTimeout that fires when
  // the growth timer actually completes. No context subscription needed.
  const [fullyGrown, setFullyGrown] = React.useState(() => {
    if (!item.plantedAt || !item.growthMs || !item.watered) return false;
    return Date.now() - item.plantedAt >= item.growthMs;
  });

  // Snapshot restore / remount: already-grown crops skip the pop-in animation.
  const grewWhileMountedRef = React.useRef(false);
  const startedFullyGrownRef = React.useRef(fullyGrown);

  React.useEffect(() => {
    if (!item.plantedAt || !item.growthMs || !item.watered) {
      setFullyGrown(false);
      startedFullyGrownRef.current = false;
      grewWhileMountedRef.current = false;
      return;
    }
    const elapsed = Date.now() - item.plantedAt;
    if (elapsed >= item.growthMs) {
      setFullyGrown(true);
      return;
    }
    const remaining = item.growthMs - elapsed;
    const timer = setTimeout(() => {
      grewWhileMountedRef.current = true;
      setFullyGrown(true);
    }, remaining);
    return () => clearTimeout(timer);
  }, [item.plantedAt, item.growthMs, item.watered]);

  const grownDef = fullyGrown && def?.harvestYield?.length
    ? itemDefs?.[def.harvestYield.find((d) => d.itemType !== item.itemType)?.itemType ?? def.harvestYield[0].itemType]
    : null;

  const displayImageUrl = grownDef?.imageUrl ?? item.imageUrl;

  const tileW = TILE_SIZE * item.tileCols;
  const tileH = TILE_SIZE * item.tileRows;
  const stableKey = item.clientId ?? item.id;

  // Whether to show darkening tint on the seed (watered + growing, not fully grown)
  const showDarken = isGrowing && !fullyGrown;
  const animateGrowth = grewWhileMountedRef.current && !startedFullyGrownRef.current;

  return (
    <>
      {displayImageUrl ? (
        fullyGrown ? (
          <GrownCropImage
            uri={displayImageUrl}
            tileW={tileW}
            tileH={tileH}
            animate={animateGrowth}
          />
        ) : (
          <>
            <SeedImage
              uri={displayImageUrl}
              stableKey={stableKey}
              tileW={tileW}
              tileH={tileH}
            />
            {/* Darken overlay: same image with black tint, conforming to PNG alpha */}
            {showDarken && (
              <CachedImage
                source={{ uri: displayImageUrl }}
                style={{ ...seedImage(tileW, tileH), opacity: 0.25 }}
                resizeMode="contain"
                tintColor="#000"
              />
            )}
          </>
        )
      ) : null}
      {needsWater && !fullyGrown && (
        <NeedsWaterIndicator />
      )}
    </>
  );
}, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.item.itemType === next.item.itemType &&
    prev.item.plantedAt === next.item.plantedAt &&
    prev.item.growthMs === next.item.growthMs &&
    prev.item.watered === next.item.watered &&
    prev.item.imageUrl === next.item.imageUrl &&
    prev.item.tileCols === next.item.tileCols &&
    prev.item.tileRows === next.item.tileRows &&
    prev.isGrowing === next.isGrowing &&
    prev.needsWater === next.needsWater &&
    prev.def === next.def
  );
});

// ─── Main Component ─────────────────────────────────────────────────────────

interface PlacedItemViewProps {
  item: PlacedItem;
  itemDefs?: Record<string, import('./types').ItemDefinition>;
  isSelected?: boolean;
  isMoving?: boolean;
  fenceConnectionMask?: number;
  highlighted?: boolean;
}

export const PlacedItemView = React.memo(function PlacedItemView({
  item,
  itemDefs,
  isSelected,
  isMoving,
  fenceConnectionMask,
  highlighted,
}: PlacedItemViewProps) {
  const { theme } = useTheme();
  if (item.anchorId) return null;

  const def = itemDefs?.[item.itemType];
  const isCrop = !!item.growthMs;
  const isFlat = def?.category === 'flooring' || def?.category === 'tiled_flooring' || def?.category === 'soil';
  const needsWater = isCrop && item.watered === false;
  const isGrowing = !!item.plantedAt && isCrop && item.watered;
  // Trees use placement footprint (tileCols/tileRows) for display; def.cols/rows may be larger (e.g. 4x4 image scaled to 2x2)
  const cols = def?.category === 'tree' ? item.tileCols : (def?.cols ?? item.tileCols);
  const rows = def?.category === 'tree' ? item.tileRows : (def?.rows ?? item.tileRows);
  const isBuilding = def?.category === 'building';
  const centerOverflow = def?.centerOverflow ?? false;
  const { pxW, pxH, footprintH } = itemArtBox(def, item);
  const overflowUp = isBuilding || centerOverflow;
  const buildingRenderer = BUILDING_RENDERERS[item.itemType];

  const selectedStyle = isSelected && !isMoving ? styles.itemSelected : undefined;
  const movingStyle = isMoving ? [styles.itemMoving, { borderColor: theme.colors.primary }] : undefined;
  const highlightStyle = highlighted ? styles.itemHighlighted : undefined;

  // ── Auto-connect fence tile ──
  if (def?.autoConnect && def.directionalImages && fenceConnectionMask != null && fenceConnectionMask >= 0) {
    const { variant, rotation } = FENCE_VARIANT_MAP[fenceConnectionMask] ?? FENCE_VARIANT_MAP[0];
    const imgUrl = def.directionalImages[variant] ?? def.imageUrl;
    return (
      <View
        style={[
          styles.item,
          {
            left: item.col * TILE_SIZE,
            top: item.row * TILE_SIZE,
            width: pxW,
            height: pxH,
            backgroundColor: 'transparent',
            borderWidth: 0,
            overflow: 'hidden',
          },
          selectedStyle,
          movingStyle,
          highlightStyle,
        ]}
      >
        {imgUrl ? (
          <CachedImage
            source={{ uri: imgUrl }}
            style={[styles.itemImage, rotation ? { transform: [{ rotate: `${rotation}deg` }] } : undefined]}
            resizeMode="contain"
          />
        ) : (
          <Text style={styles.emoji}>{item.emoji ?? '🪵'}</Text>
        )}
      </View>
    );
  }

  // ── Tree sapling: 1x1 image centered in 2x2 footprint (reuse seed-style rendering) ──
  const isTreeSapling = def?.category === 'tree' && item.itemType.startsWith('tree_sappling_');
  if (isTreeSapling && (item.imageUrl || def?.imageUrl)) {
    const imgUrl = item.imageUrl || def?.imageUrl;
    const saplingContent = (
      <CachedImage
        source={{ uri: imgUrl! }}
        style={bottomCenterImageStyle(pxW, pxH, 1)}
        resizeMode="contain"
      />
    );
    return (
      <View
        style={[
          styles.item,
          {
            left: item.col * TILE_SIZE,
            top: item.row * TILE_SIZE,
            width: pxW,
            height: pxH,
            backgroundColor: 'transparent',
            borderWidth: 0,
            overflow: 'visible',
          },
          selectedStyle,
          movingStyle,
          highlightStyle,
        ]}
      >
        <TreeShakeWrapper width={pxW} height={pxH} anchorId={item.id}>
          {saplingContent}
        </TreeShakeWrapper>
      </View>
    );
  }
  if (isTreeSapling) {
    const emojiContent = <Text style={styles.emoji}>{item.emoji ?? def?.emoji ?? '🌱'}</Text>;
    return (
      <View
        style={[
          styles.item,
          {
            left: item.col * TILE_SIZE,
            top: item.row * TILE_SIZE,
            width: pxW,
            height: pxH,
            backgroundColor: 'transparent',
            borderWidth: 0,
            overflow: 'visible',
            alignItems: 'center',
            justifyContent: 'center',
          },
          selectedStyle,
          movingStyle,
          highlightStyle,
        ]}
      >
        <TreeShakeWrapper width={pxW} height={pxH} anchorId={item.id}>
          {emojiContent}
        </TreeShakeWrapper>
      </View>
    );
  }

  // ── Fully grown tree: 4x4 image scaled and centered over 2x2 footprint ──
  const isFullyGrownTree = def?.category === 'tree' && item.itemType.startsWith('tree_fully_grown_');
  if (isFullyGrownTree && (item.imageUrl || def?.imageUrl)) {
    const imgUrl = item.imageUrl || def?.imageUrl;
    const footprintW = TILE_SIZE * (item.tileCols ?? 2);
    const footprintH = TILE_SIZE * (item.tileRows ?? 2);
    const imgSize = TILE_SIZE * 4;
    const treeImageStyle = {
      position: 'absolute' as const,
      width: imgSize,
      height: imgSize,
      left: (footprintW - imgSize) / 2,
      top: footprintH - imgSize,
    };
    const fruitCount = Math.min(item.treeFruitCount ?? 0, 3);
    const fruitDef = def?.treeFruit ? itemDefs?.[def.treeFruit] : null;
    const fruitImageUrl = fruitDef?.imageUrl;
    const fruitSize = TILE_SIZE;
    // Tree is 4x4 visually; fruit in canopy (top half), middle above the other two, spread out
    const fruitOffsets = [
      { left: (footprintW - fruitSize) / 2, top: -TILE_SIZE * 1.5 },
      { left: -TILE_SIZE * 0.3, top: -TILE_SIZE * 0.7 },
      { left: footprintW - fruitSize + TILE_SIZE * 0.3, top: -TILE_SIZE * 0.7 },
    ];
    const treeContent = (
      <>
        <CachedImage
          source={{ uri: imgUrl! }}
          style={treeImageStyle}
          resizeMode="contain"
        />
        {fruitImageUrl && fruitCount > 0 && fruitOffsets.slice(0, fruitCount).map((pos, i) => (
          <CachedImage
            key={i}
            source={{ uri: fruitImageUrl }}
            style={{
              position: 'absolute',
              width: fruitSize,
              height: fruitSize,
              left: pos.left,
              top: pos.top,
            }}
            resizeMode="contain"
          />
        ))}
      </>
    );
    return (
      <View
        style={[
          styles.item,
          {
            left: item.col * TILE_SIZE,
            top: item.row * TILE_SIZE,
            width: footprintW,
            height: footprintH,
            backgroundColor: 'transparent',
            borderWidth: 0,
            overflow: 'visible',
          },
          selectedStyle,
          movingStyle,
          highlightStyle,
        ]}
      >
        <TreeShakeWrapper width={footprintW} height={footprintH} anchorId={item.id}>
          {treeContent}
        </TreeShakeWrapper>
      </View>
    );
  }
  if (isFullyGrownTree) {
    const footprintW = TILE_SIZE * (item.tileCols ?? 2);
    const footprintH = TILE_SIZE * (item.tileRows ?? 2);
    const emojiContent = <Text style={styles.emoji}>{item.emoji ?? def?.emoji ?? '🌳'}</Text>;
    return (
      <View
        style={[
          styles.item,
          {
            left: item.col * TILE_SIZE,
            top: item.row * TILE_SIZE,
            width: footprintW,
            height: footprintH,
            backgroundColor: 'transparent',
            borderWidth: 0,
            overflow: 'visible',
            alignItems: 'center',
            justifyContent: 'center',
          },
          selectedStyle,
          movingStyle,
          highlightStyle,
        ]}
      >
        <TreeShakeWrapper width={footprintW} height={footprintH} anchorId={item.id}>
          {emojiContent}
        </TreeShakeWrapper>
      </View>
    );
  }

  // ── Crops: render independently (no soil background) ──
  if (isCrop) {
    return (
      <View
        style={[
          styles.item,
          {
            left: item.col * TILE_SIZE,
            top: item.row * TILE_SIZE,
            width: pxW,
            height: pxH,
            backgroundColor: 'transparent',
            borderWidth: 0,
            overflow: 'visible',
          },
          selectedStyle,
          movingStyle,
          highlightStyle,
        ]}
      >
        <CropVisual
          item={item}
          def={def}
          itemDefs={itemDefs}
          isGrowing={isGrowing ?? false}
          needsWater={needsWater}
        />
      </View>
    );
  }

  // ── Items with image (house, decorations, etc.) ──
  const imgUrl = item.imageUrl || def?.imageUrl;
  if (imgUrl) {
    return (
      <View
        style={[
          styles.item,
          {
            left: item.col * TILE_SIZE,
            top: item.row * TILE_SIZE,
            width: pxW,
            height: overflowUp ? pxH : (isBuilding ? footprintH : pxH),
            backgroundColor: 'transparent',
            borderWidth: 0,
            borderRadius: isFlat || overflowUp ? 0 : 6,
            overflow: 'visible',
          },
          selectedStyle,
          movingStyle,
          highlightStyle,
        ]}
      >
        {overflowUp ? (
          <CachedImage source={{ uri: imgUrl }} style={styles.itemImage} resizeMode="contain" />
        ) : isFlat ? (
          <CachedImage source={{ uri: imgUrl }} style={styles.itemImage} resizeMode="cover" />
        ) : (
          <CachedImage source={{ uri: imgUrl }} style={styles.itemImage} resizeMode="contain" />
        )}
      </View>
    );
  }

  // ── Building renderers (cooking pot, etc.) ──
  if (buildingRenderer) {
    return (
      <View
        style={[
          styles.item,
          {
            left: item.col * TILE_SIZE,
            top: item.row * TILE_SIZE,
            width: pxW,
            height: isBuilding ? footprintH : pxH,
            backgroundColor: 'transparent',
            borderWidth: 0,
            overflow: isBuilding ? 'visible' : 'hidden',
          },
          selectedStyle,
          movingStyle,
          highlightStyle,
        ]}
      >
        {isBuilding ? (
          <View style={[styles.buildingImageWrap, { width: pxW, height: pxH }]}>
            {buildingRenderer(pxW, pxH)}
          </View>
        ) : (
          buildingRenderer(pxW, pxH)
        )}
      </View>
    );
  }

  // ── Default: color box + emoji ──
  return (
    <View
      style={[
        styles.item,
        {
          left: item.col * TILE_SIZE,
          top: item.row * TILE_SIZE,
          width: pxW,
          height: pxH,
          backgroundColor: item.color,
        },
        selectedStyle,
        movingStyle,
        highlightStyle,
      ]}
    >
      {item.emoji ? <Text style={styles.emoji}>{item.emoji}</Text> : null}
    </View>
  );
}, (prev, next) => {
  // Custom comparator: compare item fields individually to avoid
  // re-renders when the item object reference changes but data is identical.
  // With 306 items, this prevents ~305 unnecessary re-renders per water tap.
  return (
    prev.item.id === next.item.id &&
    prev.item.itemType === next.item.itemType &&
    prev.item.col === next.item.col &&
    prev.item.row === next.item.row &&
    prev.item.tileCols === next.item.tileCols &&
    prev.item.tileRows === next.item.tileRows &&
    prev.item.imageUrl === next.item.imageUrl &&
    prev.item.emoji === next.item.emoji &&
    prev.item.color === next.item.color &&
    prev.item.watered === next.item.watered &&
    prev.item.plantedAt === next.item.plantedAt &&
    prev.item.growthMs === next.item.growthMs &&
    prev.item.anchorId === next.item.anchorId &&
    prev.item.treeFruitCount === next.item.treeFruitCount &&
    prev.item.fruitLastHarvestedDate === next.item.fruitLastHarvestedDate &&
    prev.item.clientId === next.item.clientId &&
    prev.isSelected === next.isSelected &&
    prev.isMoving === next.isMoving &&
    prev.fenceConnectionMask === next.fenceConnectionMask &&
    prev.highlighted === next.highlighted &&
    prev.itemDefs === next.itemDefs
  );
});
