import React, {
  forwardRef,
  useCallback,
  useEffect,
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
import { api } from '@/lib/api';
import { spacing, radius } from '@/constants/theme';
import { drawerInner } from '@/components/ui/drawerStyles';
import { heightToInches, calculateBMI } from '@/utils/weightUtils';

// ─── Public API ─────────────────────────────────────────────────────────────

export interface WeightDrawerRef {
  open: () => void;
  close: () => void;
}

interface WeightDrawerProps {
  onWeightLogged?: (xpGained: number, gemsAwarded?: number) => void;
}

// ─── StatCard (DRY) ─────────────────────────────────────────────────────────

function StatCard({
  icon,
  iconBg,
  iconColor,
  value,
  label,
  st,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
  st: { card: object; iconWrap: object; value: object; label: object };
}) {
  return (
    <View style={st.card}>
      <View style={[st.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={st.value}>{value}</Text>
      <Text style={st.label}>{label}</Text>
    </View>
  );
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
          bmiRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 14,
            marginTop: spacing.sm,
          },
          bmiLabel: { fontSize: 12, color: colors.textSecondary },
          bmiCell: { alignItems: 'center' as const },
          bmiCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
          bmiValue: { fontSize: 18, fontWeight: '700', color: colors.text },
          bmiArrow: { fontSize: 16, color: colors.textMuted },
          statGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: spacing.sm },
          card: {
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
          iconWrap: {
            width: 32,
            height: 32,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 2,
            color: colors.accent,
          },
          value: {
            fontSize: 13,
            fontWeight: '700',
            color: colors.text,
            textAlign: 'center',
          },
          label: { fontSize: 10, color: colors.textMuted, textAlign: 'center' },
          error: { color: colors.error, fontSize: 13, textAlign: 'center', marginTop: spacing.xs },
          btn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.secondary,
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
    const {
      currentWeight,
      todayLog,
      weeklyChange,
      goalWeight,
      logs,
      logWeight,
      updateTodayWeight,
    } = useWeight();

    const [weight, setWeight] = useState(150);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [height, setHeight] = useState<{ feet: number; inches: number } | null>(null);

    const isEditing = !!todayLog;

    useEffect(() => {
      api
        .getOnboardingProgress()
        .then(({ profile }) => {
          if (profile?.heightFeet != null && profile?.heightInches != null) {
            setHeight({ feet: profile.heightFeet, inches: profile.heightInches });
          }
        })
        .catch(() => {});
    }, []);

    useImperativeHandle(ref, () => ({
      open() {
        setError('');
        setWeight(todayLog?.weight ?? currentWeight ?? 150);
        drawerRef.current?.open();
      },
      close() {
        drawerRef.current?.close();
      },
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
      } catch (err: unknown) {
        const e = err as { code?: string; message?: string };
        if (e?.code === 'WEIGHT_ALREADY_LOGGED') {
          setError('Already logged today — editing instead.');
          try {
            await updateTodayWeight(weight);
            drawerRef.current?.close();
          } catch {
            setError('Failed to update weight.');
          }
        } else {
          setError(e?.message ?? 'Something went wrong');
        }
      }
      setSubmitting(false);
    }, [weight, submitting, isEditing, logWeight, updateTodayWeight, onWeightLogged]);

    const diff = currentWeight && goalWeight ? +(currentWeight - goalWeight).toFixed(1) : null;
    const totalLogs = logs.length;
    const heightInches = height ? heightToInches(height.feet, height.inches) : 0;
    const currentBmi = heightInches > 0 ? calculateBMI(weight, heightInches) : null;
    const goalBmi =
      heightInches > 0 && goalWeight > 0 ? calculateBMI(goalWeight, heightInches) : null;

    const stats = useMemo(() => {
      const items: Array<{
        icon: keyof typeof Ionicons.glyphMap;
        iconBg: string;
        iconColor: string;
        value: string;
        label: string;
      }> = [];
      if (weeklyChange !== null) {
        items.push({
          icon: weeklyChange <= 0 ? 'trending-down' : 'trending-up',
          iconBg: `${weeklyChange <= 0 ? colors.successDark : colors.errorDark}16`,
          iconColor: weeklyChange <= 0 ? colors.successDark : colors.errorDark,
          value: `${weeklyChange > 0 ? '+' : ''}${weeklyChange} lbs`,
          label: 'This week',
        });
      }
      if (diff !== null) {
        items.push({
          icon: 'flag-outline',
          iconBg: `${colors.secondary}16`,
          iconColor: colors.secondary,
          value: diff > 0 ? `${diff} to go` : 'Reached!',
          label: `Goal: ${goalWeight} lbs`,
        });
      }
      if (totalLogs > 0) {
        items.push({
          icon: 'calendar-outline',
          iconBg: `${colors.primary}14`,
          iconColor: colors.accent,
          value: String(totalLogs),
          label: 'Total logs',
        });
      }
      return items;
    }, [weeklyChange, diff, goalWeight, totalLogs, colors]);

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

          {currentBmi != null && (
            <View style={st.bmiRow}>
              <View style={st.bmiCell}>
                <Text style={st.bmiLabel}>Current</Text>
                <Text style={st.bmiValue}>{currentBmi.toFixed(1)}</Text>
              </View>
              <View style={st.bmiCenter}>
                <Text style={st.bmiLabel}>BMI</Text>
                <Text style={st.bmiArrow}>→</Text>
              </View>
              <View style={st.bmiCell}>
                <Text style={st.bmiLabel}>Goal</Text>
                <Text style={st.bmiValue}>
                  {goalBmi != null ? goalBmi.toFixed(1) : '—'}
                </Text>
              </View>
            </View>
          )}

          {stats.length > 0 && (
            <View style={st.statGrid}>
              {stats.map((s, i) => (
                <StatCard
                  key={i}
                  icon={s.icon}
                  iconBg={s.iconBg}
                  iconColor={s.iconColor}
                  value={s.value}
                  label={s.label}
                  st={st}
                />
              ))}
            </View>
          )}

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
