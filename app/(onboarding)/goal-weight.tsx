import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { StepWrapper } from '@/components/onboarding/StepWrapper';
import { NumberPicker } from '@/components/onboarding/NumberPicker';
import { useOnboarding } from '@/store/OnboardingProvider';
import { copy } from '@/constants/onboardingCopy';
import { ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';
import { getSuggestedGoalWeight, getHealthyWeightRange } from '@/utils/weightUtils';

/** Step 12: Goal weight input. Defaults to healthy BMI-based suggestion from current weight + height. */
export default function GoalWeightStep() {
  const router = useRouter();
  const { goalWeight, currentWeight, heightFeet, heightInches, setField } = useOnboarding();

  const suggested = getSuggestedGoalWeight(currentWeight, heightFeet, heightInches);
  const isUnset = goalWeight <= 0;

  // When user first lands, set goal to BMI-based suggestion
  useEffect(() => {
    if (isUnset && currentWeight > 0 && heightFeet > 0) {
      const s = getSuggestedGoalWeight(currentWeight, heightFeet, heightInches);
      setField('goalWeight', s);
    }
  }, [isUnset, currentWeight, heightFeet, heightInches, setField]);

  const { min: healthyMin, max: healthyMax } = getHealthyWeightRange(heightFeet, heightInches);
  const displayValue = isUnset && currentWeight > 0 && heightFeet > 0 ? suggested : goalWeight;

  return (
    <StepWrapper
      step={12}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={copy.goalWeight.title}
      subtitle={copy.goalWeight.subtitle}
      canContinue={true}
      onContinue={() => router.push('/(onboarding)/activity-level')}
    >
      <NumberPicker
        value={displayValue}
        onChange={(v) => setField('goalWeight', v)}
        min={Math.max(50, healthyMin - 20)}
        max={Math.min(500, healthyMax + 50)}
        step={1}
        unit="lbs"
      />
    </StepWrapper>
  );
}
