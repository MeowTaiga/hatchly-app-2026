import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ItemSearchDropdown, type SearchableItem } from '@/components/ui/ItemSearchDropdown';
import { api, type BalloonLootEntry, type AdminGameItem } from '@/lib/api';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';
import { RARITY_OPTIONS, RARITY_WEIGHTS } from '@/components/admin-item-form/constants';

type BugRarity = BalloonLootEntry['rarity'];

export default function AdminBalloonLootScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors, typography, shadows } = theme;
  const [entries, setEntries] = useState<BalloonLootEntry[]>([]);
  const [itemDefs, setItemDefs] = useState<AdminGameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addItemType, setAddItemType] = useState<string>('');
  const [addRarity, setAddRarity] = useState<BugRarity>('common');
  const skipNextSaveRef = useRef(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      skipNextSaveRef.current = true;
      const [lootRes, itemsRes] = await Promise.all([
        api.getBalloonLoot(),
        api.getGameItems(),
      ]);
      setEntries(lootRes.entries);
      setItemDefs(itemsRes);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to load balloon loot');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (loading || skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    const save = async () => {
      setSaving(true);
      try {
        const res = await api.updateBalloonLoot(entries);
        skipNextSaveRef.current = true;
        setEntries(res.entries);
      } catch (err: any) {
        Alert.alert('Error', err.message ?? 'Failed to save');
      } finally {
        setSaving(false);
      }
    };
    save();
  }, [entries, loading]);

  const handleRemove = useCallback((idx: number) => {
    setEntries((p) => p.filter((_, i) => i !== idx));
  }, []);

  const handleAdd = useCallback(() => {
    if (!addItemType.trim()) return;
    const exists = entries.some((e) => e.itemType === addItemType);
    if (exists) {
      Alert.alert('Duplicate', 'This item is already in the loot pool.');
      return;
    }
    setEntries((p) => [...p, {
      itemType: addItemType,
      rarity: addRarity,
      weight: RARITY_WEIGHTS[addRarity] ?? 100,
    }]);
    setAddItemType('');
    setAddRarity('common');
    setAddModalOpen(false);
  }, [addItemType, addRarity, entries]);

  const existingItemTypes = useMemo(() => new Set(entries.map((e) => e.itemType)), [entries]);
  const availableItems = useMemo(
    () => itemDefs.filter((i) => !existingItemTypes.has(i.itemType)),
    [itemDefs, existingItemTypes],
  );
  const searchableItems: SearchableItem[] = useMemo(
    () => availableItems.map((i) => ({ key: i.itemType, label: i.label || i.itemType, imageUrl: i.imageUrl })),
    [availableItems],
  );
  const itemDefsByType = useMemo(
    () => new Map(itemDefs.map((d) => [d.itemType, d])),
    [itemDefs],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        headerTitle: { flex: 1, textAlign: 'center', ...typography.title, fontSize: 20 },
        row: {
          flexDirection: 'row', alignItems: 'center', gap: spacing.base,
          backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base,
          borderWidth: 1, borderColor: colors.border,
          ...shadows.sm, marginBottom: spacing.sm,
        },
        rowTitle: { fontWeight: '700', fontSize: 15, color: colors.text },
        rowSub: { fontSize: 12, color: colors.textMuted },
        emptyText: { textAlign: 'center', color: colors.textMuted, marginTop: 60, fontSize: 14 },
        addBtn: {
          flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: colors.primary, borderRadius: radius.md,
          paddingHorizontal: spacing.lg, paddingVertical: spacing.base,
          marginBottom: spacing.lg,
        },
        addBtnText: { ...typography.button, fontSize: 15, color: '#fff' },
        saveBtn: {
          backgroundColor: colors.primary, borderRadius: radius.md,
          paddingHorizontal: spacing.xl, paddingVertical: spacing.base,
          alignSelf: 'center', marginTop: spacing.lg,
        },
        saveBtnText: { ...typography.button, fontSize: 16, color: '#fff' },
        rarityChip: {
          paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
          marginRight: 8, marginBottom: 8,
          borderWidth: 1, borderColor: colors.border,
        },
        rarityChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
        modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.xl },
        modalContent: {
          backgroundColor: colors.surface, borderRadius: radius.lg,
          padding: spacing.xl, borderWidth: 1, borderColor: colors.border,
        },
        modalTitle: { ...typography.title, fontSize: 18, marginBottom: spacing.lg },
      }),
    [colors, typography, shadows],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: BalloonLootEntry; index: number }) => {
      const def = itemDefsByType.get(item.itemType);
      const label = def?.label || item.itemType;
      const imageUrl = def?.imageUrl;
      const emoji = def?.emoji;
      return (
        <Animated.View entering={FadeInDown.delay(index * 40).duration(300).springify()}>
          <View style={styles.row}>
            <View style={[s.itemThumb, { backgroundColor: (def?.color || '#888') + '22' }]}>
              {imageUrl ? (
                <CachedImage source={{ uri: imageUrl }} style={s.itemImage} />
              ) : (
                <Text style={s.emojiText}>{emoji || '📦'}</Text>
              )}
            </View>
            <View style={s.rowBody}>
              <Text style={styles.rowTitle} numberOfLines={1}>{label}</Text>
              <Text style={styles.rowSub}>
                {item.rarity}
                {item.weight != null ? ` · weight ${item.weight}` : ''}
              </Text>
            </View>
            <Pressable hitSlop={12} onPress={() => handleRemove(index)} style={s.deleteBtn}>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </Pressable>
          </View>
        </Animated.View>
      );
    },
    [styles, colors, handleRemove, itemDefsByType],
  );

  return (
    <GradientBackground bubbleCount={2}>
      <View style={s.topSection}>
        <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Balloon Loot</Text>
          <View style={s.backBtn} />
        </View>

        <View style={s.listWrap}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={s.loader} />
          ) : (
            <>
              <Pressable style={styles.addBtn} onPress={() => setAddModalOpen(true)}>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.addBtnText}>Add item</Text>
              </Pressable>

              {entries.length === 0 && !saving ? (
                <Text style={styles.emptyText}>No items in loot pool. Add items to drop when balloons are popped.</Text>
              ) : (
                <>
                  {saving && (
                    <View style={s.savingBar}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={[styles.rowSub, { marginLeft: 8 }]}>Saving…</Text>
                    </View>
                  )}
                  <FlatList
                    data={entries}
                    keyExtractor={(e, i) => `${e.itemType}-${i}`}
                    renderItem={renderItem}
                    contentContainerStyle={s.listContent}
                    showsVerticalScrollIndicator={false}
                  />
                </>
              )}
            </>
          )}
        </View>
      </View>

      <Modal visible={addModalOpen} transparent animationType="fade">
        <BottomSheetModalProvider>
          <Pressable style={styles.modalOverlay} onPress={() => setAddModalOpen(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Add loot item</Text>
            <Text style={[styles.rowSub, { marginBottom: 8 }]}>Rarity</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg }}>
              {RARITY_OPTIONS.map((r) => (
                <Pressable
                  key={r.key}
                  style={[styles.rarityChip, addRarity === r.key && styles.rarityChipActive]}
                  onPress={() => setAddRarity(r.key as BugRarity)}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: addRarity === r.key ? '#fff' : colors.text,
                  }}>
                    {r.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.rowSub, { marginBottom: 8 }]}>Item</Text>
            {searchableItems.length === 0 ? (
              <Text style={[styles.emptyText, { marginTop: 12, marginBottom: spacing.lg }]}>
                No items left to add (all game items are already in the pool).
              </Text>
            ) : (
              <ItemSearchDropdown
                items={searchableItems}
                value={addItemType}
                onSelect={setAddItemType}
                placeholder="Search items…"
              />
            )}
            <View style={{ flexDirection: 'row', gap: spacing.base, marginTop: spacing.lg }}>
              <Pressable
                style={[styles.saveBtn, { flex: 1 }]}
                onPress={handleAdd}
                disabled={!addItemType}
              >
                <Text style={styles.saveBtnText}>Add</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, { flex: 1, backgroundColor: colors.border }]}
                onPress={() => setAddModalOpen(false)}
              >
                <Text style={[styles.saveBtnText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
            </View>
            </Pressable>
          </Pressable>
        </BottomSheetModalProvider>
      </Modal>
    </GradientBackground>
  );
}

const s = StyleSheet.create({
  topSection: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  listWrap: { flex: 1, paddingHorizontal: spacing.xl },
  listContent: { paddingBottom: spacing['4xl'] },
  loader: { marginTop: 60 },
  rowBody: { flex: 1 },
  deleteBtn: { padding: 4 },
  savingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
    paddingVertical: spacing.sm,
  },
  itemThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemImage: { width: 36, height: 36, borderRadius: 8 },
  emojiText: { fontSize: 22 },
});
