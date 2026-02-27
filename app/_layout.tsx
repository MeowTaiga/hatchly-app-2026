import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider, useTheme } from '@/store/ThemeProvider';
import { AuthProvider, useAuth } from '@/store/AuthProvider';
import { OnboardingProvider, useOnboarding } from '@/store/OnboardingProvider';
import { ToastProvider } from '@/store/ToastProvider';
import { SocketProvider } from '@/lib/socket';

SplashScreen.preventAutoHideAsync();

/**
 * Inner layout — reads auth context and manages splash screen / socket.
 * Separated so it can sit inside the providers.
 */
function InnerLayout() {
  const { isHydrated, isAuthenticated, hasCompletedOnboarding, token, hydrate } = useAuth();
  const { hydrateFromBackend } = useOnboarding();
  const { themeMode } = useTheme();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Hydrate onboarding provider from backend when user is mid-onboarding
  useEffect(() => {
    if (isHydrated && isAuthenticated && !hasCompletedOnboarding) {
      hydrateFromBackend();
    }
  }, [isHydrated, isAuthenticated, hasCompletedOnboarding, hydrateFromBackend]);

  useEffect(() => {
    if (isHydrated) {
      SplashScreen.hideAsync();
    }
  }, [isHydrated]);

  if (!isHydrated) return null;

  return (
    <SocketProvider token={isAuthenticated ? token : null}>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SocketProvider>
  );
}

/**
 * Root layout — wraps the entire app in AuthProvider + OnboardingProvider.
 * Auth gating happens via the redirect in `app/index.tsx`, not here.
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
        <ThemeProvider>
          <BottomSheetModalProvider>
            <ToastProvider>
              <OnboardingProvider>
                <InnerLayout />
              </OnboardingProvider>
            </ToastProvider>
          </BottomSheetModalProvider>
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
