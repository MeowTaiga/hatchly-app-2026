import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ItemSearchDropdown, type SearchableItem } from '@/components/ui/ItemSearchDropdown';
import { useTheme } from '@/store/ThemeProvider';
import { useToast } from '@/store/ToastProvider';
import { spacing, radius } from '@/constants/theme';
import {
  api,
  type AdminRecipe,
  type AdminRecipeIngredient,
  type AdminGameItem,
} from '@/lib/api';

function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export default function AdminRecipeFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ recipeId?: string }>();
  const isEdit = !!params.recipeId;
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors, typography, shadows } = theme;
  const { toast } = useToast();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [label, setLabel] = useState('');
  const [recipeId, setRecipeId] = useState('');
  const [resultItemType, setResultItemType] = useState('');
  const [resultQty, setResultQty] = useState('1');
  const [difficulty, setDifficulty] = useState('1');
  const [sortOrder, setSortOrder] = useState('0');
  const [ingredients, setIngredients] = useState<AdminRecipeIngredient[]>([]);

  const [allItems, setAllItems] = useState<AdminGameItem[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const items = await api.getGameItems();
        setAllItems(items);
        if (params.recipeId) {
          const recipes = await api.getAdminRecipes();
          const recipe = recipes.find((r) => r.recipeId === params.recipeId);
          if (!recipe) { toast('Recipe not found', 'error'); router.back(); return; }
          setLabel(recipe.label);
          setRecipeId(recipe.recipeId);
          setResultItemType(recipe.resultItemType);
          setResultQty(String(recipe.resultQty));
          setDifficulty(String(recipe.difficulty));
          setSortOrder(String(recipe.sortOrder));
          setIngredients(recipe.ingredients);
        }
      } catch (err: any) {
        toast(err.message ?? 'Failed to load', 'error');
        if (params.recipeId) router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [params.recipeId, toast, router]);

  useEffect(() => {
    if (!isEdit && label.trim()) setRecipeId(nameToSlug(label));
  }, [isEdit, label]);

  const searchableItems: SearchableItem[] = useMemo(
    () => allItems.map((i) => ({ key: i.itemType, label: i.label, imageUrl: i.imageUrl })),
    [allItems],
  );

  const foodItems: SearchableItem[] = useMemo(
    () => allItems.filter((i) => i.category === 'food').map((i) => ({ key: i.itemType, label: i.label, imageUrl: i.imageUrl })),
    [allItems],
  );

  const addIngredient = useCallback(() => {
    setIngredients((prev) => [...prev, { itemType: '', qty: 1 }]);
  }, []);

  const removeIngredient = useCallback((idx: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateIngredient = useCallback((idx: number, field: keyof AdminRecipeIngredient, value: string) => {
    setIngredients((prev) =>
      prev.map((ing, i) => {
        if (i !== idx) return ing;
        if (field === 'qty') return { ...ing, qty: parseInt(value, 10) || 0 };
        return { ...ing, [field]: value };
      }),
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!label.trim()) { toast('Label is required', 'error'); return; }
    if (!resultItemType) { toast('Result item is required', 'error'); return; }
    if (ingredients.length === 0 || ingredients.some((i) => !i.itemType)) {
      toast('At least one ingredient with a selected item is required', 'error');
      return;
    }
    setSaving(true);
    try {
      const data = {
        recipeId,
        label: label.trim(),
        resultItemType,
        resultQty: parseInt(resultQty, 10) || 1,
        difficulty: parseInt(difficulty, 10) || 1,
        sortOrder: parseInt(sortOrder, 10) || 0,
        ingredients: ingredients.filter((i) => i.itemType.trim()),
      };
      if (isEdit) {
        const { recipeId: _, ...updateData } = data;
        await api.updateAdminRecipe(params.recipeId!, updateData);
      } else {
        await api.createAdminRecipe(data);
      }
      toast(isEdit ? 'Recipe saved!' : 'Recipe created!', 'success');
      router.back();
    } catch (err: any) {
      toast(err.message ?? 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }, [label, recipeId, resultItemType, resultQty, difficulty, sortOrder, ingredients, isEdit, params.recipeId, toast, router]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        headerTitle: { flex: 1, textAlign: 'center', ...typography.title, fontSize: 20 },
        sectionLabel: { ...typography.subtitle, fontSize: 16, marginTop: spacing.xl, marginBottom: spacing.sm },
        card: {
          backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
          borderWidth: 1, borderColor: colors.border, ...shadows.sm, gap: spacing.lg,
        },
        fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
        input: {
          backgroundColor: colors.background, borderRadius: radius.md, padding: 12,
          fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border,
        },
        harvestRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        addDropText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
      }),
    [colors, typography, shadows],
  );

  if (loading) {
    return (
      <GradientBackground bubbleCount={2}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 120 }} />
      </GradientBackground>
    );
  }

  return (
    <GradientBackground bubbleCount={2}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{isEdit ? 'Edit Recipe' : 'New Recipe'}</Text>
          <Pressable onPress={handleSave} hitSlop={12} style={s.backBtn} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="checkmark-circle" size={26} color={colors.primary} />
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={s.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Identity */}
          <Text style={styles.sectionLabel}>Recipe Info</Text>
          <View style={styles.card}>
            <View style={s.field}>
              <Text style={styles.fieldLabel}>Label *</Text>
              <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="Pumpkin Soup" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={s.field}>
              <Text style={styles.fieldLabel}>Recipe ID</Text>
              <TextInput style={styles.input} value={recipeId} onChangeText={setRecipeId} placeholder="pumpkin_soup" placeholderTextColor={colors.textMuted} autoCapitalize="none" editable={!isEdit} />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Difficulty (1-5)</Text>
                <TextInput style={styles.input} value={difficulty} onChangeText={setDifficulty} keyboardType="number-pad" />
              </View>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Sort Order</Text>
                <TextInput style={styles.input} value={sortOrder} onChangeText={setSortOrder} keyboardType="number-pad" />
              </View>
            </View>
          </View>

          {/* Ingredients */}
          <Text style={styles.sectionLabel}>Ingredients</Text>
          <View style={styles.card}>
            {ingredients.map((ing, idx) => (
              <View key={idx} style={styles.harvestRow}>
                <View style={{ flex: 2 }}>
                  <ItemSearchDropdown
                    items={searchableItems}
                    value={ing.itemType}
                    onSelect={(key) => updateIngredient(idx, 'itemType', key)}
                    placeholder="Select item..."
                  />
                </View>
                <TextInput
                  style={[styles.input, { flex: 1, textAlign: 'center' }]}
                  value={ing.qty === 0 ? '' : String(ing.qty)}
                  onChangeText={(v) => updateIngredient(idx, 'qty', v)}
                  keyboardType="number-pad"
                  placeholder="1"
                  placeholderTextColor={colors.textMuted}
                />
                <Pressable onPress={() => removeIngredient(idx)} hitSlop={8}>
                  <Ionicons name="remove-circle" size={22} color={colors.error} />
                </Pressable>
              </View>
            ))}
            {ingredients.length < 4 && (
              <Pressable style={s.addBtn} onPress={addIngredient}>
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.addDropText}>Add ingredient</Text>
              </Pressable>
            )}
          </View>

          {/* Result */}
          <Text style={styles.sectionLabel}>Result</Text>
          <View style={styles.card}>
            <View style={s.field}>
              <Text style={styles.fieldLabel}>Result Item (food) *</Text>
              <ItemSearchDropdown
                items={foodItems.length > 0 ? foodItems : searchableItems}
                value={resultItemType}
                onSelect={setResultItemType}
                placeholder="Select food item..."
              />
            </View>
            <View style={s.field}>
              <Text style={styles.fieldLabel}>Result Qty</Text>
              <TextInput style={styles.input} value={resultQty} onChangeText={setResultQty} keyboardType="number-pad" />
            </View>
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingBottom: spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  form: { paddingHorizontal: spacing.xl, paddingBottom: 120 },
  field: { gap: 4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
