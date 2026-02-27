import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '@/store/ThemeProvider';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_WIDTH = SCREEN_WIDTH * 0.75;
const NEEDLE_WIDTH = 4;

const GREEN_RATIO = 0.3;
const YELLOW_RATIO = 0.2;

interface CookingMiniGameProps {
  difficulty: number;
  onComplete: (passed: boolean) => void;
  onCancel: () => void;
}

type TapResult = 'perfect' | 'good' | 'miss';

function scoreNeedlePosition(position: number): TapResult {
  const center = BAR_WIDTH / 2;
  const greenHalf = (BAR_WIDTH * GREEN_RATIO) / 2;
  const yellowHalf = (BAR_WIDTH * YELLOW_RATIO);
  const dist = Math.abs(position - center);
  if (dist <= greenHalf) return 'perfect';
  if (dist <= greenHalf + yellowHalf) return 'good';
  return 'miss';
}

export function CookingMiniGame({ difficulty, onComplete, onCancel }: CookingMiniGameProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const totalRounds = Math.max(1, Math.min(5, difficulty));
  const speed = 300 + (5 - difficulty) * 150;

  const [round, setRound] = useState(0);
  const [results, setResults] = useState<TapResult[]>([]);
  const [finished, setFinished] = useState(false);
  const [resultText, setResultText] = useState('');
  const needlePos = useSharedValue(0);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    needlePos.value = 0;
    needlePos.value = withRepeat(
      withTiming(BAR_WIDTH - NEEDLE_WIDTH, { duration: speed, easing: Easing.linear }),
      -1,
      true,
    );
    return () => {
      activeRef.current = false;
      cancelAnimation(needlePos);
    };
  }, [round, speed, needlePos]);

  const handleTap = useCallback(() => {
    if (finished || !activeRef.current) return;
    const pos = needlePos.value;

    const tapResult = scoreNeedlePosition(pos);
    Haptics.impactAsync(
      tapResult === 'perfect' ? Haptics.ImpactFeedbackStyle.Medium :
      tapResult === 'good' ? Haptics.ImpactFeedbackStyle.Light :
      Haptics.ImpactFeedbackStyle.Heavy,
    );

    const newResults = [...results, tapResult];
    setResults(newResults);

    if (newResults.length >= totalRounds) {
      setFinished(true);
      cancelAnimation(needlePos);
      const hasMiss = newResults.some((r) => r === 'miss');
      const passed = !hasMiss;
      setResultText(passed ? 'Success!' : 'Failed...');
      setTimeout(() => {
        if (activeRef.current) onComplete(passed);
      }, 1200);
    } else {
      setRound((r) => r + 1);
    }
  }, [finished, needlePos, results, totalRounds, onComplete]);

  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: needlePos.value }],
  }));

  const greenStart = (BAR_WIDTH * (1 - GREEN_RATIO)) / 2;
  const greenWidth = BAR_WIDTH * GREEN_RATIO;
  const yellowWidth = BAR_WIDTH * YELLOW_RATIO;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
          justifyContent: 'center', alignItems: 'center',
        },
        card: {
          width: SCREEN_WIDTH * 0.9, backgroundColor: colors.surface,
          borderRadius: 20, padding: 24, alignItems: 'center',
        },
        title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 8 },
        roundText: { fontSize: 14, color: colors.textSecondary, marginBottom: 20 },
        bar: {
          width: BAR_WIDTH, height: 48, borderRadius: 12,
          backgroundColor: '#EF5350', overflow: 'hidden', position: 'relative',
        },
        greenZone: {
          position: 'absolute', left: greenStart, width: greenWidth,
          height: '100%', backgroundColor: '#4CAF50',
        },
        yellowLeft: {
          position: 'absolute', left: greenStart - yellowWidth, width: yellowWidth,
          height: '100%', backgroundColor: '#FFC107',
        },
        yellowRight: {
          position: 'absolute', left: greenStart + greenWidth, width: yellowWidth,
          height: '100%', backgroundColor: '#FFC107',
        },
        needle: {
          position: 'absolute', left: 0, top: 0,
          width: NEEDLE_WIDTH, height: '100%',
          backgroundColor: '#fff', borderRadius: 2,
        },
        tapBtn: {
          marginTop: 24, paddingVertical: 16, paddingHorizontal: 48,
          backgroundColor: colors.primary, borderRadius: 14,
        },
        tapText: { fontSize: 18, fontWeight: '800', color: '#fff' },
        resultDots: {
          flexDirection: 'row', gap: 8, marginTop: 16,
        },
        dot: { width: 16, height: 16, borderRadius: 8 },
        resultOverlay: {
          ...StyleSheet.absoluteFillObject,
          justifyContent: 'center', alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12,
        },
        resultLabel: { fontSize: 28, fontWeight: '900', color: '#fff' },
        cancelBtn: {
          marginTop: 12, paddingVertical: 10, paddingHorizontal: 24,
        },
        cancelText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
      }),
    [colors, greenStart, greenWidth, yellowWidth],
  );

  const dotColor = (r: TapResult) =>
    r === 'perfect' ? '#4CAF50' : r === 'good' ? '#FFC107' : '#EF5350';

  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={handleTap}>
        <View style={styles.card} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>Cook!</Text>
          <Text style={styles.roundText}>
            {finished ? resultText : `Tap ${round + 1} of ${totalRounds}`}
          </Text>

          <View style={styles.bar}>
            <View style={styles.yellowLeft} />
            <View style={styles.greenZone} />
            <View style={styles.yellowRight} />
            <Animated.View style={[styles.needle, needleStyle]} />
            {finished && (
              <View style={styles.resultOverlay}>
                <Text style={styles.resultLabel}>{resultText}</Text>
              </View>
            )}
          </View>

          <View style={styles.resultDots}>
            {results.map((r, i) => (
              <View key={i} style={[styles.dot, { backgroundColor: dotColor(r) }]} />
            ))}
            {Array.from({ length: totalRounds - results.length }).map((_, i) => (
              <View key={`e${i}`} style={[styles.dot, { backgroundColor: colors.border }]} />
            ))}
          </View>

          {!finished && (
            <Pressable style={styles.tapBtn} onPress={handleTap}>
              <Text style={styles.tapText}>TAP!</Text>
            </Pressable>
          )}

          <Pressable style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
