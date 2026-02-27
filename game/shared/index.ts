/**
 * Shared utilities used across game modules (GameHUD, GameProvider, etc.).
 */

export { createIsHighlighted } from './questHighlightUtils';
export {
  DRAWER_HIGHLIGHT_TYPES,
  DRAWER_OPENER_TARGETS,
  getDrawerOpenerForHighlight,
  type DrawerHighlightType,
} from './drawerHighlightConfig';
export { HighlightableItem } from './HighlightableItem';
export { useDrawerHighlight } from './useDrawerHighlight';
