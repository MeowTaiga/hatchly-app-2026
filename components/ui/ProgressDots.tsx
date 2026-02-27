import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/store/ThemeProvider';
import { spacing } from '@/constants/theme';

interface ProgressDotsProps {
  current: number;
  total: number;
}

/**
 * Step indicator dots for the onboarding flow.
 * The current step is highlighted pink; completed steps are lighter pink;
 * future steps are a faint border outline.
 */
export function ProgressDots({ current, total }: ProgressDotsProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
        dot: { height: 8, borderRadius: 4 },
        active: { width: 24, backgroundColor: colors.primary },
        completed: { width: 8, backgroundColor: colors.primaryLight },
        upcoming: { width: 8, backgroundColor: colors.border },
      }),
    [colors],
  );
  return (
    <View style={styles.container}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < current && styles.completed,
            i === current && styles.active,
            i > current && styles.upcoming,
          ]}
        />
      ))}
    </View>
  );
}
