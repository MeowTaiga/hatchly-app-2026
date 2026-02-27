import React, { useState, useMemo } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { StepWrapper } from '@/components/onboarding/StepWrapper';
import { OnboardingInput } from '@/components/onboarding/OnboardingInput';
import { useOnboarding } from '@/store/OnboardingProvider';
import { api } from '@/lib/api';
import { copy } from '@/constants/onboardingCopy';
import { ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';
import { useTheme } from '@/store/ThemeProvider';
import { typography, spacing } from '@/constants/theme';

/** Step 6 (onboarding) or standalone (sign-in): Collect phone number and send SMS code. */
export default function PhoneStep() {
  const router = useRouter();
  const { theme } = useTheme();
  const { phone, setField, mode } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isSignIn = mode === 'signin';

  const isValid = phone.replace(/\D/g, '').length >= 10;

  const errorStyle = useMemo(
    () => ({
      ...typography.caption,
      color: theme.colors.error,
      textAlign: 'center' as const,
      marginTop: spacing.md,
    }),
    [theme.colors.error],
  );

  const handleContinue = async () => {
    setError('');
    setLoading(true);
    try {
      await api.requestCode(phone);
      router.push('/(onboarding)/verify');
    } catch (err: any) {
      setError(err.message ?? copy.phone.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <StepWrapper
      step={6}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={isSignIn ? copy.phoneSignIn.title : copy.phone.title}
      subtitle={isSignIn ? copy.phoneSignIn.subtitle : copy.phone.subtitle}
      canContinue={isValid && !loading}
      continueLabel={loading ? copy.phone.sending : copy.phone.continue}
      onContinue={handleContinue}
      hideProgress={isSignIn}
    >
      <OnboardingInput
        placeholder="(555) 123-4567"
        value={phone}
        onChangeText={(v) => setField('phone', v)}
        keyboardType="phone-pad"
        autoFocus
        maxLength={15}
        textContentType="telephoneNumber"
        autoComplete="tel"
        style={{ height: 60, fontSize: 22, letterSpacing: 1, fontWeight: '600' }}
      />
      {error ? <Text style={errorStyle}>{error}</Text> : null}
    </StepWrapper>
  );
}
