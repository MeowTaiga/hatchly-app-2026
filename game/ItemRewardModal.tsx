/**
 * Generic item reward modal. Used for bug catch, balloon pop, and fossil dig results.
 */
import React from 'react';
import { Modal, Pressable, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/store/ThemeProvider';
import { CachedImage } from '@/components/ui/CachedImage';
import { GemIcon } from '@/components/ui/GemIcon';

export interface ItemRewardModalProps {
  title: string;
  label: string;
  imageUrl?: string | null;
  emoji?: string;
  qty?: number;
  gemsAwarded?: number;
  accentColor?: string;
  /** Extra content below label (e.g. star row + size pill for bugs). */
  extraContent?: React.ReactNode;
  onDismiss: () => void;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 22,
    padding: 18,
    width: '88%',
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  imageWrap: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bugImage: {
    width: 56,
    height: 56,
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
  caughtLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  bugName: {
    fontSize: 20,
    fontWeight: '800',
  },
  gemBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  gemAmount: {
    fontSize: 20,
    fontWeight: '900',
  },
  gemLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  dismissBtn: {
    marginTop: 14,
    alignSelf: 'stretch',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  dismissBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
});

export function ItemRewardModal({
  title,
  label,
  imageUrl,
  emoji = '🎁',
  qty,
  gemsAwarded,
  accentColor = '#A855F7',
  extraContent,
  onDismiss,
}: ItemRewardModalProps) {
  const { theme, themeMode } = useTheme();
  const c = theme.colors;
  const dark = themeMode === 'dark';

  return (
    <Modal transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: dark ? c.border : 'transparent' }]}>
          <View style={styles.topRow}>
            <View style={[styles.imageWrap, { backgroundColor: dark ? c.surfaceElevated : accentColor + '18' }]}>
              {imageUrl ? (
                <CachedImage source={{ uri: imageUrl }} style={styles.bugImage} />
              ) : (
                <Text style={{ fontSize: 36 }}>{emoji}</Text>
              )}
            </View>
            <View style={styles.infoCol}>
              <Text style={[styles.caughtLabel, { color: c.textMuted }]}>{title}</Text>
              <Text style={[styles.bugName, { color: c.text }]} numberOfLines={1}>
                {label}
              </Text>
              {qty != null && qty > 1 && (
                <Text style={[styles.gemLabel, { color: c.textMuted, marginTop: 4, fontWeight: '600' }]}>×{qty}</Text>
              )}
              {extraContent}
            </View>
          </View>
          {gemsAwarded != null && gemsAwarded > 0 && (
            <View style={[styles.gemBar, { backgroundColor: dark ? c.surfaceElevated : accentColor + '12' }]}>
              <GemIcon size={18} />
              <Text style={[styles.gemAmount, { color: c.gemColor ?? accentColor }]}>+{gemsAwarded}</Text>
              <Text style={[styles.gemLabel, { color: c.textMuted }]}>gems earned</Text>
            </View>
          )}
          <Pressable style={[styles.dismissBtn, { backgroundColor: accentColor }]} onPress={onDismiss}>
            <Text style={styles.dismissBtnText}>Awesome!</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
