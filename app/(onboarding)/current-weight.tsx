import React from 'react';
import { useRouter } from 'expo-router';
import { StepWrapper } from '@/components/onboarding/StepWrapper';
import { NumberPicker } from '@/components/onboarding/NumberPicker';
import { useOnboarding } from '@/store/OnboardingProvider';
import { copy } from '@/constants/onboardingCopy';
import { ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';

/** Step 11: Current weight input. */
export default function CurrentWeightStep() {
  const router = useRouter();
  const { currentWeight, setField } = useOnboarding();

  return (
    <StepWrapper
      step={11}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={copy.currentWeight.title}
      subtitle={copy.currentWeight.subtitle}
      canContinue={true}
      onContinue={() => router.push('/(onboarding)/goal-weight')}
    >
      <NumberPicker
        value={currentWeight}
        onChange={(v) => setField('currentWeight', v)}
        min={50}
        max={500}
        step={1}
        unit="lbs"
      />
    </StepWrapper>
  );
}
