import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { CircleTracker } from '@/components/ui/CircleTracker';
import { TAB_BAR_TOTAL_HEIGHT } from '@/components/ui/FloatingTabBar';
import { EXPANDED_HEIGHT } from '@/components/ui/PetHeroBar';
import { FoodDrawer, type FoodDrawerRef } from '@/components/food/FoodDrawer';
import { FoodDetailDrawer, type FoodDetailDrawerRef } from '@/components/food/FoodDetailDrawer';
import { MacroInfoDrawer, type MacroInfoDrawerRef } from '@/components/food/MacroInfoDrawer';
import { WeightDrawer, type WeightDrawerRef } from '@/components/weight/WeightDrawer';
import { WaterDrawer, type WaterDrawerRef } from '@/components/water/WaterDrawer';
import { FitnessDrawer, type FitnessDrawerRef } from '@/components/fitness/FitnessDrawer';
import { FoodLogSection } from '@/components/food/FoodLogSection';
import { ActionBanner } from '@/components/ui/ActionBanner';
import { FastingTimerCard } from '@/components/fasting/FastingTimerCard';
import { FastingInterestDrawer, type FastingInterestDrawerRef } from '@/components/fasting/FastingInterestDrawer';
import { FastingDrawer, type FastingDrawerRef } from '@/components/fasting/FastingDrawer';
import { GoalsCard } from '@/components/goals/GoalsCard';
import { GoalsDrawer, type GoalsDrawerRef } from '@/components/goals/GoalsDrawer';
import { AchievementRow } from '@/components/ui/AchievementRow';
import { FriendsActivityRow } from '@/components/friends/FriendsActivityRow';
import { TodayPulseCard } from '@/components/home/TodayPulseCard';
import { PetCareCard } from '@/components/home/PetCareCard';
import { FarmHubCard } from '@/components/home/FarmHubCard';
import { AdventureStrip } from '@/components/home/AdventureStrip';
import { MoodQuickDrawer, type MoodQuickDrawerRef } from '@/components/home/MoodQuickDrawer';
import { usePetHeroScroll, usePetHero } from '@/store/PetHeroProvider';
import { useAuth } from '@/store/AuthProvider';
import { useFood } from '@/store/FoodProvider';
import { useMacroGoals } from '@/store/MacroGoalsProvider';
import { useWeight } from '@/store/WeightProvider';
import { useWater } from '@/store/WaterProvider';
import { useFasting } from '@/store/FastingProvider';
import { useTheme } from '@/store/ThemeProvider';
import { useGameSummary } from '@/hooks/useGameSummary';
import { showAppRewards } from '@/lib/showAppRewards';
import { NUTRIENT_CONFIG } from '@/lib/nutrients';
import { spacing, getMacroLabelColor } from '@/constants/theme';

export default function HomeScreen() {
  const { theme, themeMode } = useTheme();
  const { refreshUser } = useAuth();
  const { refresh: refreshGameSummary } = useGameSummary();
  const { colors } = theme;
  const { scrollHandler } = usePetHeroScroll();

  // Re-fetch farm/adventure counts whenever Home gains focus (e.g. after catching bugs).
  useFocusEffect(
    useCallback(() => {
      refreshGameSummary();
    }, [refreshGameSummary]),
  );
  const { triggerXpGain } = usePetHero();
  const { totals } = useFood();
  const { goals: macroGoals, orderedNutrientKeys, updateGoal, updateNutrientOrder } = useMacroGoals();
  const { currentWeight, weeklyChange, todayLog, goalWeight, dailyCalorieTarget } = useWeight();
  const { totalOz, goalOz } = useWater();
  const { interested: fastingInterested, isLoaded: fastingLoaded } = useFasting();
  const insets = useSafeAreaInsets();
  const [stepCount, setStepCount] = useState<number | null>(null);
  const [moodRefreshToken, setMoodRefreshToken] = useState(0);
  const foodDrawerRef = useRef<FoodDrawerRef>(null);
  const weightDrawerRef = useRef<WeightDrawerRef>(null);
  const waterDrawerRef = useRef<WaterDrawerRef>(null);
  const fitnessDrawerRef = useRef<FitnessDrawerRef>(null);
  const macroInfoDrawerRef = useRef<MacroInfoDrawerRef>(null);
  const foodDetailDrawerRef = useRef<FoodDetailDrawerRef>(null);
  const moodDrawerRef = useRef<MoodQuickDrawerRef>(null);
  const fastingInterestRef = useRef<FastingInterestDrawerRef>(null);
  const fastingDrawerRef = useRef<FastingDrawerRef>(null);
  const goalsDrawerRef = useRef<GoalsDrawerRef>(null);
  const drawerOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const calorieGoal = dailyCalorieTarget;

  const handleFoodLogged = useCallback((xpGained: number, gemsAwarded?: number) => {
    triggerXpGain?.(xpGained);
    showAppRewards({ xpGained, gemsAwarded });
    if ((gemsAwarded ?? 0) > 0 || xpGained > 0) refreshGameSummary();
    if (xpGained > 0) void refreshUser();
  }, [triggerXpGain, refreshGameSummary, refreshUser]);

  const handleWeightLogged = useCallback((xpGained: number, gemsAwarded?: number) => {
    triggerXpGain?.(xpGained);
    showAppRewards({ xpGained, gemsAwarded });
    if ((gemsAwarded ?? 0) > 0 || xpGained > 0) refreshGameSummary();
    if (xpGained > 0) void refreshUser();
  }, [triggerXpGain, refreshGameSummary, refreshUser]);

  const handleWaterLogged = useCallback((xpGained: number, gemsAwarded?: number) => {
    triggerXpGain?.(xpGained);
    showAppRewards({ xpGained, gemsAwarded });
    if ((gemsAwarded ?? 0) > 0 || xpGained > 0) refreshGameSummary();
    if (xpGained > 0) void refreshUser();
  }, [triggerXpGain, refreshGameSummary, refreshUser]);

  const clearPendingDrawerOpen = useCallback(() => {
    if (drawerOpenTimerRef.current) {
      clearTimeout(drawerOpenTimerRef.current);
      drawerOpenTimerRef.current = null;
    }
  }, []);

  const openExclusiveDrawer = useCallback((target: 'food' | 'weight' | 'water' | 'fitness') => {
    clearPendingDrawerOpen();
    foodDrawerRef.current?.close();
    weightDrawerRef.current?.close();
    waterDrawerRef.current?.close();
    fitnessDrawerRef.current?.close();

    drawerOpenTimerRef.current = setTimeout(() => {
      if (target === 'food') foodDrawerRef.current?.open();
      if (target === 'weight') weightDrawerRef.current?.open();
      if (target === 'water') waterDrawerRef.current?.open();
      if (target === 'fitness') fitnessDrawerRef.current?.open();
    }, 180);
  }, [clearPendingDrawerOpen]);

  useEffect(() => () => clearPendingDrawerOpen(), [clearPendingDrawerOpen]);

  const weightDisplay = useMemo(() => {
    if (currentWeight == null) return { display: '— lbs', sub: undefined, subColor: undefined };

    const lbs = currentWeight % 1 === 0 ? `${currentWeight} lbs` : `${currentWeight.toFixed(1)} lbs`;

    if (weeklyChange !== null) {
      const arrow = weeklyChange <= 0 ? '↓' : '↑';
      const absChange = Math.abs(weeklyChange);
      return {
        display: lbs,
        sub: `${arrow} ${absChange} lbs`,
        subColor: weeklyChange <= 0 ? colors.successDark : colors.error,
      };
    }

    return { display: lbs, sub: undefined, subColor: undefined };
  }, [currentWeight, weeklyChange, colors.successDark, colors.error]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scrollContent: {
          paddingHorizontal: spacing.xl,
          paddingBottom: TAB_BAR_TOTAL_HEIGHT + spacing.xl,
        },
        trackerRow: {
          paddingTop: spacing.xl,
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: '100%',
          marginBottom: spacing.sm,
        },
        macroChipsContent: {
          flexDirection: 'row',
          paddingLeft: 0,
          paddingRight: spacing.xl,
          gap: spacing.base,
          paddingTop: spacing.lg,
          paddingBottom: 4,
        },
        macroChipCard: {
          minWidth: 155,
          maxWidth: 180,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 16,
          backgroundColor: colors.surface + 'E6',
        },
        macroChipLabel: {
          fontSize: 11,
          fontWeight: '700',
          marginBottom: 4,
        },
        macroChipVal: {
          fontSize: 13,
          fontWeight: '700',
          marginBottom: 2,
        },
        macroChipSub: {
          fontSize: 10,
          color: colors.textSecondary,
          marginBottom: 6,
        },
        macroChipBar: {
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.border,
          overflow: 'hidden',
        },
        macroChipFill: {
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          borderRadius: 2,
        },
      }),
    [colors],
  );

  return (
    <GradientBackground bubbleCount={3}>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: EXPANDED_HEIGHT + insets.top + spacing.sm },
        ]}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
      >
        <View style={styles.trackerRow}>
          <CircleTracker
            icon="footsteps-outline"
            value={stepCount ?? 0}
            max={10000}
            color={colors.accent}
            displayValue={stepCount != null ? stepCount.toLocaleString() : '—'}
            onPress={() => openExclusiveDrawer('fitness')}
            hint={stepCount == null ? 'tap me!' : undefined}
          />
          <CircleTracker
            icon="restaurant-outline"
            value={totals.calories}
            max={calorieGoal}
            color={colors.primary}
            displayValue={`${calorieGoal - totals.calories} cal`}
            onPress={() => openExclusiveDrawer('food')}
            hint={totals.calories === 0 ? 'tap me!' : undefined}
          />
          <CircleTracker
            icon="water-outline"
            value={totalOz}
            max={goalOz}
            color={colors.accent}
            displayValue={`${Math.round(totalOz * 10) / 10} oz`}
            onPress={() => openExclusiveDrawer('water')}
            hint={totalOz === 0 ? 'tap me!' : undefined}
          />
          <CircleTracker
            icon="scale-outline"
            value={currentWeight ?? 0}
            max={goalWeight || 200}
            color={colors.secondary}
            displayValue={weightDisplay.display}
            subText={weightDisplay.sub}
            subColor={weightDisplay.subColor}
            onPress={() => openExclusiveDrawer('weight')}
            hint={!todayLog ? 'tap me!' : undefined}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.macroChipsContent}
          style={{ marginBottom: spacing.xl }}
        >
          {orderedNutrientKeys.map((key) => {
            const cfg = NUTRIENT_CONFIG[key];
            const val = totals[key] ?? 0;
            const goal = key === 'transFat' && macroGoals.transFat === 0 ? 1 : (macroGoals[key] ?? 0);
            const pct = goal > 0 ? Math.min(Math.round((val / goal) * 100), 150) : 0;
            const displayVal = val % 1 === 0 ? String(val) : val.toFixed(1);
            return (
              <Pressable
                key={key}
                onPress={() => macroInfoDrawerRef.current?.open(key)}
                style={({ pressed }) => [
                  styles.macroChipCard,
                  { borderLeftWidth: 3, borderLeftColor: cfg.color, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={[styles.macroChipLabel, { color: getMacroLabelColor(cfg.color, themeMode, colors) }]} numberOfLines={1}>{cfg.label}</Text>
                <Text style={[styles.macroChipVal, { color: colors.text }]}>
                  {displayVal} / {goal} {cfg.unit}
                </Text>
                <Text style={styles.macroChipSub}>{pct}% of daily</Text>
                <View style={styles.macroChipBar}>
                  <View
                    style={[
                      styles.macroChipFill,
                      { backgroundColor: cfg.color, width: `${Math.min(pct, 100)}%` },
                    ]}
                  />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <FastingTimerCard onPress={() => fastingDrawerRef.current?.open()} />
        <GoalsCard onPress={() => goalsDrawerRef.current?.open()} />

        {!todayLog && (
          <ActionBanner
            icon="scale-outline"
            color={colors.secondary}
            title="Time to weigh in!"
            subtitle="Log your weight to earn XP and track progress"
            actionLabel="Weigh In"
            badge="+10 XP"
            onAction={() => weightDrawerRef.current?.open()}
          />
        )}

        {!!todayLog && fastingLoaded && fastingInterested === null && (
          <ActionBanner
            icon="timer-outline"
            color={colors.primary}
            title="Want a fasting timer?"
            subtitle="A simple countdown for your eating window — stop anytime"
            actionLabel="See how"
            onAction={() => fastingInterestRef.current?.open()}
          />
        )}

        <FoodLogSection onFoodPress={(e) => foodDetailDrawerRef.current?.open(e)} />

        <TodayPulseCard
          onLogMood={() => moodDrawerRef.current?.open()}
          refreshToken={moodRefreshToken}
        />

        <FarmHubCard />
        <AdventureStrip />

        <PetCareCard />
        <FriendsActivityRow />
        <AchievementRow />
      </Animated.ScrollView>

      <FoodDrawer ref={foodDrawerRef} onFoodLogged={handleFoodLogged} />
      <WeightDrawer ref={weightDrawerRef} onWeightLogged={handleWeightLogged} />
      <WaterDrawer ref={waterDrawerRef} onWaterLogged={handleWaterLogged} />
      <FitnessDrawer ref={fitnessDrawerRef} onStepCountChange={setStepCount} />
      <MoodQuickDrawer
        ref={moodDrawerRef}
        onLogged={() => setMoodRefreshToken((n) => n + 1)}
      />
      <FastingInterestDrawer
        ref={fastingInterestRef}
        onEnabled={() => {
          setTimeout(() => fastingDrawerRef.current?.open(), 220);
        }}
      />
      <FastingDrawer ref={fastingDrawerRef} />
      <GoalsDrawer ref={goalsDrawerRef} />
      <MacroInfoDrawer
        ref={macroInfoDrawerRef}
        totals={totals}
        goals={macroGoals}
        orderedNutrientKeys={orderedNutrientKeys}
        onGoalChange={updateGoal}
        onNutrientOrderChange={updateNutrientOrder}
        onFoodPress={(e) => foodDetailDrawerRef.current?.open(e)}
      />
      <FoodDetailDrawer ref={foodDetailDrawerRef} />
    </GradientBackground>
  );
}
