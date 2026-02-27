/**
 * Admin quest form – create or edit quests.
 * Route: /admin-quest-form (new) or /admin-quest-form?questId=xxx (edit)
 *
 * Ultra-modern UI with collapsible sections and drawer-based add flows.
 */

import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ItemSearchDropdown } from '@/components/ui/ItemSearchDropdown';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';
import {
  useAdminQuestForm,
  SectionCard,
  BasicSection,
  ActivationSection,
  TriggersSection,
  RequirementsSection,
  RewardsSection,
  DialogSection,
  StepsSection,
  createThemedStyles,
} from '@/components/admin-quest-form';
import { AddItemRequirementDrawer, type AddItemRequirementDrawerRef } from '@/components/admin-quest-form/drawers/AddItemRequirementDrawer';
import { AddBuildingRequirementDrawer, type AddBuildingRequirementDrawerRef } from '@/components/admin-quest-form/drawers/AddBuildingRequirementDrawer';
import { AddActionRequirementDrawer, type AddActionRequirementDrawerRef } from '@/components/admin-quest-form/drawers/AddActionRequirementDrawer';
import { AddEquipRequirementDrawer, type AddEquipRequirementDrawerRef } from '@/components/admin-quest-form/drawers/AddEquipRequirementDrawer';
import { AddTalkToNpcDrawer, type AddTalkToNpcDrawerRef } from '@/components/admin-quest-form/drawers/AddTalkToNpcDrawer';
import { AddCropGrownDrawer, type AddCropGrownDrawerRef } from '@/components/admin-quest-form/drawers/AddCropGrownDrawer';
import { AddOpenModalDrawer, type AddOpenModalDrawerRef } from '@/components/admin-quest-form/drawers/AddOpenModalDrawer';
import { AddTriggerDrawer, type AddTriggerDrawerRef } from '@/components/admin-quest-form/drawers/AddTriggerDrawer';
import { AddDialogStepDrawer, type AddDialogStepDrawerRef } from '@/components/admin-quest-form/drawers/AddDialogStepDrawer';
import { AddItemRewardDrawer, type AddItemRewardDrawerRef } from '@/components/admin-quest-form/drawers/AddItemRewardDrawer';
import { AddStepDrawer, type AddStepDrawerRef } from '@/components/admin-quest-form/drawers/AddStepDrawer';
import type { ItemReq, BuildingReq, ActionReq, EquipReq, TalkToNpcReq, CropGrownReq, OpenModalReq, TriggerForm, DialogStepForm, ItemReward } from '@/components/admin-quest-form/types';

export default function AdminQuestFormScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors } = theme;
  const ts = createThemedStyles(theme);

  const {
    form,
    updateForm,
    loading,
    saving,
    isEdit,
    handleSave,
    searchableItems,
    buyableSearchableItems,
    searchableQuests,
    searchableScenes,
    npcItems,
    actionTypes,
    actionPayloads,
    equipSlots,
  } = useAdminQuestForm();

  const itemReqRef = useRef<AddItemRequirementDrawerRef>(null);
  const buildingReqRef = useRef<AddBuildingRequirementDrawerRef>(null);
  const actionReqRef = useRef<AddActionRequirementDrawerRef>(null);
  const equipReqRef = useRef<AddEquipRequirementDrawerRef>(null);
  const talkToNpcRef = useRef<AddTalkToNpcDrawerRef>(null);
  const cropGrownRef = useRef<AddCropGrownDrawerRef>(null);
  const openModalRef = useRef<AddOpenModalDrawerRef>(null);
  const triggerRef = useRef<AddTriggerDrawerRef>(null);
  const dialogStepRef = useRef<AddDialogStepDrawerRef>(null);
  const startDialogStepRef = useRef<AddDialogStepDrawerRef>(null);
  const endDialogStepRef = useRef<AddDialogStepDrawerRef>(null);
  const itemRewardRef = useRef<AddItemRewardDrawerRef>(null);
  const stepRef = useRef<AddStepDrawerRef>(null);

  const handleItemReqSave = useCallback(
    (item: ItemReq, editIndex?: number) => {
      if (editIndex != null && editIndex >= 0) {
        const arr = [...form.reqItems];
        arr[editIndex] = item;
        updateForm('reqItems', arr);
      } else {
        updateForm('reqItems', [...form.reqItems, item]);
      }
    },
    [form.reqItems, updateForm],
  );

  const handleBuildingReqSave = useCallback(
    (item: BuildingReq, editIndex?: number) => {
      if (editIndex != null && editIndex >= 0) {
        const arr = [...form.reqBuildings];
        arr[editIndex] = item;
        updateForm('reqBuildings', arr);
      } else {
        updateForm('reqBuildings', [...form.reqBuildings, item]);
      }
    },
    [form.reqBuildings, updateForm],
  );

  const handleActionReqSave = useCallback(
    (item: ActionReq, editIndex?: number) => {
      if (editIndex != null && editIndex >= 0) {
        const arr = [...form.reqActions];
        arr[editIndex] = item;
        updateForm('reqActions', arr);
      } else {
        updateForm('reqActions', [...form.reqActions, item]);
      }
    },
    [form.reqActions, updateForm],
  );

  const handleEquipReqSave = useCallback(
    (item: EquipReq, editIndex?: number) => {
      if (editIndex != null && editIndex >= 0) {
        const arr = [...form.reqEquips];
        arr[editIndex] = item;
        updateForm('reqEquips', arr);
      } else {
        updateForm('reqEquips', [...form.reqEquips, item]);
      }
    },
    [form.reqEquips, updateForm],
  );

  const handleTalkToNpcSave = useCallback(
    (item: TalkToNpcReq, editIndex?: number) => {
      if (editIndex != null && editIndex >= 0) {
        const arr = [...form.reqTalkToNpc];
        arr[editIndex] = item;
        updateForm('reqTalkToNpc', arr);
      } else {
        updateForm('reqTalkToNpc', [...form.reqTalkToNpc, item]);
      }
    },
    [form.reqTalkToNpc, updateForm],
  );

  const handleCropGrownSave = useCallback(
    (item: CropGrownReq, editIndex?: number) => {
      if (editIndex != null && editIndex >= 0) {
        const arr = [...form.reqCropGrown];
        arr[editIndex] = item;
        updateForm('reqCropGrown', arr);
      } else {
        updateForm('reqCropGrown', [...form.reqCropGrown, item]);
      }
    },
    [form.reqCropGrown, updateForm],
  );

  const handleOpenModalSave = useCallback(
    (item: OpenModalReq, editIndex?: number) => {
      if (editIndex != null && editIndex >= 0) {
        const arr = [...form.reqOpenModal];
        arr[editIndex] = item;
        updateForm('reqOpenModal', arr);
      } else {
        updateForm('reqOpenModal', [...form.reqOpenModal, item]);
      }
    },
    [form.reqOpenModal, updateForm],
  );

  const handleTriggerSave = useCallback(
    (item: TriggerForm, editIndex?: number) => {
      if (editIndex != null && editIndex >= 0) {
        const arr = [...form.triggers];
        arr[editIndex] = item;
        updateForm('triggers', arr);
      } else {
        updateForm('triggers', [...form.triggers, item]);
      }
    },
    [form.triggers, updateForm],
  );

  const handleDialogStepSave = useCallback(
    (item: DialogStepForm, editIndex?: number, target: 'start' | 'end' = 'start') => {
      const key = target === 'start' ? 'startDialog' : 'endDialog';
      const arr = [...form[key]];
      if (editIndex != null && editIndex >= 0) {
        arr[editIndex] = item;
      } else {
        arr.push(item);
      }
      updateForm(key, arr);
    },
    [form.startDialog, form.endDialog, updateForm],
  );

  const handleItemRewardSave = useCallback(
    (item: ItemReward, editIndex?: number) => {
      if (editIndex != null && editIndex >= 0) {
        const arr = [...form.rewItems];
        arr[editIndex] = item;
        updateForm('rewItems', arr);
      } else {
        updateForm('rewItems', [...form.rewItems, item]);
      }
    },
    [form.rewItems, updateForm],
  );

  const handleStepSave = useCallback(
    (step: { stepId: string; requirements: object }, editIndex?: number) => {
      if (editIndex != null && editIndex >= 0) {
        const arr = [...form.steps];
        arr[editIndex] = { ...arr[editIndex], ...step };
        updateForm('steps', arr);
      } else {
        updateForm('steps', [...form.steps, step as any]);
      }
    },
    [form.steps, updateForm],
  );

  if (loading) {
    return (
      <GradientBackground bubbleCount={3}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 120 }} />
      </GradientBackground>
    );
  }

  return (
    <GradientBackground bubbleCount={3}>
      <View style={[staticStyles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={staticStyles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={[staticStyles.headerTitle, { color: colors.text }]}>{isEdit ? 'Edit Quest' : 'New Quest'}</Text>
        <View style={staticStyles.backBtn} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[staticStyles.form, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <SectionCard label="Basic" defaultExpanded>
            <View style={{ gap: 16 }}>
              <BasicSection form={form} updateForm={updateForm} isEdit={isEdit} />
            </View>
          </SectionCard>

          <SectionCard label="Activation" defaultExpanded={false}>
            <View style={{ gap: 16 }}>
              <ActivationSection form={form} updateForm={updateForm} searchableQuests={searchableQuests} />
            </View>
          </SectionCard>

          <SectionCard label="Triggers" badge={form.triggers.length || undefined} defaultExpanded={false}>
            <TriggersSection
              form={form}
              updateForm={updateForm}
              onAddTrigger={() => triggerRef.current?.open()}
              onEditTrigger={(i) => triggerRef.current?.open(form.triggers[i], i)}
            />
          </SectionCard>

          <SectionCard label="Requirements" defaultExpanded={false}>
            <RequirementsSection
              form={form}
              updateForm={updateForm}
              onAddItem={() => itemReqRef.current?.open()}
              onEditItem={(i) => itemReqRef.current?.open(form.reqItems[i], i)}
              onAddBuilding={() => buildingReqRef.current?.open()}
              onEditBuilding={(i) => buildingReqRef.current?.open(form.reqBuildings[i], i)}
              onAddAction={() => actionReqRef.current?.open()}
              onEditAction={(i) => actionReqRef.current?.open(form.reqActions[i], i)}
              onAddEquip={() => equipReqRef.current?.open()}
              onEditEquip={(i) => equipReqRef.current?.open(form.reqEquips[i], i)}
              onAddTalkToNpc={() => talkToNpcRef.current?.open()}
              onEditTalkToNpc={(i) => talkToNpcRef.current?.open(form.reqTalkToNpc[i], i)}
              onAddCropGrown={() => cropGrownRef.current?.open()}
              onEditCropGrown={(i) => cropGrownRef.current?.open(form.reqCropGrown[i], i)}
              onAddOpenModal={() => openModalRef.current?.open()}
              onEditOpenModal={(i) => openModalRef.current?.open(form.reqOpenModal[i], i)}
            />
          </SectionCard>

          <SectionCard label="Rewards" defaultExpanded={false}>
            <RewardsSection
              form={form}
              updateForm={updateForm}
              onAddItem={() => itemRewardRef.current?.open()}
              onEditItem={(i) => itemRewardRef.current?.open(form.rewItems[i], i)}
            />
          </SectionCard>

          <SectionCard label="Dialogs" defaultExpanded={false}>
            <DialogSection
              form={form}
              updateForm={updateForm}
              onAddStartStep={() => startDialogStepRef.current?.open()}
              onEditStartStep={(i) => startDialogStepRef.current?.open(form.startDialog[i], i)}
              onAddEndStep={() => endDialogStepRef.current?.open()}
              onEditEndStep={(i) => endDialogStepRef.current?.open(form.endDialog[i], i)}
            />
          </SectionCard>

          <SectionCard label="Steps" badge={form.steps.length || undefined} defaultExpanded={false}>
            <StepsSection
              form={form}
              updateForm={updateForm}
              onAddStep={() => stepRef.current?.open()}
              onEditStep={(i) => stepRef.current?.open(form.steps[i], i)}
            />
          </SectionCard>

          <SectionCard label="Auto Trigger (legacy)" defaultExpanded={false}>
            <View style={{ gap: 12 }}>
              <ItemSearchDropdown
                items={searchableQuests}
                value={form.autoTrigger}
                onSelect={(key) => updateForm('autoTrigger', key)}
                placeholder="Select quest to trigger…"
              />
              {form.autoTrigger ? (
                <Pressable onPress={() => updateForm('autoTrigger', '')}>
                  <Text style={{ color: colors.error, fontSize: 12, fontWeight: '600' }}>Clear auto-trigger</Text>
                </Pressable>
              ) : null}
            </View>
          </SectionCard>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: spacing.xl }}>
            <Pressable
              onPress={() => router.back()}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.md, backgroundColor: `${colors.text}0A`, borderWidth: 1, borderColor: colors.border }}
            >
              <Text style={{ fontWeight: '700', fontSize: 15, color: colors.textSecondary }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.md, backgroundColor: colors.primary }}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.onPrimary ?? '#fff'} />
              ) : (
                <Text style={{ fontWeight: '700', fontSize: 15, color: colors.onPrimary ?? '#fff' }}>{isEdit ? 'Update' : 'Create'}</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Drawers */}
      <AddItemRequirementDrawer ref={itemReqRef} items={searchableItems} onSave={handleItemReqSave} />
      <AddBuildingRequirementDrawer ref={buildingReqRef} items={searchableItems} onSave={handleBuildingReqSave} />
      <AddActionRequirementDrawer ref={actionReqRef} items={searchableItems} actionTypes={actionTypes} onSave={handleActionReqSave} />
      <AddEquipRequirementDrawer ref={equipReqRef} items={searchableItems} equipSlots={equipSlots} onSave={handleEquipReqSave} />
      <AddTalkToNpcDrawer ref={talkToNpcRef} npcItems={npcItems.length ? npcItems : searchableItems} onSave={handleTalkToNpcSave} />
      <AddCropGrownDrawer ref={cropGrownRef} items={searchableItems} onSave={handleCropGrownSave} />
      <AddOpenModalDrawer ref={openModalRef} payloads={actionPayloads} onSave={handleOpenModalSave} />
      <AddTriggerDrawer
        ref={triggerRef}
        searchableQuests={searchableQuests}
        npcItems={npcItems.length ? npcItems : searchableItems}
        searchableScenes={searchableScenes}
        onSave={handleTriggerSave}
      />
      <AddDialogStepDrawer
        ref={startDialogStepRef}
        searchableItems={searchableItems}
        buyableSearchableItems={buyableSearchableItems}
        onSave={(item, i) => handleDialogStepSave(item, i, 'start')}
      />
      <AddDialogStepDrawer
        ref={endDialogStepRef}
        searchableItems={searchableItems}
        buyableSearchableItems={buyableSearchableItems}
        onSave={(item, i) => handleDialogStepSave(item, i, 'end')}
      />
      <AddItemRewardDrawer ref={itemRewardRef} items={searchableItems} onSave={handleItemRewardSave} />
      <AddStepDrawer ref={stepRef} existingStepIds={form.steps.map((s) => s.stepId)} onSave={handleStepSave} />
    </GradientBackground>
  );
}

const staticStyles = {
  form: { paddingHorizontal: spacing.xl, paddingBottom: 120 },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center' as const, justifyContent: 'center' as const },
  headerTitle: { flex: 1, textAlign: 'center' as const, fontSize: 18, fontWeight: '700' as const },
};
