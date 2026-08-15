import { CachedImage } from '@/components/ui/CachedImage';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { TILE_SIZE } from '../constants';
import { getAllPlacedItems, getItemAt, resolveAnchor } from '../gridHelpers';
import { BugInstance } from '../creature';
import { LivePlacementSprite } from '../LivePlacementSprite';
import { QuestBubble, getQuestStatusForNpc } from '../multiplayer/QuestBubble';
import { placementDepth } from '../placementRect';
import { PlacedItemView } from '../PlacedItemView';
import { TreeShakeProvider, type TreeShakeState } from '../treeShake';
import type { ActiveBug, GridData, ItemDefinition, PlacedItem, QuestHighlight, QuestProgress, ScenePlacement } from '../types';
import { applyCategoryDepth } from './depth';
import { WorldItem, type DragPreview, type DropZoneLayout } from './WorldItem';

const FOOD_OVERLAY_SIZE = Math.round(TILE_SIZE * 0.75);
/** Lifts the food icon clear of the dish sprite. */
const FOOD_OVERLAY_LIFT = 20;

/** Quest targets naming an interaction rather than a specific item type. */
const INTERACTION_HIGHLIGHT_TARGETS = ['sell_box', 'cooking_pot', 'food_dish', 'crafting'];

interface Renderable {
  depth: number;
  element: React.ReactElement;
}

interface WorldItemsLayerProps {
  activeGrid: GridData;
  itemDefs: Record<string, ItemDefinition>;
  foodDishQueues: Record<string, string[]> | undefined;
  selectedAnchorId: string | null;
  movingItemId: string | null;
  editMode: boolean;
  activeHighlight: QuestHighlight | null;
  quests: QuestProgress[];
  /** Soil anchors that already have a crop on them, so they can't be dragged. */
  soilWithCropsIds: Set<string>;
  /** Anchor whose move is awaiting server confirmation, if any. */
  pendingDropAnchorId: string | null;
  dropZoneLayout: DropZoneLayout | null;
  /** Camera zoom, so dragging an item tracks the finger at any scale. */
  cameraScale: SharedValue<number>;
  onMoveEnd: (anchorId: string, col: number, row: number) => boolean;
  onStore: (anchorId: string) => void;
  onDragPreview: (preview: DragPreview | null) => void;
  treeShake: TreeShakeState;
  petElement: React.ReactElement;
  /** Pet's current row, used for depth only. */
  petRow: number;
  /** Scene placements marked live — drawn here so pets can walk behind them. */
  liveScenePlacements?: ScenePlacement[];
  /** World → farm origin offset (pixels); live placements are in world space. */
  farmOffsetX?: number;
  farmOffsetY?: number;
  activeBugs: ActiveBug[];
  bugPositions: Record<string, { col: number; row: number }>;
  onBugPositionChange: (spawnId: string, col: number, row: number) => void;
  darkness: number;
}

/** Bitmask of matching neighbours, for items that connect to themselves (fences). */
function getFenceMask(grid: GridData, item: PlacedItem): number {
  let mask = 0;
  if (getItemAt(grid, item.col, item.row - 1)?.itemType === item.itemType) mask |= 1;
  if (getItemAt(grid, item.col + 1, item.row)?.itemType === item.itemType) mask |= 2;
  if (getItemAt(grid, item.col, item.row + 1)?.itemType === item.itemType) mask |= 4;
  if (getItemAt(grid, item.col - 1, item.row)?.itemType === item.itemType) mask |= 8;
  return mask;
}

function isQuestHighlighted(
  item: PlacedItem,
  def: ItemDefinition | undefined,
  highlight: QuestHighlight | null,
): boolean {
  if (highlight?.type !== 'world_item') return false;
  if (highlight.target === item.itemType) return true;
  if (!INTERACTION_HIGHLIGHT_TARGETS.includes(highlight.target)) return false;
  const payload = highlight.target === 'cooking_pot' ? 'cooking' : highlight.target;
  return def?.interactAction?.payload === payload;
}

function FoodDishOverlay({ def }: { def: ItemDefinition }) {
  if (def.imageUrl) {
    return (
      <CachedImage
        source={{ uri: def.imageUrl }}
        style={{ width: FOOD_OVERLAY_SIZE, height: FOOD_OVERLAY_SIZE }}
        resizeMode="contain"
      />
    );
  }
  return <Text style={{ fontSize: FOOD_OVERLAY_SIZE * 0.8 }}>{def.emoji ?? '🍽'}</Text>;
}

/**
 * Everything that lives inside the world and needs depth sorting: placed items,
 * the pet, and bugs.
 *
 * Items are built separately from creatures so that the pet walking or a bug
 * flying only re-sorts the list — it never rebuilds the ~180 item elements.
 */
export const WorldItemsLayer = React.memo(function WorldItemsLayer({
  activeGrid,
  itemDefs,
  foodDishQueues,
  selectedAnchorId,
  movingItemId,
  editMode,
  activeHighlight,
  quests,
  soilWithCropsIds,
  pendingDropAnchorId,
  dropZoneLayout,
  cameraScale,
  onMoveEnd,
  onStore,
  onDragPreview,
  treeShake,
  petElement,
  petRow,
  liveScenePlacements,
  farmOffsetX = 0,
  farmOffsetY = 0,
  activeBugs,
  bugPositions,
  onBugPositionChange,
  darkness,
}: WorldItemsLayerProps) {
  const itemRenderables = useMemo(() => {
    const list: Renderable[] = [];

    if (liveScenePlacements?.length) {
      const farmOffsetRows = farmOffsetY / TILE_SIZE;
      for (const p of liveScenePlacements) {
        const def = itemDefs[p.itemType];
        if (!def?.imageUrl && !def?.emoji) continue;
        const depth = placementDepth(p, def) - farmOffsetRows;
        list.push({
          depth,
          element: (
            <LivePlacementSprite
              key={`live-scene-${p.id}`}
              placement={p}
              def={def}
              offsetX={farmOffsetX}
              offsetY={farmOffsetY}
            />
          ),
        });
      }
    }

    // Guard against corrupt snapshots with duplicate placed-item ids/clientIds
    // (e.g. ground-pickup spawn doubling tiles) — React keys must stay unique.
    const seenKeys = new Set<string>();

    for (const item of getAllPlacedItems(activeGrid)) {
      if (item.anchorId) continue;

      const anchorId = item.id;
      const key = item.clientId ?? anchorId;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const def = itemDefs[item.itemType];
      const anchor = resolveAnchor(activeGrid, item) ?? item;
      const baseDepth = anchor.row + anchor.tileRows - 1;
      const isCrop = !!item.growthMs;
      const isSelected = anchorId === selectedAnchorId && !movingItemId;
      const isMoving = anchorId === movingItemId;
      const fenceMask = def?.autoConnect ? getFenceMask(activeGrid, item) : undefined;
      const highlighted = isQuestHighlighted(item, def, activeHighlight);

      // Crops skip the drag wrapper entirely: they're planted, not placed, and
      // they draw at their own grid position.
      if (isCrop) {
        list.push({
          depth: applyCategoryDepth(baseDepth, def),
          element: (
            <PlacedItemView
              key={key}
              item={item}
              itemDefs={itemDefs}
              isSelected={isSelected}
              isMoving={isMoving}
              fenceConnectionMask={fenceMask}
              highlighted={highlighted}
            />
          ),
        });
      } else {
        const isDigHole = item.itemType === 'fossil_hole' || def?.subCategory === 'dig_hole';
        const isGroundPickup =
          item.itemType === 'stone' ||
          item.itemType === 'stick' ||
          def?.subCategory === 'ground_pickup';
        const hasCrops = def?.category === 'soil' && soilWithCropsIds.has(anchorId);
        list.push({
          depth: applyCategoryDepth(baseDepth, def),
          element: (
            <WorldItem
              key={key}
              item={item}
              itemDefs={itemDefs}
              isSelected={isSelected}
              isMoving={isMoving}
              fenceConnectionMask={fenceMask}
              highlighted={highlighted}
              gridCols={activeGrid.cols}
              gridRows={activeGrid.rows}
              cameraScale={cameraScale}
              draggable={editMode && !hasCrops && !isDigHole && !isGroundPickup && def?.category !== 'npc'}
              isPendingDrop={pendingDropAnchorId === anchorId}
              dropZoneLayout={dropZoneLayout}
              onMoveEnd={onMoveEnd}
              onStore={onStore}
              onDragPreview={onDragPreview}
            />
          ),
        });
      }

      if (def?.category === 'npc') {
        const status = getQuestStatusForNpc(item.itemType, quests);
        if (status) {
          list.push({
            depth: baseDepth + 1,
            element: (
              <QuestBubble
                key={`quest-bubble-${anchorId}`}
                status={status}
                itemDefs={itemDefs}
                centerX={(item.col + item.tileCols / 2) * TILE_SIZE}
                topY={item.row * TILE_SIZE}
              />
            ),
          });
        }
      }

      const nextFoodType = def?.interactAction?.payload === 'food_dish'
        ? foodDishQueues?.[anchorId]?.[0]
        : undefined;
      const foodDef = nextFoodType ? itemDefs[nextFoodType] : undefined;
      if (foodDef) {
        const centerX = (item.col + item.tileCols / 2) * TILE_SIZE;
        const centerY = (item.row + item.tileRows / 2) * TILE_SIZE;
        list.push({
          depth: baseDepth + 1,
          element: (
            <View
              key={`food-overlay-${anchorId}`}
              style={{
                position: 'absolute',
                left: centerX - FOOD_OVERLAY_SIZE / 2,
                top: centerY - FOOD_OVERLAY_SIZE / 2 - FOOD_OVERLAY_LIFT,
                width: FOOD_OVERLAY_SIZE,
                height: FOOD_OVERLAY_SIZE,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              pointerEvents="none"
            >
              <FoodDishOverlay def={foodDef} />
            </View>
          ),
        });
      }
    }

    list.sort((a, b) => a.depth - b.depth);
    return list;
  }, [
    activeGrid, itemDefs, foodDishQueues, selectedAnchorId, movingItemId, editMode,
    activeHighlight, quests, soilWithCropsIds, pendingDropAnchorId,
    dropZoneLayout, cameraScale, onMoveEnd, onStore, onDragPreview,
    liveScenePlacements, farmOffsetX, farmOffsetY,
  ]);

  // Pet first so it draws behind bugs sharing its row, matching the old order.
  const creatureRenderables = useMemo<Renderable[]>(() => [
    { depth: petRow, element: petElement },
    ...activeBugs.map((bug) => {
      const pos = bugPositions[bug.spawnId] ?? bug;
      const def = itemDefs[bug.itemType];
      return {
        depth: pos.row,
        element: (
          <BugInstance
            key={bug.spawnId}
            bug={bug}
            cols={activeGrid.cols}
            rows={activeGrid.rows}
            imageUrl={def?.imageUrl}
            onPositionChange={onBugPositionChange}
            lightRadius={def?.lightRadius}
            lightColor={def?.lightColor}
            lightIntensity={def?.lightIntensity}
            darkness={darkness}
            activeGrid={activeGrid}
            itemDefs={itemDefs}
          />
        ),
      };
    }),
  ].sort((a, b) => a.depth - b.depth),
  [petElement, petRow, activeBugs, bugPositions, itemDefs, activeGrid, onBugPositionChange, darkness]);

  // Merging two already-sorted lists is what keeps creature movement off the
  // item list: a bug flying past never touches the item elements. Items win ties
  // so creatures pass behind anything standing on the same row.
  const elements = useMemo(() => {
    const merged: React.ReactElement[] = [];
    let i = 0;
    let j = 0;
    while (i < itemRenderables.length && j < creatureRenderables.length) {
      if (itemRenderables[i].depth <= creatureRenderables[j].depth) merged.push(itemRenderables[i++].element);
      else merged.push(creatureRenderables[j++].element);
    }
    while (i < itemRenderables.length) merged.push(itemRenderables[i++].element);
    while (j < creatureRenderables.length) merged.push(creatureRenderables[j++].element);
    return merged;
  }, [itemRenderables, creatureRenderables]);

  return <TreeShakeProvider value={treeShake}>{elements}</TreeShakeProvider>;
});
