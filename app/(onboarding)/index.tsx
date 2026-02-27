import { Redirect } from 'expo-router';

/** Redirect bare /(onboarding) to the welcome screen. */
export default function OnboardingIndex() {
  return <Redirect href="/(onboarding)/welcome" />;
}
