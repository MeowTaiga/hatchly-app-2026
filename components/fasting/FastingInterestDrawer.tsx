/**
 * One-time opt-in: want a fasting timer on Home?
 */

import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { useTheme } from '@/store/ThemeProvider';
import { useFasting } from '@/store/FastingProvider';
import { spacing, radius } from '@/constants/theme';

export interface FastingInterestDrawerRef {
  open: () => void;
  close: () => void;
}

interface FastingInterestDrawerProps {
  onEnabled?: () => void;
}

export const FastingInterestDrawer = forwardRef<FastingInterestDrawerRef, FastingInterestDrawerProps>(
  function FastingInterestDrawer({ onEnabled }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const { theme } = useTheme();
    const { colors } = theme;
    const { setInterest } = useFasting();
    const [saving, setSaving] = useState(false);

    useImperativeHandle(ref, () => ({
      open: () => drawerRef.current?.open(),
      close: () => drawerRef.current?.close(),
    }));

    const choose = useCallback(async (interested: boolean) => {
      if (saving) return;
      setSaving(true);
      try {
        await setInterest(interested);
        drawerRef.current?.close();
        if (interested) onEnabled?.();
      } finally {
        setSaving(false);
      }
    }, [saving, setInterest, onEnabled]);

    return (
      <AppDrawer ref={drawerRef} title="Fasting timer" snapPoints={['48%']} initialSnapIndex={0}>
        <View style={styles.body}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
            <Ionicons name="timer-outline" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.lead, { color: colors.text }]}>Want a simple fast timer?</Text>
          <Text style={[styles.copy, { color: colors.textSecondary }]}>
            Pick how long to go without eating — 12 to 24 hours — and we’ll count down right under your circles. Stop anytime. This is just a timer, not medical advice.
          </Text>

          <Pressable
            onPress={() => choose(true)}
            disabled={saving}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.88 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={[styles.primaryText, { color: colors.textInverse }]}>Yes, show me</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => choose(false)}
            disabled={saving}
            style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.ghostText, { color: colors.textSecondary }]}>No thanks</Text>
          </Pressable>
        </View>
      </AppDrawer>
    );
  },
);

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  lead: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  copy: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  primaryBtn: {
    width: '100%',
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '800',
  },
  ghostBtn: {
    paddingVertical: 10,
  },
  ghostText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
