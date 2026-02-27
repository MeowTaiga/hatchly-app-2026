/**
 * In-game admin panel modal: reset quests, reset farm, modify gems, modify level.
 * Clean, simple UI matching HUD aesthetics.
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/ThemeProvider';
import { api } from '@/lib/api';


interface AdminPanelModalProps {
  visible: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function AdminPanelModal({ visible, onClose, onRefresh }: AdminPanelModalProps) {
  const { theme } = useTheme();
  const { colors, typography } = theme;
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
      'Reset Farm',
      'Delete your farm? You will start fresh.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setLoading('farm');
            try {
              await api.resetMyFarm();
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
          <Text style={styles.title}>Admin</Text>

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
        </Pressable>
      </Pressable>
    </Modal>
  );
}
