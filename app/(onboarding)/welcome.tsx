import React, { useMemo } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { BubbleButton } from '@/components/ui/BubbleButton';
import { AnimatedEntry } from '@/components/ui/AnimatedEntry';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '@/store/OnboardingProvider';
import { useTheme } from '@/store/ThemeProvider';
import { typography, spacing } from '@/constants/theme';

/** Welcome splash — logo, cute intro, CTA to begin onboarding or sign in. */
export default function WelcomeStep() {
  const router = useRouter();
  const { theme } = useTheme();
  const { setMode } = useOnboarding();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1 },
        container: {
          flex: 1,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing['3xl'],
          paddingBottom: spacing['2xl'],
        },
        logoContainer: {
          alignItems: 'center',
          marginBottom: spacing.xl,
        },
        logo: { width: 220, height: 220 },
        subtitle: {
          ...typography.subtitle,
          color: theme.colors.textSecondary,
          textAlign: 'center',
          lineHeight: 24,
        },
        spacer: { flex: 1 },
        signInButton: {
          alignSelf: 'center',
          marginTop: spacing.lg,
          paddingVertical: spacing.sm,
        },
        signInText: {
          ...typography.caption,
          fontSize: 14,
          color: theme.colors.textSecondary,
        },
        signInLink: {
          color: theme.colors.primary,
          fontWeight: '600',
        },
      }),
    [theme.colors],
  );

  const handleGetStarted = () => {
    setMode('onboarding');
    router.push('/(onboarding)/theme');
  };

  const handleSignIn = () => {
    setMode('signin');
    router.push('/(onboarding)/phone');
  };

  return (
    <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <AnimatedEntry>
            <View style={styles.logoContainer}>
              <Image
                source={require('@/assets/images/hatchly_logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </AnimatedEntry>

          <AnimatedEntry delay={200}>
            <Text style={styles.subtitle}>
              Your adorable fitness companion is waiting!{'\n'}
              Let's get to know you so we can personalize your journey.
            </Text>
          </AnimatedEntry>

          <View style={styles.spacer} />

          <AnimatedEntry delay={400}>
            <BubbleButton label="Let's Go!" onPress={handleGetStarted} />
          </AnimatedEntry>

          <AnimatedEntry delay={500}>
            <Pressable onPress={handleSignIn} style={styles.signInButton} hitSlop={12}>
              <Text style={styles.signInText}>
                Already have an account? <Text style={styles.signInLink}>Sign In</Text>
              </Text>
            </Pressable>
          </AnimatedEntry>
        </View>
      </SafeAreaView>
  );
}
