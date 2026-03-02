import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CachedImage } from '@/components/ui/CachedImage';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { api, type AdminGameItem } from '@/lib/api';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';

const CATEGORY_LABELS: Record<string, string> = {
  soil: 'Soil', seed: 'Seed', decoration: 'Decor', ingredient: 'Item', building: 'Building',
  scenery: 'Scenery', flooring: 'Floor', fish: 'Fish', bug: 'Bug', equip: 'Equip', food: 'Food',
  asset: 'Asset', tree: 'Tree',
};
const CATEGORY_COLORS: Record<string, string> = {
  soil: '#8D6E63', seed: '#A8D860', decoration: '#C4A882', ingredient: '#E8D44D', building: '#D4A574',
  scenery: '#8BC34A', flooring: '#9E9E9E', fish: '#42A5F5', bug: '#AB47BC', equip: '#FF7043', food: '#EF5350',
  asset: '#E91E63', tree: '#2E7D32',
};
const SORT_CHIPS: { key: string; label: string }[] = [
  { key: '', label: 'All' },
  ...Object.entries(CATEGORY_LABELS).map(([k, v]) => ({ key: k, label: v })),
];

export default function AdminItemsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors, typography, shadows } = theme;
  const [items, setItems] = useState<AdminGameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getGameItems();
      setItems(data);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    let out = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (i) =>
          i.label.toLowerCase().includes(q) || i.itemType.toLowerCase().includes(q),
      );
    }
    if (categoryFilter) {
      out = out.filter((i) => i.category === categoryFilter);
    }
    return out;
  }, [items, search, categoryFilter]);

  const handleDelete = useCallback((item: AdminGameItem) => {
    Alert.alert('Delete Item', `Delete "${item.label}" (${item.itemType})?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await api.deleteGameItem(item.itemType); setItems((p) => p.filter((i) => i.itemType !== item.itemType)); }
          catch (err: any) { Alert.alert('Error', err.message ?? 'Failed to delete'); }
        },
      },
    ]);
  }, []);

  const [granting, setGranting] = useState<string | null>(null);
  const handleGrant = useCallback((item: AdminGameItem) => {
    Alert.alert('Give Item', `Add 1× "${item.label}" to your inventory?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Give',
        onPress: async () => {
          setGranting(item.itemType);
          try {
            await api.grantItemToSelf(item.itemType);
            Alert.alert('Done', `Added ${item.label} to your inventory.`);
          } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'Failed to grant item');
          } finally {
            setGranting(null);
          }
        },
      },
    ]);
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        headerTitle: { flex: 1, textAlign: 'center', ...typography.title, fontSize: 20 },
        searchWrap: {
          flexDirection: 'row', alignItems: 'center', gap: 8,
          marginHorizontal: spacing.xl, marginBottom: spacing.base,
          backgroundColor: colors.surface,
          borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8,
          borderWidth: 1, borderColor: colors.border,
        },
        searchInput: { flex: 1, fontSize: 14, color: colors.text, paddingVertical: 0 },
        row: {
          flexDirection: 'row', alignItems: 'center', gap: spacing.base,
          backgroundColor: colors.surface,
          borderRadius: radius.lg, padding: spacing.base,
          borderWidth: 1, borderColor: colors.border,
          ...shadows.sm, marginBottom: spacing.sm,
        },
        rowTitle: { fontWeight: '700', fontSize: 15, color: colors.text },
        rowSub: { fontSize: 10, color: colors.textMuted },
        emptyText: { textAlign: 'center', color: colors.textMuted, marginTop: 60, fontSize: 14 },
        chipRow: {
          flexDirection: 'row', alignItems: 'center', gap: 10,
          paddingHorizontal: spacing.xl, marginBottom: spacing.lg, paddingBottom: spacing.sm, minHeight: 44,
        },
        chip: {
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, minHeight: 36,
          backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
        },
        chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
        chipText: {
          ...typography.label, fontSize: 15, fontWeight: '700', lineHeight: 20, color: colors.text,
        },
        chipTextActive: {
          ...typography.label, fontSize: 15, fontWeight: '700', lineHeight: 20, color: '#fff',
        },
      }),
    [colors, typography, shadows],
  );

  const isLargeList = filtered.length > 100;
  const rowContent = useCallback(
    (item: AdminGameItem) => (
      <Pressable
        style={styles.row}
        onPress={() => router.push({ pathname: '/admin-item-form', params: { itemType: item.itemType } })}
      >
        <View style={[s.emojiCircle, { backgroundColor: (item.color || '#888') + '22' }]}>
          {item.imageUrl ? (
            <CachedImage source={{ uri: item.imageUrl }} style={s.itemImage} />
          ) : (
            <Text style={s.emojiText}>{item.emoji}</Text>
          )}
        </View>
        <View style={s.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.label}</Text>
          <View style={s.rowMeta}>
            <View style={[s.catBadge, { backgroundColor: (CATEGORY_COLORS[item.category] || '#888') + '30' }]}>
              <Text style={[s.catText, { color: CATEGORY_COLORS[item.category] || '#888' }]}>
                {CATEGORY_LABELS[item.category] ?? item.category}
              </Text>
            </View>
            <Text style={styles.rowSub}>{item.cols}×{item.rows}</Text>
            {item.placeable && <Text style={styles.rowSub}>placeable</Text>}
          </View>
        </View>
        <Pressable
          hitSlop={12}
          onPress={() => handleGrant(item)}
          style={s.actionBtn}
          disabled={granting === item.itemType}
        >
          {granting === item.itemType ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="gift-outline" size={18} color={colors.primary} />
          )}
        </Pressable>
        <Pressable hitSlop={12} onPress={() => handleDelete(item)} style={s.actionBtn}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </Pressable>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
    ),
    [styles, colors, router, handleDelete, handleGrant, granting],
  );
  const renderItem = useCallback(
    ({ item, index }: { item: AdminGameItem; index: number }) =>
      isLargeList ? (
        rowContent(item)
      ) : (
        <Animated.View entering={FadeInDown.delay(index * 40).duration(300).springify()}>
          {rowContent(item)}
        </Animated.View>
      ),
    [isLargeList, rowContent],
  );

  return (
    <GradientBackground bubbleCount={2}>
      <View style={s.topSection}>
        <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Game Items</Text>
          <Pressable onPress={() => router.push('/admin-item-form')} hitSlop={12} style={s.backBtn}>
            <Ionicons name="add-circle" size={26} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search items..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {!loading && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {SORT_CHIPS.map((chip) => {
              const active = categoryFilter === chip.key;
              return (
                <Pressable
                  key={chip.key || '_all'}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategoryFilter(chip.key)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.itemType}
          renderItem={renderItem}
          style={{ flex: 1 }}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={isLargeList ? 25 : undefined}
          maxToRenderPerBatch={isLargeList ? 10 : undefined}
          windowSize={isLargeList ? 4 : undefined}
          removeClippedSubviews={isLargeList}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {search || categoryFilter ? 'No items match' : 'No items yet — tap + to create one'}
            </Text>
          }
        />
      )}
    </GradientBackground>
  );
}

const s = StyleSheet.create({
  topSection: { flexShrink: 0 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingBottom: spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 120, flexGrow: 0 },
  emojiCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emojiText: { fontSize: 22 },
  itemImage: { width: 36, height: 36, borderRadius: 8 },
  rowBody: { flex: 1 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  catText: { fontSize: 10, fontWeight: '700' },
  actionBtn: { padding: 6 },
});
