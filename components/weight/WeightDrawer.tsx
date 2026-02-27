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
import { useWeight } from '@/store/WeightProvider';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';
import { drawerInner } from '@/components/ui/drawerStyles';

// ─── Public API ─────────────────────────────────────────────────────────────

export interface WeightDrawerRef {
  open: () => void;
  close: () => void;
}

interface WeightDrawerProps {
  onWeightLogged?: (xpGained: number, gemsAwarded?: number) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const WeightDrawer = forwardRef<WeightDrawerRef, WeightDrawerProps>(
  function WeightDrawer({ onWeightLogged }, ref) {
    const { theme } = useTheme();
    const colors = theme.colors;
    const st = useMemo(
      () =>
        StyleSheet.create({
          inner: drawerInner,
          editBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'center',
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: radius.full,
            backgroundColor: colors.border + '40',
          },
          editBadgeText: {
            fontSize: 12,
            fontWeight: '600',
            color: colors.secondary,
          },
          heroCard: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            padding: 14,
            borderWidth: 1,
            borderColor: colors.border,
          },
          heroIcon: {
            width: 38,
            height: 38,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceElevated,
          },
          heroTextWrap: { flex: 1 },
          heroTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
          heroSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
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
          summaryCard: {
            backgroundColor: colors.surfaceElevated,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 14,
            alignItems: 'center',
          },
          summaryTitle: {
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: colors.textMuted,
          },
          summaryWeight: {
            fontSize: 30,
            fontWeight: '800',
            color: colors.text,
            marginTop: 4,
          },
          summarySub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
          statGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
          statCard: {
            minWidth: '31%',
            flexGrow: 1,
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 12,
            alignItems: 'center',
            gap: 4,
          },
          statIconWrap: {
            width: 32,
            height: 32,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 2,
          },
          statValue: {
            fontSize: 13,
            fontWeight: '700',
            color: colors.text,
            textAlign: 'center',
          },
          statLabel: { fontSize: 10, color: colors.textMuted, textAlign: 'center' },
          error: { color: colors.error, fontSize: 13, textAlign: 'center' },
          btn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.secondary,
            paddingVertical: 14,
            borderRadius: radius.full,
            gap: 8,
            marginTop: spacing.xs,
          },
          btnOff: { opacity: 0.4 },
          btnText: { ...theme.typography.button, fontSize: 16, color: colors.onPrimary ?? '#fff' },
        }),
      [theme],
    );
    const drawerRef = useRef<AppDrawerRef>(null);
    const {
      currentWeight, todayLog, weeklyChange, goalWeight, logs,
      logWeight, updateTodayWeight,
    } = useWeight();

    const [weight, setWeight] = useState(150);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const isEditing = !!todayLog;

    useImperativeHandle(ref, () => ({
      open() {
        setError('');
        setWeight(todayLog?.weight ?? currentWeight ?? 150);
        drawerRef.current?.open();
      },
      close() { drawerRef.current?.close(); },
    }));

    const handleSubmit = useCallback(async () => {
      if (submitting) return;
      setSubmitting(true);
      setError('');

      try {
        if (isEditing) {
          await updateTodayWeight(weight);
          drawerRef.current?.close();
        } else {
          const { xpGained, gemsAwarded } = await logWeight(weight);
          onWeightLogged?.(xpGained, gemsAwarded ?? 0);
          drawerRef.current?.close();
        }
      } catch (err: any) {
        if (err?.code === 'WEIGHT_ALREADY_LOGGED') {
          setError('Already logged today — editing instead.');
          try {
            await updateTodayWeight(weight);
            drawerRef.current?.close();
          } catch { setError('Failed to update weight.'); }
        } else {
          setError(err?.message ?? 'Something went wrong');
        }
      }
      setSubmitting(false);
    }, [weight, submitting, isEditing, logWeight, updateTodayWeight, onWeightLogged]);

    const diff = currentWeight && goalWeight ? +(currentWeight - goalWeight).toFixed(1) : null;
    const totalLogs = logs.length;
    const weeklyLabel = useMemo(() => {
      if (weeklyChange == null) return 'No weekly trend yet';
      if (weeklyChange < 0) return `${Math.abs(weeklyChange).toFixed(1)} lbs down this week`;
      if (weeklyChange > 0) return `${Math.abs(weeklyChange).toFixed(1)} lbs up this week`;
      return 'Steady this week';
    }, [weeklyChange]);

    return (
      <AppDrawer
        ref={drawerRef}
        title="Weight Check-In"
        snapPoints={['88%']}
        showCloseButton
        scrollable
      >
        <View style={st.inner}>
          {isEditing && (
            <View style={st.editBadge}>
              <Ionicons name="create-outline" size={14} color={colors.secondary} />
              <Text style={st.editBadgeText}>Updating today's check-in</Text>
            </View>
          )}

          <View style={st.heroCard}>
            <View style={st.heroIcon}>
              <Ionicons name="cloud-outline" size={20} color={colors.secondary} />
            </View>
            <View style={st.heroTextWrap}>
              <Text style={st.heroTitle}>Take a calm progress snapshot</Text>
              <Text style={st.heroSub}>Consistency beats perfection every time.</Text>
            </View>
          </View>

          <View style={st.pickerCard}>
            <NumberPicker
              value={weight}
              onChange={setWeight}
              min={50}
              max={500}
              step={0.1}
              unit="lbs"
              color={colors.secondary}
            />
            <Text style={st.pickerHint}>Tap the number to type directly</Text>
          </View>

          <View style={st.summaryCard}>
            <Text style={st.summaryTitle}>Today</Text>
            <Text style={st.summaryWeight}>{weight.toFixed(1)} lbs</Text>
            <Text style={st.summarySub}>{weeklyLabel}</Text>
          </View>

          <View style={st.statGrid}>
            {weeklyChange !== null && (
              <View style={st.statCard}>
                <View style={[st.statIconWrap, { backgroundColor: `${colors.accent}16` }]}>
                  <Ionicons
                    name={weeklyChange <= 0 ? 'trending-down' : 'trending-up'}
                    size={18}
                    color={weeklyChange <= 0 ? colors.successDark : colors.errorDark}
                  />
                </View>
                <Text style={st.statValue}>
                  {weeklyChange > 0 ? '+' : ''}{weeklyChange} lbs
                </Text>
                <Text style={st.statLabel}>This week</Text>
              </View>
            )}

            {diff !== null && (
              <View style={st.statCard}>
                <View style={[st.statIconWrap, { backgroundColor: `${colors.secondary}16` }]}>
                  <Ionicons name="flag-outline" size={18} color={colors.secondary} />
                </View>
                <Text style={st.statValue}>
                  {diff > 0 ? `${diff} to go` : 'Reached!'}
                </Text>
                <Text style={st.statLabel}>Goal: {goalWeight} lbs</Text>
              </View>
            )}

            {totalLogs > 0 && (
              <View style={st.statCard}>
                <View style={[st.statIconWrap, { backgroundColor: `${colors.primary}14` }]}>
                  <Ionicons name="calendar-outline" size={18} color={colors.accent} />
                </View>
                <Text style={st.statValue}>{totalLogs}</Text>
                <Text style={st.statLabel}>Total logs</Text>
              </View>
            )}
          </View>

          {error ? <Text style={st.error}>{error}</Text> : null}

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={[st.btn, submitting && st.btnOff]}
          >
            {submitting ? <ActivityIndicator color={colors.onPrimary ?? '#fff'} /> : (
              <>
                <Ionicons
                  name={isEditing ? 'checkmark-circle' : 'scale'}
                  size={20}
                  color={colors.onPrimary ?? '#fff'}
                />
                <Text style={st.btnText}>
                  {isEditing ? `Save ${weight.toFixed(1)} lbs` : `Log ${weight.toFixed(1)} lbs`}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </AppDrawer>
    );
  },
);

