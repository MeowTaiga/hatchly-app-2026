import React from 'react';
import { useRouter } from 'expo-router';
import { StepWrapper } from '@/components/onboarding/StepWrapper';
import { SelectionCard } from '@/components/onboarding/SelectionCard';
import { useOnboarding } from '@/store/OnboardingProvider';
import { copy } from '@/constants/onboardingCopy';
import { ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';

const OPTIONS = [
  { key: 'chill', label: 'Chill & Laid-back', icon: '🧊', description: 'Go with the flow vibes' },
  { key: 'adventurous', label: 'Adventurous', icon: '🏔️', description: 'Always up for a challenge' },
  { key: 'mysterious', label: 'Mysterious', icon: '🌙', description: 'Deep thinker, night owl energy' },
  { key: 'creative', label: 'Creative', icon: '🎨', description: 'Imaginative & expressive' },
  { key: 'energetic', label: 'Energetic', icon: '⚡', description: 'Non-stop energy, let\'s goooo' },
  { key: 'dreamy', label: 'Dreamy', icon: '☁️', description: 'Head in the clouds, heart full of stars' },
];

/** Step 4: Personality vibe — helps determine pet category matching. */
export default function PersonalityVibeStep() {
  const router = useRouter();
  const { personalityVibe, setField } = useOnboarding();

  return (
    <StepWrapper
      step={4}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={copy.personalityVibe.title}
      subtitle={copy.personalityVibe.subtitle}
      canContinue={!!personalityVibe}
      onContinue={() => router.push('/(onboarding)/companion-style')}
    >
      <SelectionCard
        options={OPTIONS}
        selected={personalityVibe}
        onSelect={(v) => setField('personalityVibe', v)}
      />
    </StepWrapper>
  );
}
