import React from 'react';
import { useRouter } from 'expo-router';
import { StepWrapper } from '@/components/onboarding/StepWrapper';
import { SelectionCard } from '@/components/onboarding/SelectionCard';
import { useOnboarding } from '@/store/OnboardingProvider';
import { copy } from '@/constants/onboardingCopy';
import { ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';

const OPTIONS = [
  { key: 'none', label: 'No Restrictions', icon: '🍽️' },
  { key: 'vegetarian', label: 'Vegetarian', icon: '🥬' },
  { key: 'vegan', label: 'Vegan', icon: '🌱' },
  { key: 'keto', label: 'Keto', icon: '🥑' },
  { key: 'gluten-free', label: 'Gluten-Free', icon: '🌾' },
  { key: 'dairy-free', label: 'Dairy-Free', icon: '🥛' },
  { key: 'halal', label: 'Halal', icon: '🍖' },
  { key: 'kosher', label: 'Kosher', icon: '✡️' },
];

/** Step 15: Dietary preferences (multi-select, optional). */
export default function DietaryStep() {
  const router = useRouter();
  const { dietary, toggleArrayItem } = useOnboarding();

  return (
    <StepWrapper
      step={15}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={copy.dietary.title}
      subtitle={copy.dietary.subtitle}
      canContinue={true}
      continueLabel={dietary.length === 0 ? 'Skip' : 'Continue'}
      onContinue={() => router.push('/(onboarding)/pet-selection')}
    >
      <SelectionCard
        options={OPTIONS}
        selected={dietary}
        onSelect={(key) => toggleArrayItem('dietary', key)}
        multi
      />
    </StepWrapper>
  );
}
