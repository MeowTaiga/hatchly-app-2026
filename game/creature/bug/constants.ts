/** How long a bug pauses between moves (ms). */
export const BUG_IDLE_MIN_MS = 2500;
export const BUG_IDLE_MAX_MS = 6500;

/** How many tiles a bug wanders from its current position. */
export const BUG_WANDER_RADIUS = 3;

/** Base ms per tile for bug movement. */
export const BUG_WALK_SPEED_MS = 520;

/** Sprite size relative to tile. */
export const BUG_SCALE = 0.75;

/** Time to turn and face movement direction before walking (ms). */
export const BUG_TURN_DURATION_MS = 160;

/** Offset (degrees) applied to rotation — adjust if sprite art faces a different default direction. */
export const BUG_ROTATION_OFFSET_DEG = 90;

/** On-host mode: drift radius in pixels. */
export const BUG_ON_HOST_DRIFT_PX = 6;

/** On-host mode: full drift cycle duration (ms). */
export const BUG_ON_HOST_CYCLE_MS = 2000;
