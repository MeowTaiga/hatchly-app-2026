/**
 * Shared styles for pet equipment overlays (fishing pole, chair).
 * Used by PetSprite (farm), RemotePet (multiplayer), and OwnPet (multiplayer).
 */

import { StyleSheet } from 'react-native';
import { TILE_SIZE } from '../../constants';

const PET_SIZE = TILE_SIZE * 2;

export const equipmentStyles = StyleSheet.create({
  poleWrap: {
    position: 'absolute',
    left: (PET_SIZE - PET_SIZE * 1.2) / 2 - 15,
    bottom: 10,
    width: PET_SIZE * 1.2,
    height: PET_SIZE * 0.9,
    alignItems: 'center',
    justifyContent: 'flex-end',
    transformOrigin: 'bottom center',
  },
  poleImage: {
    width: PET_SIZE * 1.0,
    height: PET_SIZE * 0.8,
  },
  poleEmoji: {
    fontSize: PET_SIZE * 0.8,
  },
  chairWrap: {
    position: 'absolute',
    left: (PET_SIZE - PET_SIZE * 1.5) / 2,
    bottom: -PET_SIZE * 0.25 - 15 + 35,
    width: PET_SIZE * 1.5,
    height: PET_SIZE * 1.5,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  chairImage: {
    width: PET_SIZE * 1.5,
    height: PET_SIZE * 1.5,
  },
  chairEmoji: {
    fontSize: PET_SIZE * 1.5,
  },
});
