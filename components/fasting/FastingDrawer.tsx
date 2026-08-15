/**
 * Start, watch, or end a fast. Hour slider with preset shortcuts.
 */

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { HourSlider } from '@/components/fasting/HourSlider';
import { useTheme } from '@/store/ThemeProvider';
import { useFasting } from '@/store/FastingProvider';
import { useTick, formatCountdown, formatClock } from '@/hooks/useTick';
import {
  FASTING_GOAL_HOURS,
  FASTING_HOURS_MAX,
  FASTING_HOURS_MIN,
  type FastingGoalHours,
} from '@/lib/api';
import { spacing, radius } from '@/constants/theme';

export interface FastingDrawerRef {
  open: () => void;
  close: () => void;
}

const GOAL_HINT: Record<FastingGoalHours, string> = {
  12: 'Overnight',
  16: 'Popular',
  18: 'Longer',
  20: 'Advanced',
  24: 'Full day',
};

export const FastingDrawer = forwardRef<FastingDrawerRef>(function FastingDrawer(_props, ref) {
  const drawerRef = useRef<AppDrawerRef>(null);
  const { theme } = useTheme();
  const { colors } = theme;
  const { active, startFast, endFast, hideFastingOnLockScreen, setHideFastingOnLockScreen } = useFasting();
  const [goalHours, setGoalHours] = useState(16);
  const [saving, setSaving] = useState(false);

  const now = useTick(1000, !!active);
  const remainingMs = active
    ? Math.max(0, new Date(active.endsAt).getTime() - now)
    : 0;
  const done = !!active && remainingMs <= 0;
  const elapsedMs = active ? now - new Date(active.startedAt).getTime() : 0;
  const goalMs = (active?.goalHours ?? goalHours) * 60 * 60 * 1000;
  const progress = active ? Math.min(1, Math.max(0, elapsedMs / goalMs)) : 0;

  useImperativeHandle(ref, () => ({
    open: () => drawerRef.current?.open(),
    close: () => drawerRef.current?.close(),
  }));

  const handleStart = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await startFast(goalHours);
    } finally {
      setSaving(false);
    }
  }, [saving, startFast, goalHours]);

  const handleEnd = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await endFast();
    } finally {
      setSaving(false);
    }
  }, [saving, endFast]);

  const st = useMemo(
    () =>
      StyleSheet.create({
        body: { paddingBottom: spacing.lg, gap: 14 },
        clock: {
          fontSize: 40,
          fontWeight: '800',
          letterSpacing: -1,
          textAlign: 'center',
          color: colors.text,
        },
        hoursValue: {
          fontSize: 36,
          fontWeight: '800',
          letterSpacing: -1,
          textAlign: 'center',
          color: colors.text,
        },
        hoursUnit: {
          fontSize: 14,
          fontWeight: '700',
          textAlign: 'center',
          color: colors.textSecondary,
          marginTop: -8,
        },
        sub: {
          fontSize: 14,
          textAlign: 'center',
          color: colors.textSecondary,
          marginTop: -4,
        },
        sliderWrap: { paddingVertical: 8 },
        sliderEnds: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 8,
          paddingHorizontal: 10,
        },
        sliderEnd: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
        bar: {
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.border,
          overflow: 'hidden',
        },
        fill: {
          height: '100%',
          borderRadius: 4,
          backgroundColor: colors.primary,
        },
        chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
        chip: {
          minWidth: 64,
          paddingVertical: 8,
          paddingHorizontal: 10,
          borderRadius: radius.lg,
          borderWidth: 1.5,
          alignItems: 'center',
        },
        chipHours: { fontSize: 15, fontWeight: '800' },
        chipHint: { fontSize: 10, fontWeight: '600', marginTop: 1 },
        primaryBtn: {
          borderRadius: radius.full,
          paddingVertical: 14,
          alignItems: 'center',
        },
        primaryText: { fontSize: 16, fontWeight: '800', color: colors.textInverse },
        hint: {
          fontSize: 12,
          lineHeight: 17,
          textAlign: 'center',
          color: colors.textMuted,
        },
        lockCard: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: radius.lg,
          backgroundColor: colors.surfaceElevated,
          borderWidth: 1,
          borderColor: colors.border,
        },
        lockIcon: {
          width: 36,
          height: 36,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.primary + '22',
        },
        lockBody: { flex: 1, gap: 2 },
        lockTitle: {
          fontSize: 14,
          fontWeight: '800',
          color: colors.text,
        },
        lockMsg: {
          fontSize: 12,
          lineHeight: 16,
          fontWeight: '500',
          color: colors.textSecondary,
        },
      }),
    [colors],
  );

  const lockHideRow =
    Platform.OS === 'ios' ? (
      <View style={st.lockCard}>
        <View style={st.lockIcon}>
          <Ionicons name="moon-outline" size={18} color={colors.primary} />
        </View>
        <View style={st.lockBody}>
          <Text style={st.lockTitle}>Don't show on lockscreen</Text>
          <Text style={st.lockMsg}>
            Sometimes always seeing the timer might not be right for you
          </Text>
        </View>
        <Switch
          value={hideFastingOnLockScreen}
          onValueChange={(v) => void setHideFastingOnLockScreen(v)}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.textInverse}
        />
      </View>
    ) : null;

  return (
    <AppDrawer
      ref={drawerRef}
      title={active ? `${active.goalHours}h fast` : 'Start a fast'}
      snapPoints={Platform.OS === 'ios' ? ['78%'] : ['64%']}
      scrollable={false}
    >
      <View style={st.body}>
        {active ? (
          <>
            <Text style={st.clock}>{done ? 'Done' : formatCountdown(remainingMs)}</Text>
            <Text style={st.sub}>
              {done
                ? `You hit ${active.goalHours} hours`
                : `Eating window opens at ${formatClock(active.endsAt)}`}
            </Text>
            <View style={st.bar}>
              <View style={[st.fill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <Pressable
              onPress={handleEnd}
              disabled={saving}
              style={({ pressed }) => [
                st.primaryBtn,
                { backgroundColor: done ? colors.primary : colors.secondary },
                pressed && { opacity: 0.88 },
              ]}
            >
              {saving ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={st.primaryText}>{done ? 'Finish' : 'I ate — end early'}</Text>
              )}
            </Pressable>
            {lockHideRow}
          </>
        ) : (
          <>
            <Text style={st.hoursValue}>{goalHours}</Text>
            <Text style={st.hoursUnit}>{goalHours === 1 ? 'hour' : 'hours'}</Text>
            <View style={st.sliderWrap}>
              <HourSlider
                value={goalHours}
                min={FASTING_HOURS_MIN}
                max={FASTING_HOURS_MAX}
                onChange={setGoalHours}
              />
              <View style={st.sliderEnds}>
                <Text style={st.sliderEnd}>{FASTING_HOURS_MIN}h</Text>
                <Text style={st.sliderEnd}>{FASTING_HOURS_MAX}h</Text>
              </View>
            </View>
            <View style={st.chips}>
              {FASTING_GOAL_HOURS.map((hours) => {
                const on = goalHours === hours;
                return (
                  <Pressable
                    key={hours}
                    onPress={() => setGoalHours(hours)}
                    style={({ pressed }) => [
                      st.chip,
                      {
                        backgroundColor: on ? colors.primary + '22' : colors.surfaceElevated,
                        borderColor: on ? colors.primary : colors.border,
                      },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={[st.chipHours, { color: colors.text }]}>{hours}h</Text>
                    <Text style={[st.chipHint, { color: on ? colors.primary : colors.textMuted }]}>
                      {GOAL_HINT[hours]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={handleStart}
              disabled={saving}
              style={({ pressed }) => [
                st.primaryBtn,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.88 },
              ]}
            >
              {saving ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={st.primaryText}>Start {goalHours}h fast</Text>
              )}
            </Pressable>
            <Text style={st.hint}>
              Timer starts now. You can end it the moment you eat.
            </Text>
            {lockHideRow}
          </>
        )}
      </View>
    </AppDrawer>
  );
});
