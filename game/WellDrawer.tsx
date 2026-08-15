/**
 * Well Drawer — Collect water from well buildings.
 *
 * Opened when interacting with a well (well, well_2, well_5, etc.).
 * Displays Collect Water button, cooldown timer, and optional ×N multiplier badge.
 */

import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/store/ThemeProvider';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';

/** Parses the water multiplier from a well slug (mirrors server logic). */
function parseWellMultiplier(wellSlug: string): number {
  if (!wellSlug || typeof wellSlug !== 'string') return 1;
  const trimmed = wellSlug.trim();
  if (trimmed === 'well' || trimmed === 'well_1') return 1;
  const match = trimmed.match(/^well_(\d+)$/);
  if (!match) return 1;
  const n = parseInt(match[1], 10);
  return Number.isNaN(n) || n < 1 ? 1 : Math.min(n, 999);
}

/** Imperative handle for the well drawer. */
export interface WellDrawerRef {
  open: (wellSlug: string) => void;
  close: () => void;
}

interface WellDrawerProps {
  onCollect: (wellSlug: string) => void;
  result: { success: boolean; waterQty?: number; nextAvailableAt?: string; onCooldown?: boolean; message?: string } | null;
  onResultDismiss: () => void;
}

export const WellDrawer = forwardRef<WellDrawerRef, WellDrawerProps>(
  function WellDrawer({ onCollect, result, onResultDismiss }, ref) {
    const { theme } = useTheme();
    const drawerRef = useRef<AppDrawerRef>(null);
    const [wellSlug, setWellSlug] = useState<string>('well');

    useImperativeHandle(
      ref,
      () => ({
        open: (slug: string) => {
          setWellSlug(slug || 'well');
          drawerRef.current?.open();
        },
        close: () => drawerRef.current?.close(),
      }),
      [],
    );

    const multiplier = parseWellMultiplier(wellSlug);

    const handleCollect = useCallback(() => {
      onCollect(wellSlug);
    }, [onCollect, wellSlug]);

    const [cooldownRemaining, setCooldownRemaining] = useState<number | null>(null);

    React.useEffect(() => {
      if (!result?.nextAvailableAt) return;
      const tick = () => {
        const now = Date.now();
        const next = new Date(result!.nextAvailableAt!).getTime();
        const remaining = Math.max(0, Math.ceil((next - now) / 1000));
        setCooldownRemaining(remaining > 0 ? remaining : null);
      };
      tick();
      const id = setInterval(tick, 1000);
      return () => clearInterval(id);
    }, [result?.nextAvailableAt]);

    const disabled = cooldownRemaining !== null && cooldownRemaining > 0;

    const formatCooldown = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
      <AppDrawer
        ref={drawerRef}
        title="Well"
        snapPoints={['35%']}
        onClose={onResultDismiss}
        headerRight={
          multiplier > 1 ? (
            <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
              <Text style={[styles.badgeText, { color: theme.colors.onPrimary ?? '#fff' }]}>×{multiplier}</Text>
            </View>
          ) : undefined
        }
      >
        <View style={[styles.content, { borderColor: theme.colors.border }]}>
          <Text style={[styles.emoji, { color: theme.colors.text }]}>🪣</Text>
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>
            Draw water from the well
          </Text>

          {result?.success && result.waterQty != null && (
            <View style={[styles.resultBox, { backgroundColor: theme.colors.surfaceElevated }]}>
              <Text style={[styles.resultText, { color: theme.colors.success ?? theme.colors.primary }]}>
                +{result.waterQty} Water 💧
              </Text>
            </View>
          )}

          {(result?.onCooldown || result?.message) && !result?.success && (
            <View style={[styles.resultBox, { backgroundColor: theme.colors.surfaceElevated }]}>
              <Text style={[styles.resultText, { color: theme.colors.textMuted }]}>
                {result.message ?? 'Well is refilling. Try again in a few minutes.'}
              </Text>
            </View>
          )}

          <Pressable
            onPress={handleCollect}
            disabled={disabled}
            style={[
              styles.collectBtn,
              {
                backgroundColor: disabled ? theme.colors.border : theme.colors.primary,
                opacity: disabled ? 0.6 : 1,
              },
            ]}
          >
            <Text style={[styles.collectBtnText, { color: theme.colors.onPrimary ?? '#fff' }]}>
              {disabled && cooldownRemaining != null
                ? `Refilling... ${formatCooldown(cooldownRemaining)}`
                : 'Collect Water'}
            </Text>
          </Pressable>
        </View>
      </AppDrawer>
    );
  },
);

const styles = StyleSheet.create({
  content: {
    padding: 20,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    minWidth: 160,
    alignItems: 'center',
  },
  resultText: {
    fontSize: 16,
    fontWeight: '600',
  },
  collectBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 180,
    alignItems: 'center',
  },
  collectBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
