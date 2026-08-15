import { useTheme } from '@/store/ThemeProvider';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

const MODAL_TITLES: Record<string, string> = {
  cooking: 'Cooking Pot',
  house: 'House',
};

/** Placeholder for interactions that don't have a drawer yet. */
export function InteractionModal({ payload, onClose }: { payload: string; onClose: () => void }) {
  const { theme } = useTheme();
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.card}>
          <Text style={styles.title}>{MODAL_TITLES[payload] ?? payload}</Text>
          <Text style={styles.body}>Coming soon!</Text>
          <Pressable
            style={[styles.closeBtn, { backgroundColor: theme.colors.primary }]}
            onPress={onClose}
          >
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '80%',
    alignItems: 'center',
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: '800' },
  body: { fontSize: 14, color: '#888', textAlign: 'center' },
  closeBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  closeBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
