import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { api } from '@/lib/api';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';

interface BakeRecord {
  farmCols: number;
  farmRows: number;
  imageUrl: string;
  updatedAt: string;
}

interface FarmLevel {
  level: number;
  xpRequired: number;
  title: string;
  emoji: string;
  cols: number;
  rows: number;
}

export default function AdminSceneryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors, typography, shadows } = theme;

  const [bakes, setBakes] = useState<BakeRecord[]>([]);
  const [farmLevels, setFarmLevels] = useState<FarmLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [bakingKey, setBakingKey] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await api.getSceneryBakes();
      setBakes(data.bakes);
      setFarmLevels(data.farmLevels);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to load scenery data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const bakeMap = useMemo(() => {
    const m: Record<string, BakeRecord> = {};
    for (const b of bakes) m[`${b.farmCols}x${b.farmRows}`] = b;
    return m;
  }, [bakes]);

  const handleBake = useCallback(async (cols: number, rows: number) => {
    const key = `${cols}x${rows}`;
    setBakingKey(key);
    try {
      const result = await api.bakeScenery(cols, rows);
      setBakes((prev) => {
        const filtered = prev.filter((b) => !(b.farmCols === cols && b.farmRows === rows));
        return [...filtered, { farmCols: cols, farmRows: rows, imageUrl: result.imageUrl, updatedAt: new Date().toISOString() }];
      });
    } catch (err: any) {
      Alert.alert('Bake Failed', err.message ?? 'Unknown error');
    } finally {
      setBakingKey(null);
    }
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        headerTitle: { flex: 1, textAlign: 'center', ...typography.title, fontSize: 20 },
        subtitle: { ...typography.subtitle, textAlign: 'center', marginBottom: spacing.xl, color: colors.textSecondary },
        card: {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: spacing.base,
          ...shadows.sm,
        },
        cardHeader: {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          justifyContent: 'space-between' as const,
          marginBottom: spacing.sm,
        },
        levelTitle: { fontWeight: '700', fontSize: 16, color: colors.text },
        levelSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
        sizeLabel: { fontSize: 13, color: colors.textMuted },
        bakeBtn: {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          gap: 6,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: colors.primary,
        },
        bakeBtnText: { ...typography.button, fontSize: 13 },
        previewImage: {
          width: '100%' as any,
          height: 140,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceAlt,
          marginTop: spacing.sm,
        },
        statusRow: {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          gap: 6,
          marginTop: spacing.xs,
        },
        statusText: { fontSize: 12, color: colors.textMuted },
        noBake: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' as const, marginTop: spacing.sm },
      }),
    [colors, typography, shadows],
  );

  return (
    <GradientBackground bubbleCount={3}>
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Scenery Bake</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>
          Bake scenery images for each farm level. Each bake uploads to CDN with a unique URL for automatic cache invalidation.
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing['3xl'] }} />
        ) : (
          farmLevels.map((level, idx) => {
            const key = `${level.cols}x${level.rows}`;
            const bake = bakeMap[key];
            const isBaking = bakingKey === key;

            return (
              <Animated.View
                key={level.level}
                entering={FadeInDown.delay(idx * 60).duration(400).springify()}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.levelTitle}>
                      {level.emoji} Lv{level.level} — {level.title}
                    </Text>
                    <Text style={styles.levelSub}>
                      {level.cols} x {level.rows} tiles  ·  {level.xpRequired} XP required
                    </Text>
                  </View>
                  <Pressable
                    style={[styles.bakeBtn, isBaking && { opacity: 0.6 }]}
                    onPress={() => handleBake(level.cols, level.rows)}
                    disabled={isBaking}
                  >
                    {isBaking ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="flame" size={16} color="#fff" />
                    )}
                    <Text style={styles.bakeBtnText}>{bake ? 'Re-bake' : 'Bake'}</Text>
                  </Pressable>
                </View>

                {bake ? (
                  <>
                    <Image
                      source={{ uri: bake.imageUrl }}
                      style={styles.previewImage}
                      contentFit="cover"
                      cachePolicy="disk"
                    />
                    <View style={styles.statusRow}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <Text style={styles.statusText}>
                        Last baked: {new Date(bake.updatedAt).toLocaleString()}
                      </Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.noBake}>No bake yet — tap Bake to generate</Text>
                )}
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },
});
