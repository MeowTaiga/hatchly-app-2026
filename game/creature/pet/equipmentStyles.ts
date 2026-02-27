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
    left: -20,
    bottom: -30,
    width: PET_SIZE * 1.2,
    height: PET_SIZE * 0.9,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    transform: [{ rotate: '-35deg' }],
    transformOrigin: 'bottom left',
  },
  poleImage: {
    width: PET_SIZE * 1.0,
    height: PET_SIZE * 0.8,
    transform: [{ scaleX: -1 }],
  },
  poleEmoji: {
    fontSize: PET_SIZE * 0.8,
  },
  chairWrap: {
    position: 'absolute',
    left: -PET_SIZE * 0.25,
    bottom: -PET_SIZE * 0.25 - 15,
    width: PET_SIZE * 1.5,
    height: PET_SIZE * 1.5,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: -1,
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
