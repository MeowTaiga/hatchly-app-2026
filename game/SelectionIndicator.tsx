import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TILE_SIZE } from './constants';

// ─── Props ──────────────────────────────────────────────────────────────────

interface SelectionIndicatorProps {
  /** Grid column of the selected tile */
  col: number;
  /** Grid row of the selected tile */
  row: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Highlights the currently selected tile on the grid.
 *
 * A single lightweight View positioned at the tile's world-space coordinates.
 * Uses a gold border + translucent fill to clearly indicate the selection
 * without blocking the underlying grid.
 */
export const SelectionIndicator = React.memo(function SelectionIndicator({
  col,
  row,
}: SelectionIndicatorProps) {
  return (
    <View
      style={[
        styles.indicator,
        {
          left: col * TILE_SIZE,
          top: row * TILE_SIZE,
        },
      ]}
      pointerEvents="none"
    />
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  indicator: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderWidth: 2.5,
    borderColor: '#FFD700',
    borderRadius: 6,
    backgroundColor: 'rgba(255, 215, 0, 0.18)',
    zIndex: 50,
  },
});
