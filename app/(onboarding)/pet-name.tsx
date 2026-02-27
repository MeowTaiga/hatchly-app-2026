import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { StepWrapper } from '@/components/onboarding/StepWrapper';
import { OnboardingInput } from '@/components/onboarding/OnboardingInput';
import { useOnboarding } from '@/store/OnboardingProvider';
import { copy } from '@/constants/onboardingCopy';
import { ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';
import { spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Step 18: Name your pet — appears after pet selection, before hatching. */
export default function PetNameStep() {
  const router = useRouter();
  const { selectedPet, petCustomName, setField } = useOnboarding();
  const [name, setName] = useState(petCustomName || '');

  const handleContinue = () => {
    const trimmed = name.trim();
    setField('petCustomName', trimmed || selectedPet?.name || 'Buddy');
    router.push('/(onboarding)/hatching');
  };

  const petLabel = selectedPet?.name ?? 'companion';

  return (
    <StepWrapper
      step={18}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={copy.petName.title(petLabel)}
      subtitle={copy.petName.subtitle}
      canContinue
      continueLabel={name.trim() ? `Continue with "${name.trim()}"` : 'Skip & use default'}
      onContinue={handleContinue}
    >
      <View style={styles.petPreview}>
        {selectedPet?.image ? (
          <Image
            source={{ uri: selectedPet.image }}
            style={styles.petImage}
            resizeMode="contain"
          />
        ) : (
          <Text style={styles.petFallback}>🐣</Text>
        )}
      </View>

      <OnboardingInput
        placeholder="e.g. Buddy, Luna, Mochi..."
        value={name}
        onChangeText={setName}
        autoFocus
        autoCapitalize="words"
        returnKeyType="done"
        maxLength={20}
      />
    </StepWrapper>
  );
}

const styles = StyleSheet.create({
  petPreview: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  petImage: {
    width: SCREEN_WIDTH * 0.35,
    height: SCREEN_WIDTH * 0.35,
  },
  petFallback: {
    fontSize: 80,
  },
});
