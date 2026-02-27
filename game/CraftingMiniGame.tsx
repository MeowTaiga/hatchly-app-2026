import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Modal } from 'react-native';
import { useTheme } from '@/store/ThemeProvider';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAD_SIZE = Math.min(80, (SCREEN_WIDTH * 0.5 - 48) / 2);
const FLASH_MS = 550;
const GAP_MS = 250;

const PAD_COLORS = ['#4CAF50', '#2196F3', '#FFC107', '#E91E63'];

interface CraftingMiniGameProps {
  difficulty: number;
  onComplete: (passed: boolean) => void;
  onCancel: () => void;
}

function randomPadIndex(): number {
  return Math.floor(Math.random() * 4);
}

export function CraftingMiniGame({ difficulty, onComplete, onCancel }: CraftingMiniGameProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const sequenceLength = Math.max(2, Math.min(6, 2 + difficulty));
  const [sequence, setSequence] = useState<number[]>([]);
  const [phase, setPhase] = useState<'playing' | 'input' | 'done'>('playing');
  const [inputIndex, setInputIndex] = useState(0);
  const [passed, setPassed] = useState(false);
  const [litIndex, setLitIndex] = useState<number | null>(null);
  const [resultText, setResultText] = useState('');
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    const seq = Array.from({ length: sequenceLength }, randomPadIndex);
    setSequence(seq);
    setPhase('playing');
    setInputIndex(0);
    setLitIndex(null);
  }, [sequenceLength]);

  useEffect(() => {
    if (phase !== 'playing' || sequence.length === 0) return;

    let i = 0;
    const run = () => {
      if (!activeRef.current) return;
      if (i >= sequence.length) {
        setPhase('input');
        setInputIndex(0);
        return;
      }
      setLitIndex(sequence[i]);
      setTimeout(() => {
        if (!activeRef.current) return;
        setLitIndex(null);
        i += 1;
        setTimeout(run, GAP_MS);
      }, FLASH_MS);
    };
    const t = setTimeout(run, GAP_MS);
    return () => clearTimeout(t);
  }, [phase, sequence]);

  const handlePadPress = useCallback(
    (padIndex: number) => {
      if (phase !== 'input' || !activeRef.current) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (padIndex !== sequence[inputIndex]) {
        activeRef.current = false;
        setPhase('done');
        setPassed(false);
        setResultText('Wrong!');
        setTimeout(() => onComplete(false), 800);
        return;
      }

      const next = inputIndex + 1;
      if (next >= sequence.length) {
        activeRef.current = false;
        setPhase('done');
        setPassed(true);
        setResultText('Success!');
        setTimeout(() => onComplete(true), 800);
        return;
      }
      setInputIndex(next);
    },
    [phase, sequence, inputIndex, onComplete],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.75)',
          justifyContent: 'center',
          alignItems: 'center',
        },
        card: {
          width: SCREEN_WIDTH * 0.9,
          backgroundColor: colors.surface,
          borderRadius: 20,
          padding: 24,
          alignItems: 'center',
        },
        title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 8 },
        hint: { fontSize: 14, color: colors.textSecondary, marginBottom: 20 },
        grid: { flexDirection: 'row', flexWrap: 'wrap', width: PAD_SIZE * 2 + 16, gap: 8 },
        pad: {
          width: PAD_SIZE,
          height: PAD_SIZE,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
        },
        padLit: { opacity: 1, transform: [{ scale: 1.15 }] },
        resultOverlay: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0,0,0,0.5)',
          borderRadius: 20,
          justifyContent: 'center',
          alignItems: 'center',
        },
        resultLabel: { fontSize: 28, fontWeight: '900', color: '#fff' },
        cancelBtn: { marginTop: 24, paddingVertical: 10, paddingHorizontal: 24 },
        cancelText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
      }),
    [colors],
  );

  const hint =
    phase === 'playing'
      ? 'Watch the pattern...'
      : phase === 'input'
        ? 'Repeat the pattern'
        : '';

  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Craft!</Text>
          <Text style={styles.hint}>{hint || resultText}</Text>

          <View style={styles.grid}>
            {PAD_COLORS.map((color, i) => (
              <Pressable
                key={i}
                style={[
                  styles.pad,
                  { backgroundColor: color },
                  phase === 'playing' && { opacity: litIndex === i ? 1 : 0.4 },
                  phase === 'playing' && litIndex === i && styles.padLit,
                ]}
                onPress={() => handlePadPress(i)}
                disabled={phase !== 'input'}
              />
            ))}
          </View>

          {phase === 'done' && (
            <View style={styles.resultOverlay}>
              <Text style={styles.resultLabel}>{resultText}</Text>
            </View>
          )}

          <Pressable style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
