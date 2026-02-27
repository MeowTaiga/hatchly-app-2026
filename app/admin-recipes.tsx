import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { api, type AdminRecipe } from '@/lib/api';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';

export default function AdminRecipesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors, typography, shadows } = theme;
  const [recipes, setRecipes] = useState<AdminRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getAdminRecipes();
      setRecipes(data);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    if (!search.trim()) return recipes;
    const q = search.toLowerCase();
    return recipes.filter(
      (r) => r.label.toLowerCase().includes(q) || r.recipeId.toLowerCase().includes(q),
    );
  }, [recipes, search]);

  const handleDelete = useCallback((recipe: AdminRecipe) => {
    Alert.alert('Delete Recipe', `Delete "${recipe.label}" (${recipe.recipeId})?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteAdminRecipe(recipe.recipeId);
            setRecipes((p) => p.filter((r) => r.recipeId !== recipe.recipeId));
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
          flexDirection: 'row', alignItems: 'center', gap: 8,
          marginHorizontal: spacing.xl, marginBottom: spacing.base,
          backgroundColor: colors.surface, borderRadius: radius.md,
          paddingHorizontal: 12, paddingVertical: 8,
          borderWidth: 1, borderColor: colors.border,
        },
        searchInput: { flex: 1, fontSize: 14, color: colors.text, paddingVertical: 0 },
        row: {
          flexDirection: 'row', alignItems: 'center', gap: spacing.base,
          backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base,
          borderWidth: 1, borderColor: colors.border,
          ...shadows.sm, marginBottom: spacing.sm,
        },
        rowTitle: { fontWeight: '700', fontSize: 15, color: colors.text },
        rowSub: { fontSize: 10, color: colors.textMuted },
        emptyText: { textAlign: 'center', color: colors.textMuted, marginTop: 60, fontSize: 14 },
      }),
    [colors, typography, shadows],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: AdminRecipe; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 40).duration(300).springify()}>
        <Pressable
          style={styles.row}
          onPress={() => router.push({ pathname: '/admin-recipe-form', params: { recipeId: item.recipeId } })}
        >
          <View style={s.imageCircle}>
            <Ionicons name="flame" size={22} color="#EF5350" />
          </View>
          <View style={s.rowBody}>
            <Text style={styles.rowTitle} numberOfLines={1}>{item.label}</Text>
            <View style={s.rowMeta}>
              <Text style={styles.rowSub}>{item.ingredients.length} ingredients</Text>
              <Text style={styles.rowSub}>Difficulty {item.difficulty}</Text>
              <Text style={styles.rowSub}>→ {item.resultItemType}</Text>
            </View>
          </View>
          <Pressable hitSlop={12} onPress={() => handleDelete(item)} style={s.deleteBtn}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </Pressable>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </Animated.View>
    ),
    [styles, colors, router, handleDelete],
  );

  return (
    <GradientBackground bubbleCount={2}>
      <View style={s.topSection}>
        <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Recipes</Text>
          <Pressable onPress={() => router.push('/admin-recipe-form')} hitSlop={12} style={s.backBtn}>
            <Ionicons name="add-circle" size={26} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipes..."
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
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.recipeId}
          renderItem={renderItem}
          style={{ flex: 1 }}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {search ? 'No recipes match' : 'No recipes yet — tap + to create one'}
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
  imageCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(239,83,80,0.12)',
  },
  rowBody: { flex: 1 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  deleteBtn: { padding: 6 },
});
