/**
 * Quick mood diary sheet for the home tab — same moods as Health/Chat.
 */

import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { useTheme } from '@/store/ThemeProvider';
import { useToast } from '@/store/ToastProvider';
import { useGameSummary } from '@/hooks/useGameSummary';
import { useAuth } from '@/store/AuthProvider';
import { usePetHero } from '@/store/PetHeroProvider';
import { api } from '@/lib/api';
import { showAppRewards } from '@/lib/showAppRewards';
import { MOOD_OPTIONS, type MoodId } from '@/components/chat/moodOptions';
import { spacing } from '@/constants/theme';

export interface MoodQuickDrawerRef {
  open: () => void;
  close: () => void;
}

interface MoodQuickDrawerProps {
  onLogged?: () => void;
}

export const MoodQuickDrawer = forwardRef<MoodQuickDrawerRef, MoodQuickDrawerProps>(
  function MoodQuickDrawer({ onLogged }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const { theme } = useTheme();
    const { colors } = theme;
    const { toast } = useToast();
    const { refresh: refreshGameSummary } = useGameSummary();
    const { refreshUser } = useAuth();
    const { triggerXpGain } = usePetHero();

    const [selected, setSelected] = useState<MoodId | null>(null);
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [canReward, setCanReward] = useState(true);
    const [cooldownLabel, setCooldownLabel] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      open: async () => {
        setSelected(null);
        setNote('');
        try {
          const status = await api.getMoodStatus();
          setCanReward(status.canReward);
          if (status.nextAvailableAt) {
            const ms = new Date(status.nextAvailableAt).getTime() - Date.now();
            if (ms > 0) {
              const mins = Math.ceil(ms / 60_000);
              setCooldownLabel(mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h`);
            } else {
              setCooldownLabel(null);
            }
          } else {
            setCooldownLabel(null);
          }
        } catch {
          setCanReward(true);
          setCooldownLabel(null);
        }
        drawerRef.current?.open();
      },
      close: () => drawerRef.current?.close(),
    }));

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
        } else {
          toast('Mood saved to your diary', 'success');
        }
        onLogged?.();
        drawerRef.current?.close();
      } catch (err: unknown) {
        toast(err instanceof Error ? err.message : 'Failed to log mood', 'error');
      } finally {
        setSaving(false);
      }
    }, [selected, note, saving, toast, triggerXpGain, refreshGameSummary, refreshUser, onLogged]);

    return (
      <AppDrawer ref={drawerRef} title="Mood diary">
        <View style={styles.body}>
          <Text style={[styles.lead, { color: colors.textSecondary }]}>
            {canReward
              ? 'Check in for XP, gems, and a chance at a farm treat.'
              : cooldownLabel
                ? `Diary open · next reward in ${cooldownLabel}`
                : 'Diary open · rewards cooling down'}
          </Text>

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
                      backgroundColor: active ? colors.primary + '22' : 'rgba(127,127,127,0.08)',
                      borderColor: active ? colors.primary + '55' : 'transparent',
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
            <>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Optional note…"
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
                  <View style={styles.saveRow}>
                    <Ionicons name="heart" size={16} color="#fff" />
                    <Text style={styles.saveText}>
                      {canReward ? 'Save & claim reward' : 'Save to diary'}
                    </Text>
                  </View>
                )}
              </Pressable>
            </>
          ) : null}
        </View>
      </AppDrawer>
    );
  },
);

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: 12 },
  lead: { fontSize: 14, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    width: '22%',
    flexGrow: 1,
    minWidth: 64,
    maxWidth: 88,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  emoji: { fontSize: 26, marginBottom: 2 },
  optionLabel: { fontSize: 11, fontWeight: '700' },
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
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
