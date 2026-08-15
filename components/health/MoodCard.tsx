/**
 * Mood diary card — quick check-in + recent entries.
 * Rewards XP/gems/(optional item) every 3 hours; logging is always allowed.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/ThemeProvider';
import { useToast } from '@/store/ToastProvider';
import { useGameSummary } from '@/hooks/useGameSummary';
import { useAuth } from '@/store/AuthProvider';
import { usePetHero } from '@/store/PetHeroProvider';
import { api } from '@/lib/api';
import { showAppRewards } from '@/lib/showAppRewards';
import { MOOD_OPTIONS, type MoodId } from '@/components/chat/moodOptions';
import { spacing } from '@/constants/theme';

type MoodEntry = {
  id?: string;
  mood: string;
  date: string;
  note?: string;
  rewarded?: boolean;
  createdAt?: string;
};

function formatCooldown(iso: string | null): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const mins = Math.ceil(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function moodMeta(id: string) {
  return MOOD_OPTIONS.find((o) => o.id === id);
}

export function MoodCard() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { toast } = useToast();
  const { refresh: refreshGameSummary } = useGameSummary();
  const { refreshUser } = useAuth();
  const { triggerXpGain } = usePetHero();

  const [logs, setLogs] = useState<MoodEntry[]>([]);
  const [canReward, setCanReward] = useState(true);
  const [nextAvailableAt, setNextAvailableAt] = useState<string | null>(null);
  const [selected, setSelected] = useState<MoodId | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const cardShadow = useMemo(
    () =>
      Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
        android: { elevation: 2 },
      }),
    [],
  );

  const refresh = useCallback(async () => {
    try {
      const data = await api.getMoodHistory(30);
      setLogs(data.logs);
      setCanReward(data.canReward);
      setNextAvailableAt(data.nextAvailableAt);
    } catch {
      // keep prior
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const cooldownLabel = formatCooldown(nextAvailableAt);

  const handleSave = useCallback(async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      const result = await api.logMood(selected, note);
      if (result.xpGained > 0) {
        triggerXpGain?.(result.xpGained);
        void refreshUser();
      }
      if (result.xpGained > 0 || result.gemsAwarded > 0 || result.item) {
        showAppRewards({
          xpGained: result.xpGained,
          gemsAwarded: result.gemsAwarded,
          item: result.item,
        });
        refreshGameSummary();
      } else if (!result.rewarded) {
        toast('Mood saved to your diary', 'success');
      }
      setSelected(null);
      setNote('');
      await refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to log mood', 'error');
    } finally {
      setSaving(false);
    }
  }, [selected, note, saving, toast, triggerXpGain, refreshGameSummary, refreshUser, refresh]);

  const recent = logs.slice(0, 6);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
      <View style={[styles.glow, { backgroundColor: colors.secondary + '18' }]} />

      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: colors.textMuted }]}>DIARY</Text>
          <Text style={[styles.title, { color: colors.text }]}>How are you feeling?</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {canReward
              ? 'Log a mood for XP, gems, and a chance at a farm treat'
              : cooldownLabel
                ? `Diary open · next reward in ${cooldownLabel}`
                : 'Diary open · rewards cooling down'}
          </Text>
        </View>
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary + '22' }]}>
          <Ionicons name="heart" size={22} color={colors.secondary} />
        </View>
      </View>

      <View style={styles.grid}>
        {MOOD_OPTIONS.map(({ id, emoji, label }) => {
          const active = selected === id;
          return (
            <Pressable
              key={id}
              onPress={() => setSelected(id)}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: active ? colors.secondary + '22' : 'rgba(127,127,127,0.08)',
                  borderColor: active ? colors.secondary + '55' : 'transparent',
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.emoji}>{emoji}</Text>
              <Text style={[styles.optionLabel, { color: colors.text }]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selected ? (
        <View style={styles.compose}>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Optional note — a sentence for your diary…"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.noteInput,
              {
                color: colors.text,
                backgroundColor: 'rgba(127,127,127,0.08)',
                borderColor: colors.border,
              },
            ]}
            maxLength={500}
            multiline
          />
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: colors.primary },
              (pressed || saving) && { opacity: 0.85 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>
                {canReward ? 'Save & claim reward' : 'Save to diary'}
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 12 }} color={colors.primary} />
      ) : recent.length > 0 ? (
        <View style={styles.timeline}>
          <Text style={[styles.timelineTitle, { color: colors.textMuted }]}>RECENT</Text>
          {recent.map((entry) => {
            const meta = moodMeta(entry.mood);
            const time = entry.createdAt
              ? new Date(entry.createdAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : entry.date;
            return (
              <View
                key={entry.id ?? `${entry.date}-${entry.createdAt}-${entry.mood}`}
                style={[styles.timelineRow, { backgroundColor: 'rgba(127,127,127,0.06)' }]}
              >
                <Text style={styles.timelineEmoji}>{meta?.emoji ?? '·'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.timelineMood, { color: colors.text }]}>
                    {meta?.label ?? entry.mood}
                    {entry.rewarded ? ' · rewarded' : ''}
                  </Text>
                  {entry.note ? (
                    <Text style={[styles.timelineNote, { color: colors.textSecondary }]} numberOfLines={2}>
                      {entry.note}
                    </Text>
                  ) : null}
                  <Text style={[styles.timelineTime, { color: colors.textMuted }]}>{time}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1,
    padding: spacing.xl,
    marginBottom: spacing.base,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    top: -50,
    left: -30,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    width: '22%',
    flexGrow: 1,
    minWidth: 64,
    maxWidth: 88,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  emoji: { fontSize: 26, marginBottom: 2 },
  optionLabel: { fontSize: 11, fontWeight: '700' },
  compose: { marginTop: 12, gap: 10 },
  noteInput: {
    minHeight: 64,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  timeline: { marginTop: 16, gap: 8 },
  timelineTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 2,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 14,
    padding: 10,
    alignItems: 'flex-start',
  },
  timelineEmoji: { fontSize: 22, marginTop: 2 },
  timelineMood: { fontSize: 14, fontWeight: '700' },
  timelineNote: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  timelineTime: { fontSize: 11, marginTop: 4, fontWeight: '600' },
});
