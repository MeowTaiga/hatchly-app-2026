import { GemIcon } from '@/components/ui/GemIcon';
import { api } from '@/lib/api';
import { useTheme } from '@/store/ThemeProvider';
import React, { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiningEnergyStat } from '../GameHUD/MiningEnergyPill';

const BOT_COUNT_OPTIONS = [5, 10, 15, 20, 30];

/** Admin-only tool for spawning bot players into a multiplayer scene. */
function StressTestModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const run = useCallback(async (task: () => Promise<string>) => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await task());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }, []);

  const handleSpawn = useCallback(
    () => run(async () => `Spawned ${(await api.spawnStressTestBots(count)).spawned} bots`),
    [run, count],
  );
  const handleRemove = useCallback(
    () => run(async () => `Removed ${(await api.removeStressTestBots()).removed} bots`),
    [run],
  );

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.content, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: colors.text }]}>Multiplayer Stress Test</Text>
          <Text style={[styles.desc, { color: colors.textMuted }]}>
            Spawn bot players that wander and fish. You see them via WebSocket — the server emits
            their updates to your connection.
          </Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.text }]}>Count:</Text>
            <View style={styles.countRow}>
              {BOT_COUNT_OPTIONS.map((n) => (
                <Pressable
                  key={n}
                  style={[
                    styles.countBtn,
                    {
                      backgroundColor: count === n ? colors.primary : colors.border + '40',
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setCount(n)}
                >
                  <Text
                    style={[
                      styles.countBtnText,
                      { color: count === n ? colors.onPrimary ?? '#fff' : colors.text },
                    ]}
                  >
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          {error && <Text style={[styles.error, { color: colors.error ?? '#f44336' }]}>{error}</Text>}
          {result && <Text style={[styles.result, { color: colors.primary }]}>{result}</Text>}
          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, { backgroundColor: colors.primary }]}
              onPress={handleSpawn}
              disabled={busy}
            >
              <Text style={[styles.btnText, { color: colors.onPrimary ?? '#fff' }]}>
                {busy ? '...' : 'Spawn Bots'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.btn, { backgroundColor: colors.border + '80', borderColor: colors.border }]}
              onPress={handleRemove}
              disabled={busy}
            >
              <Text style={[styles.btnText, { color: colors.text }]}>Remove Bots</Text>
            </Pressable>
          </View>
          <Pressable style={[styles.closeBtn, { borderColor: colors.border }]} onPress={onClose}>
            <Text style={[styles.closeBtnText, { color: colors.text }]}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface MPTopBarProps {
  sceneName: string;
  farmLevel: number;
  gems: number;
  isAdmin?: boolean;
}

/** Scene name, gems and level pill shown over multiplayer scenes. */
export const MPTopBar = React.memo(function MPTopBar({
  sceneName,
  farmLevel,
  gems,
  isAdmin,
}: MPTopBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const colors = theme.colors;
  const [stressTestVisible, setStressTestVisible] = useState(false);

  return (
    <View style={[styles.root, { top: insets.top + 8 }]} pointerEvents="box-none">
      <View style={styles.topRow}>
        <View style={[styles.pill, { backgroundColor: colors.surface }]}>
          <Text style={[styles.pillText, { color: colors.text }]}>{sceneName}</Text>
          <View style={[styles.sep, { backgroundColor: colors.border }]} />
          <GemIcon size={14} />
          <Text style={[styles.gemCount, { color: colors.gemColor ?? colors.accent }]}>
            {gems.toLocaleString()}
          </Text>
          <View style={[styles.lvlBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.lvlText, { color: colors.onPrimary ?? '#fff' }]}>Lv.{farmLevel}</Text>
          </View>
          <View style={[styles.sep, { backgroundColor: colors.border }]} />
          <MiningEnergyStat />
        </View>
      </View>
      {isAdmin && (
        <Pressable
          style={[styles.stressTestBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setStressTestVisible(true)}
        >
          <Text style={[styles.stressTestBtnText, { color: colors.text }]}>Stress Test</Text>
        </Pressable>
      )}
      <StressTestModal visible={stressTestVisible} onClose={() => setStressTestVisible(false)} />
    </View>
  );
});

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 12, right: 12, zIndex: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  pillText: { fontSize: 13, fontWeight: '700' },
  sep: { width: 1, height: 14, marginHorizontal: 2 },
  gemCount: { fontSize: 13, fontWeight: '700' },
  lvlBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  lvlText: { fontSize: 10, fontWeight: '800' },
  stressTestBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  stressTestBtnText: { fontSize: 12, fontWeight: '600' },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: { borderRadius: 16, padding: 24, width: '100%', maxWidth: 340 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  desc: { fontSize: 13, marginBottom: 16, lineHeight: 20 },
  row: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  countRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  countBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  countBtnText: { fontSize: 14, fontWeight: '600' },
  error: { fontSize: 13, marginBottom: 8 },
  result: { fontSize: 13, marginBottom: 8, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnText: { fontSize: 15, fontWeight: '600' },
  closeBtn: {
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  closeBtnText: { fontSize: 14, fontWeight: '600' },
});
