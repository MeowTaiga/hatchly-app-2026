import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  Alert, Dimensions, Keyboard, ScrollView,
} from 'react-native';
import Animated, { useAnimatedStyle, runOnJS, useAnimatedReaction } from 'react-native-reanimated';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import {
  useSharedValue, withDecay, cancelAnimation, clamp, runOnUI,
} from 'react-native-reanimated';
import { CachedImage } from '@/components/ui/CachedImage';
import type { SearchableItem } from '@/components/ui/ItemSearchDropdown';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api, type AdminScene, type AdminScenePlacement, type AdminGameItem } from '@/lib/api';
import { useTheme } from '@/store/ThemeProvider';
import { TILE_SIZE } from '@/game/constants';
import Svg, { Rect } from 'react-native-svg';
import { AdminBottomBar } from '@/components/admin-scene-editor';
import { TileToolsPanel } from '@/components/admin-scene-editor/TileToolsPanel';
import { SettingsPanel } from '@/components/admin-scene-editor/SettingsPanel';
import type { AppDrawerRef } from '@/components/ui/AppDrawer';

const EDITOR_MIN_ZOOM = 0.15;
const EDITOR_MAX_ZOOM = 3;
const EDITOR_DEFAULT_ZOOM = 0.6;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const VIEWPORT_SYNC_THROTTLE_MS = 60;
const VIEWPORT_PADDING = 10 * TILE_SIZE;
const VIEWPORT_QUANTUM = 2 * TILE_SIZE; // ~96px; reduces bridge crossings from 60/sec to ~5-15/sec
const EDITOR_GRID_ZOOM_THRESHOLD = 0.5;

const DEFAULT_TREE_TYPES = ['scenery_tree_oak', 'scenery_tree_pine', 'scenery_tree_birch'];
const DEFAULT_SMALL_DECO = ['scenery_bush_large', 'scenery_bush_small', 'scenery_rock_small', 'scenery_flowers', 'scenery_mushroom', 'scenery_stump'];
const DEFAULT_OUTER_BUSH = 'scenery_bush_large';
const DEFAULT_LARGE_ROCK = 'scenery_rock_large';

function toSearchable(items: AdminGameItem[]): SearchableItem[] {
  return items.map((d) => ({ key: d.itemType, label: d.label, imageUrl: d.imageUrl }));
}

function uid() {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function rectIntersects(
  viewLeft: number, viewTop: number, viewRight: number, viewBottom: number,
  itemLeft: number, itemTop: number, itemRight: number, itemBottom: number,
): boolean {
  return !(itemRight < viewLeft || itemLeft > viewRight || itemBottom < viewTop || itemTop > viewBottom);
}

/** Compute depth matching the backend bake's computeDepth + bakeScene logic. */
function computeDepth(p: AdminScenePlacement, def: AdminGameItem | undefined): number {
  const baseH = (def?.rows ?? 1) * TILE_SIZE;
  const yBottom = p.y + baseH;
  const baseDepth = yBottom / TILE_SIZE;
  const cat = def?.category;
  const isTable = def?.subCategory === 'table';
  let depth = baseDepth;
  if (cat === 'flooring' || cat === 'tiled_flooring') depth = -1e6 + baseDepth;
  else if (cat === 'soil') depth = -5e5 + baseDepth;
  else if (isTable) depth = baseDepth - 1000;
  return depth + (p.depthOffset ?? 0);
}

// ─── Memoized Grid Lines (visible-rect culling for performance) ───────────────

interface EditorGridProps {
  cols: number;
  rows: number;
  worldW: number;
  worldH: number;
  /** When provided, only render lines intersecting this rect to reduce lag. */
  visibleRect?: { left: number; top: number; right: number; bottom: number } | null;
}

const EditorGrid = React.memo(function EditorGrid({
  cols, rows, worldW, worldH, visibleRect,
}: EditorGridProps) {
  const { vLines, hLines } = useMemo(() => {
    let colMin = 0;
    let colMax = cols;
    let rowMin = 0;
    let rowMax = rows;

    if (visibleRect) {
      colMin = Math.max(0, Math.floor(visibleRect.left / TILE_SIZE));
      colMax = Math.min(cols, Math.ceil(visibleRect.right / TILE_SIZE));
      rowMin = Math.max(0, Math.floor(visibleRect.top / TILE_SIZE));
      rowMax = Math.min(rows, Math.ceil(visibleRect.bottom / TILE_SIZE));
    }

    const v: React.ReactElement[] = [];
    for (let i = colMin; i <= colMax; i++) {
      v.push(
        <View key={`v${i}`} style={{ position: 'absolute', left: i * TILE_SIZE, top: 0, width: 1, height: worldH, backgroundColor: 'rgba(0,0,0,0.06)' }} />,
      );
    }
    const h: React.ReactElement[] = [];
    for (let i = rowMin; i <= rowMax; i++) {
      h.push(
        <View key={`h${i}`} style={{ position: 'absolute', left: 0, top: i * TILE_SIZE, width: worldW, height: 1, backgroundColor: 'rgba(0,0,0,0.06)' }} />,
      );
    }
    return { vLines: v, hLines: h };
  }, [cols, rows, worldW, worldH, visibleRect]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {vLines}
      {hLines}
    </View>
  );
});

/** Batched SVG overlay for unwalkable/fishing tiles — single draw call vs hundreds of Views. */
const TileOverlays = React.memo(function TileOverlays({
  worldW,
  worldH,
  unwalkableTiles,
  fishingTiles,
}: {
  worldW: number;
  worldH: number;
  unwalkableTiles: Array<{ col: number; row: number }>;
  fishingTiles: Array<{ col: number; row: number; spotType?: string }>;
}) {
  if (unwalkableTiles.length === 0 && fishingTiles.length === 0) return null;
  return (
    <Svg width={worldW} height={worldH} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
      {unwalkableTiles.map(({ col, row }) => (
        <Rect
          key={`uw-${col}-${row}`}
          x={col * TILE_SIZE}
          y={row * TILE_SIZE}
          width={TILE_SIZE}
          height={TILE_SIZE}
          fill="rgba(239,68,68,0.35)"
          stroke="rgba(239,68,68,0.6)"
          strokeWidth={1}
        />
      ))}
      {fishingTiles.map(({ col, row }) => (
        <Rect
          key={`fish-${col}-${row}`}
          x={col * TILE_SIZE}
          y={row * TILE_SIZE}
          width={TILE_SIZE}
          height={TILE_SIZE}
          fill="rgba(34,197,94,0.35)"
          stroke="rgba(34,197,94,0.6)"
          strokeWidth={1}
        />
      ))}
    </Svg>
  );
});

// ─── Scene Editor ────────────────────────────────────────────────────────────

export default function AdminSceneEditorScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors } = theme;

  const [scene, setScene] = useState<AdminScene | null>(null);
  const [itemDefs, setItemDefs] = useState<Record<string, AdminGameItem>>({});
  const [placements, setPlacements] = useState<AdminScenePlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<string | null>(null);
  const [loadingPrecompute, setLoadingPrecompute] = useState(false);
  const [showProceduralOptions, setShowProceduralOptions] = useState(false);
  const [proceduralOverrides, setProceduralOverrides] = useState<{
    outerBushType?: string;
    treeTypes?: string[];
  }>({});

  const [editCols, setEditCols] = useState('40');
  const [editRows, setEditRows] = useState('48');
  const [editFarmCols, setEditFarmCols] = useState('16');
  const [editFarmRows, setEditFarmRows] = useState('24');
  const [editBgColor, setEditBgColor] = useState('#7EC87E');
  const [editTiledFlooringItemType, setEditTiledFlooringItemType] = useState<string | null>(null);
  const [editGrassNoise, setEditGrassNoise] = useState('0.04');
  const [unwalkableTiles, setUnwalkableTiles] = useState<Array<{ col: number; row: number }>>([]);
  const [paintUnwalkableMode, setPaintUnwalkableMode] = useState(false);
  const [fishingTiles, setFishingTiles] = useState<Array<{ col: number; row: number; spotType?: string }>>([]);
  const [paintFishingMode, setPaintFishingMode] = useState(false);
  const [selectedSpotType, setSelectedSpotType] = useState('general');
  const [setSpawnMode, setSetSpawnMode] = useState(false);
  const [spawnPoint, setSpawnPoint] = useState<{ x: number; y: number } | null>(null);

  const [paletteDragAsset, setPaletteDragAsset] = useState<{
    itemType: string; def: AdminGameItem;
  } | null>(null);

  const [visibleRect, setVisibleRect] = useState<{
    left: number; top: number; right: number; bottom: number; scale?: number;
  } | null>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [areaSelectMode, setAreaSelectMode] = useState(false);
  const [multiSelectedIds, setMultiSelectedIds] = useState<Set<string>>(new Set());

  const dragOffsetX = useSharedValue(0);
  const dragOffsetY = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const dragStartY = useSharedValue(0);

  const palettePreviewX = useSharedValue(0);
  const palettePreviewY = useSharedValue(0);

  /** When true, skip viewport sync entirely — no culling benefit, eliminates runOnJS during pan. */
  const needsCulling = useMemo(
    () => placements.length > 0 || unwalkableTiles.length > 0 || fishingTiles.length > 0,
    [placements.length, unwalkableTiles.length, fishingTiles.length],
  );
  const needsCullingShared = useSharedValue(needsCulling);
  useEffect(() => {
    needsCullingShared.value = needsCulling;
  }, [needsCulling, needsCullingShared]);

  /** Skip runOnJS during active pan/pinch (like WorldRenderer). */
  const isPanning = useSharedValue(false);

  const [selectionRect, setSelectionRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [paintSelectionRect, setPaintSelectionRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // ── Data Loading ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const [sceneData, items] = await Promise.all([
          api.getAdminScene(slug),
          api.getGameItems(),
        ]);
        setScene(sceneData);
        setPlacements(sceneData.placements);
        setEditCols(String(sceneData.cols));
        setEditRows(String(sceneData.rows));
        setEditFarmCols(String(sceneData.farmCols));
        setEditFarmRows(String(sceneData.farmRows));
        setEditBgColor(sceneData.bgColor || '#7EC87E');
        setEditTiledFlooringItemType(sceneData.tiledFlooringItemType ?? null);
        setEditGrassNoise(String(sceneData.grassNoiseStrength ?? 0.04));
        setUnwalkableTiles(sceneData.unwalkableTiles ?? []);
        setFishingTiles(sceneData.fishingTiles ?? []);
        if (sceneData.spawnX != null && sceneData.spawnY != null) {
          setSpawnPoint({ x: sceneData.spawnX, y: sceneData.spawnY });
        }
        const map: Record<string, AdminGameItem> = {};
        for (const it of items) map[it.itemType] = it;
        setItemDefs(map);
      } catch (err: any) {
        Alert.alert('Error', err.message ?? 'Failed to load scene');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const refetchItems = useCallback(async () => {
    try {
      const items = await api.getGameItems();
      const map: Record<string, AdminGameItem> = {};
      for (const it of items) map[it.itemType] = it;
      setItemDefs(map);
    } catch (_) {
      // Silently fail; itemDefs unchanged
    }
  }, []);

  // ── Derived dimensions ──────────────────────────────────────────────────

  const sceneCols = scene?.cols ?? 40;
  const sceneRows = scene?.rows ?? 48;
  const worldW = sceneCols * TILE_SIZE;
  const worldH = sceneRows * TILE_SIZE;

  // ── Camera (no clamping — free pan in editor) ───────────────────────────

  const minZoom = Math.min(EDITOR_MIN_ZOOM, SCREEN_W / worldW, SCREEN_H / worldH);
  const initScale = Math.max(EDITOR_DEFAULT_ZOOM, minZoom);

  const translateX = useSharedValue((SCREEN_W - worldW * initScale) / 2);
  const translateY = useSharedValue((SCREEN_H - worldH * initScale) / 2);
  const scale = useSharedValue(initScale);
  const startTX = useSharedValue(0);
  const startTY = useSharedValue(0);
  const startScale = useSharedValue(initScale);
  const isPinching = useSharedValue(false);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);
  /** Focal point only valid in ACTIVE; capture on first onUpdate (Android fix). */
  const focalCaptured = useSharedValue(false);
  const worldCenterX = useSharedValue(worldW / 2);
  const worldCenterY = useSharedValue(worldH / 2);
  useEffect(() => {
    worldCenterX.value = worldW / 2;
    worldCenterY.value = worldH / 2;
  }, [worldW, worldH]);

  const pan = useMemo(() => Gesture.Pan()
    .enabled(!areaSelectMode && !paintUnwalkableMode && !paintFishingMode)
    .minPointers(1).maxPointers(2)
    .onStart(() => {
      'worklet';
      isPanning.value = true;
      cancelAnimation(translateX); cancelAnimation(translateY);
      startTX.value = translateX.value; startTY.value = translateY.value;
    })
    .onUpdate((e) => {
      'worklet';
      if (isPinching.value) return;
      translateX.value = startTX.value + e.translationX;
      translateY.value = startTY.value + e.translationY;
    })
    .onEnd((e) => {
      'worklet';
      isPanning.value = false;
      if (isPinching.value) return;
      translateX.value = withDecay({ velocity: e.velocityX });
      translateY.value = withDecay({ velocity: e.velocityY });
    }), [areaSelectMode, paintUnwalkableMode, paintFishingMode, isPanning]);

  const pinch = useMemo(() => Gesture.Pinch()
    .onStart(() => {
      'worklet';
      isPanning.value = true;
      focalCaptured.value = false;
      cancelAnimation(translateX); cancelAnimation(translateY);
      isPinching.value = true; startScale.value = scale.value;
      startTX.value = translateX.value; startTY.value = translateY.value;
    })
    .onUpdate((e) => {
      'worklet';
      if (!focalCaptured.value) {
        focalX.value = e.focalX;
        focalY.value = e.focalY;
        focalCaptured.value = true;
      }
      const ns = clamp(startScale.value * e.scale, minZoom, EDITOR_MAX_ZOOM);
      const ratio = ns / startScale.value;
      translateX.value = focalX.value - ratio * (focalX.value - startTX.value);
      translateY.value = focalY.value - ratio * (focalY.value - startTY.value);
      scale.value = ns;
    })
    .onEnd(() => {
      'worklet';
      isPanning.value = false;
      isPinching.value = false;
      startTX.value = translateX.value;
      startTY.value = translateY.value;
    }), [minZoom, isPanning, focalCaptured]);

  /** Screen-to-world: matches MultiplayerScene (transformOrigin left top) so fishing tiles align in-game. */
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const s = scale.value;
    const tx = translateX.value;
    const ty = translateY.value;
    return {
      x: (screenX - tx) / s,
      y: (screenY - ty) / s,
    };
  }, [scale, translateX, translateY]);

  const handleTileToggleUnwalkable = useCallback((screenX: number, screenY: number) => {
    const { x: worldX, y: worldY } = screenToWorld(screenX, screenY);
    const col = Math.floor(worldX / TILE_SIZE);
    const row = Math.floor(worldY / TILE_SIZE);
    const sceneColsVal = (parseInt(editCols) || scene?.cols) ?? 40;
    const sceneRowsVal = (parseInt(editRows) || scene?.rows) ?? 48;
    if (col < 0 || row < 0 || col >= sceneColsVal || row >= sceneRowsVal) return;
    setUnwalkableTiles((prev) => {
      const has = prev.some((t) => t.col === col && t.row === row);
      if (has) return prev.filter((t) => !(t.col === col && t.row === row));
      return [...prev, { col, row }];
    });
  }, [screenToWorld, editCols, editRows, scene]);

  const handleTileToggleFishing = useCallback((screenX: number, screenY: number) => {
    const { x: worldX, y: worldY } = screenToWorld(screenX, screenY);
    const col = Math.floor(worldX / TILE_SIZE);
    const row = Math.floor(worldY / TILE_SIZE);
    const sceneColsVal = (parseInt(editCols) || scene?.cols) ?? 40;
    const sceneRowsVal = (parseInt(editRows) || scene?.rows) ?? 48;
    if (col < 0 || row < 0 || col >= sceneColsVal || row >= sceneRowsVal) return;
    setFishingTiles((prev) => {
      const has = prev.some((t) => t.col === col && t.row === row);
      if (has) return prev.filter((t) => !(t.col === col && t.row === row));
      return [...prev, { col, row, spotType: selectedSpotType }];
    });
  }, [screenToWorld, editCols, editRows, scene, selectedSpotType]);

  const handleTap = useCallback((screenX: number, screenY: number) => {
    if (areaSelectMode) {
      setMultiSelectedIds(new Set());
      setSelectionRect(null);
      return;
    }
    if (paintUnwalkableMode) {
      handleTileToggleUnwalkable(screenX, screenY);
      return;
    }
    if (paintFishingMode) {
      handleTileToggleFishing(screenX, screenY);
      return;
    }
    if (setSpawnMode) {
      const { x: worldX, y: worldY } = screenToWorld(screenX, screenY);
      setSpawnPoint({ x: Math.round(worldX), y: Math.round(worldY) });
      setSetSpawnMode(false);
      return;
    }
    if (!scene || !selectedItemType) return;
    const def = itemDefs[selectedItemType];
    if (!def) return;
    const { x: worldX, y: worldY } = screenToWorld(screenX, screenY);
    setPlacements((prev) => [...prev, {
      id: uid(), itemType: selectedItemType,
      x: worldX - (def.cols * TILE_SIZE) / 2,
      y: worldY - (def.rows * TILE_SIZE) / 2,
      scale: 1,
      rotationDegrees: 0,
    }]);
  }, [scene, selectedItemType, itemDefs, screenToWorld, areaSelectMode, paintUnwalkableMode, paintFishingMode, setSpawnMode, handleTileToggleUnwalkable, handleTileToggleFishing]);

  const areaSelectRectRef = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const areaUpdateLastRef = useRef(0);
  const handleAreaSelectStart = useCallback((screenX: number, screenY: number) => {
    const { x, y } = screenToWorld(screenX, screenY);
    const rect = { x1: x, y1: y, x2: x, y2: y };
    areaSelectRectRef.current = rect;
    setSelectionRect(rect);
    setMultiSelectedIds(new Set());
  }, [screenToWorld]);

  const handleAreaSelectUpdate = useCallback((screenX: number, screenY: number) => {
    const { x, y } = screenToWorld(screenX, screenY);
    const prev = areaSelectRectRef.current;
    if (!prev) return;
    const next = { ...prev, x2: x, y2: y };
    areaSelectRectRef.current = next;
    const now = Date.now();
    if (now - areaUpdateLastRef.current >= 16) {
      areaUpdateLastRef.current = now;
      setSelectionRect(next);
    }
  }, [screenToWorld]);

  const handleAreaSelectEnd = useCallback(() => {
    const rect = areaSelectRectRef.current;
    areaSelectRectRef.current = null;
    setSelectionRect(null);
    if (!rect) return;
    const rLeft = Math.min(rect.x1, rect.x2);
    const rRight = Math.max(rect.x1, rect.x2);
    const rTop = Math.min(rect.y1, rect.y2);
    const rBottom = Math.max(rect.y1, rect.y2);
    const ids = new Set<string>();
    for (const p of placements) {
      const def = itemDefs[p.itemType];
      const baseW = (def?.cols ?? 1) * TILE_SIZE;
      const baseH = (def?.rows ?? 1) * TILE_SIZE;
      const w = baseW * p.scale;
      const h = baseH * p.scale;
      const rx = p.x + (baseW - w) / 2;
      const ry = p.y + (baseH - h);
      const cx = rx + w / 2;
      const cy = ry + h / 2;
      if (cx >= rLeft && cx <= rRight && cy >= rTop && cy <= rBottom) {
        ids.add(p.id);
      }
    }
    setMultiSelectedIds(ids);
  }, [placements, itemDefs]);

  const handleMassDelete = useCallback(() => {
    if (multiSelectedIds.size === 0) return;
    Alert.alert(
      'Delete Items',
      `Delete ${multiSelectedIds.size} selected items?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setPlacements((prev) => prev.filter((p) => !multiSelectedIds.has(p.id)));
            setMultiSelectedIds(new Set());
            setSelectionRect(null);
          },
        },
      ],
    );
  }, [multiSelectedIds]);

  const paintAreaRectRef = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const dragActiveRef = useRef(false);
  const settingsDrawerRef = useRef<AppDrawerRef>(null);
  const tileToolsDrawerRef = useRef<AppDrawerRef>(null);

  const handlePaintAreaStart = useCallback((screenX: number, screenY: number) => {
    const { x, y } = screenToWorld(screenX, screenY);
    const rect = { x1: x, y1: y, x2: x, y2: y };
    paintAreaRectRef.current = rect;
    setPaintSelectionRect(rect);
  }, [screenToWorld]);

  const paintUpdateLastRef = useRef(0);
  const handlePaintAreaUpdate = useCallback((screenX: number, screenY: number) => {
    const { x, y } = screenToWorld(screenX, screenY);
    const prev = paintAreaRectRef.current;
    if (prev) {
      const next = { ...prev, x2: x, y2: y };
      paintAreaRectRef.current = next;
      const now = Date.now();
      if (now - paintUpdateLastRef.current >= 16) {
        paintUpdateLastRef.current = now;
        setPaintSelectionRect(next);
      }
    }
  }, [screenToWorld]);

  const handlePaintAreaEnd = useCallback(() => {
    const rect = paintAreaRectRef.current;
    paintAreaRectRef.current = null;
    setPaintSelectionRect(null);
    if (!rect) return;
    const rLeft = Math.min(rect.x1, rect.x2);
    const rRight = Math.max(rect.x1, rect.x2);
    const rTop = Math.min(rect.y1, rect.y2);
    const rBottom = Math.max(rect.y1, rect.y2);
    const sceneColsVal = (parseInt(editCols) || scene?.cols) ?? 40;
    const sceneRowsVal = (parseInt(editRows) || scene?.rows) ?? 48;
    const colMin = Math.max(0, Math.floor(rLeft / TILE_SIZE));
    const colMax = Math.min(sceneColsVal - 1, Math.floor(rRight / TILE_SIZE));
    const rowMin = Math.max(0, Math.floor(rTop / TILE_SIZE));
    const rowMax = Math.min(sceneRowsVal - 1, Math.floor(rBottom / TILE_SIZE));
    const tilesInRect: { col: number; row: number }[] = [];
    for (let col = colMin; col <= colMax; col++) {
      for (let row = rowMin; row <= rowMax; row++) {
        tilesInRect.push({ col, row });
      }
    }
    if (paintUnwalkableMode) {
      setUnwalkableTiles((prev) => {
        const prevSet = new Set(prev.map((t) => `${t.col},${t.row}`));
        const next: { col: number; row: number }[] = [];
        for (const t of prev) {
          const inRect = tilesInRect.some((r) => r.col === t.col && r.row === t.row);
          if (!inRect) next.push(t);
        }
        for (const t of tilesInRect) {
          if (!prevSet.has(`${t.col},${t.row}`)) next.push(t);
        }
        return next;
      });
    } else if (paintFishingMode) {
      setFishingTiles((prev) => {
        const prevSet = new Set(prev.map((t) => `${t.col},${t.row}`));
        const next: Array<{ col: number; row: number; spotType?: string }> = [];
        for (const t of prev) {
          const inRect = tilesInRect.some((r) => r.col === t.col && r.row === t.row);
          if (!inRect) next.push(t);
        }
        for (const t of tilesInRect) {
          if (!prevSet.has(`${t.col},${t.row}`)) next.push({ ...t, spotType: selectedSpotType });
        }
        return next;
      });
    }
  }, [editCols, editRows, scene, paintUnwalkableMode, paintFishingMode, selectedSpotType]);

  const areaPan = useMemo(() => Gesture.Pan()
    .enabled(areaSelectMode)
    .minDistance(8)
    .onStart((e) => { 'worklet'; runOnJS(handleAreaSelectStart)(e.absoluteX, e.absoluteY); })
    .onUpdate((e) => { 'worklet'; runOnJS(handleAreaSelectUpdate)(e.absoluteX, e.absoluteY); })
    .onEnd(() => { 'worklet'; runOnJS(handleAreaSelectEnd)(); }), [areaSelectMode, handleAreaSelectStart, handleAreaSelectUpdate, handleAreaSelectEnd]);

  const paintAreaPan = useMemo(() => Gesture.Pan()
    .enabled(paintUnwalkableMode || paintFishingMode)
    .minDistance(8)
    .onStart((e) => { 'worklet'; runOnJS(handlePaintAreaStart)(e.absoluteX, e.absoluteY); })
    .onUpdate((e) => { 'worklet'; runOnJS(handlePaintAreaUpdate)(e.absoluteX, e.absoluteY); })
    .onEnd(() => { 'worklet'; runOnJS(handlePaintAreaEnd)(); }), [paintUnwalkableMode, paintFishingMode, handlePaintAreaStart, handlePaintAreaUpdate, handlePaintAreaEnd]);

  const tapGesture = useMemo(() => Gesture.Tap()
    .maxDuration(250)
    .onEnd((e) => { 'worklet'; runOnJS(handleTap)(e.absoluteX, e.absoluteY); }), [handleTap]);

  const gesture = useMemo(() => {
    const cameraPanPinch = Gesture.Simultaneous(pan, pinch);
    if (areaSelectMode) return Gesture.Race(areaPan, tapGesture);
    if (paintUnwalkableMode || paintFishingMode) return Gesture.Race(paintAreaPan, tapGesture);
    return Gesture.Race(cameraPanPinch, tapGesture);
  }, [pan, pinch, areaPan, paintAreaPan, tapGesture, areaSelectMode, paintUnwalkableMode, paintFishingMode]);

  const cameraStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // ── Viewport sync for culling (skipped when empty; quantized + no sync during pan) ─
  const lastSyncRef = useRef(0);
  const syncTrigger = useSharedValue(0);
  const setVisibleRectThrottled = useCallback((rect: { left: number; top: number; right: number; bottom: number; scale?: number }) => {
    if (dragActiveRef.current) return;
    const now = Date.now();
    if (now - lastSyncRef.current >= VIEWPORT_SYNC_THROTTLE_MS) {
      lastSyncRef.current = now;
      setVisibleRect(rect);
    }
  }, []);

  // When scene is empty, no culling benefit — clear visibleRect and skip reaction
  useEffect(() => {
    if (!needsCulling) setVisibleRect(null);
  }, [needsCulling]);

  useAnimatedReaction(
    () => {
      'worklet';
      if (!needsCullingShared.value) return -1;
      if (isPanning.value) return -2; // skip during active pan/pinch
      const qx = Math.floor(translateX.value / VIEWPORT_QUANTUM);
      const qy = Math.floor(translateY.value / VIEWPORT_QUANTUM);
      const qs = Math.round(scale.value * 20);
      return qx * 1e6 + qy * 1e3 + qs + syncTrigger.value * 1e9;
    },
    (curr) => {
      'worklet';
      if (curr === -1 || curr === -2) return;
      const pad = VIEWPORT_PADDING;
      const s = scale.value;
      const tx = translateX.value;
      const ty = translateY.value;
      const left = (-tx - pad) / s;
      const top = (-ty - pad) / s;
      const right = (SCREEN_W - tx + pad) / s;
      const bottom = (SCREEN_H - ty + pad) / s;
      runOnJS(setVisibleRectThrottled)({ left, top, right, bottom, scale: s });
    },
  );
  // Kick the viewport sync once on mount so initial culling rect is computed (when needsCulling)
  useEffect(() => {
    runOnUI(() => {
      'worklet';
      syncTrigger.value = syncTrigger.value + 1;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Placement Actions ───────────────────────────────────────────────────

  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return;
    setPlacements((prev) => prev.filter((p) => p.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  const selectedPlacement = useMemo(
    () => placements.find((p) => p.id === selectedId) ?? null,
    [placements, selectedId],
  );

  const handleScaleChange = useCallback((delta: number) => {
    if (!selectedId) return;
    setPlacements((prev) => prev.map((p) =>
      p.id === selectedId
        ? { ...p, scale: Math.max(0.1, Math.min(5, +(p.scale + delta).toFixed(2))) }
        : p,
    ));
  }, [selectedId]);

  const handleSendUp = useCallback(() => {
    if (!selectedId) return;
    setPlacements((prev) =>
      prev.map((p) =>
        p.id === selectedId ? { ...p, depthOffset: (p.depthOffset ?? 0) + 1 } : p,
      ),
    );
  }, [selectedId]);

  const handleSendDown = useCallback(() => {
    if (!selectedId) return;
    setPlacements((prev) =>
      prev.map((p) =>
        p.id === selectedId ? { ...p, depthOffset: (p.depthOffset ?? 0) - 1 } : p,
      ),
    );
  }, [selectedId]);

  const handleRotateLeft = useCallback(() => {
    if (!selectedId) return;
    setPlacements((prev) =>
      prev.map((p) => {
        if (p.id !== selectedId) return p;
        const current = p.rotationDegrees ?? 0;
        const next = (current - 90 + 360) % 360;
        return { ...p, rotationDegrees: next };
      }),
    );
  }, [selectedId]);

  const handleRotateRight = useCallback(() => {
    if (!selectedId) return;
    setPlacements((prev) =>
      prev.map((p) => {
        if (p.id !== selectedId) return p;
        const current = p.rotationDegrees ?? 0;
        const next = (current + 90) % 360;
        return { ...p, rotationDegrees: next };
      }),
    );
  }, [selectedId]);

  /** Set rotation to an arbitrary degree value. */
  const handleRotationChange = useCallback((degrees: number) => {
    if (!selectedId) return;
    setPlacements((prev) =>
      prev.map((p) =>
        p.id === selectedId ? { ...p, rotationDegrees: ((degrees % 360) + 360) % 360 } : p,
      ),
    );
  }, [selectedId]);

  const handleDuplicatePlacement = useCallback((direction: 'n' | 's' | 'e' | 'w') => {
    const p = selectedPlacement;
    if (!p || !scene) return;
    const def = itemDefs[p.itemType];
    const baseW = (def?.cols ?? 1) * TILE_SIZE;
    const baseH = (def?.rows ?? 1) * TILE_SIZE;
    const w = baseW * (p.scale ?? 1);
    const h = baseH * (p.scale ?? 1);
    let newX = p.x;
    let newY = p.y;
    const overlap = 1; // -1px so duplicated items touch
    if (direction === 'e') newX = p.x + w - overlap;
    else if (direction === 'w') newX = p.x - w + overlap;
    else if (direction === 's') newY = p.y + h - overlap;
    else if (direction === 'n') newY = p.y - h + overlap;
    const dup: AdminScenePlacement = {
      id: uid(),
      itemType: p.itemType,
      x: newX,
      y: newY,
      scale: p.scale ?? 1,
      rotationDegrees: p.rotationDegrees ?? 0,
      depthOffset: p.depthOffset,
    };
    setPlacements((prev) => [...prev, dup]);
    setSelectedId(dup.id);
  }, [selectedPlacement, scene, itemDefs]);

  // Stable callbacks for AdminBottomBar (avoid inline arrows breaking React.memo)
  const handleDeselectPlacement = useCallback(() => setSelectedId(null), []);
  const handleClearMultiSelect = useCallback(() => { setMultiSelectedIds(new Set()); setSelectionRect(null); }, []);
  const handleToggleGrid = useCallback(() => setShowGrid((v) => !v), []);
  const handleOpenSettings = useCallback(() => {
    tileToolsDrawerRef.current?.close();
    settingsDrawerRef.current?.open();
  }, []);
  const handleOpenTileTools = useCallback(() => {
    settingsDrawerRef.current?.close();
    tileToolsDrawerRef.current?.open();
  }, []);
  const handleToggleSetSpawn = useCallback(() => {
    setSetSpawnMode((v) => !v);
    setPaintUnwalkableMode(false);
    setPaintFishingMode(false);
    setAreaSelectMode(false);
    setSelectedId(null);
  }, []);

  // ── Dimension + bgColor apply ───────────────────────────────────────────

  const handleApplyDimensions = useCallback(async () => {
    if (!slug || !scene) return;
    Keyboard.dismiss();
    const cols = parseInt(editCols) || scene.cols;
    const rows = parseInt(editRows) || scene.rows;
    const farmCols = parseInt(editFarmCols) || scene.farmCols;
    const farmRows = parseInt(editFarmRows) || scene.farmRows;
    const bgColor = /^#[0-9a-fA-F]{6}$/.test(editBgColor) ? editBgColor : scene.bgColor;
    const grassNoiseVal = parseFloat(editGrassNoise);
    const grassNoiseStrength = Number.isFinite(grassNoiseVal) && grassNoiseVal >= 0 && grassNoiseVal <= 0.2 ? grassNoiseVal : (scene.grassNoiseStrength ?? 0.04);
    setSaving(true);
    try {
      const updated = await api.updateScene(slug, {
        cols, rows, farmCols, farmRows, bgColor, tiledFlooringItemType: editTiledFlooringItemType, grassNoiseStrength,
        unwalkableTiles, fishingTiles,
      });
      setScene(updated);
      setEditCols(String(updated.cols));
      setEditRows(String(updated.rows));
      setEditFarmCols(String(updated.farmCols));
      setEditFarmRows(String(updated.farmRows));
      setEditBgColor(updated.bgColor || '#7EC87E');
      setEditTiledFlooringItemType(updated.tiledFlooringItemType ?? null);
      setEditGrassNoise(String(updated.grassNoiseStrength ?? 0.04));
      setUnwalkableTiles(updated.unwalkableTiles ?? []);
      setFishingTiles(updated.fishingTiles ?? []);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to update');
    } finally {
      setSaving(false);
    }
  }, [slug, scene, editCols, editRows, editFarmCols, editFarmRows, editBgColor, editTiledFlooringItemType, editGrassNoise, unwalkableTiles, fishingTiles]);

  const handleSave = useCallback(async () => {
    if (!slug || !scene) return;
    Keyboard.dismiss();
    setSaving(true);
    try {
      const cols = parseInt(editCols) || scene.cols;
      const rows = parseInt(editRows) || scene.rows;
      const farmCols = parseInt(editFarmCols) || scene.farmCols;
      const farmRows = parseInt(editFarmRows) || scene.farmRows;
      const bgColor = /^#[0-9a-fA-F]{6}$/.test(editBgColor) ? editBgColor : scene.bgColor;
      const grassNoiseVal = parseFloat(editGrassNoise);
      const grassNoiseStrength = Number.isFinite(grassNoiseVal) && grassNoiseVal >= 0 && grassNoiseVal <= 0.2 ? grassNoiseVal : (scene.grassNoiseStrength ?? 0.04);
      const updated = await api.updateScene(slug, {
        placements, cols, rows, farmCols, farmRows, bgColor, tiledFlooringItemType: editTiledFlooringItemType, grassNoiseStrength,
        unwalkableTiles, fishingTiles,
        ...(spawnPoint ? { spawnX: spawnPoint.x, spawnY: spawnPoint.y } : {}),
      });
      setScene(updated);
      setUnwalkableTiles(updated.unwalkableTiles ?? []);
      setFishingTiles(updated.fishingTiles ?? []);
      Alert.alert('Saved', 'Scene saved.');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [slug, scene, placements, editCols, editRows, editFarmCols, editFarmRows, editBgColor, editTiledFlooringItemType, editGrassNoise, unwalkableTiles, fishingTiles, spawnPoint]);

  // ── Tile tool toggles (used by TileToolsPanel) ─────────────────────────

  const handleToggleAreaSelect = useCallback(() => {
    setPaintUnwalkableMode(false);
    setPaintFishingMode(false);
    setPaintSelectionRect(null);
    paintAreaRectRef.current = null;
    setAreaSelectMode((v) => {
      if (!v) setSelectedId(null);
      else { setMultiSelectedIds(new Set()); setSelectionRect(null); }
      return !v;
    });
  }, []);

  const handleTogglePaintUnwalkable = useCallback(() => {
    setAreaSelectMode(false);
    setMultiSelectedIds(new Set());
    setSelectionRect(null);
    setSelectedId(null);
    setPaintFishingMode(false);
    setPaintSelectionRect(null);
    paintAreaRectRef.current = null;
    setPaintUnwalkableMode((v) => {
      if (v) { setPaintSelectionRect(null); paintAreaRectRef.current = null; }
      return !v;
    });
  }, []);

  const handleTogglePaintFishing = useCallback(() => {
    setAreaSelectMode(false);
    setMultiSelectedIds(new Set());
    setSelectionRect(null);
    setSelectedId(null);
    setPaintUnwalkableMode(false);
    setPaintSelectionRect(null);
    paintAreaRectRef.current = null;
    setPaintFishingMode((v) => {
      if (v) { setPaintSelectionRect(null); paintAreaRectRef.current = null; }
      return !v;
    });
  }, []);

  // ── Load precomputed procedural placements ──────────────────────────────

  const handleLoadPrecomputed = useCallback(async () => {
    if (!scene) return;
    const farmCols = parseInt(editFarmCols) || scene.farmCols;
    const farmRows = parseInt(editFarmRows) || scene.farmRows;
    const sceneCols = parseInt(editCols) || scene.cols;
    const sceneRows = parseInt(editRows) || scene.rows;
    Alert.alert(
      'Load Procedural',
      `Replace all placements with precomputed scenery for ${farmCols}×${farmRows} farm?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load', onPress: async () => {
            setLoadingPrecompute(true);
            try {
              const overrides = Object.keys(proceduralOverrides).length
                ? proceduralOverrides
                : undefined;
              const result = await api.precomputeSceneryPlacements(farmCols, farmRows, overrides);
              const WORLD_PADDING = 12;
              const worldCols = farmCols + 2 * WORLD_PADDING;
              const worldRows = farmRows + 2 * WORLD_PADDING;
              const offsetX = ((sceneCols - worldCols) / 2) * TILE_SIZE;
              const offsetY = ((sceneRows - worldRows) / 2) * TILE_SIZE;
              const placed = result.placements.map((p) => ({
                ...p,
                x: p.x + offsetX,
                y: p.y + offsetY,
              }));
              setPlacements(placed);
              setSelectedId(null);
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Failed to precompute');
            } finally {
              setLoadingPrecompute(false);
            }
          },
        },
      ],
    );
  }, [scene, editFarmCols, editFarmRows, editCols, editRows, proceduralOverrides]);

  // ── Drag-to-move placed items (SharedValue for smooth updates) ───────────

  const handleItemPanStart = useCallback((id: string) => {
    dragActiveRef.current = true;
    const p = placements.find((pl) => pl.id === id);
    if (p) {
      dragStartX.value = p.x;
      dragStartY.value = p.y;
      dragOffsetX.value = 0;
      dragOffsetY.value = 0;
    }
    setDraggingId(id);
    setSelectedId(id);
  }, [placements]);

  const commitItemDrag = useCallback((id: string, finalX: number, finalY: number, cancelled?: boolean) => {
    dragActiveRef.current = false;
    if (!cancelled) {
      setPlacements((prev) => prev.map((p) =>
        p.id === id ? { ...p, x: finalX, y: finalY } : p,
      ));
    }
    setDraggingId(null);
    dragOffsetX.value = 0;
    dragOffsetY.value = 0;
  }, []);

  /** Called when a palette drag ends — place the item at the drop position. */
  const handlePaletteDragEnd = useCallback((screenX: number, screenY: number) => {
    if (!paletteDragAsset || !scene) return;
    const def = paletteDragAsset.def;
    const { x: worldX, y: worldY } = screenToWorld(screenX, screenY);
    setPlacements((prev) => [...prev, {
      id: uid(),
      itemType: paletteDragAsset.itemType,
      x: worldX - (def.cols * TILE_SIZE) / 2,
      y: worldY - (def.rows * TILE_SIZE) / 2,
      scale: 1,
      rotationDegrees: 0,
    }]);
    setPaletteDragAsset(null);
  }, [paletteDragAsset, scene, screenToWorld]);

  /** Cancel a palette drag without placing. */
  const handlePaletteDragCancel = useCallback(() => {
    setPaletteDragAsset(null);
  }, []);

  // ── Stable callbacks for SceneItem (avoid breaking React.memo) ──────────

  const selectItem = useCallback((id: string) => {
    setSelectedId((prev) => prev === id ? null : id);
  }, []);

  // ── Palette items ───────────────────────────────────────────────────────

  const sceneryBySlot = useMemo(() => {
    const scenery = Object.values(itemDefs).filter((d) => d.category === 'scenery');
    return {
      trees: scenery.filter(
        (d) =>
          d.itemType?.startsWith('scenery_tree_') || ((d.cols ?? 1) >= 2 && (d.rows ?? 1) >= 2)
      ),
      outerBush: scenery.filter((d) => (d.cols ?? 1) === 1 && (d.rows ?? 1) === 1),
      largeRock: scenery.filter((d) => (d.cols ?? 1) >= 2 && (d.rows ?? 1) === 1),
      smallDeco: scenery.filter((d) => (d.cols ?? 1) === 1 && (d.rows ?? 1) === 1),
    };
  }, [itemDefs]);

  const searchableTrees = useMemo(() => toSearchable(sceneryBySlot.trees), [sceneryBySlot.trees]);
  const searchableSmallDeco = useMemo(() => toSearchable(sceneryBySlot.smallDeco), [sceneryBySlot.smallDeco]);
  const searchableOuterBush = useMemo(() => toSearchable(sceneryBySlot.outerBush), [sceneryBySlot.outerBush]);
  const searchableLargeRock = useMemo(() => toSearchable(sceneryBySlot.largeRock), [sceneryBySlot.largeRock]);
  const searchableTiledFlooring = useMemo(
    () => toSearchable(Object.values(itemDefs).filter((d) => d.category === 'tiled_flooring')),
    [itemDefs],
  );

  // ── Depth-sorted renderables (matches bake layer order) ─────────────────
  // Compute the visual rect for each placement identically to bakeScene:
  //   left = p.x + (baseW - w) / 2   (center scaled image in unscaled bounds)
  //   top  = p.y + (baseH - h)        (anchor to bottom of unscaled bounds)

  interface RenderablePlacement extends AdminScenePlacement {
    depth: number;
    renderX: number;
    renderY: number;
    renderW: number;
    renderH: number;
  }

  const sortedPlacements: RenderablePlacement[] = useMemo(() => {
    return placements
      .map((p) => {
        const def = itemDefs[p.itemType];
        const baseW = (def?.cols ?? 1) * TILE_SIZE;
        const baseH = (def?.rows ?? 1) * TILE_SIZE;
        const w = baseW * p.scale;
        const h = baseH * p.scale;
        return {
          ...p,
          depth: computeDepth(p, def),
          renderX: p.x + (baseW - w) / 2,
          renderY: p.y + (baseH - h),
          renderW: w,
          renderH: h,
        };
      })
      .sort((a, b) => a.depth - b.depth);
  }, [placements, itemDefs]);

  const visiblePlacements = useMemo(() => {
    if (!visibleRect) return sortedPlacements;
    const { left, top, right, bottom } = visibleRect;
    return sortedPlacements.filter((p) => {
      if (draggingId === p.id) return true;
      const iL = p.renderX;
      const iT = p.renderY;
      const iR = p.renderX + p.renderW;
      const iB = p.renderY + p.renderH;
      return rectIntersects(left, top, right, bottom, iL, iT, iR, iB);
    });
  }, [sortedPlacements, visibleRect, draggingId]);

  const visibleUnwalkableTiles = useMemo(() => {
    if (!visibleRect || unwalkableTiles.length === 0) return unwalkableTiles;
    const { left, top, right, bottom } = visibleRect;
    return unwalkableTiles.filter(({ col, row }) => {
      const tL = col * TILE_SIZE;
      const tT = row * TILE_SIZE;
      return rectIntersects(left, top, right, bottom, tL, tT, tL + TILE_SIZE, tT + TILE_SIZE);
    });
  }, [unwalkableTiles, visibleRect]);

  const visibleFishingTiles = useMemo(() => {
    if (!visibleRect || fishingTiles.length === 0) return fishingTiles;
    const { left, top, right, bottom } = visibleRect;
    return fishingTiles.filter(({ col, row }) => {
      const tL = col * TILE_SIZE;
      const tT = row * TILE_SIZE;
      return rectIntersects(left, top, right, bottom, tL, tT, tL + TILE_SIZE, tT + TILE_SIZE);
    });
  }, [fishingTiles, visibleRect]);

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading || !scene) {
    return (
      <View style={[st.fullCenter, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const farmOffsetX = ((sceneCols - scene.farmCols) / 2) * TILE_SIZE;
  const farmOffsetY = ((sceneRows - scene.farmRows) / 2) * TILE_SIZE;
  const farmW = scene.farmCols * TILE_SIZE;
  const farmH = scene.farmRows * TILE_SIZE;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#333' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={false}
      >
      <GestureDetector gesture={gesture}>
        <Animated.View style={[{ width: SCREEN_W, height: SCREEN_H }, { overflow: 'hidden' }]}>
          <Animated.View style={[{ width: worldW, height: worldH, position: 'absolute', transformOrigin: 'left top' }, cameraStyle]}>
            {/* Color flooring always rendered first so transparent tiled flooring shows it beneath */}
            <View style={{ width: worldW, height: worldH, position: 'absolute', backgroundColor: /^#[0-9a-fA-F]{6}$/.test(editBgColor) ? editBgColor : scene.bgColor }} />
            {editTiledFlooringItemType && itemDefs[editTiledFlooringItemType]?.imageUrl ? (
              <View style={{ width: worldW, height: worldH, position: 'absolute' }}>
                {Array.from({ length: Math.ceil(sceneRows / 5) * Math.ceil(sceneCols / 5) }, (_, i) => {
                  const tileCols = Math.ceil(sceneCols / 5);
                  const row = Math.floor(i / tileCols);
                  const col = i % tileCols;
                  return (
                    <CachedImage
                      key={`tile-${row}-${col}`}
                      source={{ uri: itemDefs[editTiledFlooringItemType]!.imageUrl! }}
                      style={{
                        position: 'absolute',
                        left: col * 5 * TILE_SIZE - 1,
                        top: row * 5 * TILE_SIZE - 1,
                        width: 5 * TILE_SIZE + 2,
                        height: 5 * TILE_SIZE + 2,
                      }}
                      resizeMode="fill"
                    />
                  );
                })}
              </View>
            ) : null}

            {showGrid && (visibleRect == null || (visibleRect.scale ?? initScale) > EDITOR_GRID_ZOOM_THRESHOLD) && (
              <EditorGrid cols={sceneCols} rows={sceneRows} worldW={worldW} worldH={worldH} visibleRect={visibleRect} />
            )}

            {showGrid && (visibleRect == null || (visibleRect.scale ?? initScale) > EDITOR_GRID_ZOOM_THRESHOLD) && (
              <View
                style={{
                  position: 'absolute', left: farmOffsetX, top: farmOffsetY,
                  width: farmW, height: farmH,
                  borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                }}
                pointerEvents="none"
              />
            )}

            {visiblePlacements.map((p) => {
              if (!itemDefs[p.itemType]) return null;
              const def = itemDefs[p.itemType];
              const isDragging = draggingId === p.id;
              return (
                <SceneItem
                  key={p.id}
                  id={p.id}
                  x={p.renderX}
                  y={p.renderY}
                  width={p.renderW}
                  height={p.renderH}
                  imageUrl={def.imageUrl}
                  emoji={def.emoji}
                  color={def.color}
                  isSelected={selectedId === p.id || multiSelectedIds.has(p.id)}
                  onSelect={selectItem}
                  onPanStart={handleItemPanStart}
                  onPanEnd={commitItemDrag}
                  scale={scale}
                  isDragging={isDragging}
                  dragOffsetX={isDragging ? dragOffsetX : undefined}
                  dragOffsetY={isDragging ? dragOffsetY : undefined}
                  dragStartX={isDragging ? dragStartX : undefined}
                  dragStartY={isDragging ? dragStartY : undefined}
                  rotationDegrees={p.rotationDegrees ?? 0}
                  disabled={paintUnwalkableMode || paintFishingMode || areaSelectMode}
                />
              );
            })}

            {showGrid && (
              <View style={{ position: 'absolute', left: 0, top: 0, width: worldW, height: worldH, zIndex: 99 }} pointerEvents="none">
                <TileOverlays
                  worldW={worldW}
                  worldH={worldH}
                  unwalkableTiles={visibleUnwalkableTiles}
                  fishingTiles={visibleFishingTiles}
                />
              </View>
            )}

            {selectionRect && (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: Math.min(selectionRect.x1, selectionRect.x2),
                  top: Math.min(selectionRect.y1, selectionRect.y2),
                  width: Math.abs(selectionRect.x2 - selectionRect.x1),
                  height: Math.abs(selectionRect.y2 - selectionRect.y1),
                  borderWidth: 2,
                  borderColor: '#EF4444',
                  backgroundColor: 'rgba(239,68,68,0.12)',
                  borderStyle: 'dashed',
                }}
              />
            )}

            {paintSelectionRect && (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: Math.min(paintSelectionRect.x1, paintSelectionRect.x2),
                  top: Math.min(paintSelectionRect.y1, paintSelectionRect.y2),
                  width: Math.abs(paintSelectionRect.x2 - paintSelectionRect.x1),
                  height: Math.abs(paintSelectionRect.y2 - paintSelectionRect.y1),
                  borderWidth: 2,
                  borderColor: '#F59E0B',
                  backgroundColor: 'rgba(245,158,11,0.15)',
                  borderStyle: 'dashed',
                }}
              />
            )}

            {/* Spawn point marker */}
            {spawnPoint && (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: spawnPoint.x - 12,
                  top: spawnPoint.y - 12,
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: 'rgba(59,130,246,0.5)',
                  borderWidth: 2,
                  borderColor: '#3B82F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 200,
                }}
              >
                <Ionicons name="flag" size={12} color="#fff" />
              </View>
            )}

          </Animated.View>
        </Animated.View>
      </GestureDetector>

      {paletteDragAsset && (
        <PaletteDragGhost
          def={paletteDragAsset.def}
          previewX={palettePreviewX}
          previewY={palettePreviewY}
        />
      )}

      {/* Top bar — back, scene name, save */}
      <View style={[st.topBar, { paddingTop: insets.top + 4 }]} pointerEvents="box-none">
        <Pressable style={st.topBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <Text style={st.topTitle} numberOfLines={1}>{scene.name}</Text>
        <Pressable style={[st.topBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="save" size={22} color="#fff" />
          )}
        </Pressable>
      </View>

      {/* Panels above bottom bar */}
      <View style={[st.panelContainer, { paddingBottom: insets.bottom }]} pointerEvents="box-none">
        <SettingsPanel
          ref={settingsDrawerRef}
          onClose={() => {}}
          editCols={editCols}
          editRows={editRows}
          editFarmCols={editFarmCols}
          editFarmRows={editFarmRows}
          editBgColor={editBgColor}
          editTiledFlooringItemType={editTiledFlooringItemType}
          editGrassNoise={editGrassNoise}
          onEditCols={setEditCols}
          onEditRows={setEditRows}
          onEditFarmCols={setEditFarmCols}
          onEditFarmRows={setEditFarmRows}
          onEditBgColor={setEditBgColor}
          onEditTiledFlooringItemType={setEditTiledFlooringItemType}
          onEditGrassNoise={setEditGrassNoise}
          onApplyBgColor={handleApplyDimensions}
          searchableTiledFlooring={searchableTiledFlooring}
          showProceduralOptions={showProceduralOptions}
          onToggleProceduralOptions={() => setShowProceduralOptions((v) => !v)}
          proceduralOverrides={proceduralOverrides}
          onSetProceduralOverrides={setProceduralOverrides}
          defaultTreeTypes={DEFAULT_TREE_TYPES}
          defaultOuterBush={DEFAULT_OUTER_BUSH}
          searchableTrees={searchableTrees}
          searchableOuterBush={searchableOuterBush}
          saving={saving}
          loadingPrecompute={loadingPrecompute}
          onApplyDimensions={handleApplyDimensions}
          onLoadPrecomputed={handleLoadPrecomputed}
          placementCount={placements.length}
          sceneCols={sceneCols}
          sceneRows={sceneRows}
          farmCols={scene.farmCols}
          farmRows={scene.farmRows}
        />

        <TileToolsPanel
          ref={tileToolsDrawerRef}
          onClose={() => {}}
          areaSelectMode={areaSelectMode}
          onToggleAreaSelect={handleToggleAreaSelect}
          paintUnwalkableMode={paintUnwalkableMode}
          onTogglePaintUnwalkable={handleTogglePaintUnwalkable}
          paintFishingMode={paintFishingMode}
          onTogglePaintFishing={handleTogglePaintFishing}
          selectedSpotType={selectedSpotType}
          onSelectSpotType={setSelectedSpotType}
        />

        <AdminBottomBar
          itemDefs={itemDefs}
          selectedItemType={selectedItemType}
          onSelectItemType={setSelectedItemType}
          selectedPlacement={selectedPlacement}
          onDeleteSelected={handleDeleteSelected}
          onSendUp={handleSendUp}
          onSendDown={handleSendDown}
          onScaleChange={handleScaleChange}
          onRotateLeft={handleRotateLeft}
          onRotateRight={handleRotateRight}
          onRotationChange={handleRotationChange}
          onDuplicatePlacement={handleDuplicatePlacement}
          onDeselectPlacement={handleDeselectPlacement}
          multiSelectedCount={multiSelectedIds.size}
          onMassDelete={handleMassDelete}
          onClearMultiSelect={handleClearMultiSelect}
          onToggleGrid={handleToggleGrid}
          showGrid={showGrid}
          onOpenSettings={handleOpenSettings}
          onOpenTileTools={handleOpenTileTools}
          tileToolActive={areaSelectMode || paintUnwalkableMode || paintFishingMode}
          setSpawnMode={setSpawnMode}
          onToggleSetSpawn={handleToggleSetSpawn}
          onStartDragItem={(itemType, def) => {
            setPaletteDragAsset({ itemType, def });
          }}
          onItemCreated={refetchItems}
        />
      </View>
      </ScrollView>
    </GestureHandlerRootView>
  );
}

// ─── Palette Drag Ghost (position from SharedValues, no per-frame setState) ───

function PaletteDragGhost({
  def,
  previewX,
  previewY,
}: {
  def: AdminGameItem;
  previewX: SharedValue<number>;
  previewY: SharedValue<number>;
}) {
  const ghostStyle = useAnimatedStyle(() => ({
    left: previewX.value - 24,
    top: previewY.value - 24,
  }));

  return (
    <Animated.View
      style={[
        st.dragGhost,
        ghostStyle,
      ]}
      pointerEvents="none"
    >
      {def.imageUrl ? (
        <CachedImage source={{ uri: def.imageUrl }} style={st.dragGhostImg} resizeMode="contain" />
      ) : (
        <Text style={{ fontSize: 28 }}>{def.emoji}</Text>
      )}
    </Animated.View>
  );
}

// ─── Scene Item (optimized: primitive props for React.memo) ──────────────────

interface SceneItemProps {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  imageUrl?: string;
  emoji?: string;
  color?: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onPanStart: (id: string) => void;
  onPanEnd: (id: string, finalX: number, finalY: number, cancelled?: boolean) => void;
  scale?: SharedValue<number>;
  isDragging?: boolean;
  dragOffsetX?: SharedValue<number>;
  dragOffsetY?: SharedValue<number>;
  dragStartX?: SharedValue<number>;
  dragStartY?: SharedValue<number>;
  rotationDegrees?: number;
  /** When true, gestures are disabled (e.g. during tile painting). */
  disabled?: boolean;
}

const SceneItem = React.memo(function SceneItem({
  id, x, y, width, height, imageUrl, emoji, color, isSelected,
  onSelect, onPanStart, onPanEnd,
  scale, isDragging, dragOffsetX, dragOffsetY, dragStartX, dragStartY,
  rotationDegrees = 0,
  disabled = false,
}: SceneItemProps) {
  const itemGesture = useMemo(() => {
    const tap = Gesture.Tap()
      .maxDuration(250)
      .enabled(!disabled)
      .onEnd(() => { 'worklet'; runOnJS(onSelect)(id); });

    const rot = rotationDegrees;
    const dragPan = Gesture.Pan()
      .activateAfterLongPress(200)
      .minDistance(4)
      .enabled(!disabled)
      .onStart(() => { 'worklet'; runOnJS(onPanStart)(id); })
      .onUpdate((e) => {
        'worklet';
        if (dragOffsetX && dragOffsetY && scale) {
          const tx = e.translationX / scale.value;
          const ty = e.translationY / scale.value;
          const rad = (-rot * Math.PI) / 180;
          const c = Math.cos(rad);
          const s = Math.sin(rad);
          dragOffsetX.value = c * tx - s * ty;
          dragOffsetY.value = s * tx + c * ty;
        }
      })
      .onEnd((e) => {
        'worklet';
        if (dragStartX && dragStartY && scale) {
          const tx = e.translationX / scale.value;
          const ty = e.translationY / scale.value;
          const finalX = dragStartX.value + tx;
          const finalY = dragStartY.value + ty;
          runOnJS(onPanEnd)(id, finalX, finalY, false);
        } else {
          runOnJS(onPanEnd)(id, 0, 0, true);
        }
      });

    return Gesture.Exclusive(tap, dragPan);
  }, [id, onSelect, onPanStart, onPanEnd, disabled, scale, rotationDegrees, dragOffsetX, dragOffsetY, dragStartX, dragStartY]);

  const animatedStyle = useAnimatedStyle(() => {
    const rot = `${rotationDegrees}deg`;
    if (!isDragging || !dragOffsetX || !dragOffsetY) {
      return { transform: [{ rotate: rot }] };
    }
    return {
      transform: [
        { rotate: rot },
        { translateX: dragOffsetX.value },
        { translateY: dragOffsetY.value },
      ],
    };
  }, [isDragging, rotationDegrees]);

  const HIT_AREA_RATIO = 0.55;
  const hitW = Math.max(20, width * HIT_AREA_RATIO);
  const hitH = Math.max(20, height * HIT_AREA_RATIO);
  const hitAreaStyle = {
    position: 'absolute' as const,
    left: (width - hitW) / 2,
    top: (height - hitH) / 2,
    width: hitW,
    height: hitH,
  };

  const wrapperStyle = {
    position: 'absolute' as const,
    left: x,
    top: y,
    width,
    height,
    borderRadius: 4,
  };

  return (
    <Animated.View
      collapsable={false}
      pointerEvents={disabled ? 'none' : 'box-none'}
      style={[wrapperStyle, animatedStyle]}
    >
      {isSelected && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: -2,
            top: -2,
            width: width + 4,
            height: height + 4,
            borderWidth: 2,
            borderColor: '#4ADE80',
            borderRadius: 6,
          }}
        />
      )}
      {imageUrl ? (
        <CachedImage source={{ uri: imageUrl }} style={{ width, height }} resizeMode="contain" pointerEvents="none" />
      ) : (
        <View style={{ width, height, backgroundColor: color || '#888', borderRadius: 4, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
          <Text style={{ fontSize: Math.min(width, height) * 0.4 }}>{emoji}</Text>
        </View>
      )}
      <GestureDetector gesture={itemGesture}>
        <View style={hitAreaStyle} />
      </GestureDetector>
    </Animated.View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  fullCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
  },
  topBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, color: '#fff', fontWeight: '700', fontSize: 15, textAlign: 'center' },
  panelContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 10, paddingBottom: 10, zIndex: 100,
  },
  dragGhost: {
    position: 'absolute', width: 48, height: 48,
    alignItems: 'center', justifyContent: 'center', zIndex: 500, opacity: 0.8,
  },
  dragGhostImg: { width: 36, height: 36 },
});
