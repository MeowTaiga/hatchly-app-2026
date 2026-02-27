import React, { useRef, useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { TAB_BAR_TOTAL_HEIGHT } from '@/components/ui/FloatingTabBar';
import { EXPANDED_HEIGHT } from '@/components/ui/PetHeroBar';
import { FitnessDrawer, type FitnessDrawerRef } from '@/components/fitness/FitnessDrawer';
import { WaterDrawer, type WaterDrawerRef } from '@/components/water/WaterDrawer';
import { HealthPeriodProvider } from '@/store/HealthPeriodProvider';
import { PeriodToggle } from '@/components/health/PeriodToggle';
import { WeightOverTimeChart } from '@/components/health/WeightOverTimeChart';
import { NutritionProgressCard } from '@/components/health/NutritionProgressCard';
import { HydrationCard } from '@/components/health/HydrationCard';
import { StepsCard } from '@/components/health/StepsCard';
import { MoodCard } from '@/components/health/MoodCard';
import { usePetHeroScroll, usePetHero } from '@/store/PetHeroProvider';
import { useTheme } from '@/store/ThemeProvider';
import { useToast } from '@/store/ToastProvider';
import { useGameSummary } from '@/hooks/useGameSummary';
import { spacing } from '@/constants/theme';

export default function HealthScreen() {
  const { theme } = useTheme();
  const { typography } = theme;
  const { scrollHandler } = usePetHeroScroll();
  const { triggerXpGain } = usePetHero();
  const { toast } = useToast();
  const { refresh: refreshGameSummary } = useGameSummary();
  const insets = useSafeAreaInsets();
  const fitnessDrawerRef = useRef<FitnessDrawerRef>(null);
  const waterDrawerRef = useRef<WaterDrawerRef>(null);

  const openFitnessDrawer = useCallback(() => {
    fitnessDrawerRef.current?.open();
  }, []);

  const openWaterDrawer = useCallback(() => {
    waterDrawerRef.current?.open();
  }, []);

  const handleWaterLogged = useCallback(
    (xpGained: number, gemsAwarded?: number) => {
      triggerXpGain?.(xpGained);
      if (gemsAwarded && gemsAwarded > 0) {
        toast(`+${gemsAwarded} gems ✨`, 'success');
        refreshGameSummary();
      }
    },
    [triggerXpGain, toast, refreshGameSummary],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scrollContent: {
          paddingHorizontal: spacing.xl,
          paddingBottom: TAB_BAR_TOTAL_HEIGHT + spacing.xl,
          alignItems: 'center',
        },
        title: { ...typography.title, textAlign: 'center' as const, marginBottom: spacing.sm },
        subtitle: { ...typography.subtitle, textAlign: 'center' as const, marginBottom: spacing['2xl'] },
      }),
    [typography],
  );

  return (
    <HealthPeriodProvider>
      <GradientBackground bubbleCount={3}>
        <Animated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: EXPANDED_HEIGHT + insets.top + spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
        >
          <PeriodToggle />
          <WeightOverTimeChart />
          <NutritionProgressCard />
          <HydrationCard onPress={openWaterDrawer} />
          <StepsCard onPress={openFitnessDrawer} />
          <MoodCard />
        </Animated.ScrollView>

        <WaterDrawer ref={waterDrawerRef} onWaterLogged={handleWaterLogged} />
        <FitnessDrawer ref={fitnessDrawerRef} />
      </GradientBackground>
    </HealthPeriodProvider>
  );
}
