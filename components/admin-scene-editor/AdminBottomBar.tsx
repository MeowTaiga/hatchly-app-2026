import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Keyboard,
  Alert,
} from 'react-native';
import { useTheme } from '@/store/ThemeProvider';
import { useToast } from '@/store/ToastProvider';
import { hexToRgba } from '@/utils/colorUtils';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CachedImage } from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { api, type AdminGameItem, type AdminScenePlacement } from '@/lib/api';
import type { ItemCategory } from '@/game/types';
import { ITEM_CATEGORIES } from '@/game/types';
import { buildDefaultPrompt } from '@/components/admin-item-form/utils';
import { SPRING_CONFIG, CLOSE_DURATION } from '@/game/GameHUD/constants';

const KEYBOARD_OPEN_OFFSET = 80;

interface AdminBottomBarProps {
  itemDefs: Record<string, AdminGameItem>;
  selectedItemType: string | null;
  onSelectItemType: (itemType: string | null) => void;

  selectedPlacement: AdminScenePlacement | null;
  onDeleteSelected: () => void;
  onSendUp: () => void;
  onSendDown: () => void;
  onScaleChange: (delta: number) => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onRotationChange: (degrees: number) => void;
  onDuplicatePlacement: (direction: 'n' | 's' | 'e' | 'w') => void;
  onDeselectPlacement: () => void;

  multiSelectedCount: number;
  onMassDelete: () => void;
  onClearMultiSelect: () => void;

  onToggleGrid: () => void;
  showGrid: boolean;
  onOpenSettings: () => void;
  onOpenTileTools: () => void;

  tileToolActive: boolean;

  /** Spawn point mode. */
  setSpawnMode?: boolean;
  onToggleSetSpawn?: () => void;

  /** Drag-to-place: called when user long-presses a palette item. */
  onStartDragItem?: (itemType: string, def: AdminGameItem) => void;

  /** Called after Quick Create successfully creates an item (to refresh itemDefs). */
  onItemCreated?: () => void;
}

/** Lightweight inline rotation slider (0-360°). */
function RotationSlider({ value, onChange }: { value: number; onChange: (deg: number) => void }) {
  const { theme } = useTheme();
  const primary = theme.colors.primary;
  const trackRef = useRef<View>(null);
  const trackWidth = useRef(0);

  const handleTouch = useCallback((pageX: number) => {
    trackRef.current?.measure((_x, _y, width, _h, px) => {
      const ratio = Math.max(0, Math.min(1, (pageX - px) / width));
      onChange(Math.round(ratio * 360));
    });
  }, [onChange]);

  return (
    <View
      ref={trackRef}
      style={sliderStyles.track}
      onLayout={(e) => { trackWidth.current = e.nativeEvent.layout.width; }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => handleTouch(e.nativeEvent.pageX)}
      onResponderMove={(e) => handleTouch(e.nativeEvent.pageX)}
    >
      <View style={[sliderStyles.fill, { width: `${(value / 360) * 100}%`, backgroundColor: hexToRgba(primary, 0.4) }]} />
      <View style={[sliderStyles.thumb, { left: `${(value / 360) * 100}%`, backgroundColor: primary }]} />
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  track: {
    width: 80,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    overflow: 'visible',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 12,
  },
  thumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
    top: 4,
  },
});

export function AdminBottomBar({
  itemDefs,
  selectedItemType,
  onSelectItemType,
  selectedPlacement,
  onDeleteSelected,
  onSendUp,
  onSendDown,
  onScaleChange,
  onRotateLeft,
  onRotateRight,
  onRotationChange,
  onDuplicatePlacement,
  onDeselectPlacement,
  multiSelectedCount,
  onMassDelete,
  onClearMultiSelect,
  onToggleGrid,
  showGrid,
  onOpenSettings,
  onOpenTileTools,
  tileToolActive,
  setSpawnMode,
  onToggleSetSpawn,
  onStartDragItem,
  onItemCreated,
}: AdminBottomBarProps) {
  const { theme } = useTheme();
  const { toast } = useToast();
  const primary = theme.colors.primary;
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ItemCategory | 'all'>('all');
  const [paletteExpanded, setPaletteExpanded] = useState(false);
  const [searchMode, setSearchMode] = useState(false);

  const handleOpenSearch = useCallback(() => {
    setSearchMode(true);
    setPaletteExpanded(true);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setSearchMode(false);
    setSearchQuery('');
  }, []);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickCategory, setQuickCategory] = useState<'scenery' | 'decoration'>('scenery');
  const [quickCols, setQuickCols] = useState('1');
  const [quickRows, setQuickRows] = useState('1');
  const [quickPrompt, setQuickPrompt] = useState('');
  const [quickGenerating, setQuickGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const targetBottomClosed = 0;
  const bottomValue = useSharedValue(targetBottomClosed);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: { endCoordinates: { height: number } }) => {
      setKeyboardVisible(true);
      const kh = e.endCoordinates.height;
      const targetBottom = kh - insets.bottom + KEYBOARD_OPEN_OFFSET;
      bottomValue.value = withSpring(targetBottom, SPRING_CONFIG);
    };
    const onHide = () => {
      setKeyboardVisible(false);
      bottomValue.value = withTiming(targetBottomClosed, { duration: CLOSE_DURATION });
    };
    const sub1 = Keyboard.addListener(showEvent, onShow);
    const sub2 = Keyboard.addListener(hideEvent, onHide);
    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, [insets.bottom, targetBottomClosed]);

  const animatedRootStyle = useAnimatedStyle(() => ({
    bottom: bottomValue.value,
  }));

  const defaultImagePrompt = useMemo(
    () => buildDefaultPrompt(quickName.trim() || 'item', quickCategory),
    [quickName, quickCategory],
  );

  const filteredItems = useMemo(() => {
    let items = Object.values(itemDefs);
    if (activeCategory !== 'all') {
      items = items.filter((d) => d.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (d) => d.label.toLowerCase().includes(q) || d.itemType.toLowerCase().includes(q),
      );
    }
    return items;
  }, [itemDefs, activeCategory, searchQuery]);

  const handleItemPress = useCallback(
    (itemType: string) => {
      onSelectItemType(selectedItemType === itemType ? null : itemType);
    },
    [selectedItemType, onSelectItemType],
  );

  /** Generate a new item + AI image and auto-select it. */
  const handleQuickCreate = useCallback(async () => {
    const name = quickName.trim();
    if (!name) { Alert.alert('Name required'); return; }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const itemType = `${quickCategory}_${slug}`;
    const cols = Math.max(1, parseInt(quickCols) || 1);
    const rows = Math.max(1, parseInt(quickRows) || 1);
    setQuickGenerating(true);
    try {
      await api.createGameItem({
        itemType,
        label: name,
        color: '#8B5E3C',
        category: quickCategory,
        cols,
        rows,
        placeable: true,
      });
      const prompt = quickPrompt.trim() || defaultImagePrompt;
      await api.generateGameItemImage(itemType, prompt);
      onItemCreated?.();
      toast(`Item created: ${name}`, 'success');
      onSelectItemType(itemType);
      setShowQuickCreate(false);
      setQuickName('');
      setQuickPrompt('');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create item');
    } finally {
      setQuickGenerating(false);
    }
  }, [quickName, quickCategory, quickCols, quickRows, quickPrompt, defaultImagePrompt, onSelectItemType, onItemCreated, toast]);

  const showMultiSelect = multiSelectedCount > 0;
  const showItemTools = !!selectedPlacement && !showMultiSelect;
  const showPalette = paletteExpanded && !showMultiSelect;

  return (
    <Animated.View style={[s.root, animatedRootStyle]} pointerEvents="box-none">
      {/* Multi-select action bar */}
      {showMultiSelect && (
        <View style={s.toolBarRow}>
          <View style={[s.toolBar, s.multiSelectBar]}>
            <Text style={s.multiSelectText}>{multiSelectedCount} selected</Text>
            <Pressable style={s.multiDeleteBtn} onPress={onMassDelete}>
              <Ionicons name="trash-outline" size={14} color="#fff" />
              <Text style={s.multiDeleteText}>Delete All</Text>
            </Pressable>
            <Pressable style={s.iconBtn} onPress={onClearMultiSelect}>
              <Ionicons name="close" size={16} color="#fff" />
            </Pressable>
          </View>
        </View>
      )}

      {/* Selected item tool bar — Row 1: Delete | Send Down/Up | Duplicate | Deselect; Row 2: Scale | Rotate */}
      {showItemTools && (
        <View style={s.toolBarRows}>
          <View style={s.toolBarRow}>
            <View style={s.toolBar}>
              <Pressable style={s.iconBtn} onPress={onDeleteSelected}>
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
              </Pressable>
              <Pressable style={s.iconBtn} onPress={onSendDown}>
                <Ionicons name="chevron-down" size={16} color="#fff" />
              </Pressable>
              <Pressable style={s.iconBtn} onPress={onSendUp}>
                <Ionicons name="chevron-up" size={16} color="#fff" />
              </Pressable>
            <Pressable style={s.iconBtn} onPress={() => onDuplicatePlacement('n')} accessibilityLabel="Duplicate N">
              <Ionicons name="arrow-up" size={16} color="#fff" />
            </Pressable>
            <Pressable style={s.iconBtn} onPress={() => onDuplicatePlacement('s')} accessibilityLabel="Duplicate S">
              <Ionicons name="arrow-down" size={16} color="#fff" />
            </Pressable>
            <Pressable style={s.iconBtn} onPress={() => onDuplicatePlacement('e')} accessibilityLabel="Duplicate E">
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </Pressable>
            <Pressable style={s.iconBtn} onPress={() => onDuplicatePlacement('w')} accessibilityLabel="Duplicate W">
              <Ionicons name="arrow-back" size={16} color="#fff" />
            </Pressable>
              <Pressable style={s.iconBtn} onPress={onDeselectPlacement}>
                <Ionicons name="close" size={16} color="#fff" />
              </Pressable>
            </View>
          </View>
          <View style={s.toolBarRow}>
            <View style={s.toolBar}>
              <View style={s.scaleGroup}>
                <Pressable style={s.scaleBtn} onPress={() => onScaleChange(-0.1)}>
                  <Ionicons name="remove" size={14} color="#fff" />
                </Pressable>
                <Text style={s.scaleLabel}>{selectedPlacement!.scale.toFixed(1)}x</Text>
                <Pressable style={s.scaleBtn} onPress={() => onScaleChange(0.1)}>
                  <Ionicons name="add" size={14} color="#fff" />
                </Pressable>
              </View>
              <View style={s.rotationGroup}>
                <Pressable style={s.scaleBtn} onPress={onRotateLeft}>
                  <Ionicons name="arrow-undo" size={14} color="#fff" />
                </Pressable>
                <RotationSlider
                  value={selectedPlacement?.rotationDegrees ?? 0}
                  onChange={onRotationChange}
                />
                <Pressable style={s.scaleBtn} onPress={onRotateRight}>
                  <Ionicons name="arrow-redo" size={14} color="#fff" />
                </Pressable>
                <Text style={s.scaleLabel}>{selectedPlacement?.rotationDegrees ?? 0}°</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Quick create panel */}
      {showQuickCreate && (
        <View style={s.palettePanel}>
          <View style={s.quickCreateRow}>
            <TextInput
              style={s.quickInput}
              placeholder="Item name..."
              placeholderTextColor="#888"
              value={quickName}
              onChangeText={setQuickName}
              autoCapitalize="words"
            />
            <View style={s.quickCatRow}>
              <Pressable
                style={[s.chip, quickCategory === 'scenery' && s.chipActive, quickCategory === 'scenery' && { backgroundColor: primary }]}
                onPress={() => setQuickCategory('scenery')}
              >
                <Text style={[s.chipText, quickCategory === 'scenery' && s.chipTextActive]}>Scenery</Text>
              </Pressable>
              <Pressable
                style={[s.chip, quickCategory === 'decoration' && s.chipActive, quickCategory === 'decoration' && { backgroundColor: primary }]}
                onPress={() => setQuickCategory('decoration')}
              >
                <Text style={[s.chipText, quickCategory === 'decoration' && s.chipTextActive]}>Deco</Text>
              </Pressable>
            </View>
            <Pressable
              style={[s.quickGenBtn, { backgroundColor: primary }, quickGenerating && { opacity: 0.5 }]}
              onPress={handleQuickCreate}
              disabled={quickGenerating}
            >
              {quickGenerating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={14} color="#fff" />
                  <Text style={s.quickGenText}>Generate</Text>
                </>
              )}
            </Pressable>
          </View>
          <Pressable onPress={() => setShowAdvanced((v) => !v)} style={s.advancedToggle}>
            <Text style={s.advancedToggleText}>{showAdvanced ? 'Hide' : 'Advanced'}</Text>
            <Ionicons name={showAdvanced ? 'chevron-up' : 'chevron-down'} size={12} color="#999" />
          </Pressable>
          {showAdvanced && (
            <View style={s.advancedSection}>
              <View style={s.advancedRow}>
                <View style={s.advancedField}>
                  <Text style={s.advancedLabel}>Cols</Text>
                  <TextInput
                    style={s.advancedInput}
                    value={quickCols}
                    onChangeText={setQuickCols}
                    keyboardType="number-pad"
                    placeholderTextColor="#888"
                  />
                </View>
                <View style={s.advancedField}>
                  <Text style={s.advancedLabel}>Rows</Text>
                  <TextInput
                    style={s.advancedInput}
                    value={quickRows}
                    onChangeText={setQuickRows}
                    keyboardType="number-pad"
                    placeholderTextColor="#888"
                  />
                </View>
              </View>
              <View style={s.advancedPromptRow}>
                <Text style={s.advancedLabel}>Image prompt</Text>
                <TextInput
                  style={s.advancedPromptInput}
                  value={quickPrompt || defaultImagePrompt}
                  onChangeText={setQuickPrompt}
                  placeholder="Edit the prompt above…"
                  placeholderTextColor="#888"
                  multiline
                />
              </View>
            </View>
          )}
        </View>
      )}

      {/* Item palette (search + items) */}
      {showPalette && paletteExpanded && (
        <View style={s.palettePanel}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chipRow}
          >
            <Pressable
              style={[s.chip, activeCategory === 'all' && s.chipActive, activeCategory === 'all' && { backgroundColor: primary }]}
              onPress={() => setActiveCategory('all')}
            >
              <Text style={[s.chipText, activeCategory === 'all' && s.chipTextActive]}>All</Text>
            </Pressable>
            {ITEM_CATEGORIES.map((cat) => (
              <Pressable
                key={cat.key}
                style={[s.chip, activeCategory === cat.key && s.chipActive, activeCategory === cat.key && { backgroundColor: primary }]}
                onPress={() => setActiveCategory(cat.key)}
              >
                <Ionicons
                  name={cat.ionicon as any}
                  size={14}
                  color={activeCategory === cat.key ? '#fff' : '#999'}
                />
                <Text style={[s.chipText, activeCategory === cat.key && s.chipTextActive]}>
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {filteredItems.length === 0 ? (
            <View style={s.slotRow}>
              <Text style={s.emptyText}>No items found</Text>
            </View>
          ) : (
            <FlatList
              data={filteredItems}
              keyExtractor={(def) => def.itemType}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.slotRow}
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              windowSize={5}
              getItemLayout={(_, index) => ({ length: 68, offset: 68 * index, index })}
              renderItem={({ item: def }) => {
                const isActive = selectedItemType === def.itemType;
                return (
                  <Pressable
                    style={[s.slot, isActive && s.slotActive, isActive && { borderColor: primary, backgroundColor: hexToRgba(primary, 0.15) }]}
                    onPress={() => handleItemPress(def.itemType)}
                    onLongPress={() => onStartDragItem?.(def.itemType, def)}
                  >
                    {def.imageUrl ? (
                      <CachedImage
                        source={{ uri: def.imageUrl }}
                        style={s.slotImg}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={{ fontSize: 20 }}>{def.emoji}</Text>
                    )}
                    <Text style={s.slotLabel} numberOfLines={1}>
                      {def.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      )}

      {/* Keyboard dismiss button — visible when keyboard is open */}
      {keyboardVisible && (
        <View style={s.keyboardDismissRow}>
          <Pressable style={s.keyboardDismissBtn} onPress={() => Keyboard.dismiss()}>
            <Ionicons name="close" size={18} color="#ccc" />
            <Text style={s.keyboardDismissText}>Close keyboard</Text>
          </Pressable>
        </View>
      )}

      {/* Bottom bar row */}
      <View style={s.barsRow}>
        {searchMode ? (
          /* Search mode: full-width search input, nav hidden */
          <View style={[s.inputBar, { flex: 1 }]}>
            <Ionicons name="search" size={16} color="#999" />
            <TextInput
              style={s.input}
              placeholder="Search items..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoFocus
            />
            <Pressable style={s.emoteBtn} onPress={handleCloseSearch}>
              <Ionicons name="close" size={18} color="#ccc" />
            </Pressable>
          </View>
        ) : (
          <>
            {/* Left bar: palette expand, search, add item */}
            <View style={s.inputBar}>
              <Pressable
                style={[s.navBtn, paletteExpanded && { backgroundColor: hexToRgba(primary, 0.3) }]}
                onPress={() => setPaletteExpanded((v) => !v)}
              >
                <Ionicons
                  name={paletteExpanded ? 'chevron-down' : 'chevron-up'}
                  size={18}
                  color={paletteExpanded ? '#fff' : '#ccc'}
                />
              </Pressable>
              <Pressable style={s.navBtn} onPress={handleOpenSearch}>
                <Ionicons name="search" size={18} color="#ccc" />
              </Pressable>
              <Pressable style={s.navBtn} onPress={() => setShowQuickCreate((v) => !v)}>
                <Ionicons name="add-circle-outline" size={18} color={showQuickCreate ? '#4ADE80' : '#ccc'} />
              </Pressable>
            </View>

            {/* Right bar: spawn, tile tools, settings, grid */}
            <View style={s.navBar}>
              {onToggleSetSpawn && (
                <Pressable style={s.navBtn} onPress={onToggleSetSpawn}>
                  <Ionicons name="flag-outline" size={18} color={setSpawnMode ? '#3B82F6' : '#ccc'} />
                </Pressable>
              )}
              <Pressable style={s.navBtn} onPress={onOpenTileTools}>
                <Ionicons name="map-outline" size={18} color={tileToolActive ? '#4ADE80' : '#ccc'} />
              </Pressable>
              <Pressable style={s.navBtn} onPress={onOpenSettings}>
                <Ionicons name="settings-outline" size={18} color="#ccc" />
              </Pressable>
              <Pressable style={s.navBtn} onPress={onToggleGrid}>
                <Ionicons name={showGrid ? 'grid' : 'grid-outline'} size={18} color={showGrid ? '#4ADE80' : '#ccc'} />
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 50,
    paddingHorizontal: 10,
    paddingBottom: 10,
    zIndex: 100,
  },
  keyboardDismissRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  keyboardDismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(30,30,30,0.92)',
  },
  keyboardDismissText: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '600',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  inputBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    backgroundColor: 'rgba(30,30,30,0.92)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  emoteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  emoteBtnActive: {},
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 24,
    paddingHorizontal: 6,
    paddingVertical: 6,
    backgroundColor: 'rgba(30,30,30,0.92)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Palette panel
  palettePanel: {
    backgroundColor: 'rgba(30,30,30,0.95)',
    borderRadius: 16,
    paddingVertical: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: {},
  chipText: { fontSize: 11, fontWeight: '700', color: '#999' },
  chipTextActive: { color: '#fff' },
  slotRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  slot: {
    width: 60,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  slotActive: {},
  slotImg: { width: 36, height: 36, marginBottom: 2 },
  slotLabel: { fontSize: 9, fontWeight: '600', color: '#ccc', textAlign: 'center' },
  emptyText: { fontSize: 12, color: '#888', paddingVertical: 12, paddingHorizontal: 8 },
  // Tool bar (selected item / multi-select)
  toolBarRows: {
    marginBottom: 8,
  },
  toolBarRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 4,
  },
  toolBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(30,30,30,0.92)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  multiSelectBar: {
    backgroundColor: 'rgba(239,68,68,0.85)',
  },
  multiSelectText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  multiDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  multiDeleteText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  rotationGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scaleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  scaleLabel: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
    minWidth: 32,
    textAlign: 'center',
  },
  quickCreateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  quickInput: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  quickCatRow: {
    flexDirection: 'row',
    gap: 4,
  },
  quickGenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  quickGenText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  advancedToggleText: {
    color: '#999',
    fontSize: 11,
    fontWeight: '600',
  },
  advancedSection: {
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  advancedRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  advancedPromptRow: {
    gap: 4,
  },
  advancedPromptInput: {
    minHeight: 56,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.08)',
    textAlignVertical: 'top',
  },
  advancedField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  advancedLabel: {
    color: '#999',
    fontSize: 11,
    fontWeight: '600',
  },
  advancedInput: {
    width: 40,
    height: 28,
    borderRadius: 8,
    paddingHorizontal: 6,
    fontSize: 12,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.08)',
    textAlign: 'center',
  },
});
