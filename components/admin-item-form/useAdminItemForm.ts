/**
 * Hook for admin item form logic: loading, saving, payload building, and side effects.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useToast } from '@/store/ToastProvider';
import {
  api,
  type ItemCategory,
  type AdminGameItem,
  type AdminGameItemInput,
  type AdminGameItemHarvestDrop,
} from '@/lib/api';
import { formReducer, INITIAL_STATE } from './reducer';
import { buildDefaultPrompt, nameToSlug } from './utils';
import type { FormState } from './types';
import type { SearchableItem } from '@/components/ui/ItemSearchDropdown';

const NONE_OPTION: SearchableItem = { key: '', label: 'None' };

export function useAdminItemForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ itemType?: string }>();
  const isEdit = !!params.itemType;
  const { toast } = useToast();

  const [state, dispatch] = useReducer(formReducer, INITIAL_STATE);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [allItems, setAllItems] = useState<AdminGameItem[]>([]);
  const [actionPayloads, setActionPayloads] = useState<string[]>([]);

  const isSeed = state.category === 'seed';
  const isTree = state.category === 'tree';
  const isBug = state.category === 'bug';
  const isFish = state.category === 'fish';

  const slug = isEdit ? state.itemType : (state.itemType || nameToSlug(state.label));
  const defaultPrompt = useMemo(() => buildDefaultPrompt(state.label, state.category, state.subCategory), [state.label, state.category, state.subCategory]);
  const basePrompt = state.promptTouched ? state.imagePrompt : defaultPrompt;
  const selectedColors = useMemo(
    () => state.selectedColorIndices.map((i) => state.extractedColors[i]).filter(Boolean),
    [state.selectedColorIndices, state.extractedColors],
  );
  const effectivePrompt = useMemo(() => {
    if (selectedColors.length === 0) return basePrompt;
    return `${basePrompt} Use these exact hex colors in the palette: ${selectedColors.join(', ')}.`;
  }, [basePrompt, selectedColors]);

  // Sync itemType from label when creating new item. Debounced to avoid double
  // state updates per keystroke which causes inputs to lose text while typing.
  const labelSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isEdit) return;
    if (labelSyncRef.current) clearTimeout(labelSyncRef.current);
    labelSyncRef.current = setTimeout(() => {
      labelSyncRef.current = null;
      if (state.label.trim()) {
        dispatch({ type: 'SET_FIELD', field: 'itemType', value: nameToSlug(state.label) });
      }
    }, 300);
    return () => {
      if (labelSyncRef.current) {
        clearTimeout(labelSyncRef.current);
        labelSyncRef.current = null;
      }
    };
  }, [isEdit, state.label]);

  // Load items, action payloads, and optionally populate form
  useEffect(() => {
    (async () => {
      try {
        const [items, payloadsRes] = await Promise.all([
          api.getGameItems(),
          api.getActionPayloads(),
        ]);
        setAllItems(items);
        setActionPayloads(payloadsRes.payloads);
        if (params.itemType) {
          const item = items.find((i) => i.itemType === params.itemType);
          if (!item) {
            toast('Item not found', 'error');
            router.back();
            return;
          }
          dispatch({ type: 'POPULATE', payload: item });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load';
        toast(msg, 'error');
        if (params.itemType) router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [params.itemType, toast, router]);

  // Fetch colors when color scheme item is selected
  useEffect(() => {
    if (!state.colorSchemeItemType) {
      dispatch({ type: 'SET_EXTRACTED_COLORS', itemType: '', colors: [] });
      return;
    }
    let cancelled = false;
    api
      .extractImageColors(state.colorSchemeItemType)
      .then(({ colors }) => {
        if (!cancelled) dispatch({ type: 'SET_EXTRACTED_COLORS', itemType: state.colorSchemeItemType, colors });
      })
      .catch((err: unknown) => {
        if (!cancelled) toast(err instanceof Error ? err.message : 'Failed to extract colors', 'error');
      });
    return () => { cancelled = true; };
  }, [state.colorSchemeItemType, toast]);

  const searchableItems: SearchableItem[] = useMemo(() => {
    const items = allItems.map((i) => ({ key: i.itemType, label: i.label, imageUrl: i.imageUrl }));
    const currentSlug = slug || nameToSlug(state.label);
    if (!isEdit && state.label.trim() && !items.some((i) => i.key === currentSlug)) {
      items.unshift({ key: currentSlug, label: state.label.trim() + ' (this item)', imageUrl: undefined });
    }
    return items;
  }, [allItems, slug, state.label, isEdit]);

  const buildPayload = useCallback((): AdminGameItemInput => {
    const data: AdminGameItemInput = {
      itemType: slug || nameToSlug(state.label),
      label: state.label.trim(),
      emoji: '📦',
      color: '#888888',
      category: state.category,
      placeable: state.placeable,
      cols: parseInt(state.cols, 10) || 2,
      rows: parseInt(state.rows, 10) || 2,
    };
    if (state.imageUrl) data.imageUrl = state.imageUrl;
    if (isSeed || state.growthMs) data.growthMs = parseInt(state.growthMs, 10) || 0;
    if (state.harvestYield.length > 0) data.harvestYield = state.harvestYield.filter((d) => d.itemType.trim());
    if (state.actionType !== 'none') data.interactAction = { type: state.actionType, payload: state.actionPayload || undefined };
    data.autoConnect = state.autoConnect;
    data.centerOverflow = state.centerOverflow;
    data.buyable = state.buyable;
    if (state.gemPrice) data.gemPrice = parseInt(state.gemPrice, 10) || 0;
    if (state.farmLevel) data.farmLevel = parseInt(state.farmLevel, 10) || 0;
    else if (isEdit) data.farmLevel = null;
    if (state.petLevel) data.petLevel = parseInt(state.petLevel, 10) || 0;
    else if (isEdit) data.petLevel = null;
    if (state.shopSection.trim()) data.shopSection = state.shopSection.trim();
    else if (isEdit) data.shopSection = null;
    data.sellable = state.sellable;
    data.sellPrice = state.sellPrice ? parseInt(state.sellPrice, 10) || 0 : 0;
    if (state.availableUntil.trim()) data.availableUntil = new Date(state.availableUntil).toISOString();
    else if (isEdit) data.availableUntil = null;
    if (state.gemsGiven) data.gemsGiven = parseInt(state.gemsGiven, 10) || 0;
    else if (isEdit) data.gemsGiven = null;
    if (state.bugSizeMin) data.bugSizeMin = parseFloat(state.bugSizeMin) || null;
    else if (isEdit) data.bugSizeMin = null;
    if (state.bugSizeMax) data.bugSizeMax = parseFloat(state.bugSizeMax) || null;
    else if (isEdit) data.bugSizeMax = null;
    if (state.bugRarity && state.bugRarity !== 'common') data.bugRarity = state.bugRarity as any;
    else if (isEdit) data.bugRarity = state.bugRarity as any;
    if (state.bugActiveTime && state.bugActiveTime !== 'all_day') data.bugActiveTime = state.bugActiveTime as any;
    else if (isEdit) data.bugActiveTime = state.bugActiveTime as any;
    if (isBug && state.bugSpawnOn?.length) data.bugSpawnOn = state.bugSpawnOn;
    else if (isEdit && state.category === 'bug') data.bugSpawnOn = state.bugSpawnOn?.length ? state.bugSpawnOn : null;
    if (isBug && state.bugScenes?.length) data.bugScenes = state.bugScenes;
    else if (isEdit && state.category === 'bug') data.bugScenes = state.bugScenes?.length ? state.bugScenes : null;
    if (state.fishSizeMin) data.fishSizeMin = parseFloat(state.fishSizeMin) || null;
    else if (isEdit) data.fishSizeMin = null;
    if (state.fishSizeMax) data.fishSizeMax = parseFloat(state.fishSizeMax) || null;
    else if (isEdit) data.fishSizeMax = null;
    if (state.fishRarity && state.fishRarity !== 'common') data.fishRarity = state.fishRarity as any;
    else if (isEdit) data.fishRarity = state.fishRarity as any;
    if (state.fishActiveTime && state.fishActiveTime !== 'all_day') data.fishActiveTime = state.fishActiveTime as any;
    else if (isEdit) data.fishActiveTime = state.fishActiveTime as any;
    if (isFish) data.fishSpotTypes = state.fishSpotTypes?.length ? state.fishSpotTypes : [];
    if (state.lightEnabled && state.lightRadius) {
      data.lightRadius = parseFloat(state.lightRadius) || 3;
      data.lightColor = state.lightColor || '#FFDD88';
      data.lightIntensity = parseFloat(state.lightIntensity) || 0.5;
    } else if (isEdit) {
      data.lightRadius = null;
      data.lightColor = null;
      data.lightIntensity = null;
    }
    Object.assign(data, state.subCategory.trim() ? { subCategory: state.subCategory.trim() } : isEdit ? { subCategory: null } : {});
    if (state.category === 'npc' && state.npcDialog?.length) {
      data.npcDialog = state.npcDialog.filter((s) => s.text.trim()).map((s) => ({ text: s.text.trim() }));
    } else if (isEdit) {
      data.npcDialog = null;
    }
    if (state.subCategory === 'fruit') {
      data.growsOnTrees = state.growsOnTrees ?? [];
    } else if (isEdit) {
      data.growsOnTrees = null;
    }
    if (state.category === 'food') {
      if (state.foodHunger) data.foodHunger = parseInt(state.foodHunger, 10) || 0;
      else if (isEdit) data.foodHunger = null;
      if (state.foodHappiness) data.foodHappiness = parseInt(state.foodHappiness, 10) || 0;
      else if (isEdit) data.foodHappiness = null;
      if (state.foodPetXp) data.foodPetXp = parseInt(state.foodPetXp, 10) || 0;
      else if (isEdit) data.foodPetXp = null;
      if (state.foodBuffType.trim()) data.foodBuffType = state.foodBuffType.trim();
      else if (isEdit) data.foodBuffType = null;
      if (state.foodBuffDurationMs) data.foodBuffDurationMs = parseInt(state.foodBuffDurationMs, 10) || 0;
      else if (isEdit) data.foodBuffDurationMs = null;
    }
    return data;
  }, [state, slug, isEdit, isSeed, isBug, isFish]);

  const saveItem = useCallback(async (): Promise<boolean> => {
    const data = buildPayload();
    if (!data.itemType || !data.label) {
      toast('Label is required.', 'error');
      return false;
    }
    if (isSeed && (!data.growthMs || data.growthMs <= 0)) {
      toast('Seeds require a growth time.', 'error');
      return false;
    }
    try {
      if (isEdit) {
        const { itemType: _, ...updateData } = data;
        await api.updateGameItem(params.itemType!, updateData);
      } else {
        try {
          await api.createGameItem(data);
        } catch (e: unknown) {
          const err = e as { code?: string };
          if (err?.code === 'DUPLICATE_ITEM') {
            const { itemType: _t, ...upd } = data;
            await api.updateGameItem(data.itemType, upd);
          } else throw e;
        }
      }
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      toast(msg, 'error');
      return false;
    }
  }, [buildPayload, isEdit, isSeed, params.itemType, toast]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const ok = await saveItem();
    setSaving(false);
    if (ok) {
      toast(isEdit ? 'Item saved!' : 'Item created!', 'success');
      router.back();
    }
  }, [saveItem, isEdit, toast, router]);

  const handleGenerateImage = useCallback(async () => {
    const effectiveSlug = slug || nameToSlug(state.label);
    if (!effectiveSlug || !state.label.trim()) {
      toast('Enter a label first.', 'error');
      return;
    }
    try {
      setGeneratingImage(true);
      const saved = await saveItem();
      if (!saved) {
        setGeneratingImage(false);
        return;
      }
      if (!isEdit) {
        dispatch({ type: 'SET_FIELD', field: 'itemType', value: effectiveSlug });
      }
      setGeneratingImage(false);
      toast(
        state.autoConnect ? 'Item saved! Fence images queued.' : 'Item saved! Image queued.',
        'success',
      );
      api
        .generateGameItemImage(effectiveSlug, effectivePrompt, state.referenceItemType || undefined)
        .then((result) => {
          dispatch({ type: 'SET_IMAGE_URL', payload: result.imageUrl });
          if (result.directionalImages) {
            dispatch({ type: 'SET_DIRECTIONAL_IMAGES', payload: result.directionalImages as Record<string, string> });
            toast(`${Object.keys(result.directionalImages).length} fence variants generated!`, 'success');
          } else {
            toast('Image generated successfully!', 'success');
          }
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Image generation failed';
          toast(msg, 'error');
        });
    } catch (err: unknown) {
      setGeneratingImage(false);
      const msg = err instanceof Error ? err.message : 'Failed to save';
      toast(msg, 'error');
    }
  }, [isEdit, effectivePrompt, slug, state.label, state.autoConnect, state.referenceItemType, saveItem, toast]);

  const handleGenerateImageAndNew = useCallback(async () => {
    const effectiveSlug = slug || nameToSlug(state.label);
    if (!effectiveSlug || !state.label.trim()) {
      toast('Enter a label first.', 'error');
      return;
    }
    try {
      setGeneratingImage(true);
      const saved = await saveItem();
      if (!saved) {
        setGeneratingImage(false);
        return;
      }
      setGeneratingImage(false);
      toast(
        state.autoConnect ? 'Item saved! Fence images queued.' : 'Item saved! Image queued.',
        'success',
      );
      api
        .generateGameItemImage(effectiveSlug, effectivePrompt, state.referenceItemType || undefined)
        .then((result) => {
          if (result.directionalImages) {
            toast(`${Object.keys(result.directionalImages).length} fence variants generated!`, 'success');
          } else {
            toast('Image generated successfully!', 'success');
          }
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Image generation failed';
          toast(msg, 'error');
        });
      router.replace({ pathname: '/admin-item-form' });
    } catch (err: unknown) {
      setGeneratingImage(false);
      const msg = err instanceof Error ? err.message : 'Failed to save';
      toast(msg, 'error');
    }
  }, [effectivePrompt, slug, state.label, state.autoConnect, state.referenceItemType, saveItem, toast, router]);

  const setField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    dispatch({ type: 'SET_FIELD', field, value: value as string | boolean | string[] });
  }, []);

  const resetPrompt = useCallback(() => {
    dispatch({ type: 'RESET_PROMPT' });
  }, []);

  const handlePromptChange = useCallback((t: string) => {
    dispatch({ type: 'SET_FIELD', field: 'promptTouched', value: true });
    dispatch({ type: 'SET_FIELD', field: 'imagePrompt', value: t });
  }, []);

  const handleColorSchemeSelect = useCallback((itemType: string) => {
    dispatch({ type: 'SET_FIELD', field: 'colorSchemeItemType', value: itemType });
  }, []);

  const handleToggleColor = useCallback((index: number) => {
    dispatch({ type: 'TOGGLE_COLOR_INDEX', index });
  }, []);

  const addHarvestDrop = useCallback(() => {
    const currentSlug = slug || nameToSlug(state.label);
    dispatch({ type: 'ADD_HARVEST_DROP', currentSlug });
  }, [slug, state.label]);

  const removeHarvestDrop = useCallback((idx: number) => {
    dispatch({ type: 'REMOVE_HARVEST_DROP', index: idx });
  }, []);

  const updateHarvestDrop = useCallback((idx: number, field: keyof AdminGameItemHarvestDrop, value: string) => {
    dispatch({ type: 'UPDATE_HARVEST_DROP', index: idx, field, value });
  }, []);

  const colorSchemeItems: SearchableItem[] = useMemo(
    () => [NONE_OPTION, ...searchableItems.filter((i) => i.imageUrl)],
    [searchableItems],
  );

  return {
    state,
    dispatch,
    setField,
    loading,
    saving,
    generatingImage,
    isEdit,
    isSeed,
    isTree,
    isBug,
    isFish,
    slug,
    defaultPrompt,
    basePrompt,
    effectivePrompt,
    resetPrompt,
    handlePromptChange,
    searchableItems,
    handleSave,
    handleGenerateImage,
    handleGenerateImageAndNew,
    handleColorSchemeSelect,
    handleToggleColor,
    colorSchemeItems,
    actionPayloads,
    addHarvestDrop,
    removeHarvestDrop,
    updateHarvestDrop,
    allItems,
  };
}