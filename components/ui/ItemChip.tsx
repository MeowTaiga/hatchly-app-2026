/**
 * Reusable item display: image (or emoji) + label + optional qty.
 * Used for rewards, inventory, shop, etc.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CachedImage } from './CachedImage';
import { GemIcon } from './GemIcon';
import { useTheme } from '@/store/ThemeProvider';

export interface ItemChipProps {
  /** Item type for lookup (unused if imageUrl/emoji provided) */
  itemType?: string;
  label: string;
  imageUrl?: string | null;
  emoji?: string;
  qty?: number;
  /** Size of the image square. Default 36. */
  size?: number;
  /** Show as gems (diamond icon + gem color) */
  asGems?: boolean;
  gemsAmount?: number;
}

export function ItemChip({
  label,
  imageUrl,
  emoji = '📦',
  qty,
  size = 36,
  asGems,
  gemsAmount,
}: ItemChipProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const showGems = asGems || (gemsAmount != null && gemsAmount > 0);
  const displayLabel = showGems ? `+${gemsAmount ?? 0} Gems` : (label || '');
  const gemColor = colors.gemColor ?? colors.successDark ?? colors.success;

  return (
    <View style={styles.row}>
      <View style={[styles.imageWrap, { width: size, height: size }]}>
        {showGems ? (
          <View style={[styles.placeholder, { backgroundColor: (gemColor as string) + '20' }]}>
            <GemIcon size={Math.round(size * 0.6)} />
          </View>
        ) : imageUrl ? (
          <CachedImage source={{ uri: imageUrl }} style={[styles.image, { width: size, height: size }]} resizeMode="contain" />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: colors.primaryLight + '40' }]}>
            <Text style={styles.emoji}>{emoji}</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={[styles.label, showGems && { color: gemColor }]} numberOfLines={1}>
          {displayLabel}
        </Text>
        {!showGems && qty != null && qty > 1 && (
          <Text style={[styles.qty, { color: colors.primaryText ?? colors.primary }]}>× {qty}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  imageWrap: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    borderRadius: 8,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  emoji: {
    fontSize: 18,
  },
  info: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  qty: {
    fontSize: 13,
    fontWeight: '700',
  },
});
