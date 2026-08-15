/**
 * Incoming multiplayer trade request — accept / decline overlay.
 */

import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CachedImage } from '@/components/ui/CachedImage';
import { useTheme } from '@/store/ThemeProvider';
import { radius, spacing } from '@/constants/theme';
import type { IncomingTradeRequest } from './tradeTypes';

interface TradeRequestModalProps {
  request: IncomingTradeRequest | null;
  busy?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function TradeRequestModal({
  request,
  busy,
  onAccept,
  onDecline,
}: TradeRequestModalProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  if (!request) return null;

  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconRing, { backgroundColor: `${colors.primary}18` }]}>
            {request.fromPetImageUrl ? (
              <CachedImage
                source={{ uri: request.fromPetImageUrl }}
                style={styles.pet}
                resizeMode="contain"
              />
            ) : (
              <Ionicons name="swap-horizontal" size={28} color={colors.primary} />
            )}
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Trade request</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            <Text style={{ fontWeight: '800', color: colors.text }}>
              @{request.fromUsername}
            </Text>
            {' wants to trade with you'}
          </Text>
          <View style={styles.row}>
            <Pressable
              onPress={onDecline}
              disabled={busy}
              style={({ pressed }) => [
                styles.btn,
                styles.btnGhost,
                { borderColor: colors.border },
                (pressed || busy) && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.btnText, { color: colors.textSecondary }]}>Decline</Text>
            </Pressable>
            <Pressable
              onPress={onAccept}
              disabled={busy}
              style={({ pressed }) => [
                styles.btn,
                { backgroundColor: colors.primary },
                (pressed || busy) && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.btnText, { color: colors.onPrimary ?? '#fff' }]}>Accept</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 10,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 4,
  },
  pet: { width: 64, height: 64 },
  title: { fontSize: 18, fontWeight: '800' },
  body: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  row: { flexDirection: 'row', gap: 10, marginTop: 8, alignSelf: 'stretch' },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: { borderWidth: 1.5 },
  btnText: { fontSize: 15, fontWeight: '800' },
});
