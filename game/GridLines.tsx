import React, { useMemo } from 'react';
import { View } from 'react-native';
import { TILE_SIZE } from './constants';

// ─── Props ──────────────────────────────────────────────────────────────────

interface GridLinesProps {
  /** Number of columns in the grid */
  cols: number;
  /** Number of rows in the grid */
  rows: number;
  /** Line colour (default: subtle dark overlay) */
  color?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Renders grid lines as long thin `<View>` elements positioned in world space.
 *
 * **Performance rationale:**
 * For a 64x64 grid this produces 65 + 65 = 130 lines. Each line is a single
 * absolutely-positioned View with no children, no event handlers, and a fixed
 * size. This is orders of magnitude cheaper than rendering 4,096 individual
 * tile Views — React Native can batch-transform all of them in a single
 * native layout pass since they're all absolutely positioned with constant
 * dimensions.
 *
 * The lines live inside the camera-transformed world container, so they move
 * and scale with the grid automatically. No per-frame recalculation needed.
 *
 * @example
 * ```tsx
 * <Animated.View style={worldTransform}>
 *   <GridLines cols={64} rows={64} />
 *   {placedItems}
 * </Animated.View>
 * ```
 */
export const GridLines = React.memo(function GridLines({
  cols,
  rows,
  color = 'rgba(0, 0, 0, 0.08)',
}: GridLinesProps) {
  const worldW = cols * TILE_SIZE;
  const worldH = rows * TILE_SIZE;

  const lines = useMemo(() => {
    const result: React.ReactElement[] = [];

    // Horizontal lines (row boundaries)
    for (let row = 0; row <= rows; row++) {
      result.push(
        <View
          key={`h${row}`}
          style={{
            position: 'absolute',
            left: 0,
            top: row * TILE_SIZE,
            width: worldW,
            height: 1,
            backgroundColor: color,
          }}
        />,
      );
    }

    // Vertical lines (column boundaries)
    for (let col = 0; col <= cols; col++) {
      result.push(
        <View
          key={`v${col}`}
          style={{
            position: 'absolute',
            left: col * TILE_SIZE,
            top: 0,
            width: 1,
            height: worldH,
            backgroundColor: color,
          }}
        />,
      );
    }

    return result;
  }, [cols, rows, worldW, worldH, color]);

  return <>{lines}</>;
});
