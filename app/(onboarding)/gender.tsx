import React from 'react';
import { useRouter } from 'expo-router';
import { StepWrapper } from '@/components/onboarding/StepWrapper';
import { SelectionCard } from '@/components/onboarding/SelectionCard';
import { useOnboarding } from '@/store/OnboardingProvider';
import { copy } from '@/constants/onboardingCopy';
import { ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';

const OPTIONS = [
  { key: 'male', label: 'Male', icon: '👦' },
  { key: 'female', label: 'Female', icon: '👧' },
  { key: 'nonbinary', label: 'Non-binary', icon: '🌟' },
  { key: 'prefer-not', label: 'Prefer not to say', icon: '✨' },
];

/** Step 8: Gender selection. */
export default function GenderStep() {
  const router = useRouter();
  const { gender, setField } = useOnboarding();

  return (
    <StepWrapper
      step={8}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={copy.gender.title}
      subtitle={copy.gender.subtitle}
      canContinue={!!gender}
      onContinue={() => router.push('/(onboarding)/birthday')}
    >
      <SelectionCard
        options={OPTIONS}
        selected={gender}
        onSelect={(v) => setField('gender', v)}
      />
    </StepWrapper>
  );
}
