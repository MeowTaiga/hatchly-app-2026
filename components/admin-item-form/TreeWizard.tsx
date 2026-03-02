/**
 * Two-step wizard for the full tree pipeline:
 * 1. Tree Details (base + image prompts)
 * 2. Create (creates sapling, in_growth, fully_grown items + generates all images).
 * Renders inside admin-item-form when category === 'tree' && !isEdit.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ItemSearchDropdown } from '@/components/ui/ItemSearchDropdown';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';
import { api, type AdminGameItem } from '@/lib/api';
import { useTreeWizard } from './useTreeWizard';

export function TreeWizard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors, typography, shadows } = theme;

  const wiz = useTreeWizard();
  const { state, stepLabels, saving } = wiz;

  const [allItems, setAllItems] = useState<AdminGameItem[]>([]);
  useEffect(() => {
    api.getGameItems().then(setAllItems).catch(() => {});
  }, []);

  const fruitItems = useMemo(() => {
    return allItems
      .filter((i) => i.subCategory === 'fruit')
      .map((i) => ({ key: i.itemType, label: i.label, imageUrl: i.imageUrl }));
  }, [allItems]);

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
    promptInput: { minHeight: 60, textAlignVertical: 'top' },
    imgRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    imgThumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: colors.surfaceElevated },
  }), [colors, typography, shadows]);

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

  const renderImageSection = useCallback((which: 'sapling' | 'inGrowth' | 'fullyGrown') => {
    const stepData = state[which];
    const prompt = wiz.effectivePrompt(which);
    const sizeLabel = which === 'sapling' ? '1x1' : which === 'inGrowth' ? '2x2' : '4x4';
    return (
      <View style={ts.card}>
        <Text style={ts.fieldLabel}>{which === 'sapling' ? 'Sapling' : which === 'inGrowth' ? 'In Growth' : 'Fully Grown'} ({sizeLabel})</Text>
        <View style={ts.imgRow}>
          {stepData.imageUrl ? (
            <CachedImage source={{ uri: stepData.imageUrl }} style={ts.imgThumb} />
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
              onChangeText={(v) => wiz.updateStep(which, 'imagePrompt', v)}
              placeholder="Image prompt..."
              placeholderTextColor={colors.textMuted}
              multiline
            />
          </View>
        </View>
      </View>
    );
  }, [state, wiz, ts, colors]);

  const renderTreeDetailsStep = () => (
    <>
      <Text style={ts.sectionLabel}>Tree Details</Text>
      <View style={ts.card}>
        {renderField('Label *', state.treeBase.label, (v) => wiz.updateBase('label', v), { placeholder: 'Oak' })}
        {renderField('Variant Slug', state.treeBase.variantSlug, (v) => wiz.updateBase('variantSlug', v), { placeholder: 'oak' })}
        <View style={{ gap: 4 }}>
          <Text style={ts.fieldLabel}>Fruit (optional)</Text>
          <ItemSearchDropdown
            items={fruitItems}
            value={state.treeBase.fruitItemType}
            onSelect={(key) => wiz.updateBase('fruitItemType', key)}
            placeholder="Select fruit item..."
          />
        </View>
        <View style={{ gap: 4 }}>
          <Text style={ts.fieldLabel}>Harvest Yield (when no fruit, e.g. wood)</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            <ItemSearchDropdown
              items={allItems.map((i) => ({ key: i.itemType, label: i.label, imageUrl: i.imageUrl }))}
              value={state.treeBase.harvestYield[0]?.itemType ?? ''}
              onSelect={(key) => wiz.updateBase('harvestYield', [{ itemType: key, qty: 1 }])}
              placeholder="e.g. wood"
            />
            <TextInput
              style={[ts.input, { width: 60, textAlign: 'center' }]}
              value={String(state.treeBase.harvestYield[0]?.qty ?? 1)}
              onChangeText={(v) => {
                const qty = parseInt(v, 10) || 1;
                wiz.updateBase('harvestYield', [{ itemType: state.treeBase.harvestYield[0]?.itemType ?? 'wood', qty }]);
              }}
              keyboardType="number-pad"
            />
          </View>
        </View>
      </View>
      <Text style={ts.sectionLabel}>Image Prompts (optional)</Text>
      <Text style={[ts.fieldLabel, { marginBottom: spacing.sm }]}>
        Customize prompts for each growth stage. Leave default or edit.
      </Text>
      {renderImageSection('sapling')}
      {renderImageSection('inGrowth')}
      {renderImageSection('fullyGrown')}
    </>
  );

  const renderCreateStep = () => (
    <>
      <Text style={ts.sectionLabel}>Create Tree Pipeline</Text>
      <View style={ts.card}>
        <Text style={ts.fieldLabel}>Will create:</Text>
        <Text style={{ fontSize: 14, color: colors.text }}>• {wiz.saplingSlug} (1x1, placeable)</Text>
        <Text style={{ fontSize: 14, color: colors.text }}>• {wiz.inGrowthSlug} (2x2)</Text>
        <Text style={{ fontSize: 14, color: colors.text }}>• {wiz.fullyGrownSlug} (4x4{state.treeBase.fruitItemType ? `, fruit: ${state.treeBase.fruitItemType}` : ''})</Text>
        <Text style={[ts.fieldLabel, { marginTop: spacing.sm }]}>
          Creates all 3 items, then generates all 3 images. Trees grow daily: sapling → in growth → fully grown over 3 days.
        </Text>
      </View>
    </>
  );

  const STEP_RENDERERS = [renderTreeDetailsStep, renderCreateStep];
  const anyGenerating = state.sapling.generating || state.inGrowth.generating || state.fullyGrown.generating;

  return (
    <GradientBackground bubbleCount={2}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
          <Text style={ts.headerTitle}>Tree Wizard</Text>
          <View style={s.backBtn} />
        </View>

        <View style={ts.stepBar}>
          {stepLabels.map((label, i) => {
            const done = i < state.step;
            const active = i === state.step;
            return (
              <React.Fragment key={label}>
                {i > 0 && <View style={[ts.stepLine, done && ts.stepLineDone]} />}
                <Pressable
                  style={[ts.stepDot, done && ts.stepDotDone, active && ts.stepDotActive]}
                  onPress={() => { if (i <= state.step) wiz.setStep(i); }}
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

        <ScrollView contentContainerStyle={s.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {STEP_RENDERERS[state.step]()}

          <View style={ts.btnRow}>
            <Pressable style={[ts.btn, ts.btnSecondary]} onPress={wiz.goBack}>
              <Text style={ts.btnTextSecondary}>{state.step === 0 ? 'Cancel' : 'Back'}</Text>
            </Pressable>
            <Pressable
              style={[ts.btn, ts.btnPrimary]}
              onPress={state.step === 1 ? wiz.saveAllAndCreate : () => wiz.setStep(state.step + 1)}
              disabled={saving || anyGenerating}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={ts.btnText}>{state.step === 1 ? 'Create & Generate Images' : 'Next'}</Text>
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
