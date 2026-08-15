/**
 * On/off reminder with hour, minute, and AM/PM steppers — no typing.
 */

import React from 'react';
import { View, Text, Pressable, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '@/constants/theme';
import type { ClockTime } from '@/components/goals/goalSchedule';

const MINUTE_STEP = 5;

interface ReminderPickerProps {
  enabled: boolean;
  time: ClockTime;
  onEnabledChange: (on: boolean) => void;
  onTimeChange: (next: ClockTime) => void;
  colors: {
    text: string;
    textMuted: string;
    textInverse: string;
    primary: string;
    surface: string;
    border: string;
  };
}

function wrapHour(hour: number): number {
  if (hour < 1) return 12;
  if (hour > 12) return 1;
  return hour;
}

function wrapMinute(minute: number): number {
  if (minute < 0) return 60 - MINUTE_STEP;
  if (minute > 59) return 0;
  return minute;
}

function Stepper({
  value,
  label,
  onUp,
  onDown,
  colors,
}: {
  value: string;
  label: string;
  onUp: () => void;
  onDown: () => void;
  colors: ReminderPickerProps['colors'];
}) {
  return (
    <View style={[styles.step, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Pressable onPress={onUp} hitSlop={8} style={styles.chevron}>
        <Ionicons name="chevron-up" size={18} color={colors.primary} />
      </Pressable>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <Pressable onPress={onDown} hitSlop={8} style={styles.chevron}>
        <Ionicons name="chevron-down" size={18} color={colors.primary} />
      </Pressable>
    </View>
  );
}

export function ReminderPicker({
  enabled,
  time,
  onEnabledChange,
  onTimeChange,
  colors,
}: ReminderPickerProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.toggleRow}>
        <View style={styles.toggleCopy}>
          <Ionicons name="notifications-outline" size={16} color={colors.primary} />
          <Text style={[styles.toggleTitle, { color: colors.text }]}>Reminder</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onEnabledChange}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.textInverse}
        />
      </View>
      {enabled ? (
        <View style={styles.pickers}>
          <Stepper
            value={String(time.hour)}
            label="Hour"
            colors={colors}
            onUp={() => onTimeChange({ ...time, hour: wrapHour(time.hour + 1) })}
            onDown={() => onTimeChange({ ...time, hour: wrapHour(time.hour - 1) })}
          />
          <Stepper
            value={String(time.minute).padStart(2, '0')}
            label="Min"
            colors={colors}
            onUp={() => onTimeChange({ ...time, minute: wrapMinute(time.minute + MINUTE_STEP) })}
            onDown={() => onTimeChange({ ...time, minute: wrapMinute(time.minute - MINUTE_STEP) })}
          />
          <View style={[styles.ampm, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            {(['AM', 'PM'] as const).map((period) => {
              const on = period === 'AM' ? time.am : !time.am;
              return (
                <Pressable
                  key={period}
                  onPress={() => onTimeChange({ ...time, am: period === 'AM' })}
                  style={[
                    styles.ampmBtn,
                    on && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={[styles.ampmText, { color: on ? colors.textInverse : colors.text }]}>
                    {period}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : (
        <Text style={[styles.offHint, { color: colors.textMuted }]}>Off — we won’t ping you for this one</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleCopy: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleTitle: { fontSize: 14, fontWeight: '800' },
  pickers: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  step: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingVertical: 6,
    gap: 2,
  },
  chevron: { padding: 4 },
  value: { fontSize: 22, fontWeight: '800', lineHeight: 26 },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  ampm: {
    width: 72,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  ampmBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  ampmText: { fontSize: 14, fontWeight: '800' },
  offHint: { fontSize: 12, fontWeight: '500' },
});
