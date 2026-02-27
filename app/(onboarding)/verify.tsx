import React, { useState, useMemo } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { StepWrapper } from '@/components/onboarding/StepWrapper';
import { CodeInput } from '@/components/onboarding/CodeInput';
import { useOnboarding } from '@/store/OnboardingProvider';
import { useAuth } from '@/store/AuthProvider';
import { api } from '@/lib/api';
import { copy } from '@/constants/onboardingCopy';
import { ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';
import { useTheme } from '@/store/ThemeProvider';
import { typography, spacing } from '@/constants/theme';

/** Step 7 (onboarding) or standalone (sign-in): Verify the SMS code. */
export default function VerifyStep() {
  const router = useRouter();
  const { theme } = useTheme();
  const { phone, personalityVibe, companionStyle, startPetGeneration, mode } = useOnboarding();
  const { setAuth } = useAuth();
  const isSignIn = mode === 'signin';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    setError('');
    setLoading(true);
    try {
      const { token, user, isNewUser } = await api.verifyCode(phone, code);

      if (isSignIn) {
        if (isNewUser) {
          setError(copy.verifyNoAccount);
          setCode('');
          return;
        }
        await setAuth(token, user, isNewUser);
        if (user.onboardingComplete) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(onboarding)/subscription');
        }
      } else {
        await setAuth(token, user, isNewUser);
        startPetGeneration(token, personalityVibe, companionStyle);
        router.push('/(onboarding)/gender');
      }
    } catch (err: any) {
      setError(err.message ?? copy.verify.error);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <StepWrapper
      step={7}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={copy.verify.title}
      subtitle={copy.verify.subtitle(phone)}
      canContinue={code.length === 6 && !loading}
      continueLabel={loading ? copy.verify.verifying : copy.verify.continue}
      onContinue={handleVerify}
      hideProgress={isSignIn}
    >
      <CodeInput value={code} onChange={setCode} />
      {error ? (
        <Text
          style={[
            typography.caption,
            { color: theme.colors.error, textAlign: 'center', marginTop: spacing.base },
          ]}
        >
          {error}
        </Text>
      ) : null}
    </StepWrapper>
  );
}
