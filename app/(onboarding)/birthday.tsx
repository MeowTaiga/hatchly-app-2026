import React from 'react';
import { useRouter } from 'expo-router';
import { StepWrapper } from '@/components/onboarding/StepWrapper';
import { OnboardingInput } from '@/components/onboarding/OnboardingInput';
import { useOnboarding } from '@/store/OnboardingProvider';
import { copy } from '@/constants/onboardingCopy';
import { ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';

/** Step 9: Birthday / date of birth entry. */
export default function BirthdayStep() {
  const router = useRouter();
  const { birthday, setField } = useOnboarding();

  const formatBirthday = (text: string) => {
    const digits = text.replace(/\D/g, '');
    let formatted = '';
    if (digits.length > 0) formatted = digits.slice(0, 2);
    if (digits.length > 2) formatted += '/' + digits.slice(2, 4);
    if (digits.length > 4) formatted += '/' + digits.slice(4, 8);
    return formatted;
  };

  const isValid = birthday.replace(/\D/g, '').length === 8;

  return (
    <StepWrapper
      step={9}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={copy.birthday.title}
      subtitle={copy.birthday.subtitle}
      canContinue={isValid}
      onContinue={() => router.push('/(onboarding)/height')}
    >
      <OnboardingInput
        placeholder="MM/DD/YYYY"
        value={birthday}
        onChangeText={(v) => setField('birthday', formatBirthday(v))}
        keyboardType="number-pad"
        autoFocus
        maxLength={10}
        style={{ height: 60, fontSize: 24, letterSpacing: 2, fontWeight: '600' }}
      />
    </StepWrapper>
  );
}
