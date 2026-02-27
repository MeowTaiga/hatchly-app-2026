import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { GameProvider } from '@/game/GameProvider';
import { WorldRenderer } from '@/game/WorldRenderer';
import { useTheme } from '@/store/ThemeProvider';

const UNLOAD_AFTER_MS = 2 * 60 * 1000;

/**
 * Game tab screen — the player's interactive farm and house.
 *
 * Unloads the heavy game (provider + renderer) after 2 mins away from the tab
 * so it doesn't lag the rest of the app. Remounts when the user returns.
 */
export default function GameScreen() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(true);
  const unmountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (unmountTimerRef.current) {
        clearTimeout(unmountTimerRef.current);
        unmountTimerRef.current = null;
      }
      setMounted(true);
      return () => {
        unmountTimerRef.current = setTimeout(() => {
          unmountTimerRef.current = null;
          setMounted(false);
        }, UNLOAD_AFTER_MS);
      };
    }, []),
  );

  if (!mounted) {
    return <View style={[styles.placeholder, { backgroundColor: theme.colors.background }]} />;
  }

  return (
    <GameProvider>
      <WorldRenderer />
    </GameProvider>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
  },
});
