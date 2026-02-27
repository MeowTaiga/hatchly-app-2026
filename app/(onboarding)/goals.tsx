import React from 'react';
import { useRouter } from 'expo-router';
import { StepWrapper } from '@/components/onboarding/StepWrapper';
import { SelectionCard } from '@/components/onboarding/SelectionCard';
import { useOnboarding } from '@/store/OnboardingProvider';
import { copy } from '@/constants/onboardingCopy';
import { ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';

const OPTIONS = [
  { key: 'lose-weight', label: 'Lose Weight', icon: '⚖️' },
  { key: 'build-muscle', label: 'Build Muscle', icon: '💪' },
  { key: 'eat-healthier', label: 'Eat Healthier', icon: '🥗' },
  { key: 'improve-fitness', label: 'Improve Fitness', icon: '❤️' },
  { key: 'reduce-stress', label: 'Reduce Stress', icon: '🧘' },
  { key: 'better-sleep', label: 'Better Sleep', icon: '😴' },
  { key: 'more-energy', label: 'More Energy', icon: '⚡' },
];

/** Step 14: Fitness goals (multi-select). */
export default function GoalsStep() {
  const router = useRouter();
  const { goals, toggleArrayItem } = useOnboarding();

  return (
    <StepWrapper
      step={14}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={copy.goals.title}
      subtitle={copy.goals.subtitle}
      canContinue={goals.length > 0}
      onContinue={() => router.push('/(onboarding)/dietary')}
    >
      <SelectionCard
        options={OPTIONS}
        selected={goals}
        onSelect={(key) => toggleArrayItem('goals', key)}
        multi
      />
    </StepWrapper>
  );
}
