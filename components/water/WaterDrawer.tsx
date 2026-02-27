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

export interface WaterDrawerRef {
  open: () => void;
  close: () => void;
}

interface WaterDrawerProps {
  onWaterLogged?: (xpGained: number, gemsAwarded?: number) => void;
}

const PRESET_AMOUNTS_OZ = [8, 12, 16.9, 20, 32] as const;

export const WaterDrawer = forwardRef<WaterDrawerRef, WaterDrawerProps>(
  function WaterDrawer({ onWaterLogged }, ref) {
    const { theme } = useTheme();
    const st = useWaterDrawerStyles();
    const drawerRef = useRef<AppDrawerRef>(null);
    const { totalOz, goalOz, goalSourceWeightLbs, logWater } = useWater();

    const [amountOz, setAmountOz] = useState(16.9);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const remainingOz = useMemo(
      () => Math.max(0, Math.round((goalOz - totalOz) * 10) / 10),
      [goalOz, totalOz],
    );
    const progressPct = useMemo(
      () => Math.min(Math.round((totalOz / Math.max(goalOz, 1)) * 100), 100),
      [totalOz, goalOz],
    );

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
      } catch (err: any) {
        setError(err?.message ?? 'Failed to log water');
      }
      setSubmitting(false);
    }, [amountOz, submitting, logWater, onWaterLogged]);

    return (
      <AppDrawer
        ref={drawerRef}
        title="Hydration Check-In"
        snapPoints={['88%']}
        showCloseButton
        scrollable
      >
        <View style={st.inner}>
          <View style={st.headerCard}>
            <View style={st.headerIcon}>
              <Ionicons name="water" size={22} color={theme.colors.accent} />
            </View>
            <View style={st.headerTextWrap}>
              <Text style={st.headerTitle}>Hydration with a calm rhythm</Text>
              <Text style={st.headerSub}>
                {Math.round(totalOz * 10) / 10} / {goalOz} fl oz today ({progressPct}%)
              </Text>
            </View>
          </View>

          <View style={st.goalCard}>
            <Text style={st.goalTitle}>Daily target</Text>
            <Text style={st.goalValue}>{goalOz} fl oz</Text>
            <Text style={st.goalSub}>
              {goalSourceWeightLbs
                ? `Based on your weight (${goalSourceWeightLbs.toFixed(1)} lbs x 0.5 oz)`
                : 'Based on your profile weight using the 0.5 oz/lb formula'}
            </Text>
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
            <NumberPicker
              value={amountOz}
              onChange={setAmountOz}
              min={1}
              max={128}
              step={0.1}
              unit="fl oz"
              color={theme.colors.accent}
            />
          </View>

          <View style={st.statsRow}>
            <View style={st.statCard}>
              <Text style={st.statValue}>{Math.round(amountOz * 10) / 10} fl oz</Text>
              <Text style={st.statLabel}>This log</Text>
            </View>
            <View style={st.statCard}>
              <Text style={st.statValue}>{remainingOz} fl oz</Text>
              <Text style={st.statLabel}>Left to goal</Text>
            </View>
          </View>

          {error ? <Text style={st.error}>{error}</Text> : null}

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={[st.btn, submitting && st.btnOff]}
          >
            {submitting ? <ActivityIndicator color={theme.colors.onPrimary ?? '#fff'} /> : (
              <>
                <Ionicons name="water" size={20} color={theme.colors.onPrimary ?? '#fff'} />
                <Text style={st.btnText}>Log {Math.round(amountOz * 10) / 10} fl oz</Text>
              </>
            )}
          </Pressable>
        </View>
      </AppDrawer>
    );
  },
);

function useWaterDrawerStyles() {
  const { theme } = useTheme();
  const colors = theme.colors;
  return useMemo(
    () =>
      StyleSheet.create({
        inner: { gap: spacing.base },
        headerCard: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          padding: 12,
          borderWidth: 1,
          borderColor: colors.border,
        },
        headerIcon: {
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.accent + '20',
        },
        headerTextWrap: { flex: 1 },
        headerTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
        headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
        goalCard: {
          backgroundColor: colors.surfaceElevated,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 14,
          alignItems: 'center',
        },
        goalTitle: {
          fontSize: 11,
          fontWeight: '700',
          color: colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        goalValue: { fontSize: 28, fontWeight: '800', color: colors.accent, marginTop: 4 },
        goalSub: { fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginTop: 4 },
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
          backgroundColor: colors.surfaceElevated,
        },
        presetBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
        presetText: { fontSize: 12, fontWeight: '600', color: colors.accent },
        presetTextActive: { color: colors.onPrimary ?? '#fff' },
        statsRow: { flexDirection: 'row', gap: 10 },
        statCard: {
          flex: 1,
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 12,
          alignItems: 'center',
        },
        statValue: { fontSize: 15, fontWeight: '700', color: colors.text },
        statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
        error: { color: colors.error, textAlign: 'center', fontSize: 13 },
        btn: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.accent,
          paddingVertical: 14,
          borderRadius: radius.full,
          gap: 8,
          marginTop: spacing.xs,
        },
        btnOff: { opacity: 0.45 },
        btnText: { ...theme.typography.button, fontSize: 16, color: colors.onPrimary ?? '#fff' },
      }),
    [theme],
  );
}
