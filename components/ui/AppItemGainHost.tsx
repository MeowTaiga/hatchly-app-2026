/**
 * App-shell host for ItemGainToast on non-game tabs.
 * Game tab uses its own HUD / shop hosts to avoid double-rendering.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ItemGainToastHost } from '@/game/ItemGainToastHost';
import { EXPANDED_HEIGHT } from '@/components/ui/PetHeroBar';

export function AppItemGainHost() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const onGameTab = pathname.startsWith('/game');

  if (onGameTab) return null;

  return (
    <ItemGainToastHost
      style={[
        styles.host,
        { top: insets.top + EXPANDED_HEIGHT + 8 },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 500,
    elevation: 500,
  },
});
