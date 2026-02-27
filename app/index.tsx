import { Redirect } from 'expo-router';
import { useAuth } from '@/store/AuthProvider';

/**
 * Root index — auth gate redirect.
 *
 * Routing logic:
 * 1. Authenticated + onboarding complete -> main tabs
 * 2. Authenticated + has pet but onboarding incomplete -> subscription page
 *    (they got past pet selection but didn't finish subscribing)
 * 3. Everything else -> onboarding welcome screen
 */
export default function Index() {
  const { isAuthenticated, hasCompletedOnboarding, user } = useAuth();

  if (isAuthenticated && hasCompletedOnboarding) {
    return <Redirect href="/(tabs)" />;
  }

  if (isAuthenticated && !hasCompletedOnboarding && user?.pet) {
    return <Redirect href="/(onboarding)/subscription" />;
  }

  return <Redirect href="/(onboarding)/welcome" />;
}
