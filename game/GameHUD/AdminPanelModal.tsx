/**
 * In-game admin panel modal: reset quests, full game reset, modify gems, modify level,
 * and preview weather effects locally.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/store/ThemeProvider';
import { api } from '@/lib/api';
import { useAuth } from '@/store/AuthProvider';
import { useGame } from '../GameProvider';
import type { WeatherType } from '../types';

interface AdminPanelModalProps {
  visible: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const WEATHER_PRESETS: { key: WeatherType | null; label: string }[] = [
  { key: null, label: 'Auto' },
  { key: 'clear', label: 'Clear' },
  { key: 'rain', label: 'Rain' },
  { key: 'snow', label: 'Snow' },
  { key: 'meteor_shower', label: 'Meteors' },
];

export function AdminPanelModal({ visible, onClose, onRefresh }: AdminPanelModalProps) {
  const { theme } = useTheme();
  const { colors, typography } = theme;
  const { weatherOverride, setWeatherOverride, weather } = useGame();
  const { refreshUser } = useAuth();
  const [gemsInput, setGemsInput] = useState('');
  const [levelInput, setLevelInput] = useState('1');

  const [loading, setLoading] = useState<string | null>(null);

  const resetQuests = async () => {
    Alert.alert(
      'Reset Quests',
      'Delete all your quest progress?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setLoading('quests');
            try {
              await api.resetMyQuests();
              onRefresh();
              onClose();
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Failed to reset quests');
            } finally {
              setLoading(null);
            }
          },
        },
      ],
    );
  };

  const resetFarm = async () => {
    Alert.alert(
      'Reset farm',
      'This wipes your farm, quests, farm level, skills, recipes, collections, and mailbox — same as a new player. Health logs, your pet, and account settings stay.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setLoading('farm');
            try {
              await api.resetMyFarm();
              await refreshUser();
              onRefresh();
              onClose();
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Failed to reset farm');
            } finally {
              setLoading(null);
            }
          },
        },
      ],
    );
  };

  const applyGems = async () => {
    const n = parseInt(gemsInput, 10);
    if (isNaN(n) || n < 0) {
      Alert.alert('Invalid', 'Enter a valid gems amount');
      return;
    }
    setLoading('gems');
    try {
      await api.updateMyFarm({ gems: n });
      onRefresh();
      setGemsInput('');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to update gems');
    } finally {
      setLoading(null);
    }
  };

  const applyLevel = async () => {
    const lvl = parseInt(levelInput, 10);
    if (isNaN(lvl) || lvl < 1 || lvl > 8) {
      Alert.alert('Invalid', 'Level must be 1–8');
      return;
    }
    setLoading('level');
    try {
      await api.updateMyFarm({ farmLevel: lvl });
      onRefresh();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to update level');
    } finally {
      setLoading(null);
    }
  };

  const resetSpiritSnatch = async () => {
    setLoading('snatch');
    try {
      await api.resetSpiritSnatchCooldown();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to reset Spirit Snatch');
    } finally {
      setLoading(null);
    }
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    panel: {
      width: '90%',
      maxWidth: 340,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
    },
    title: {
      ...typography.title,
      fontSize: 18,
      marginBottom: 20,
      textAlign: 'center',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    label: { ...typography.label, flex: 1 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      minWidth: 80,
      fontSize: 16,
      color: colors.text,
    },
    btn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    btnDestructive: { backgroundColor: colors.error ?? '#DC2626' },
    btnText: { ...typography.button, fontSize: 13, color: colors.onPrimary ?? '#fff' },
    sectionLabel: {
      ...typography.caption,
      color: colors.textMuted,
      marginBottom: 8,
      marginTop: 4,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: (colors.primary ?? '#4CAF50') + '22',
    },
    chipText: { ...typography.caption, color: colors.text, fontWeight: '600' },
    chipTextActive: { color: colors.primary },
    hint: { ...typography.caption, color: colors.textMuted, marginBottom: 16, marginTop: -8 },
    closeBtn: {
      marginTop: 12,
      paddingVertical: 10,
      alignItems: 'center',
    },
    closeText: { ...typography.caption, color: colors.textMuted },
  });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Admin</Text>

          <Text style={styles.sectionLabel}>Weather preview (local only)</Text>
          <View style={styles.chipRow}>
            {WEATHER_PRESETS.map(({ key, label }) => {
              const active = weatherOverride === key;
              return (
                <Pressable
                  key={label}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setWeatherOverride(key)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>
            Server today: {weather.type}
            {weatherOverride != null ? ` · previewing ${weatherOverride}` : ''}
          </Text>

          <View style={styles.row}>
            <Text style={styles.label}>Spirit Snatch cooldown</Text>
            <Pressable
              style={styles.btn}
              onPress={resetSpiritSnatch}
              disabled={!!loading}
            >
              {loading === 'snatch' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.btnText}>Reset</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Reset quests</Text>
            <Pressable
              style={[styles.btn, styles.btnDestructive]}
              onPress={resetQuests}
              disabled={!!loading}
            >
              {loading === 'quests' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.btnText}>Reset</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Reset farm</Text>
            <Pressable
              style={[styles.btn, styles.btnDestructive]}
              onPress={resetFarm}
              disabled={!!loading}
            >
              {loading === 'farm' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.btnText}>Reset</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Gems</Text>
            <TextInput
              style={styles.input}
              value={gemsInput}
              onChangeText={setGemsInput}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />
            <Pressable
              style={[styles.btn, { marginLeft: 8 }]}
              onPress={applyGems}
              disabled={!!loading}
            >
              {loading === 'gems' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.btnText}>Apply</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Level (1–8)</Text>
            <TextInput
              style={styles.input}
              value={levelInput}
              onChangeText={setLevelInput}
              placeholder="1"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />
            <Pressable style={[styles.btn, { marginLeft: 8 }]} onPress={applyLevel} disabled={!!loading}>
              {loading === 'level' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.btnText}>Apply</Text>
              )}
            </Pressable>
          </View>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
