import React from 'react';
import { useRouter } from 'expo-router';
import { StepWrapper } from '@/components/onboarding/StepWrapper';
import { OnboardingInput } from '@/components/onboarding/OnboardingInput';
import { useOnboarding } from '@/store/OnboardingProvider';
import { copy } from '@/constants/onboardingCopy';
import { ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';

/** Step 3: Collect the user's name / nickname. */
export default function NameStep() {
  const router = useRouter();
  const { name, setField } = useOnboarding();

  return (
    <StepWrapper
      step={3}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={copy.name.title}
      subtitle={copy.name.subtitle}
      canContinue={name.trim().length >= 2}
      onContinue={() => router.push('/(onboarding)/personality-vibe')}
    >
      <OnboardingInput
        placeholder="Your name"
        value={name}
        onChangeText={(v) => setField('name', v)}
        autoFocus
        autoCapitalize="words"
        returnKeyType="next"
        maxLength={30}
      />
    </StepWrapper>
  );
}
