import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { StepWrapper } from '@/components/onboarding/StepWrapper';
import { NumberPicker } from '@/components/onboarding/NumberPicker';
import { useOnboarding } from '@/store/OnboardingProvider';
import { useTheme } from '@/store/ThemeProvider';
import { copy } from '@/constants/onboardingCopy';
import { ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';
import { typography, spacing, radius } from '@/constants/theme';

/** Step 10: Height input (feet then inches, stacked vertically). */
export default function HeightStep() {
  const router = useRouter();
  const { theme } = useTheme();
  const { heightFeet, heightInches, setField } = useOnboarding();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        section: { alignItems: 'center' },
        label: {
          ...typography.label,
          color: theme.colors.textSecondary,
        },
        divider: {
          height: 1,
          backgroundColor: theme.colors.border,
          marginVertical: spacing.sm,
          borderRadius: radius.sm,
        },
      }),
    [theme.colors],
  );

  return (
    <StepWrapper
      step={10}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={copy.height.title}
      subtitle={copy.height.subtitle}
      canContinue
      onContinue={() => router.push('/(onboarding)/current-weight')}
    >
      <View style={styles.section}>
        <Text style={styles.label}>Feet</Text>
        <NumberPicker
          value={heightFeet}
          onChange={(v) => setField('heightFeet', v)}
          min={3}
          max={8}
          unit="ft"
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.label}>Inches</Text>
        <NumberPicker
          value={heightInches}
          onChange={(v) => setField('heightInches', v)}
          min={0}
          max={11}
          unit="in"
        />
      </View>
    </StepWrapper>
  );
}
