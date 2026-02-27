/**
 * Calls the daily-login-rewards endpoint on app open when user is authenticated.
 * If first login of the day, shows the AI greeting via serverPetDialog.
 */

import { useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/AuthProvider';
import { usePetHero } from '@/store/PetHeroProvider';

export function DailyLoginChecker() {
  const { isAuthenticated, hasCompletedOnboarding } = useAuth();
  const { showPetDialog } = usePetHero();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !hasCompletedOnboarding) return;
    if (checkedRef.current) return;
    checkedRef.current = true;

    api.claimDailyLoginRewards()
      .then((result) => {
        if (result.greeting) {
          showPetDialog(result.greeting);
        }
      })
      .catch(() => {
        checkedRef.current = false;
      });
  }, [isAuthenticated, hasCompletedOnboarding, showPetDialog]);

  return null;
}
