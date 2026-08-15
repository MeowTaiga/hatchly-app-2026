/**
 * Full-screen accept / decline when someone has proposed marriage.
 */

import React, { useCallback, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CachedImage } from '@/components/ui/CachedImage';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { useGoals } from '@/store/GoalsProvider';
import { useTheme } from '@/store/ThemeProvider';
import { useToast } from '@/store/ToastProvider';
import { spacing, radius } from '@/constants/theme';

export function MarriageProposalOverlay() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { toast } = useToast();
  const insets = useSafeAreaInsets();
  const { state, isLoaded, respondToMarriage } = useGoals();
  const [busy, setBusy] = useState<'accepted' | 'rejected' | null>(null);

  const marriage = state.marriage;
  const incoming = isLoaded && marriage?.status === 'pending' && !marriage.proposedByMe;
  const partner = marriage?.partner;
  const onPrimary = colors.onPrimary ?? colors.textInverse;

  const respond = useCallback(
    async (status: 'accepted' | 'rejected') => {
      if (!marriage || busy) return;
      setBusy(status);
      try {
        await respondToMarriage(marriage.id, status);
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Could not respond', 'error');
      } finally {
        setBusy(null);
      }
    },
    [marriage, busy, respondToMarriage, toast],
  );

  if (!incoming || !marriage) return null;

  const name = partner?.username ?? 'Someone';
  const petName = partner?.petName;

  return (
    <Modal
      visible
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={() => void respond('rejected')}
    >
      <GradientBackground>
        <View
          style={[
            styles.screen,
            { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg },
          ]}
        >
          <Text style={[styles.kicker, { color: colors.primary }]}>A LITTLE PROPOSAL</Text>

          <View style={[styles.petRing, { backgroundColor: colors.primary + '22', borderColor: colors.primary }]}>
            {partner?.petImageUrl ? (
              <CachedImage
                source={{ uri: partner.petImageUrl }}
                style={styles.pet}
                resizeMode="contain"
              />
            ) : (
              <Ionicons name="heart" size={64} color={colors.primary} />
            )}
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            {name} wants to marry you
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {petName
              ? `Share a Together goal list with ${name} and ${petName}. Your personal goals stay yours.`
              : 'Share a Together goal list, just the two of you. Your personal goals stay yours.'}
          </Text>

          <View style={styles.actions}>
            <Pressable
              onPress={() => void respond('accepted')}
              disabled={!!busy}
              style={({ pressed }) => [
                styles.accept,
                { backgroundColor: colors.primary },
                (pressed || busy) && { opacity: 0.85 },
              ]}
            >
              {busy === 'accepted' ? (
                <ActivityIndicator color={onPrimary} />
              ) : (
                <>
                  <Ionicons name="heart" size={18} color={onPrimary} />
                  <Text style={[styles.acceptText, { color: onPrimary }]}>Say yes</Text>
                </>
              )}
            </Pressable>
            <Pressable
              onPress={() => void respond('rejected')}
              disabled={!!busy}
              style={({ pressed }) => [
                styles.decline,
                (pressed || busy) && { opacity: 0.7 },
              ]}
            >
              {busy === 'rejected' ? (
                <ActivityIndicator color={colors.textMuted} />
              ) : (
                <Text style={[styles.declineText, { color: colors.textMuted }]}>Not now</Text>
              )}
            </Pressable>
          </View>
        </View>
      </GradientBackground>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
    marginBottom: spacing.lg,
  },
  petRing: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  pet: { width: 148, height: 148 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 32,
    paddingHorizontal: spacing.md,
  },
  body: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  actions: {
    alignSelf: 'stretch',
    marginTop: spacing.xl,
    gap: 10,
  },
  accept: {
    height: 52,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  acceptText: { fontSize: 17, fontWeight: '800' },
  decline: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: { fontSize: 15, fontWeight: '700' },
});
