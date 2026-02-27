/**
 * Constants for the Game Provider: default grid sizes and farm level definitions.
 */

import type { FarmLevelDef } from '../types';
import {
  DEFAULT_FARM_COLS,
  DEFAULT_FARM_ROWS,
  DEFAULT_HOUSE_COLS,
  DEFAULT_HOUSE_ROWS,
} from '../constants';
import type { ToolMode } from '../types';

/** Default farm level definitions. Level 1 unlocks the starter grid. */
export const DEFAULT_LEVELS: readonly FarmLevelDef[] = [
  { level: 1, xpRequired: 0, title: 'Seedling', emoji: '🌱', cols: DEFAULT_FARM_COLS, rows: DEFAULT_FARM_ROWS },
];

/** Initial tool mode when the game loads. */
export const INITIAL_TOOL_MODE: ToolMode = 'none';

/** Re-exported for use in initialState and reducer. */
export { DEFAULT_FARM_COLS, DEFAULT_FARM_ROWS, DEFAULT_HOUSE_COLS, DEFAULT_HOUSE_ROWS };
