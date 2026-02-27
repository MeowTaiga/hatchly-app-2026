/**
 * Constants for the Game HUD: toolbar tools, animation values, layout dimensions.
 */

import type { ToolMode } from '../types';

/** Toolbar tools: trash only (shown next to backpack when open). Water/catch are tap-to-use. */
export const TOOLS: {
  mode: ToolMode;
  gameIcon?: 'trash';
  ionicon?: string;
  ioniconOutline?: string;
  label: string;
}[] = [
  { mode: 'trash', gameIcon: 'trash', label: 'Store' },
];

/** Height of the farm and pet stats pills (must match in both). */
export const HUD_PILL_HEIGHT = 30;

/** Approx height of the top section (farm pill + pet stats row, + admin button below when visible). */
const TOP_SECTION_HEIGHT = 88;

/** Vertical offset for content below TopRow (HarvestBubblesView, moveBanner). */
export const BELOW_TOP_ROW_OFFSET = 8 + TOP_SECTION_HEIGHT;

/** Build palette slide offset (px) when closed. */
export const BUILD_PALETTE_SLIDE_OFFSET = 140;

/** Toolbar vertical lift when palette shows 1 row. */
export const TOOLBAR_LIFT_1_ROW = 165;

/** Toolbar vertical lift when palette shows 2 rows (expanded). */
export const TOOLBAR_LIFT_2_ROW = 253;

/** Single row height for build slot strip. */
export const SLOT_ROW_HEIGHT = 88;

/** Height when trash tool shows the "how to use" message. */
export const TRASH_MESSAGE_HEIGHT = 56;

/** Toolbar lift when trash message is shown. */
export const TOOLBAR_LIFT_TRASH = 84;

/** Spring config for palette/toolbar animations. */
export const SPRING_CONFIG = { damping: 70, stiffness: 780 };

/** Duration (ms) for close animation. */
export const CLOSE_DURATION = 220;
