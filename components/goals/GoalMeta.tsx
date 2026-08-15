/**
 * Repeat cadence, reminder, and description under a goal title.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { GoalRepeat } from '@/lib/api';
import { formatGoalRepeat, formatRemindAt } from '@/components/goals/goalSchedule';

export interface GoalMetaProps {
  repeat: GoalRepeat;
  repeatDays?: number[];
  remindAt?: string;
  notes?: string;
  color: string;
  notesColor: string;
  /** Cap list previews. 0 = show the full description. */
  notesMax?: number;
}

const NOTES_LIST_MAX = 100;

function previewNotes(notes: string, max: number): string {
  if (max <= 0 || notes.length <= max) return notes;
  return `${notes.slice(0, max).trimEnd()}…`;
}

export function GoalMeta({
  repeat,
  repeatDays = [],
  remindAt,
  notes,
  color,
  notesColor,
  notesMax = NOTES_LIST_MAX,
}: GoalMetaProps) {
  const schedule = formatGoalRepeat(repeat, repeatDays);
  const time = remindAt ? formatRemindAt(remindAt) : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.chip}>
          <Ionicons name="repeat" size={13} color={color} />
          <Text style={[styles.chipText, { color }]}>{schedule}</Text>
        </View>
        {time ? (
          <View style={styles.chip}>
            <Ionicons name="notifications-outline" size={13} color={color} />
            <Text style={[styles.chipText, { color }]}>{time}</Text>
          </View>
        ) : null}
      </View>
      {notes ? (
        <Text style={[styles.notes, { color: notesColor }]} numberOfLines={notesMax <= 0 ? undefined : 4}>
          {previewNotes(notes, notesMax)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  notes: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
});
