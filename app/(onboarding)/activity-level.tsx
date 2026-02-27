import React from 'react';
import { useRouter } from 'expo-router';
import { StepWrapper } from '@/components/onboarding/StepWrapper';
import { SelectionCard } from '@/components/onboarding/SelectionCard';
import { useOnboarding } from '@/store/OnboardingProvider';
import { copy } from '@/constants/onboardingCopy';
import { ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';

const OPTIONS = [
  { key: 'sedentary', label: 'Sedentary', icon: '🛋️', description: 'Little to no exercise' },
  { key: 'light', label: 'Lightly Active', icon: '🚶', description: 'Light exercise 1-3 days/week' },
  { key: 'moderate', label: 'Moderately Active', icon: '🏃', description: 'Moderate exercise 3-5 days/week' },
  { key: 'active', label: 'Very Active', icon: '🏋️', description: 'Hard exercise 6-7 days/week' },
  { key: 'athlete', label: 'Athlete', icon: '🥇', description: 'Training twice a day or physical job' },
];

/** Step 13: Activity level selection. */
export default function ActivityLevelStep() {
  const router = useRouter();
  const { activityLevel, setField } = useOnboarding();

  return (
    <StepWrapper
      step={13}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={copy.activityLevel.title}
      subtitle={copy.activityLevel.subtitle}
      canContinue={!!activityLevel}
      onContinue={() => router.push('/(onboarding)/goals')}
    >
      <SelectionCard
        options={OPTIONS}
        selected={activityLevel}
        onSelect={(v) => setField('activityLevel', v)}
      />
    </StepWrapper>
  );
}
