import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  useSharedValue,
  useAnimatedScrollHandler,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { usePathname } from 'expo-router';
import { useSocketEvent } from '@/lib/socket';
import { PetProfileDrawer, type PetProfileDrawerRef } from '@/components/ui/PetProfileDrawer';

const WS_PET_DIALOG = 'pet:dialog';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PetHeroContextValue {
  /** 0 = expanded, 1 = collapsed — drives all hero bar animations */
  collapsed: SharedValue<number>;
  /** Trigger a floating +XP animation on the hero bar */
  triggerXpGain?: (amount: number) => void;
  /** Clear the XP event after animation completes (prevents replay on remount) */
  clearXpGainEvent: () => void;
  /** Current XP gain event (amount > 0 means animation playing) */
  xpGainEvent: { amount: number; key: number };
  /** Server-pushed pet dialog (e.g. hunger reminder) — show globally */
  serverPetDialog: { text: string } | null;
  dismissServerPetDialog: () => void;
  /** Programmatically show a pet dialog (e.g. daily greeting, welcome back) */
  showPetDialog: (text: string) => void;
  /** Open the pet profile drawer (from PetStatsDisplay tap) */
  openPetProfileDrawer: () => void;
}

// ─── Scroll threshold before collapse triggers ──────────────────────────────

const COLLAPSE_THRESHOLD = 80;
const SCROLL_UP_SENSITIVITY = 10;
const ANIM_DURATION = 280;

// ─── Context ────────────────────────────────────────────────────────────────

const PetHeroContext = createContext<PetHeroContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

export function PetHeroProvider({ children }: { children: React.ReactNode }) {
  const collapsed = useSharedValue(0);
  const [xpGainEvent, setXpGainEvent] = useState({ amount: 0, key: 0 });
  const [serverPetDialog, setServerPetDialog] = useState<{ text: string } | null>(null);
  const pathname = usePathname();
  const petProfileDrawerRef = useRef<PetProfileDrawerRef>(null);

  useSocketEvent<{ text: string }>(WS_PET_DIALOG, (data) => {
    setServerPetDialog({ text: data.text });
  });

  useEffect(() => {
    const isSettings = pathname?.includes('settings') ?? false;
    const isScrollableHeroTab =
      pathname === '/' ||
      pathname === '/index' ||
      pathname?.startsWith('/health') === true;

    if (isSettings) {
      collapsed.value = withTiming(1, { duration: 150 });
    } else if (isScrollableHeroTab) {
      // At top of scrollable page → expand hero
      collapsed.value = withTiming(0, { duration: 150 });
    }
  }, [pathname]);

  const triggerXpGain = useCallback((amount: number) => {
    setXpGainEvent({ amount, key: Date.now() });
  }, []);

  const clearXpGainEvent = useCallback(() => {
    setXpGainEvent({ amount: 0, key: 0 });
  }, []);

  const dismissServerPetDialog = useCallback(() => {
    setServerPetDialog(null);
  }, []);

  const showPetDialog = useCallback((text: string) => {
    setServerPetDialog({ text });
  }, []);

  const openPetProfileDrawer = useCallback(() => {
    petProfileDrawerRef.current?.open();
  }, []);

  return (
    <PetHeroContext.Provider
      value={{
        collapsed,
        triggerXpGain,
        clearXpGainEvent,
        xpGainEvent,
        serverPetDialog,
        dismissServerPetDialog,
        showPetDialog,
        openPetProfileDrawer,
      }}
    >
      <PetProfileDrawer ref={petProfileDrawerRef} />
      {children}
    </PetHeroContext.Provider>
  );
}

// ─── Hook: read shared state ────────────────────────────────────────────────

export function usePetHero(): PetHeroContextValue {
  const ctx = useContext(PetHeroContext);
  if (!ctx) throw new Error('usePetHero must be used within <PetHeroProvider>');
  return ctx;
}

// ─── Hook: create a scroll handler for a tab screen ─────────────────────────

/**
 * Returns a Reanimated scroll handler that drives the hero bar's
 * collapse / expand animation based on scroll direction.
 *
 * Key perf optimisation: `targetState` tracks the desired end state
 * so `withTiming` is only called when the target **changes**, not on
 * every scroll frame.
 */
export function usePetHeroScroll() {
  const { collapsed } = usePetHero();
  const lastY = useSharedValue(0);
  const targetState = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      const dy = y - lastY.value;
      lastY.value = y;

      let next = targetState.value;

      if (y < 10) {
        next = 0;
      } else if (dy > 0 && y > COLLAPSE_THRESHOLD) {
        next = 1;
      } else if (dy < -SCROLL_UP_SENSITIVITY) {
        next = 0;
      }

      // Only start a new timing animation when the target actually changes
      if (next !== targetState.value) {
        targetState.value = next;
        collapsed.value = withTiming(next, { duration: ANIM_DURATION });
      }
    },
  });

  return { scrollHandler };
}
