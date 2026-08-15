import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs, usePathname } from 'expo-router';
import { FloatingTabBar } from '@/components/ui/FloatingTabBar';
import { PetHeroProvider } from '@/store/PetHeroProvider';
import { FriendsProvider } from '@/store/FriendsProvider';
import { GameSummaryProvider } from '@/store/GameSummaryProvider';
import { NotificationsProvider } from '@/store/NotificationsProvider';
import { FoodProvider } from '@/store/FoodProvider';
import { MacroGoalsProvider } from '@/store/MacroGoalsProvider';
import { WeightProvider } from '@/store/WeightProvider';
import { WaterProvider } from '@/store/WaterProvider';
import { FastingProvider } from '@/store/FastingProvider';
import { GoalsProvider } from '@/store/GoalsProvider';
import { AchievementProvider } from '@/store/AchievementProvider';
import { PetHeroBar } from '@/components/ui/PetHeroBar';
import { GlobalPetDialog } from '@/components/ui/GlobalPetDialog';
import { AppItemGainHost } from '@/components/ui/AppItemGainHost';
import { DailyLoginChecker } from '@/components/DailyLoginChecker';
import { MarriageProposalOverlay } from '@/components/goals/MarriageProposalOverlay';

function getTabIndex(pathname: string): number {
  if (pathname === '/' || pathname === '/index') return 0;
  if (pathname.startsWith('/health')) return 1;
  if (pathname.startsWith('/game')) return 2;
  if (pathname.startsWith('/explore')) return 3;
  if (pathname.startsWith('/settings')) return 4;
  return 0;
}

export default function TabLayout() {
  const pathname = usePathname();
  const activeTabIndex = getTabIndex(pathname);

  return (
    <PetHeroProvider>
    <FriendsProvider>
    <GameSummaryProvider>
    <NotificationsProvider>
    <FoodProvider>
    <WeightProvider>
    <MacroGoalsProvider>
    <WaterProvider>
    <GoalsProvider>
    <FastingProvider>
    <AchievementProvider>
      <View style={styles.root}>
        {/* Content fills the entire screen */}
        <Tabs
          initialRouteName="index"
          tabBar={(props) => <FloatingTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Home' }} />
          <Tabs.Screen name="health/index" options={{ title: 'Health' }} />
          {/* Frozen while blurred so the world stops re-rendering behind the
              other tabs — it stays mounted, it just isn't doing render work. */}
          <Tabs.Screen name="game" options={{ title: 'Play', freezeOnBlur: true }} />
          <Tabs.Screen name="explore" options={{ title: 'Chat' }} />
          <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
        </Tabs>

        {/* Hero overlays on top — absolute positioned, never affects layout */}
        <PetHeroBar activeTabIndex={activeTabIndex} />
        <GlobalPetDialog />
        <AppItemGainHost />
        <DailyLoginChecker />
        <MarriageProposalOverlay />
      </View>
    </AchievementProvider>
    </FastingProvider>
    </GoalsProvider>
    </WaterProvider>
    </MacroGoalsProvider>
    </WeightProvider>
    </FoodProvider>
    </NotificationsProvider>
    </GameSummaryProvider>
    </FriendsProvider>
    </PetHeroProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
