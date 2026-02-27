/**
 * Single-page stepped wizard for the full seed pipeline:
 * Seed -> Ingredient -> Food -> Recipe.
 * Renders inside admin-item-form when category === 'seed' && !isEdit.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, Image,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ItemSearchDropdown, type SearchableItem } from '@/components/ui/ItemSearchDropdown';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';
import { api, type AdminGameItem } from '@/lib/api';
import { useSeedWizard, type ItemStepData } from './useSeedWizard';
import { DurationField } from './DurationField';

export function SeedWizard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors, typography, shadows } = theme;

  const wiz = useSeedWizard();
  const { state, stepLabels, saving } = wiz;

  const [allItems, setAllItems] = useState<AdminGameItem[]>([]);
  useEffect(() => {
    api.getGameItems().then(setAllItems).catch(() => {});
  }, []);

  const searchableItems: SearchableItem[] = useMemo(() => {
    const wizardBySlug = new Map<string, { label: string; imageUrl: string }>();
    for (const wi of [state.seed, state.ingredient, state.food] as ItemStepData[]) {
      if (wi.saved && wi.slug) {
        wizardBySlug.set(wi.slug, { label: wi.label || wi.slug, imageUrl: wi.imageUrl });
      }
    }

    const base = allItems.map((i) => {
      const override = wizardBySlug.get(i.itemType);
      if (override) {
        wizardBySlug.delete(i.itemType);
        return { key: i.itemType, label: override.label, imageUrl: override.imageUrl || i.imageUrl };
      }
      return { key: i.itemType, label: i.label, imageUrl: i.imageUrl };
    });

    for (const [slug, wi] of wizardBySlug) {
      base.push({ key: slug, label: wi.label, imageUrl: wi.imageUrl });
    }
    return base;
  }, [allItems, state.seed, state.ingredient, state.food]);

  const ts = useMemo(() => StyleSheet.create({
    headerTitle: { flex: 1, textAlign: 'center', ...typography.title, fontSize: 20, color: colors.text },
    sectionLabel: {
      ...typography.subtitle, fontSize: 14, color: colors.textSecondary,
      marginTop: spacing.lg, marginBottom: spacing.sm, marginLeft: 4,
    },
    card: {
      backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
      borderWidth: 1, borderColor: colors.border, ...shadows.sm, gap: spacing.base,
    },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    input: {
      backgroundColor: colors.surfaceElevated, borderRadius: radius.md,
      paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: colors.text,
    },
    stepBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: 4,
    },
    stepDot: {
      width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.surfaceElevated,
    },
    stepDotActive: { backgroundColor: colors.primary },
    stepDotDone: { backgroundColor: colors.success },
    stepDotText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    stepDotTextActive: { color: '#fff' },
    stepLine: { flex: 1, height: 2, backgroundColor: colors.border, maxWidth: 40 },
    stepLineDone: { backgroundColor: colors.success },
    stepLabelRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      paddingHorizontal: spacing.xl, marginBottom: spacing.sm,
    },
    stepLabelText: { fontSize: 10, fontWeight: '600', color: colors.textMuted, textAlign: 'center', width: 60 },
    stepLabelTextActive: { color: colors.primary },
    btnRow: {
      flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, paddingHorizontal: spacing.xl,
    },
    btn: {
      flex: 1, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
    },
    btnPrimary: { backgroundColor: colors.primary },
    btnSecondary: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
    btnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    btnTextSecondary: { fontSize: 14, fontWeight: '700', color: colors.text },
    promptToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
    promptToggleText: { fontSize: 12, fontWeight: '600', color: colors.primary },
    promptInput: { minHeight: 60, textAlignVertical: 'top' },
    imgRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    imgThumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: colors.surfaceElevated },
    genAllBtn: {
      marginTop: spacing.lg, marginHorizontal: spacing.xl, paddingVertical: 14,
      borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#6366F1', flexDirection: 'row', gap: 8,
    },
    genAllText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    harvestRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    addIngText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  }), [colors, typography, shadows]);

  // ── Renderers per step ────────────────────────────────────────────────

  const renderField = useCallback((label: string, value: string, onChange: (v: string) => void, opts?: {
    placeholder?: string; keyboardType?: 'default' | 'number-pad'; flex?: number;
  }) => (
    <View style={{ gap: 4, flex: opts?.flex }}>
      <Text style={ts.fieldLabel}>{label}</Text>
      <TextInput
        style={ts.input}
        value={value}
        onChangeText={onChange}
        placeholder={opts?.placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={opts?.keyboardType ?? 'default'}
      />
    </View>
  ), [ts, colors.textMuted]);

  const renderImageSection = useCallback((which: 'seed' | 'ingredient' | 'food') => {
    const stepData = state[which] as ItemStepData;
    const prompt = wiz.effectivePrompt(which);
    return (
      <View style={ts.card}>
        <View style={ts.imgRow}>
          {stepData.imageUrl ? (
            <Image source={{ uri: stepData.imageUrl }} style={ts.imgThumb} />
          ) : (
            <View style={ts.imgThumb}>
              <Ionicons name="image-outline" size={20} color={colors.textMuted} style={{ margin: 'auto' }} />
            </View>
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={ts.fieldLabel}>Image Prompt</Text>
            <TextInput
              style={[ts.input, ts.promptInput]}
              value={stepData.promptTouched ? stepData.imagePrompt : prompt}
              onChangeText={(v) => {
                if (which === 'seed') wiz.updateSeed('imagePrompt', v);
                else if (which === 'ingredient') wiz.updateIngredient('imagePrompt', v);
                else wiz.updateFood('imagePrompt', v);
              }}
              placeholder="Image prompt..."
              placeholderTextColor={colors.textMuted}
              multiline
            />
          </View>
        </View>
        <Pressable
          style={[ts.btn, ts.btnSecondary, { flexDirection: 'row', gap: 6, flex: 0 }]}
          onPress={() => wiz.generateImage(which)}
          disabled={stepData.generating || !stepData.saved}
        >
          {stepData.generating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="sparkles" size={16} color={colors.primary} />
          )}
          <Text style={ts.btnTextSecondary}>
            {!stepData.saved ? 'Save first to generate' : 'Generate Image'}
          </Text>
        </Pressable>
      </View>
    );
  }, [state, wiz, ts, colors]);

  const renderSeedStep = () => (
    <>
      <Text style={ts.sectionLabel}>Seed Details</Text>
      <View style={ts.card}>
        {renderField('Label *', state.seed.label, (v) => wiz.updateSeed('label', v), { placeholder: 'Wheat Seed' })}
        <View style={{ flexDirection: 'row', gap: spacing.base }}>
          {renderField('Cols', state.seed.cols, (v) => wiz.updateSeed('cols', v), { keyboardType: 'number-pad', flex: 1 })}
          {renderField('Rows', state.seed.rows, (v) => wiz.updateSeed('rows', v), { keyboardType: 'number-pad', flex: 1 })}
        </View>
        <DurationField
          label="Growth Time *"
          valueMs={state.seed.growthMs}
          onChangeMs={(v) => wiz.updateSeed('growthMs', v)}
          placeholder="60"
          fieldLabelStyle={ts.fieldLabel}
          inputStyle={ts.input}
          colors={colors}
        />
        <View style={{ flexDirection: 'row', gap: spacing.base }}>
          {renderField('Gem Price', state.seed.gemPrice, (v) => wiz.updateSeed('gemPrice', v), { placeholder: '5', keyboardType: 'number-pad', flex: 1 })}
          {renderField('Farm Level', state.seed.farmLevel, (v) => wiz.updateSeed('farmLevel', v), { placeholder: '1', keyboardType: 'number-pad', flex: 1 })}
        </View>
        {renderField('Gems Given on Harvest', state.seed.gemsGiven, (v) => wiz.updateSeed('gemsGiven', v), { placeholder: '0', keyboardType: 'number-pad' })}
      </View>
      <Text style={ts.sectionLabel}>Seed Image</Text>
      {renderImageSection('seed')}
    </>
  );

  const renderIngredientStep = () => (
    <>
      <Text style={ts.sectionLabel}>Ingredient Details</Text>
      <View style={ts.card}>
        {renderField('Label *', state.ingredient.label, (v) => wiz.updateIngredient('label', v), { placeholder: 'Wheat' })}
        <View style={{ flexDirection: 'row', gap: spacing.base }}>
          {renderField('Cols', state.ingredient.cols, (v) => wiz.updateIngredient('cols', v), { keyboardType: 'number-pad', flex: 1 })}
          {renderField('Rows', state.ingredient.rows, (v) => wiz.updateIngredient('rows', v), { keyboardType: 'number-pad', flex: 1 })}
        </View>
      </View>
      <Text style={ts.sectionLabel}>Ingredient Image</Text>
      {renderImageSection('ingredient')}
    </>
  );

  const renderFoodStep = () => (
    <>
      <Text style={ts.sectionLabel}>Food Details</Text>
      <View style={ts.card}>
        {renderField('Label *', state.food.label, (v) => wiz.updateFood('label', v), { placeholder: 'Wheat Bread' })}
        {renderField('Hunger Restored (0-100)', state.food.foodHunger, (v) => wiz.updateFood('foodHunger', v), { placeholder: '20', keyboardType: 'number-pad' })}
        {renderField('Happiness Restored (0-100)', state.food.foodHappiness, (v) => wiz.updateFood('foodHappiness', v), { placeholder: '10', keyboardType: 'number-pad' })}
        {renderField('Pet XP Given', state.food.foodPetXp, (v) => wiz.updateFood('foodPetXp', v), { placeholder: '10', keyboardType: 'number-pad' })}
      </View>
      <Text style={ts.sectionLabel}>Food Image</Text>
      {renderImageSection('food')}
    </>
  );

  const addRecipeIngredient = useCallback(() => {
    wiz.setRecipeIngredients([...state.recipe.ingredients, { itemType: '', qty: 1 }]);
  }, [state.recipe.ingredients, wiz]);

  const removeRecipeIngredient = useCallback((idx: number) => {
    wiz.setRecipeIngredients(state.recipe.ingredients.filter((_, i) => i !== idx));
  }, [state.recipe.ingredients, wiz]);

  const updateRecipeIngredient = useCallback((idx: number, field: 'itemType' | 'qty', value: string) => {
    wiz.setRecipeIngredients(
      state.recipe.ingredients.map((ing, i) => {
        if (i !== idx) return ing;
        if (field === 'qty') return { ...ing, qty: parseInt(value, 10) || 0 };
        return { ...ing, [field]: value };
      }),
    );
  }, [state.recipe.ingredients, wiz]);

  const renderRecipeStep = () => (
    <>
      <Text style={ts.sectionLabel}>Recipe Details</Text>
      <View style={ts.card}>
        {renderField('Label', state.recipe.label, (v) => wiz.updateRecipe('label', v), { placeholder: state.food.label || 'Recipe name' })}
        {renderField('Difficulty (1-5)', state.recipe.difficulty, (v) => wiz.updateRecipe('difficulty', v), { placeholder: '1', keyboardType: 'number-pad' })}
      </View>

      <Text style={ts.sectionLabel}>Ingredients</Text>
      <View style={ts.card}>
        {state.recipe.ingredients.map((ing, idx) => (
          <View key={idx} style={ts.harvestRow}>
            <View style={{ flex: 2 }}>
              <ItemSearchDropdown
                items={searchableItems}
                value={ing.itemType}
                onSelect={(key) => updateRecipeIngredient(idx, 'itemType', key)}
                placeholder="Select item..."
              />
            </View>
            <TextInput
              style={[ts.input, { flex: 1, textAlign: 'center' }]}
              value={ing.qty === 0 ? '' : String(ing.qty)}
              onChangeText={(v) => updateRecipeIngredient(idx, 'qty', v)}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor={colors.textMuted}
            />
            <Pressable onPress={() => removeRecipeIngredient(idx)} hitSlop={8}>
              <Ionicons name="remove-circle" size={22} color={colors.error} />
            </Pressable>
          </View>
        ))}
        {state.recipe.ingredients.length < 4 && (
          <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 }} onPress={addRecipeIngredient}>
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={ts.addIngText}>Add ingredient</Text>
          </Pressable>
        )}
      </View>

      <Text style={ts.sectionLabel}>Result</Text>
      <View style={ts.card}>
        <View style={{ gap: 4 }}>
          <Text style={ts.fieldLabel}>Produces</Text>
          <View style={[ts.input, { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 }]}>
            <Ionicons name="restaurant-outline" size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.text, fontSize: 14 }}>
              {state.food.label || state.food.slug || '(food item)'}
            </Text>
          </View>
        </View>
      </View>
    </>
  );

  // ── Step renderer ─────────────────────────────────────────────────────

  const STEP_RENDERERS = [renderSeedStep, renderIngredientStep, renderFoodStep, renderRecipeStep];

  const anyGenerating = state.seed.generating || state.ingredient.generating || state.food.generating;

  return (
    <GradientBackground bubbleCount={2}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
          <Text style={ts.headerTitle}>Seed Wizard</Text>
          <View style={s.backBtn} />
        </View>

        {/* Step indicator */}
        <View style={ts.stepBar}>
          {stepLabels.map((label, i) => {
            const done = i < state.step || (i === 0 && state.seed.saved) || (i === 1 && state.ingredient.saved) || (i === 2 && state.food.saved) || (i === 3 && state.recipe.saved);
            const active = i === state.step;
            return (
              <React.Fragment key={label}>
                {i > 0 && <View style={[ts.stepLine, done && ts.stepLineDone]} />}
                <Pressable
                  style={[ts.stepDot, done && ts.stepDotDone, active && ts.stepDotActive]}
                  onPress={() => { if (i <= state.step) wiz.goBack(); }}
                >
                  {done && !active ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : (
                    <Text style={[ts.stepDotText, (active || done) && ts.stepDotTextActive]}>{i + 1}</Text>
                  )}
                </Pressable>
              </React.Fragment>
            );
          })}
        </View>
        <View style={ts.stepLabelRow}>
          {stepLabels.map((label, i) => (
            <Text key={label} style={[ts.stepLabelText, i === state.step && ts.stepLabelTextActive]}>{label}</Text>
          ))}
        </View>

        {/* Form content */}
        <ScrollView contentContainerStyle={s.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {STEP_RENDERERS[state.step]()}

          {/* Generate all images */}
          {wiz.allItemsSaved && state.step <= 2 && (
            <Pressable style={[ts.genAllBtn, anyGenerating && { opacity: 0.6 }]} onPress={wiz.generateAllImages} disabled={anyGenerating}>
              {anyGenerating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="sparkles" size={18} color="#fff" />
              )}
              <Text style={ts.genAllText}>Generate All Images</Text>
            </Pressable>
          )}

          {/* Navigation buttons */}
          <View style={ts.btnRow}>
            <Pressable style={[ts.btn, ts.btnSecondary]} onPress={wiz.goBack}>
              <Text style={ts.btnTextSecondary}>{state.step === 0 ? 'Cancel' : 'Back'}</Text>
            </Pressable>
            <Pressable style={[ts.btn, ts.btnSecondary]} onPress={wiz.saveAndExit} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Text style={ts.btnTextSecondary}>Save & Exit</Text>
              )}
            </Pressable>
            <Pressable style={[ts.btn, ts.btnPrimary]} onPress={wiz.saveAndContinue} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={ts.btnText}>{state.step === 3 ? 'Finish' : 'Save & Next'}</Text>
              )}
            </Pressable>
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
});
