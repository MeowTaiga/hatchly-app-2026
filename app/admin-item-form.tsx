/**
 * Admin item form screen – create or edit game items.
 * Refactored: logic in useAdminItemForm, reducer, sections, and shared components.
 */

import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { useTheme } from '@/store/ThemeProvider';
import { spacing } from '@/constants/theme';
import {
  useAdminItemForm,
  createThemedStyles,
  staticStyles as s,
  IdentitySection,
  GridBehaviorSection,
  ShopSection,
  CropSection,
  BugSection,
  FishSection,
  InteractSection,
  NpcDialogSection,
  LightSection,
  FoodSection,
  ImageSection,
  SeedWizard,
} from '@/components/admin-item-form';

export default function AdminItemFormScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors } = theme;

  const {
    state,
    setField,
    loading,
    saving,
    generatingImage,
    isEdit,
    isSeed,
    isBug,
    slug,
    effectivePrompt,
    resetPrompt,
    handlePromptChange,
    searchableItems,
    handleSave,
    handleGenerateImage,
    handleGenerateImageAndNew,
    actionPayloads,
    addHarvestDrop,
    removeHarvestDrop,
    updateHarvestDrop,
    dispatch,
  } = useAdminItemForm();

  const ts = useMemo(() => createThemedStyles(theme), [theme]);

  if (loading) {
    return (
      <GradientBackground bubbleCount={2}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 120 }} />
      </GradientBackground>
    );
  }

  if (isSeed && !isEdit) {
    return <SeedWizard />;
  }

  return (
    <GradientBackground bubbleCount={2}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
          <Text style={ts.headerTitle}>{isEdit ? 'Edit Item' : 'New Item'}</Text>
          <Pressable onPress={handleSave} hitSlop={12} style={s.backBtn} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="checkmark-circle" size={26} color={colors.primary} />
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={s.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">
          <IdentitySection state={state} setField={setField} ts={ts} colors={colors} slug={slug} />

          <GridBehaviorSection state={state} setField={setField} ts={ts} colors={colors} s={s} />

          <ShopSection state={state} setField={setField} ts={ts} colors={colors} s={s} />

          {isSeed && (
            <CropSection
              state={state}
              setField={setField}
              updateHarvestDrop={updateHarvestDrop}
              addHarvestDrop={addHarvestDrop}
              removeHarvestDrop={removeHarvestDrop}
              searchableItems={searchableItems}
              ts={ts}
              colors={colors}
              s={s}
            />
          )}

          {isBug && <BugSection state={state} setField={setField} ts={ts} colors={colors} />}

          {state.category === 'fish' && <FishSection state={state} setField={setField} ts={ts} colors={colors} />}

          <InteractSection state={state} setField={setField} ts={ts} colors={colors} actionPayloads={actionPayloads} />

          {state.category === 'npc' && (
            <NpcDialogSection state={state} dispatch={dispatch} ts={ts} colors={colors} />
          )}

          {state.category === 'food' && (
            <FoodSection state={state} setField={setField} ts={ts} colors={colors} />
          )}

          <LightSection state={state} setField={setField} ts={ts} colors={colors} />

          <ImageSection
            state={state}
            setField={setField}
            effectivePrompt={effectivePrompt}
            onPromptChange={handlePromptChange}
            resetPrompt={resetPrompt}
            handleGenerateImage={handleGenerateImage}
            handleGenerateImageAndNew={handleGenerateImageAndNew}
            generatingImage={generatingImage}
            promptTouched={state.promptTouched}
            searchableItems={searchableItems}
            ts={ts}
            colors={colors}
            s={s}
          />

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}
