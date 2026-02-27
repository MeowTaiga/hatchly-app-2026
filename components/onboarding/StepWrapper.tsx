import React, { useMemo } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { BubbleButton } from '@/components/ui/BubbleButton';
import { ProgressDots } from '@/components/ui/ProgressDots';
import { AnimatedEntry } from '@/components/ui/AnimatedEntry';
import { useOnboarding } from '@/store/OnboardingProvider';
import { useTheme } from '@/store/ThemeProvider';
import { spacing } from '@/constants/theme';

interface StepWrapperProps {
  /** Current step index (0-based) */
  step: number;
  /** Total number of steps */
  totalSteps: number;
  /** Large title displayed at the top */
  title: string;
  /** Descriptive subtitle below the title */
  subtitle?: string;
  /** Whether the continue button is enabled */
  canContinue: boolean;
  /** Override the continue button label */
  continueLabel?: string;
  /** Called when continue is pressed — defaults to router.push of next route */
  onContinue?: () => void;
  /** Hide the back button (e.g. on the welcome screen) */
  hideBack?: boolean;
  /** Hide the continue button (for screens with custom actions) */
  hideContinue?: boolean;
  /** Hide the progress dots */
  hideProgress?: boolean;
  /** The step's unique input UI */
  children: React.ReactNode;
}

/**
 * THE reusable onboarding step container.
 *
 * Every onboarding screen wraps its content in this component.
 * It provides: gradient background, progress dots, animated title + subtitle,
 * a scrollable content area, and a sticky continue button at the bottom.
 *
 * Individual screens only need to provide the unique content (children).
 */
export function StepWrapper({
  step,
  totalSteps,
  title,
  subtitle,
  canContinue,
  continueLabel = 'Continue',
  onContinue,
  hideBack = false,
  hideContinue = false,
  hideProgress = false,
  children,
}: StepWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { saveProgress } = useOnboarding();
  const { theme } = useTheme();
  const { typography } = theme;

  const { colors } = theme;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1 },
        flex: { flex: 1 },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.base,
          paddingVertical: spacing.sm,
        },
        backPlaceholder: { width: 60 },
        content: { flexGrow: 1, paddingHorizontal: spacing.base, paddingTop: spacing.lg },
        title: {
          ...typography.title,
          color: colors.text,
          textAlign: 'center' as const,
          marginBottom: spacing.sm,
        },
        subtitle: {
          ...typography.subtitle,
          color: colors.textSecondary,
          textAlign: 'center' as const,
          marginBottom: spacing['2xl'],
        },
        children: { flex: 1, paddingTop: spacing.base },
        footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.base, paddingTop: spacing.sm },
      }),
    [typography, colors],
  );

  const handleBack = () => router.back();
  const handleContinue = () => {
    // Derive step name from route, e.g. "/(onboarding)/gender" → "gender"
    const stepName = pathname.split('/').pop() || `step-${step}`;
    saveProgress(stepName);
    onContinue?.();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header: back button + progress dots */}
          <View style={styles.header}>
            {!hideBack ? (
              <BubbleButton label="Back" onPress={handleBack} variant="ghost" />
            ) : (
              <View style={styles.backPlaceholder} />
            )}
            {!hideProgress && <ProgressDots current={step} total={totalSteps} />}
            <View style={styles.backPlaceholder} />
          </View>

          {/* Scrollable content area */}
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AnimatedEntry>
              <Text style={styles.title}>{title}</Text>
            </AnimatedEntry>

            {subtitle && (
              <AnimatedEntry delay={80}>
                <Text style={styles.subtitle}>{subtitle}</Text>
              </AnimatedEntry>
            )}

            <AnimatedEntry delay={160}>
              <View style={styles.children}>{children}</View>
            </AnimatedEntry>
          </ScrollView>

          {/* Sticky bottom CTA */}
          {!hideContinue && (
            <View style={styles.footer}>
              <BubbleButton
                label={continueLabel}
                onPress={handleContinue}
                disabled={!canContinue}
              />
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
  );
}
