import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { NumberPicker } from '@/components/onboarding/NumberPicker';
import { useWater } from '@/store/WaterProvider';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';
import { drawerInner } from '@/components/ui/drawerStyles';

// ─── Public API ─────────────────────────────────────────────────────────────

export interface WaterDrawerRef {
  open: () => void;
  close: () => void;
}

interface WaterDrawerProps {
  onWaterLogged?: (xpGained: number, gemsAwarded?: number) => void;
}

const PRESET_AMOUNTS_OZ = [8, 12, 16.9, 20, 32] as const;

// ─── Component ──────────────────────────────────────────────────────────────

export const WaterDrawer = forwardRef<WaterDrawerRef, WaterDrawerProps>(
  function WaterDrawer({ onWaterLogged }, ref) {
    const { theme } = useTheme();
    const colors = theme.colors;
    const st = useMemo(
      () =>
        StyleSheet.create({
          inner: drawerInner,
          goalRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 14,
          },
          goalLabel: { fontSize: 12, color: colors.textSecondary },
          goalValue: { fontSize: 16, fontWeight: '700', color: colors.text },
          goalRight: { alignItems: 'flex-end' as const },
          section: { gap: 8 },
          sectionLabel: {
            fontSize: 11,
            fontWeight: '700',
            color: colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
          },
          presetWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
          presetBtn: {
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: radius.full,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          },
          presetBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
          presetText: { fontSize: 12, fontWeight: '600', color: colors.accent },
          presetTextActive: { color: colors.onPrimary ?? '#fff' },
          pickerCard: {
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            paddingVertical: spacing.sm,
          },
          pickerHint: {
            fontSize: 11,
            textAlign: 'center',
            color: colors.textMuted,
            marginTop: -6,
            marginBottom: 8,
          },
          error: {
            color: colors.error,
            fontSize: 13,
            textAlign: 'center',
            marginTop: spacing.xs,
          },
          btn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.accent,
            paddingVertical: 14,
            borderRadius: radius.full,
            gap: 8,
            marginTop: spacing.md,
          },
          btnOff: { opacity: 0.4 },
          btnText: { ...theme.typography.button, fontSize: 16, color: colors.onPrimary ?? '#fff' },
        }),
      [theme],
    );

    const drawerRef = useRef<AppDrawerRef>(null);
    const { totalOz, goalOz, logWater } = useWater();

    const [amountOz, setAmountOz] = useState(16.9);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const remainingOz = useMemo(
      () => Math.max(0, Math.round((goalOz - totalOz) * 10) / 10),
      [goalOz, totalOz],
    );
    const displayTotal = Math.round(totalOz * 10) / 10;

    useImperativeHandle(ref, () => ({
      open() {
        setError('');
        setAmountOz(remainingOz > 0 ? Math.min(16.9, remainingOz) : 8);
        drawerRef.current?.open();
      },
      close() {
        drawerRef.current?.close();
      },
    }));

    const applyPreset = useCallback((preset: number) => {
      setAmountOz(preset);
      setError('');
    }, []);

    const handleSubmit = useCallback(async () => {
      if (submitting || amountOz <= 0) return;
      setSubmitting(true);
      setError('');
      try {
        const { xpGained, gemsAwarded } = await logWater(amountOz);
        onWaterLogged?.(xpGained, gemsAwarded ?? 0);
        drawerRef.current?.close();
      } catch (err: unknown) {
        const e = err as { message?: string };
        setError(e?.message ?? 'Failed to log water');
      }
      setSubmitting(false);
    }, [amountOz, submitting, logWater, onWaterLogged]);

    const displayAmount = Math.round(amountOz * 10) / 10;

    return (
      <AppDrawer
        ref={drawerRef}
        title="Hydration Check-In"
        snapPoints={['88%']}
        showCloseButton
        scrollable
      >
        <View style={st.inner}>
          <View style={st.goalRow}>
            <View>
              <Text style={st.goalLabel}>Today</Text>
              <Text style={st.goalValue}>
                {displayTotal} / {goalOz} fl oz
              </Text>
            </View>
            <View style={st.goalRight}>
              <Text style={st.goalLabel}>Left to goal</Text>
              <Text style={st.goalValue}>{remainingOz} fl oz</Text>
            </View>
          </View>

          <View style={st.section}>
            <Text style={st.sectionLabel}>Quick Add</Text>
            <View style={st.presetWrap}>
              {PRESET_AMOUNTS_OZ.map((preset) => {
                const isActive = Math.abs(amountOz - preset) < 0.05;
                return (
                  <Pressable
                    key={preset}
                    onPress={() => applyPreset(preset)}
                    style={({ pressed }) => [
                      st.presetBtn,
                      isActive && st.presetBtnActive,
                      pressed && { opacity: 0.75 },
                    ]}
                  >
                    <Text style={[st.presetText, isActive && st.presetTextActive]}>
                      {preset} fl oz
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={st.section}>
            <Text style={st.sectionLabel}>Custom Amount</Text>
            <View style={st.pickerCard}>
              <NumberPicker
                value={amountOz}
                onChange={setAmountOz}
                min={1}
                max={128}
                step={0.1}
                unit="fl oz"
                color={colors.accent}
              />
              <Text style={st.pickerHint}>Tap the number to type directly</Text>
            </View>
          </View>

          {error ? <Text style={st.error}>{error}</Text> : null}

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={[st.btn, submitting && st.btnOff]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.onPrimary ?? '#fff'} />
            ) : (
              <>
                <Ionicons
                  name="water"
                  size={20}
                  color={colors.onPrimary ?? '#fff'}
                />
                <Text style={st.btnText}>Log {displayAmount} fl oz</Text>
              </>
            )}
          </Pressable>
        </View>
      </AppDrawer>
    );
  },
);
