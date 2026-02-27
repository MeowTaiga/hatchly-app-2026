import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  ScrollView, Alert, TextInput,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { api, type AdminScene } from '@/lib/api';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';

interface FarmLevel {
  level: number;
  xpRequired: number;
  title: string;
  emoji: string;
  cols: number;
  rows: number;
}

interface BakeRecord {
  farmCols: number;
  farmRows: number;
  imageUrl: string;
  updatedAt: Date;
}

const WORLD_PADDING = 12;

export default function AdminScenesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors, typography, shadows } = theme;

  const [scenes, setScenes] = useState<AdminScene[]>([]);
  const [farmLevels, setFarmLevels] = useState<FarmLevel[]>([]);
  const [bakes, setBakes] = useState<BakeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', cols: '40', rows: '48', farmCols: '16', farmRows: '24' });
  const [creating, setCreating] = useState(false);
  const [bakingSlug, setBakingSlug] = useState<string | null>(null);
  const [bakingFarmKey, setBakingFarmKey] = useState<string | null>(null);
  const [creatingFarmKey, setCreatingFarmKey] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const data = await api.getScenes();
      setScenes(data.scenes);
      setFarmLevels(data.farmLevels);
      setBakes(data.bakes);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to load scenes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Map scene slugs for quick lookup
  const sceneBySlug = useMemo(() => {
    const m: Record<string, AdminScene> = {};
    for (const s of scenes) m[s.slug] = s;
    return m;
  }, [scenes]);

  const bakeMap = useMemo(() => {
    const m: Record<string, BakeRecord> = {};
    for (const b of bakes) m[`${b.farmCols}x${b.farmRows}`] = b;
    return m;
  }, [bakes]);

  // ── Custom scene actions ────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (!form.name || !form.slug) return Alert.alert('Error', 'Name and slug are required');
    setCreating(true);
    try {
      await api.createScene({
        name: form.name,
        slug: form.slug,
        cols: parseInt(form.cols) || 40,
        rows: parseInt(form.rows) || 48,
        farmCols: parseInt(form.farmCols) || 16,
        farmRows: parseInt(form.farmRows) || 24,
      });
      setShowCreate(false);
      setForm({ name: '', slug: '', cols: '40', rows: '48', farmCols: '16', farmRows: '24' });
      fetchAll();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create scene');
    } finally {
      setCreating(false);
    }
  }, [form, fetchAll]);

  const handleDelete = useCallback(async (slug: string) => {
    Alert.alert('Delete Scene', `Delete "${slug}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.deleteScene(slug);
            fetchAll();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  }, [fetchAll]);

  const handleBakeScene = useCallback(async (slug: string) => {
    setBakingSlug(slug);
    try {
      const result = await api.bakeScene(slug);
      setScenes((prev) => prev.map((s) => s.slug === slug ? { ...s, bakedImageUrl: result.imageUrl } : s));
    } catch (err: any) {
      Alert.alert('Bake Failed', err.message);
    } finally {
      setBakingSlug(null);
    }
  }, []);

  // ── Farm-level scene actions ────────────────────────────────────────────

  const farmSlug = (level: FarmLevel) => `farm_${level.cols}x${level.rows}`;

  const handleCreateFarmScene = useCallback(async (level: FarmLevel) => {
    const key = `${level.cols}x${level.rows}`;
    setCreatingFarmKey(key);
    try {
      const totalCols = level.cols + 2 * WORLD_PADDING;
      const totalRows = level.rows + 2 * WORLD_PADDING;
      const slug = farmSlug(level);
      await api.createScene({
        name: `${level.emoji} Lv${level.level} — ${level.title}`,
        slug,
        cols: totalCols,
        rows: totalRows,
        farmCols: level.cols,
        farmRows: level.rows,
      });
      fetchAll();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create farm scene');
    } finally {
      setCreatingFarmKey(null);
    }
  }, [fetchAll]);

  const handleBakeFarmProcedural = useCallback(async (cols: number, rows: number) => {
    const key = `${cols}x${rows}`;
    setBakingFarmKey(key);
    try {
      const result = await api.bakeScenery(cols, rows);
      setBakes((prev) => {
        const filtered = prev.filter((b) => !(b.farmCols === cols && b.farmRows === rows));
        return [...filtered, { farmCols: cols, farmRows: rows, imageUrl: result.imageUrl, updatedAt: new Date() }];
      });
    } catch (err: any) {
      Alert.alert('Bake Failed', err.message);
    } finally {
      setBakingFarmKey(null);
    }
  }, []);

  // ── Styles ──────────────────────────────────────────────────────────────

  const styles = useMemo(
    () => StyleSheet.create({
      headerTitle: { flex: 1, textAlign: 'center', ...typography.title, fontSize: 20 },
      sectionTitle: { fontWeight: '800', fontSize: 16, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
      sectionSub: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.base },
      card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.base,
        ...shadows.sm,
      },
      cardHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: spacing.sm },
      sceneName: { fontWeight: '700', fontSize: 16, color: colors.text },
      sceneMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
      btnRow: { flexDirection: 'row' as const, gap: 8, marginTop: spacing.sm, flexWrap: 'wrap' as const },
      btn: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.md },
      btnPrimary: { backgroundColor: colors.primary },
      btnDanger: { backgroundColor: '#EF4444' },
      btnSecondary: { backgroundColor: colors.border },
      btnSuccess: { backgroundColor: '#10B981' },
      btnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
      btnTextDark: { fontSize: 12, fontWeight: '700', color: colors.text },
      preview: { width: '100%' as any, height: 100, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, marginTop: spacing.sm },
      createCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.primary, marginBottom: spacing.xl, ...shadows.sm },
      input: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8, color: colors.text, fontSize: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
      inputRow: { flexDirection: 'row' as const, gap: 8 },
      inputLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 },
      addBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.primary, alignSelf: 'flex-start' as const },
      statusRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginTop: spacing.xs },
      statusText: { fontSize: 12, color: colors.textMuted },
    }),
    [colors, typography, shadows],
  );

  return (
    <GradientBackground bubbleCount={3}>
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Scenes & Scenery</Text>
        <Pressable onPress={() => setShowCreate((v) => !v)} hitSlop={12} style={s.backBtn}>
          <Ionicons name={showCreate ? 'close' : 'add'} size={26} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Create new custom scene */}
        {showCreate && (
          <Animated.View entering={FadeInDown.duration(300).springify()} style={styles.createCard}>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={(t) => setForm((f) => ({ ...f, name: t }))} placeholder="My Scene" placeholderTextColor={colors.textMuted} />
            <Text style={styles.inputLabel}>Slug (unique ID)</Text>
            <TextInput style={styles.input} value={form.slug} onChangeText={(t) => setForm((f) => ({ ...f, slug: t.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))} placeholder="my_scene" placeholderTextColor={colors.textMuted} autoCapitalize="none" />
            <View style={styles.inputRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Total Cols</Text>
                <TextInput style={styles.input} value={form.cols} onChangeText={(t) => setForm((f) => ({ ...f, cols: t }))} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Total Rows</Text>
                <TextInput style={styles.input} value={form.rows} onChangeText={(t) => setForm((f) => ({ ...f, rows: t }))} keyboardType="number-pad" />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Farm Cols</Text>
                <TextInput style={styles.input} value={form.farmCols} onChangeText={(t) => setForm((f) => ({ ...f, farmCols: t }))} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Farm Rows</Text>
                <TextInput style={styles.input} value={form.farmRows} onChangeText={(t) => setForm((f) => ({ ...f, farmRows: t }))} keyboardType="number-pad" />
              </View>
            </View>
            <Pressable style={[styles.addBtn, creating && { opacity: 0.6 }]} onPress={handleCreate} disabled={creating}>
              {creating ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="add" size={16} color="#fff" />}
              <Text style={styles.btnText}>Create Scene</Text>
            </Pressable>
          </Animated.View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing['3xl'] }} />
        ) : (
          <>
            {/* ── Farm Level Scenery ──────────────────────────────── */}
            <Text style={styles.sectionTitle}>Farm Level Scenery</Text>
            <Text style={styles.sectionSub}>
              Each farm level needs a baked scenery image. Create a scene to edit manually, or quick-bake procedurally.
            </Text>

            {farmLevels.map((level, idx) => {
              const key = `${level.cols}x${level.rows}`;
              const slug = farmSlug(level);
              const existingScene = sceneBySlug[slug];
              const bake = bakeMap[key];
              const isBakingFarm = bakingFarmKey === key;
              const isCreatingFarm = creatingFarmKey === key;
              const isBakingScene = bakingSlug === slug;
              const previewUrl = existingScene?.bakedImageUrl ?? bake?.imageUrl;

              return (
                <Animated.View key={level.level} entering={FadeInDown.delay(idx * 50).duration(300).springify()} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sceneName}>
                        {level.emoji} Lv{level.level} — {level.title}
                      </Text>
                      <Text style={styles.sceneMeta}>
                        {level.cols}×{level.rows} farm · {level.xpRequired} XP
                        {existingScene ? ` · ${existingScene.placements.length} items` : ''}
                      </Text>
                    </View>
                  </View>

                  {previewUrl && (
                    <Image source={{ uri: previewUrl }} style={styles.preview} contentFit="cover" cachePolicy="disk" />
                  )}

                  {bake && (
                    <View style={styles.statusRow}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <Text style={styles.statusText}>
                        Baked: {new Date(bake.updatedAt).toLocaleString()}
                      </Text>
                    </View>
                  )}

                  <View style={styles.btnRow}>
                    {existingScene ? (
                      <>
                        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => router.push(`/admin-scene-editor?slug=${slug}`)}>
                          <Ionicons name="create" size={14} color="#fff" />
                          <Text style={styles.btnText}>Edit</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.btn, styles.btnSuccess, isBakingScene && { opacity: 0.6 }]}
                          onPress={() => handleBakeScene(slug)}
                          disabled={isBakingScene}
                        >
                          {isBakingScene ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="flame" size={14} color="#fff" />}
                          <Text style={styles.btnText}>Bake Scene</Text>
                        </Pressable>
                      </>
                    ) : (
                      <Pressable
                        style={[styles.btn, styles.btnPrimary, isCreatingFarm && { opacity: 0.6 }]}
                        onPress={() => handleCreateFarmScene(level)}
                        disabled={isCreatingFarm}
                      >
                        {isCreatingFarm ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="add" size={14} color="#fff" />}
                        <Text style={styles.btnText}>Create Scene</Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={[styles.btn, styles.btnSecondary, isBakingFarm && { opacity: 0.6 }]}
                      onPress={() => handleBakeFarmProcedural(level.cols, level.rows)}
                      disabled={isBakingFarm}
                    >
                      {isBakingFarm ? <ActivityIndicator size="small" color={colors.text} /> : <Ionicons name="flash" size={14} color={colors.text} />}
                      <Text style={styles.btnTextDark}>Quick Bake</Text>
                    </Pressable>
                  </View>
                </Animated.View>
              );
            })}

            {/* ── Custom Scenes ───────────────────────────────────── */}
            {scenes.filter((sc) => !farmLevels.some((l) => farmSlug(l) === sc.slug)).length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Custom Scenes</Text>
                <Text style={styles.sectionSub}>
                  Manually created scenes for buildings, interiors, etc.
                </Text>
              </>
            )}

            {scenes
              .filter((sc) => !farmLevels.some((l) => farmSlug(l) === sc.slug))
              .map((scene, idx) => {
                const isBaking = bakingSlug === scene.slug;
                return (
                  <Animated.View key={scene.slug} entering={FadeInDown.delay(idx * 50).duration(300).springify()} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sceneName}>{scene.name}</Text>
                        <Text style={styles.sceneMeta}>
                          {scene.slug} · {scene.cols}x{scene.rows} total · {scene.farmCols}x{scene.farmRows} farm · {scene.placements.length} items
                        </Text>
                      </View>
                    </View>

                    {scene.bakedImageUrl && (
                      <Image source={{ uri: scene.bakedImageUrl }} style={styles.preview} contentFit="cover" cachePolicy="disk" />
                    )}

                    <View style={styles.btnRow}>
                      <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => router.push(`/admin-scene-editor?slug=${scene.slug}`)}>
                        <Ionicons name="create" size={14} color="#fff" />
                        <Text style={styles.btnText}>Edit</Text>
                      </Pressable>
                      <Pressable style={[styles.btn, styles.btnSecondary, isBaking && { opacity: 0.6 }]} onPress={() => handleBakeScene(scene.slug)} disabled={isBaking}>
                        {isBaking ? <ActivityIndicator size="small" color={colors.text} /> : <Ionicons name="flame" size={14} color={colors.text} />}
                        <Text style={styles.btnTextDark}>Bake</Text>
                      </Pressable>
                      <Pressable style={[styles.btn, styles.btnDanger]} onPress={() => handleDelete(scene.slug)}>
                        <Ionicons name="trash" size={14} color="#fff" />
                        <Text style={styles.btnText}>Delete</Text>
                      </Pressable>
                    </View>
                  </Animated.View>
                );
              })}
          </>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingBottom: spacing.sm },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },
});
