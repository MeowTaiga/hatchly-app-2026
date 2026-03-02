import React, { useMemo } from 'react';
import { QuestDialogOverlay } from '@/game/QuestDialogOverlay';
import { usePetHero } from '@/store/PetHeroProvider';
import { useAuth } from '@/store/AuthProvider';
import { getPoseForContext, useNeutralPoseCycle } from '@/game/creature/pet';

/**
 * Renders the pet dialog when the server pushes a message (e.g. hunger reminder).
 * Uses the same NPC dialog UI/UX as quest dialogs. Shown on all tabs.
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

  return (
    <QuestDialogOverlay
      steps={[{ text: serverPetDialog.text }]}
      stepIndex={0}
      petName={petName}
      petImageUrl={petImageUrl}
      playerName={petName}
      blocking={false}
      onAdvance={dismissServerPetDialog}
    />
  );
}
