import React, { useMemo } from 'react';
import { PetDialog } from '@/game/creature/pet/PetDialog';
import { usePetHero } from '@/store/PetHeroProvider';
import { useAuth } from '@/store/AuthProvider';
import { getPoseForContext, useNeutralPoseCycle } from '@/game/creature/pet';

/**
 * Renders the pet dialog when the server pushes a message (e.g. hunger reminder).
 * Shown on all tabs — home, health, settings, explore, game.
 */
export function GlobalPetDialog() {
  const { serverPetDialog, dismissServerPetDialog } = usePetHero();
  const { user } = useAuth();
  const pet = user?.pet;
  const petName = pet?.customName ?? pet?.name ?? 'Buddy';
  const neutralPoseOverride = useNeutralPoseCycle(!!serverPetDialog);
  const petImageUrl = useMemo(() => {
    const poseKey = getPoseForContext(
      undefined,
      pet?.hunger ?? 100,
      pet?.happy ?? 100,
      pet?.mood ?? 100,
      'dialog',
      pet?.pose,
      { neutralPoseOverride },
    );
    return (poseKey && pet?.pose?.[poseKey]) ?? pet?.imageUrl ?? null;
  }, [pet?.hunger, pet?.happy, pet?.mood, pet?.pose, pet?.imageUrl, neutralPoseOverride]);

  if (!serverPetDialog) return null;

  const message = {
    id: `server_${Date.now()}`,
    text: serverPetDialog.text,
  };

  return (
    <PetDialog
      message={message}
      petName={petName}
      petImageUrl={petImageUrl}
      onDismiss={dismissServerPetDialog}
    />
  );
}
