import React from 'react';
import { useRouter } from 'expo-router';
import { StepWrapper } from '@/components/onboarding/StepWrapper';
import { SelectionCard } from '@/components/onboarding/SelectionCard';
import { useOnboarding } from '@/store/OnboardingProvider';

import { ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';
import { copy } from '@/constants/onboardingCopy';

const OPTIONS = [
  { key: 'cuddly', label: 'Cuddly & Warm', icon: '🧸', description: 'A soft friend to snuggle up with' },
  { key: 'brave', label: 'Brave & Bold', icon: '🦁', description: 'A fearless partner in crime' },
  { key: 'magical', label: 'Magical & Mystical', icon: '✨', description: 'Something otherworldly and enchanting' },
  { key: 'quirky', label: 'Quirky & Unique', icon: '🦎', description: 'One of a kind, totally weird (in a good way)' },
  { key: 'sleek', label: 'Sleek & Cool', icon: '😎', description: 'Smooth, stylish, effortlessly awesome' },
];

/** Step 5: Companion style — second personality axis for pet matching. */
export default function CompanionStyleStep() {
  const router = useRouter();
  const { companionStyle, setField } = useOnboarding();

  return (
    <StepWrapper
      step={5}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={copy.companionStyle.title}
      subtitle={copy.companionStyle.subtitle}
      canContinue={!!companionStyle}
      onContinue={() => router.push('/(onboarding)/phone')}
    >
      <SelectionCard
        options={OPTIONS}
        selected={companionStyle}
        onSelect={(v) => setField('companionStyle', v)}
      />
    </StepWrapper>
  );
}
