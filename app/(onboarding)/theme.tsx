import React from 'react';
import { useRouter } from 'expo-router';
import { StepWrapper } from '@/components/onboarding/StepWrapper';
import { SelectionCard } from '@/components/onboarding/SelectionCard';
import { useTheme } from '@/store/ThemeProvider';
import { copy } from '@/constants/onboardingCopy';
import { ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';

const OPTIONS = [
  { key: 'light', label: 'Light mode', icon: '☀️', description: 'Bright and cheerful' },
  { key: 'dark', label: 'Dark mode', icon: '🌙', description: 'Easy on the eyes' },
];

/** Step 1: Theme mode — light, dark, or match device. */
export default function ThemeStep() {
  const router = useRouter();
  const { themeMode, setThemeMode } = useTheme();

  const handleSelect = (key: string) => {
    setThemeMode(key as 'light' | 'dark');
  };

  return (
    <StepWrapper
      step={1}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={copy.theme.title}
      subtitle={copy.theme.subtitle}
      canContinue
      onContinue={() => router.push('/(onboarding)/accent')}
    >
      <SelectionCard
        options={OPTIONS}
        selected={themeMode}
        onSelect={handleSelect}
      />
    </StepWrapper>
  );
}
