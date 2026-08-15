/**
 * Subscribes to the module item-gain store (safe inside BottomSheet portals).
 */

import React, { useSyncExternalStore } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ItemGainTone } from './ItemGainToast';
import { ItemGainToast } from './ItemGainToast';
import { getItemGainState, subscribeItemGain } from './itemGainStore';

export function ItemGainToastHost({
  style,
  toneFilter,
}: {
  style?: StyleProp<ViewStyle>;
  toneFilter?: ItemGainTone;
}) {
  const state = useSyncExternalStore(subscribeItemGain, getItemGainState, getItemGainState);
  const show = state.visible && (!toneFilter || state.tone === toneFilter);
  return (
    <ItemGainToast
      lines={state.lines}
      tone={state.tone}
      pulseKey={state.pulseKey}
      visible={show}
      levelUp={state.levelUp}
      style={style}
    />
  );
}
