import React, { useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/constants/theme';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WizardStepProps<T> {
  data: T;
  updateData: (partial: Partial<T>) => void;
  next: () => void;
  back: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export interface WizardStep<T> {
  key: string;
  title: string;
  component: React.FC<WizardStepProps<T>>;
}

interface StepWizardProps<T> {
  steps: WizardStep<T>[];
  initialData: T;
  onComplete: (data: T) => void;
  onCancel?: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function StepWizard<T extends Record<string, any>>({
  steps,
  initialData,
  onComplete,
  onCancel,
}: StepWizardProps<T>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [data, setData] = useState<T>(initialData);
  const dataRef = useRef(data);
  dataRef.current = data;

  const updateData = useCallback((partial: Partial<T>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const next = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (currentIndex < steps.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      onComplete(dataRef.current);
    }
  }, [currentIndex, steps.length, onComplete]);

  const back = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    } else {
      onCancel?.();
    }
  }, [currentIndex, onCancel]);

  const step = steps[currentIndex];
  const StepComponent = step.component;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={back} hitSlop={12} style={styles.backButton}>
          <Ionicons
            name={currentIndex === 0 ? 'close' : 'chevron-back'}
            size={22}
            color={colors.text}
          />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{step.title}</Text>
        <Text style={styles.stepIndicator}>
          {currentIndex + 1}/{steps.length}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${((currentIndex + 1) / steps.length) * 100}%` },
          ]}
        />
      </View>

      {/* Step content */}
      <View style={styles.content}>
        <StepComponent
          data={data}
          updateData={updateData}
          next={next}
          back={back}
          isFirst={currentIndex === 0}
          isLast={currentIndex === steps.length - 1}
        />
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.label,
    flex: 1,
  },
  stepIndicator: {
    ...typography.caption,
    color: colors.textMuted,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.border,
    marginHorizontal: spacing.base,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingTop: spacing.base,
  },
});
