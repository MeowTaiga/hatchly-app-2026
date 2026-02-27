import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FloatingBubbles } from '@/components/ui/FloatingBubbles';
import { useTheme } from '@/store/ThemeProvider';

/**
 * Onboarding stack — no headers, clean transitions.
 * Bubbles are rendered once here and persist across all steps (no re-mount on navigation).
 * Bubbles layer is on top (pointerEvents: none) so screens can use opaque backgrounds for clean transitions.
 */
export default function OnboardingLayout() {
  const { theme } = useTheme();
  const colors = theme.gradients.dreamy as readonly string[];
  const screenBg = colors[0];
  return (
    <LinearGradient colors={colors as any} style={styles.gradient}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
          contentStyle: { backgroundColor: screenBg },
        }}
      />
      <View style={styles.bubblesOverlay} pointerEvents="none">
        <FloatingBubbles count={8} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  bubblesOverlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
});
