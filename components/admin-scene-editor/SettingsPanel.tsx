import React, { forwardRef, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { ItemSearchDropdown, type SearchableItem } from '@/components/ui/ItemSearchDropdown';
import { SceneColorPickerModal } from './SceneColorPickerModal';

interface SettingsPanelProps {
  onClose: () => void;

  editCols: string;
  editRows: string;
  editFarmCols: string;
  editFarmRows: string;
  editBgColor: string;
  editTiledFlooringItemType: string | null;
  editGrassNoise: string;
  onEditCols: (v: string) => void;
  onEditRows: (v: string) => void;
  onEditFarmCols: (v: string) => void;
  onEditFarmRows: (v: string) => void;
  onEditBgColor: (v: string) => void;
  onEditTiledFlooringItemType: (v: string | null) => void;
  onEditGrassNoise: (v: string) => void;
  onApplyBgColor?: () => void;
  searchableTiledFlooring: SearchableItem[];

  showProceduralOptions: boolean;
  onToggleProceduralOptions: () => void;
  proceduralOverrides: {
    outerBushType?: string;
    treeTypes?: string[];
  };
  onSetProceduralOverrides: (fn: (prev: SettingsPanelProps['proceduralOverrides']) => SettingsPanelProps['proceduralOverrides']) => void;
  defaultTreeTypes: string[];
  defaultOuterBush: string;
  searchableTrees: SearchableItem[];
  searchableOuterBush: SearchableItem[];

  saving: boolean;
  loadingPrecompute: boolean;
  onApplyDimensions: () => void;
  onLoadPrecomputed: () => void;

  placementCount: number;
  sceneCols: number;
  sceneRows: number;
  farmCols: number;
  farmRows: number;
}

export const SettingsPanel = forwardRef<AppDrawerRef, SettingsPanelProps>(
  function SettingsPanel(
    {
      onClose,
      editCols,
      editRows,
      editFarmCols,
      editFarmRows,
      editBgColor,
      editTiledFlooringItemType,
      editGrassNoise,
      onEditCols,
      onEditRows,
      onEditFarmCols,
      onEditFarmRows,
      onEditBgColor,
      onEditTiledFlooringItemType,
      onEditGrassNoise,
      onApplyBgColor,
      searchableTiledFlooring,
      showProceduralOptions,
      onToggleProceduralOptions,
      proceduralOverrides,
      onSetProceduralOverrides,
      defaultTreeTypes,
      defaultOuterBush,
      searchableTrees,
      searchableOuterBush,
      saving,
      loadingPrecompute,
      onApplyDimensions,
      onLoadPrecomputed,
      placementCount,
      sceneCols,
      sceneRows,
      farmCols,
      farmRows,
    },
    ref,
  ) {
    const bgColorApplyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [colorPickerVisible, setColorPickerVisible] = useState(false);
    useEffect(() => {
      return () => {
        if (bgColorApplyRef.current) clearTimeout(bgColorApplyRef.current);
      };
    }, []);

    const handleBgColorChange = (v: string) => {
      onEditBgColor(v);
      if (onApplyBgColor) {
        if (bgColorApplyRef.current) clearTimeout(bgColorApplyRef.current);
        bgColorApplyRef.current = setTimeout(() => {
          bgColorApplyRef.current = null;
          onApplyBgColor();
        }, 500);
      }
    };

    return (
      <AppDrawer ref={ref} title="Scene Settings" onClose={onClose} snapPoints={['50%', '90%']}>
        <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
          <View style={s.row}>
        <View style={s.field}>
          <Text style={s.label}>Cols</Text>
          <TextInput style={s.input} value={editCols} onChangeText={onEditCols} keyboardType="number-pad" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
        </View>
        <View style={s.field}>
          <Text style={s.label}>Rows</Text>
          <TextInput style={s.input} value={editRows} onChangeText={onEditRows} keyboardType="number-pad" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
        </View>
        <View style={s.field}>
          <Text style={s.label}>Farm C</Text>
          <TextInput style={s.input} value={editFarmCols} onChangeText={onEditFarmCols} keyboardType="number-pad" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
        </View>
        <View style={s.field}>
          <Text style={s.label}>Farm R</Text>
          <TextInput style={s.input} value={editFarmRows} onChangeText={onEditFarmRows} keyboardType="number-pad" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
        </View>
      </View>

      <View style={[s.row, { marginTop: 10 }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Ground Tile</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <ItemSearchDropdown
                items={searchableTiledFlooring}
                value={editTiledFlooringItemType ?? ''}
                onSelect={(key) => onEditTiledFlooringItemType(key || null)}
                placeholder="Select tiled flooring (or use color below)"
              />
            </View>
            {editTiledFlooringItemType ? (
              <Pressable
                onPress={() => onEditTiledFlooringItemType(null)}
                style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 }}
              >
                <Ionicons name="close" size={18} color="#fff" />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      <View style={[s.row, { marginTop: 10 }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Ground Color (fallback when no tile)</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable onPress={() => setColorPickerVisible(true)}>
              <View style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: /^#[0-9a-fA-F]{6}$/.test(editBgColor) ? editBgColor : '#7EC87E', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }} />
            </Pressable>
            <SceneColorPickerModal
              visible={colorPickerVisible}
              currentColor={/^#[0-9a-fA-F]{6}$/.test(editBgColor) ? editBgColor : '#7EC87E'}
              onSelect={(hex) => {
                onEditBgColor(hex);
                setColorPickerVisible(false);
              }}
              onClose={() => setColorPickerVisible(false)}
            />
            <TextInput
              style={[s.input, { flex: 1, marginBottom: 0 }]}
              value={editBgColor}
              onChangeText={handleBgColorChange}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={() => { Keyboard.dismiss(); onApplyBgColor?.(); }}
            />
          </View>
        </View>
      </View>

      <View style={[s.row, { marginTop: 8 }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Grass Noise (0–0.2)</Text>
          <TextInput
            style={[s.input, { marginBottom: 0 }]}
            value={editGrassNoise}
            onChangeText={onEditGrassNoise}
            keyboardType="decimal-pad"
            placeholder="0.04"
            placeholderTextColor="#666"
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />
        </View>
      </View>

      <Pressable
        style={[s.row, { marginTop: 12, justifyContent: 'space-between', alignItems: 'center' }]}
        onPress={onToggleProceduralOptions}
      >
        <Text style={s.label}>Scenery options (Load Procedural)</Text>
        <Ionicons name={showProceduralOptions ? 'chevron-up' : 'chevron-down'} size={18} color="#999" />
      </Pressable>

      {showProceduralOptions && (
        <ScrollView style={{ marginTop: 8, maxHeight: 320 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
          <View style={{ gap: 16 }}>
            <View>
              <Text style={[s.label, { marginBottom: 8 }]}>Trees</Text>
              <View style={{ gap: 8 }}>
                {[0, 1, 2].map((i) => {
                  const current = proceduralOverrides.treeTypes ?? defaultTreeTypes;
                  const value = current[i] ?? defaultTreeTypes[i];
                  return (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[s.label, { marginBottom: 0, minWidth: 50 }]}>Tree {i + 1}</Text>
                      <View style={{ flex: 1 }}>
                        <ItemSearchDropdown
                          items={searchableTrees}
                          value={value}
                          onSelect={(key) =>
                            onSetProceduralOverrides((o) => {
                              const prev = o.treeTypes ?? [...defaultTreeTypes];
                              const next = [...prev];
                              if (next.length <= i) next.length = i + 1;
                              next[i] = key;
                              return { ...o, treeTypes: next };
                            })
                          }
                          placeholder="Search trees…"
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
            <View>
              <Text style={[s.label, { marginBottom: 8 }]}>Walkable Edge Decoration</Text>
              <ItemSearchDropdown
                items={searchableOuterBush}
                value={proceduralOverrides.outerBushType ?? defaultOuterBush}
                onSelect={(key) => onSetProceduralOverrides((o) => ({ ...o, outerBushType: key }))}
                placeholder="Search edge decoration…"
              />
            </View>
          </View>
        </ScrollView>
      )}

      <View style={s.actions}>
        <Pressable style={[s.actionBtn, { backgroundColor: '#10B981' }, saving && { opacity: 0.5 }]} onPress={onApplyDimensions} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={16} color="#fff" />}
          <Text style={s.actionBtnText}>Apply</Text>
        </Pressable>
        <Pressable style={[s.actionBtn, loadingPrecompute && { opacity: 0.5 }]} onPress={onLoadPrecomputed} disabled={loadingPrecompute}>
          {loadingPrecompute ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="download-outline" size={16} color="#fff" />}
          <Text style={s.actionBtnText}>Load Procedural</Text>
        </Pressable>
      </View>
          <Text style={s.hint}>
            {placementCount} items · {sceneCols}×{sceneRows} canvas · {farmCols}×{farmRows} farm
          </Text>
        </Pressable>
      </AppDrawer>
    );
  },
);
SettingsPanel.displayName = 'SettingsPanel';

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  field: { flex: 1 },
  label: { color: '#999', fontSize: 10, fontWeight: '600', marginBottom: 4 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#6366F1',
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  hint: { color: '#888', fontSize: 11, marginTop: 8 },
});
