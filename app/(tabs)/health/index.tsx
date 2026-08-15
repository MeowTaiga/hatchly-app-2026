import React, { useRef, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
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
import { useAuth } from '@/store/AuthProvider';
import { useTheme } from '@/store/ThemeProvider';
import { useGameSummary } from '@/hooks/useGameSummary';
import { useWeight } from '@/store/WeightProvider';
import { showAppRewards } from '@/lib/showAppRewards';
import { spacing } from '@/constants/theme';
import { GoalsCard } from '@/components/goals/GoalsCard';
import { GoalOverviewCard } from '@/components/health/GoalOverviewCard';
import { GoalsDrawer, type GoalsDrawerRef } from '@/components/goals/GoalsDrawer';

export default function HealthScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { scrollHandler } = usePetHeroScroll();
  const { triggerXpGain } = usePetHero();
  const { refreshUser } = useAuth();
  const { refresh: refreshGameSummary } = useGameSummary();
  const { currentWeight, goalWeight, weeklyChange } = useWeight();
  const insets = useSafeAreaInsets();
  const fitnessDrawerRef = useRef<FitnessDrawerRef>(null);
  const waterDrawerRef = useRef<WaterDrawerRef>(null);
  const goalsDrawerRef = useRef<GoalsDrawerRef>(null);

  const openFitnessDrawer = useCallback(() => {
    fitnessDrawerRef.current?.open();
  }, []);

  const openWaterDrawer = useCallback(() => {
    waterDrawerRef.current?.open();
  }, []);

  const handleWaterLogged = useCallback(
    (xpGained: number, gemsAwarded?: number) => {
      triggerXpGain?.(xpGained);
      showAppRewards({ xpGained, gemsAwarded });
      if ((gemsAwarded ?? 0) > 0 || xpGained > 0) refreshGameSummary();
      if (xpGained > 0) void refreshUser();
    },
    [triggerXpGain, refreshGameSummary, refreshUser],
  );

  const cardShadow = useMemo(
    () =>
      Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
        android: { elevation: 2 },
      }),
    [],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scrollContent: {
          paddingHorizontal: spacing.xl,
          paddingBottom: TAB_BAR_TOTAL_HEIGHT + spacing.xl,
          alignItems: 'center',
        },
        hero: {
          width: '100%',
          borderRadius: 22,
          borderWidth: 1,
          padding: spacing.xl,
          marginBottom: spacing.base,
          overflow: 'hidden',
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        glow: {
          position: 'absolute',
          width: 180,
          height: 180,
          borderRadius: 90,
          top: -70,
          right: -50,
          backgroundColor: colors.primary + '16',
        },
        kicker: {
          fontSize: 11,
          fontWeight: '900',
          letterSpacing: 1.1,
          color: colors.textMuted,
          marginBottom: 4,
        },
        title: {
          fontSize: 24,
          fontWeight: '900',
          letterSpacing: -0.4,
          color: colors.text,
          marginBottom: 4,
        },
        subtitle: {
          fontSize: 14,
          color: colors.textSecondary,
          lineHeight: 20,
          marginBottom: 14,
        },
        statsRow: { flexDirection: 'row', gap: 8 },
        stat: {
          flex: 1,
          borderRadius: 14,
          paddingVertical: 10,
          paddingHorizontal: 8,
          backgroundColor: 'rgba(127,127,127,0.08)',
          alignItems: 'center',
        },
        statLabel: {
          fontSize: 10,
          fontWeight: '800',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: colors.textMuted,
          marginBottom: 2,
        },
        statValue: {
          fontSize: 16,
          fontWeight: '900',
          color: colors.text,
        },
      }),
    [colors],
  );

  const toGo =
    goalWeight > 0 && currentWeight != null ? +(currentWeight - goalWeight).toFixed(1) : null;

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
          <View style={[styles.hero, cardShadow]}>
            <View style={styles.glow} />
            <Text style={styles.kicker}>WELLNESS</Text>
            <Text style={styles.title}>Your progress</Text>
            <Text style={styles.subtitle}>
              Weight, mood, fuel, and movement — one calm place to see the journey.
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Now</Text>
                <Text style={styles.statValue}>
                  {currentWeight != null ? `${currentWeight.toFixed(1)}` : '—'}
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Goal</Text>
                <Text style={styles.statValue}>{goalWeight > 0 ? goalWeight.toFixed(1) : '—'}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Week</Text>
                <Text style={styles.statValue}>
                  {weeklyChange == null ? '—' : `${weeklyChange >= 0 ? '+' : ''}${weeklyChange}`}
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Left</Text>
                <Text style={styles.statValue}>
                  {toGo == null ? '—' : `${toGo >= 0 ? '+' : ''}${toGo}`}
                </Text>
              </View>
            </View>
          </View>

          <GoalsCard onPress={() => goalsDrawerRef.current?.open()} />

          <PeriodToggle />
          <GoalOverviewCard onPress={() => goalsDrawerRef.current?.open()} />
          <WeightOverTimeChart />
          <MoodCard />
          <NutritionProgressCard />
          <HydrationCard onPress={openWaterDrawer} />
          <StepsCard onPress={openFitnessDrawer} />
        </Animated.ScrollView>

        <WaterDrawer ref={waterDrawerRef} onWaterLogged={handleWaterLogged} />
        <FitnessDrawer ref={fitnessDrawerRef} />
        <GoalsDrawer ref={goalsDrawerRef} />
      </GradientBackground>
    </HealthPeriodProvider>
  );
}
