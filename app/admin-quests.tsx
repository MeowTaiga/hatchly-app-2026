/**
 * Admin quests list – search, filter, edit/delete.
 * Edit navigates to /admin-quest-form?questId=xxx
 */

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
import { GradientBackground } from '@/components/ui/GradientBackground';
import { api, type AdminQuestDef } from '@/lib/api';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';

const QUEST_TYPES: { key: string; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'farm_upgrade', label: 'Farm Upgrade' },
  { key: 'story', label: 'Story' },
  { key: 'daily', label: 'Daily' },
];

function triggersSummary(quest: AdminQuestDef): string {
  if (quest.triggers?.length) {
    return quest.triggers.map((t) => {
      if (t.type === 'quest_complete' && t.questId) return `after ${t.questId}`;
      if (t.type === 'talk_to_npc' && t.npcItemType) return `talk ${t.npcItemType}`;
      if (t.type === 'enter_scene' && t.sceneSlug) return `enter ${t.sceneSlug}`;
      if (t.type === 'start') return 'start';
      return t.type;
    }).join(', ');
  }
  if (quest.autoTrigger) return `after ${quest.autoTrigger}`;
  return '';
}

function stepCount(quest: AdminQuestDef): number {
  return quest.steps?.length ?? (quest.requirements?.items?.length || quest.requirements?.buildings?.length || quest.requirements?.actions?.length ? 1 : 0);
}

export default function AdminQuestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors, typography, shadows } = theme;
  const [quests, setQuests] = useState<AdminQuestDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getQuests();
      setQuests(data.quests);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to load quests');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    let out = quests;
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (x) =>
          x.title.toLowerCase().includes(q) ||
          x.questId.toLowerCase().includes(q) ||
          (x.description && x.description.toLowerCase().includes(q)),
      );
    }
    if (typeFilter) {
      out = out.filter((x) => x.type === typeFilter);
    }
    return out;
  }, [quests, search, typeFilter]);

  const handleDelete = useCallback((quest: AdminQuestDef) => {
    Alert.alert('Delete Quest', `Delete "${quest.title}" (${quest.questId})?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteQuest(quest.questId);
            setQuests((p) => p.filter((x) => x.questId !== quest.questId));
          } catch (err: any) {
            Alert.alert('Error', err.message ?? 'Failed to delete');
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
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginHorizontal: spacing.xl,
          marginBottom: spacing.base,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderWidth: 1,
          borderColor: colors.border,
        },
        searchInput: { flex: 1, fontSize: 14, color: colors.text, paddingVertical: 0 },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.base,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.base,
          borderWidth: 1,
          borderColor: colors.border,
          ...shadows.sm,
          marginBottom: spacing.sm,
        },
        rowTitle: { fontWeight: '700', fontSize: 15, color: colors.text, flex: 1 },
        rowSub: { fontSize: 10, color: colors.textMuted },
        emptyText: { textAlign: 'center', color: colors.textMuted, marginTop: 60, fontSize: 14 },
        chipRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: spacing.xl,
          marginBottom: spacing.lg,
          paddingBottom: spacing.sm,
          minHeight: 44,
        },
        chip: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 22,
          minHeight: 36,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        },
        chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
        chipText: {
          ...typography.label,
          fontSize: 15,
          fontWeight: '700',
          lineHeight: 20,
          color: colors.text,
        },
        chipTextActive: {
          ...typography.label,
          fontSize: 15,
          fontWeight: '700',
          lineHeight: 20,
          color: '#fff',
        },
        typeBadge: {
          fontSize: 10,
          fontWeight: '700',
          color: colors.primary,
          backgroundColor: `${colors.primary}14`,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 6,
        },
      }),
    [colors, typography, shadows],
  );

  const rowContent = useCallback(
    (quest: AdminQuestDef, index: number) => (
      <Animated.View entering={FadeInDown.delay(index * 40).duration(300).springify()}>
        <Pressable
          style={styles.row}
          onPress={() => router.push({ pathname: '/admin-quest-form', params: { questId: quest.questId } })}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {quest.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <View style={styles.typeBadge}>
                <Text style={{ color: colors.primary }}>{quest.type.replace('_', ' ')}</Text>
              </View>
              <Text style={styles.rowSub}>{quest.questId}</Text>
              {quest.steps?.length ? (
                <Text style={styles.rowSub}>{quest.steps.length} step(s)</Text>
              ) : null}
              {triggersSummary(quest) ? (
                <Text style={[styles.rowSub, { maxWidth: 120 }]} numberOfLines={1}>
                  {triggersSummary(quest)}
                </Text>
              ) : null}
            </View>
          </View>
          <Pressable
            hitSlop={12}
            onPress={(e) => {
              e.stopPropagation();
              handleDelete(quest);
            }}
            style={{ padding: 6 }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </Pressable>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </Animated.View>
    ),
    [styles, colors, router, handleDelete],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: AdminQuestDef; index: number }) => rowContent(item, index),
    [rowContent],
  );

  return (
    <GradientBackground bubbleCount={3}>
      <View style={{ paddingTop: insets.top + spacing.sm }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing.base,
            paddingBottom: spacing.sm,
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={12} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Quests</Text>
          <Pressable
            onPress={() => router.push('/admin-quest-form')}
            hitSlop={12}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="add-circle" size={26} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search quests…"
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
            {QUEST_TYPES.map((chip) => {
              const active = typeFilter === chip.key;
              return (
                <Pressable
                  key={chip.key || '_all'}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setTypeFilter(chip.key)}
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
          keyExtractor={(x) => x.questId}
          renderItem={renderItem}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 120, flexGrow: 0 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {search || typeFilter ? 'No quests match' : 'No quests yet — tap + to create one'}
            </Text>
          }
        />
      )}
    </GradientBackground>
  );
}
