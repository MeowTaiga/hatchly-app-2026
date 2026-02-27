import React, { forwardRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';

interface TileToolsPanelProps {
  onClose: () => void;

  areaSelectMode: boolean;
  onToggleAreaSelect: () => void;

  paintUnwalkableMode: boolean;
  onTogglePaintUnwalkable: () => void;

  paintFishingMode: boolean;
  onTogglePaintFishing: () => void;

  selectedSpotType: string;
  onSelectSpotType: (type: string) => void;
}

const SPOT_TYPES = [
  { key: 'general', label: 'General' },
  { key: 'river', label: 'River' },
  { key: 'ocean', label: 'Ocean' },
  { key: 'pond', label: 'Pond' },
];

export const TileToolsPanel = forwardRef<AppDrawerRef, TileToolsPanelProps>(
  function TileToolsPanel(
    {
      onClose,
      areaSelectMode,
      onToggleAreaSelect,
      paintUnwalkableMode,
      onTogglePaintUnwalkable,
      paintFishingMode,
      onTogglePaintFishing,
      selectedSpotType,
      onSelectSpotType,
    },
    ref,
  ) {
    return (
      <AppDrawer ref={ref} title="Tile Tools" onClose={onClose} snapPoints={['45%', '70%']}>
        <View style={s.toolsGrid}>
        <Pressable
          style={[s.toolCard, areaSelectMode && s.toolCardActive]}
          onPress={onToggleAreaSelect}
        >
          <Ionicons
            name="scan-outline"
            size={24}
            color={areaSelectMode ? '#fff' : '#ccc'}
          />
          <Text style={[s.toolLabel, areaSelectMode && s.toolLabelActive]}>
            Area Select
          </Text>
        </Pressable>

        <Pressable
          style={[s.toolCard, paintUnwalkableMode && s.toolCardDanger]}
          onPress={onTogglePaintUnwalkable}
        >
          <Ionicons
            name="footsteps-outline"
            size={24}
            color={paintUnwalkableMode ? '#fff' : '#ccc'}
          />
          <Text style={[s.toolLabel, paintUnwalkableMode && s.toolLabelActive]}>
            Unwalkable
          </Text>
        </Pressable>

        <Pressable
          style={[s.toolCard, paintFishingMode && s.toolCardSuccess]}
          onPress={onTogglePaintFishing}
        >
          <Ionicons
            name="fish-outline"
            size={24}
            color={paintFishingMode ? '#fff' : '#ccc'}
          />
          <Text style={[s.toolLabel, paintFishingMode && s.toolLabelActive]}>
            Fishing
          </Text>
        </Pressable>
      </View>

      {paintFishingMode && (
        <View style={s.spotTypeSection}>
          <Text style={s.spotTypeLabel}>Spot Type</Text>
          <View style={s.spotTypeRow}>
            {SPOT_TYPES.map((opt) => (
              <Pressable
                key={opt.key}
                style={[s.spotChip, selectedSpotType === opt.key && s.spotChipActive]}
                onPress={() => onSelectSpotType(opt.key)}
              >
                <Text
                  style={[
                    s.spotChipText,
                    selectedSpotType === opt.key && s.spotChipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

        <Text style={s.hint}>
          {paintUnwalkableMode
            ? 'Tap tiles to toggle unwalkable. Drag to paint an area.'
            : paintFishingMode
              ? 'Tap tiles to toggle fishing spots. Drag to paint an area.'
              : areaSelectMode
                ? 'Drag to select multiple items, then delete them.'
                : 'Select a tool above to start editing tiles.'}
        </Text>
      </AppDrawer>
    );
  },
);
TileToolsPanel.displayName = 'TileToolsPanel';

const s = StyleSheet.create({
  toolsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  toolCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  toolCardActive: {
    backgroundColor: '#6366F1',
  },
  toolCardDanger: {
    backgroundColor: '#EF4444',
  },
  toolCardSuccess: {
    backgroundColor: '#22C55E',
  },
  toolLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ccc',
  },
  toolLabelActive: {
    color: '#fff',
  },
  spotTypeSection: {
    marginBottom: 8,
  },
  spotTypeLabel: {
    color: '#999',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 6,
  },
  spotTypeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  spotChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  spotChipActive: {
    backgroundColor: '#22C55E',
  },
  spotChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#aaa',
  },
  spotChipTextActive: {
    color: '#fff',
  },
  hint: {
    color: '#888',
    fontSize: 11,
    marginTop: 4,
  },
});
