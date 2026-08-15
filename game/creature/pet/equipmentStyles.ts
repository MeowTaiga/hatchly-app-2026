/**
 * Shared styles / resolvers for pet equipment overlays (hand tools, chairs).
 * Used by PetSprite (farm), RemotePet (multiplayer), and OwnPet (multiplayer).
 */

import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { TILE_SIZE } from '../../constants';

export const PET_EQUIP_SIZE = TILE_SIZE * 2;

/** Idle absolute rotation written by usePetAI into toolRotationDeg. */
export const TOOL_ANIM_IDLE_ROTATION_DEG = -50;

export type EquipOverlaySlot = 'handTool' | 'chair';

export interface EquipOverlayConfig {
  x?: number;
  y?: number;
  flipX?: boolean;
  flipY?: boolean;
  rotationDeg?: number;
  scale?: number;
}

export interface ResolvedEquipOverlay {
  x: number;
  y: number;
  flipX: boolean;
  flipY: boolean;
  rotationDeg: number;
  scale: number;
}

const HAND_TOOL_DEFAULTS: ResolvedEquipOverlay = {
  x: (PET_EQUIP_SIZE - PET_EQUIP_SIZE * 1.2) / 2 - 33,
  y: 10,
  flipX: true,
  flipY: false,
  rotationDeg: TOOL_ANIM_IDLE_ROTATION_DEG,
  scale: 1,
};

const CHAIR_DEFAULTS: ResolvedEquipOverlay = {
  x: (PET_EQUIP_SIZE - PET_EQUIP_SIZE * 1.5) / 2,
  y: -PET_EQUIP_SIZE * 0.25 - 15 + 35,
  flipX: false,
  flipY: false,
  rotationDeg: 0,
  scale: 1,
};

export function defaultEquipOverlay(slot: EquipOverlaySlot): ResolvedEquipOverlay {
  return slot === 'chair' ? { ...CHAIR_DEFAULTS } : { ...HAND_TOOL_DEFAULTS };
}

export function resolveEquipOverlay(
  slot: EquipOverlaySlot,
  overlay?: EquipOverlayConfig | null,
): ResolvedEquipOverlay {
  const d = defaultEquipOverlay(slot);
  if (!overlay) return d;
  return {
    x: overlay.x ?? d.x,
    y: overlay.y ?? d.y,
    flipX: overlay.flipX ?? d.flipX,
    flipY: overlay.flipY ?? d.flipY,
    rotationDeg: overlay.rotationDeg ?? d.rotationDeg,
    scale: overlay.scale ?? d.scale,
  };
}

export function buildEquipWrapStyle(
  slot: EquipOverlaySlot,
  resolved: ResolvedEquipOverlay,
): ViewStyle {
  const isChair = slot === 'chair';
  return {
    position: 'absolute',
    left: resolved.x,
    bottom: resolved.y,
    width: isChair ? PET_EQUIP_SIZE * 1.5 : PET_EQUIP_SIZE * 1.2,
    height: isChair ? PET_EQUIP_SIZE * 1.5 : PET_EQUIP_SIZE * 0.9,
    alignItems: 'center',
    justifyContent: 'flex-end',
    transformOrigin: 'bottom center',
    overflow: 'visible',
  };
}

export function buildEquipImageStyle(
  slot: EquipOverlaySlot,
  resolved: ResolvedEquipOverlay,
): ImageStyle {
  const isChair = slot === 'chair';
  const sx = (resolved.flipX ? -1 : 1) * resolved.scale;
  const sy = (resolved.flipY ? -1 : 1) * resolved.scale;
  return {
    width: isChair ? PET_EQUIP_SIZE * 1.5 : PET_EQUIP_SIZE * 1.0,
    height: isChair ? PET_EQUIP_SIZE * 1.5 : PET_EQUIP_SIZE * 0.8,
    transform: [{ scaleX: sx }, { scaleY: sy }],
  };
}

export function buildEquipEmojiStyle(
  slot: EquipOverlaySlot,
  resolved: ResolvedEquipOverlay,
): TextStyle {
  const isChair = slot === 'chair';
  const sx = (resolved.flipX ? -1 : 1) * resolved.scale;
  const sy = (resolved.flipY ? -1 : 1) * resolved.scale;
  return {
    fontSize: isChair ? PET_EQUIP_SIZE * 1.5 : PET_EQUIP_SIZE * 0.8,
    transform: [{ scaleX: sx }, { scaleY: sy }],
  };
}

/** Legacy static styles — prefer resolve + build helpers for new code. */
export const equipmentStyles = StyleSheet.create({
  poleWrap: {
    position: 'absolute',
    left: HAND_TOOL_DEFAULTS.x,
    bottom: HAND_TOOL_DEFAULTS.y,
    width: PET_EQUIP_SIZE * 1.2,
    height: PET_EQUIP_SIZE * 0.9,
    alignItems: 'center',
    justifyContent: 'flex-end',
    transformOrigin: 'bottom center',
  },
  poleImage: {
    width: PET_EQUIP_SIZE * 1.0,
    height: PET_EQUIP_SIZE * 0.8,
    transform: [{ scaleX: -1 }],
  },
  poleEmoji: {
    fontSize: PET_EQUIP_SIZE * 0.8,
    transform: [{ scaleX: -1 }],
  },
  chairWrap: {
    position: 'absolute',
    left: CHAIR_DEFAULTS.x,
    bottom: CHAIR_DEFAULTS.y,
    width: PET_EQUIP_SIZE * 1.5,
    height: PET_EQUIP_SIZE * 1.5,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  chairImage: {
    width: PET_EQUIP_SIZE * 1.5,
    height: PET_EQUIP_SIZE * 1.5,
  },
  chairEmoji: {
    fontSize: PET_EQUIP_SIZE * 1.5,
  },
});
