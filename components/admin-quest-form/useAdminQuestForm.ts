/**
 * Hook for admin quest form state and actions.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api, type AdminQuestDef, type AdminGameItem } from '@/lib/api';
import type { SearchableItem } from '@/components/ui/ItemSearchDropdown';
import type { FormState } from './types';
import { defToForm, formToInput, formToUpdate, emptyForm } from './converters';
import { DEFAULT_ACTION_TYPES } from './constants';

export function useAdminQuestForm() {
  const router = useRouter();
  const { questId } = useLocalSearchParams<{ questId?: string }>();

  const [quests, setQuests] = useState<AdminQuestDef[]>([]);
  const [gameItems, setGameItems] = useState<AdminGameItem[]>([]);
  const [scenes, setScenes] = useState<{ slug: string; name: string }[]>([]);
  const [actionTypes, setActionTypes] = useState<string[]>(DEFAULT_ACTION_TYPES as unknown as string[]);
  const [actionPayloads, setActionPayloads] = useState<string[]>([]);
  const [equipSlots, setEquipSlots] = useState<string[]>(['handTool', 'bobber', 'bait', 'chair']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const searchableItems: SearchableItem[] = useMemo(
    () => gameItems.map((g) => ({ key: g.itemType, label: g.label, imageUrl: g.imageUrl })),
    [gameItems],
  );

  const buyableSearchableItems: SearchableItem[] = useMemo(
    () => gameItems.filter((g) => g.buyable && (g.gemPrice ?? 0) > 0).map((g) => ({ key: g.itemType, label: g.label, imageUrl: g.imageUrl })),
    [gameItems],
  );

  const searchableQuests: SearchableItem[] = useMemo(
    () => quests.map((q) => ({ key: q.questId, label: `${q.title} (${q.questId})` })),
    [quests],
  );

  const searchableScenes: SearchableItem[] = useMemo(
    () => scenes.map((s) => ({ key: s.slug, label: `${s.name} (${s.slug})` })),
    [scenes],
  );

  const npcItems: SearchableItem[] = useMemo(
    () => gameItems.filter((g) => g.category === 'npc').map((g) => ({ key: g.itemType, label: g.label, imageUrl: g.imageUrl })),
    [gameItems],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [questData, items, scenesData, actionTypesRes, actionPayloadsRes, equipSlotsRes] = await Promise.all([
        api.getQuests(),
        api.getGameItems(),
        api.getScenes().catch(() => ({ scenes: [] })),
        api.getQuestActionTypes().catch(() => ({ actions: DEFAULT_ACTION_TYPES as unknown as string[] })),
        api.getActionPayloads().catch(() => ({ payloads: [] })),
        api.getQuestEquipSlots().catch(() => ({ slots: ['handTool', 'bobber', 'bait', 'chair'] })),
      ]);
      setQuests(questData.quests);
      setGameItems(items);
      setScenes(scenesData.scenes ?? []);
      setActionTypes(actionTypesRes.actions);
      setActionPayloads(actionPayloadsRes.payloads ?? []);
      setEquipSlots(equipSlotsRes.slots);
      if (questId) {
        const q = questData.quests.find((x) => x.questId === questId);
        if (q) setForm(defToForm(q));
      } else {
        setForm(emptyForm());
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [questId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateForm = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.questId.trim() || !form.title.trim()) {
      Alert.alert('Validation', 'Quest ID and Title are required');
      return;
    }
    try {
      setSaving(true);
      if (questId) {
        await api.updateQuest(questId, formToUpdate(form));
      } else {
        await api.createQuest(formToInput(form));
      }
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }, [form, questId, router]);

  return {
    form,
    updateForm,
    loading,
    saving,
    isEdit: !!questId,
    handleSave,
    searchableItems,
    buyableSearchableItems,
    searchableQuests,
    searchableScenes,
    npcItems,
    actionTypes,
    actionPayloads,
    equipSlots,
  };
}
