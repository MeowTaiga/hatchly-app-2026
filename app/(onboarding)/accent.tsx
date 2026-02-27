import React from 'react';
import { useRouter } from 'expo-router';
import { StepWrapper } from '@/components/onboarding/StepWrapper';
import { AccentColorSectionPicker } from '@/components/ui/AccentColorSectionPicker';
import { useTheme } from '@/store/ThemeProvider';
import { ACCENT_COLOR_SECTIONS } from '@/constants/accentColors';
import { copy } from '@/constants/onboardingCopy';
import { ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';

/** Step 2: Accent color picker. */
export default function AccentStep() {
  const router = useRouter();
  const { theme, accentColor, setAccentColor } = useTheme();

  return (
    <StepWrapper
      step={2}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={copy.accent.title}
      subtitle={copy.accent.subtitle}
      canContinue
      onContinue={() => router.push('/(onboarding)/name')}
    >
      <AccentColorSectionPicker
        sections={ACCENT_COLOR_SECTIONS}
        selectedHex={accentColor}
        onSelect={(hex) => setAccentColor(hex)}
        selectedBorderColor={theme.colors.surface}
        textColor={theme.colors.text}
        sectionLabelColor={theme.colors.textMuted}
      />
    </StepWrapper>
  );
}
