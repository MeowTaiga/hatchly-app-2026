/**
 * Wraps a child and applies quest highlight border/glow when highlighted.
 * Reuses the same visual style as ShopDrawer (cardHighlight).
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

const highlightStyle = StyleSheet.create({
  border: { borderWidth: 2, borderColor: '#FFD700' },
});

interface HighlightableItemProps {
  highlighted: boolean;
  children: React.ReactNode;
  style?: object;
}

export function HighlightableItem({ highlighted, children, style }: HighlightableItemProps) {
  return (
    <View style={[style, highlighted && highlightStyle.border]}>
      {children}
    </View>
  );
}
