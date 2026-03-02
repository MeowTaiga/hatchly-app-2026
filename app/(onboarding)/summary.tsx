import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { StepWrapper } from '@/components/onboarding/StepWrapper';
import { useOnboarding } from '@/store/OnboardingProvider';
import { useTheme } from '@/store/ThemeProvider';
import { copy } from '@/constants/onboardingCopy';
import { ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';
import { typography, spacing, radius } from '@/constants/theme';

/** Step 19: Summary review — shows all collected data + chosen pet before the paywall. */
export default function SummaryStep() {
  const router = useRouter();
  const { theme } = useTheme();
  const {
    name, gender, birthday, heightFeet, heightInches,
    currentWeight, goalWeight, activityLevel, goals, dietary,
    selectedPet, petCustomName,
  } = useOnboarding();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        petPreview: {
          alignItems: 'center',
          marginBottom: spacing.xl,
        },
        petImage: {
          width: 120,
          height: 120,
          marginBottom: spacing.sm,
        },
        petFallback: {
          fontSize: 64,
          marginBottom: spacing.sm,
        },
        petName: {
          ...typography.label,
          fontSize: 20,
          color: theme.colors.primary,
        },
        petVibe: {
          ...typography.caption,
          color: theme.colors.textSecondary,
          marginTop: 2,
        },
        card: {
          backgroundColor: theme.colors.surface,
          borderRadius: radius.lg,
          padding: spacing.base,
          ...theme.shadows.md,
        },
        row: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        rowLast: { borderBottomWidth: 0 },
        label: {
          ...typography.caption,
          fontSize: 14,
          fontWeight: '600',
          color: theme.colors.textSecondary,
        },
        value: {
          ...typography.body,
          fontSize: 15,
          fontWeight: '600',
          color: theme.colors.text,
          maxWidth: '55%',
          textAlign: 'right',
        },
      }),
    [theme],
  );

  const rows: Array<{ label: string; value: string }> = [
    { label: 'Name', value: name },
    { label: 'Gender', value: gender || 'Not set' },
    { label: 'Birthday', value: birthday || 'Not set' },
    { label: 'Height', value: `${heightFeet}'${heightInches}"` },
    { label: 'Current Weight', value: `${currentWeight} lbs` },
    { label: 'Goal Weight', value: `${goalWeight} lbs` },
    { label: 'Activity Level', value: activityLevel || 'Not set' },
    { label: 'Goals', value: goals.join(', ') || 'None' },
    { label: 'Dietary', value: dietary.join(', ') || 'None' },
  ];

  return (
    <StepWrapper
      step={19}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={copy.summary.title}
      subtitle={copy.summary.subtitle}
      canContinue
      continueLabel="Continue"
      onContinue={() => router.push('/(onboarding)/subscription')}
    >
      {selectedPet && (
        <View style={styles.petPreview}>
          {selectedPet.image ? (
            <CachedImage
              source={{ uri: selectedPet.image }}
              style={styles.petImage}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.petFallback}>🐣</Text>
          )}
          <Text style={styles.petName}>{petCustomName || selectedPet.name}</Text>
          <Text style={styles.petVibe}>{selectedPet.vibe}</Text>
        </View>
      )}

      <View style={styles.card}>
        {rows.map((row, i) => (
          <View key={row.label} style={[styles.row, i === rows.length - 1 && styles.rowLast]}>
            <Text style={styles.label}>{row.label}</Text>
            <Text style={styles.value} numberOfLines={1}>{row.value}</Text>
          </View>
        ))}
      </View>
    </StepWrapper>
  );
}
