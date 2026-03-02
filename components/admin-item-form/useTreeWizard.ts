/**
 * Hook for the tree creation wizard: manages 3-step state (tree base → images → finish),
 * creates sapling, in_growth, and fully_grown items, and generates all images at once.
 */

import { useCallback, useMemo, useReducer, useState } from 'react';
import { useRouter } from 'expo-router';
import { useToast } from '@/store/ToastProvider';
import { api } from '@/lib/api';
import { nameToSlug } from './utils';
import { STYLE_FRAGMENT } from './constants';

export interface TreeStepData {
  label: string;
  slug: string;
  imagePrompt: string;
  promptTouched: boolean;
  imageUrl: string;
  saved: boolean;
  generating: boolean;
}

export interface TreeWizardState {
  step: number;
  treeBase: {
    label: string;
    variantSlug: string;
    fruitItemType: string;
    harvestYield: Array<{ itemType: string; qty: number }>;
  };
  sapling: TreeStepData;
  inGrowth: TreeStepData;
  fullyGrown: TreeStepData;
}

function makeTreeStep(label: string): TreeStepData {
  return {
    label,
    slug: '',
    imagePrompt: '',
    promptTouched: false,
    imageUrl: '',
    saved: false,
    generating: false,
  };
}

function initialState(): TreeWizardState {
  return {
    step: 0,
    treeBase: {
      label: '',
      variantSlug: '',
      fruitItemType: '',
      harvestYield: [{ itemType: 'wood', qty: 1 }],
    },
    sapling: makeTreeStep(''),
    inGrowth: makeTreeStep(''),
    fullyGrown: makeTreeStep(''),
  };
}

type TreeWizardAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'UPDATE_BASE'; field: string; value: string | Array<{ itemType: string; qty: number }> }
  | { type: 'UPDATE_STEP'; which: 'sapling' | 'inGrowth' | 'fullyGrown'; field: keyof TreeStepData; value: string | boolean }
  | { type: 'MARK_SAVED'; which: 'sapling' | 'inGrowth' | 'fullyGrown' }
  | { type: 'SET_GENERATING'; which: 'sapling' | 'inGrowth' | 'fullyGrown'; value: boolean }
  | { type: 'SET_IMAGE_URL'; which: 'sapling' | 'inGrowth' | 'fullyGrown'; url: string };

function treeWizardReducer(state: TreeWizardState, action: TreeWizardAction): TreeWizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'UPDATE_BASE': {
      const base = { ...state.treeBase, [action.field]: action.value };
      if (action.field === 'label') {
        const slug = nameToSlug(action.value as string);
        base.variantSlug = slug || base.variantSlug;
      }
      return { ...state, treeBase: base };
    }
    case 'UPDATE_STEP': {
      const which = action.which;
      const stepData = { ...state[which], [action.field]: action.value };
      if (action.field === 'label') stepData.slug = nameToSlug((action.value as string) || '');
      if (action.field === 'imagePrompt') stepData.promptTouched = true;
      return { ...state, [which]: stepData };
    }
    case 'MARK_SAVED':
      return { ...state, [action.which]: { ...state[action.which], saved: true } };
    case 'SET_GENERATING':
      return { ...state, [action.which]: { ...state[action.which], generating: action.value } };
    case 'SET_IMAGE_URL':
      return { ...state, [action.which]: { ...state[action.which], imageUrl: action.url } };
    default:
      return state;
  }
}

function buildSaplingPrompt(label: string): string {
  const name = label.trim() || 'sapling';
  return `A small ${name} tree sapling, 2D game sprite for a cozy top-down farming game. ${STYLE_FRAGMENT}`;
}

function buildInGrowthPrompt(label: string): string {
  const name = label.trim() || 'tree';
  return `A growing ${name} tree, 2D game sprite for a cozy top-down farming game. ${STYLE_FRAGMENT}`;
}

function buildFullyGrownPrompt(label: string): string {
  const name = label.trim() || 'tree';
  return `A fully grown ${name} tree, 2D game sprite for a cozy top-down farming game. ${STYLE_FRAGMENT}`;
}

export function useTreeWizard() {
  const router = useRouter();
  const { toast } = useToast();
  const [state, dispatch] = useReducer(treeWizardReducer, undefined, initialState);
  const [saving, setSaving] = useState(false);

  const variantSlug = state.treeBase.variantSlug || nameToSlug(state.treeBase.label);
  const saplingSlug = `tree_sappling_${variantSlug}`;
  const inGrowthSlug = `tree_in_growth_${variantSlug}`;
  const fullyGrownSlug = `tree_fully_grown_${variantSlug}`;

  const effectivePrompt = useCallback(
    (which: 'sapling' | 'inGrowth' | 'fullyGrown') => {
      const step = state[which];
      if (step.promptTouched) return step.imagePrompt;
      const label = state.treeBase.label || variantSlug;
      if (which === 'sapling') return buildSaplingPrompt(label);
      if (which === 'inGrowth') return buildInGrowthPrompt(label);
      return buildFullyGrownPrompt(label);
    },
    [state, variantSlug],
  );

  const saveAllAndCreate = useCallback(async () => {
    if (!state.treeBase.label.trim()) {
      toast('Tree label is required', 'error');
      return false;
    }
    if (!variantSlug) {
      toast('Variant slug is required', 'error');
      return false;
    }
    setSaving(true);
    try {
      const harvestYield = state.treeBase.harvestYield.filter((h) => h.itemType.trim());
      const treeFruit = state.treeBase.fruitItemType?.trim() || undefined;
      const defaultHarvest = harvestYield.length ? harvestYield : [{ itemType: 'wood', qty: 1 }];

      const createOrUpdate = async (
        itemType: string,
        data: Parameters<typeof api.createGameItem>[0],
      ) => {
        try {
          await api.createGameItem(data);
        } catch (e: any) {
          if (e?.code === 'DUPLICATE_ITEM') {
            await api.updateGameItem(itemType, {
              label: data.label,
              cols: data.cols,
              rows: data.rows,
              harvestYield: data.harvestYield,
              treeFruit: (data as any).treeFruit,
            });
          } else throw e;
        }
      };

      await createOrUpdate(saplingSlug, {
        itemType: saplingSlug,
        label: `${state.treeBase.label} Sapling`,
        emoji: '🌱',
        color: '#8BC34A',
        category: 'tree',
        placeable: true,
        cols: 1,
        rows: 1,
        harvestYield: defaultHarvest,
      });
      await createOrUpdate(inGrowthSlug, {
        itemType: inGrowthSlug,
        label: `${state.treeBase.label} Tree (Growing)`,
        emoji: '🌳',
        color: '#558B2F',
        category: 'tree',
        placeable: true,
        cols: 2,
        rows: 2,
        harvestYield: defaultHarvest,
      });
      await createOrUpdate(fullyGrownSlug, {
        itemType: fullyGrownSlug,
        label: `${state.treeBase.label} Tree`,
        emoji: '🌳',
        color: '#2E7D32',
        category: 'tree',
        placeable: true,
        cols: 4,
        rows: 4,
        treeFruit,
        harvestYield: defaultHarvest,
      });

      const items: ('sapling' | 'inGrowth' | 'fullyGrown')[] = ['sapling', 'inGrowth', 'fullyGrown'];
      const slugs = [saplingSlug, inGrowthSlug, fullyGrownSlug];
      for (const w of items) dispatch({ type: 'SET_GENERATING', which: w, value: true });
      const results = await Promise.allSettled(
        items.map((which, i) => api.generateGameItemImage(slugs[i], effectivePrompt(which))),
      );
      for (const w of items) dispatch({ type: 'SET_GENERATING', which: w, value: false });
      for (let i = 0; i < items.length; i++) {
        const r = results[i];
        if (r.status === 'fulfilled') dispatch({ type: 'SET_IMAGE_URL', which: items[i], url: r.value.imageUrl });
      }
      const errors = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      const firstErr = errors[0]?.reason;
      const errMsg = firstErr instanceof Error ? firstErr.message : String(firstErr ?? 'Unknown error');
      if (errors.length > 0) toast(`${errors.length} image(s) failed: ${errMsg}`, 'error');
      else toast('Tree pipeline complete! All items and images created.', 'success');
      router.back();
    } catch (e: any) {
      toast(e?.message ?? 'Failed to create tree', 'error');
    } finally {
      setSaving(false);
    }
  }, [state.treeBase, variantSlug, saplingSlug, inGrowthSlug, fullyGrownSlug, effectivePrompt, toast, router]);

  const generateAllImages = useCallback(async () => {
    const items: ('sapling' | 'inGrowth' | 'fullyGrown')[] = ['sapling', 'inGrowth', 'fullyGrown'];
    const slugs = [saplingSlug, inGrowthSlug, fullyGrownSlug];
    for (const w of items) dispatch({ type: 'SET_GENERATING', which: w, value: true });
    const results = await Promise.allSettled(
      items.map((which, i) => api.generateGameItemImage(slugs[i], effectivePrompt(which))),
    );
    for (const w of items) dispatch({ type: 'SET_GENERATING', which: w, value: false });
    for (let i = 0; i < items.length; i++) {
      const r = results[i];
      if (r.status === 'fulfilled') dispatch({ type: 'SET_IMAGE_URL', which: items[i], url: r.value.imageUrl });
    }
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    const firstErr = failed[0]?.reason;
    const errMsg = firstErr instanceof Error ? firstErr.message : String(firstErr ?? 'Unknown error');
    if (failed.length > 0) toast(`${failed.length} image(s) failed: ${errMsg}`, 'error');
    else toast('All images generated!', 'success');
  }, [saplingSlug, inGrowthSlug, fullyGrownSlug, effectivePrompt, toast]);

  const stepLabels = ['Tree Details', 'Create'] as const;

  return {
    state,
    stepLabels,
    saving,
    variantSlug,
    saplingSlug,
    inGrowthSlug,
    fullyGrownSlug,
    effectivePrompt,
    updateBase: (field: string, value: string | Array<{ itemType: string; qty: number }>) =>
      dispatch({ type: 'UPDATE_BASE', field, value }),
    updateStep: (which: 'sapling' | 'inGrowth' | 'fullyGrown', field: keyof TreeStepData, value: string | boolean) =>
      dispatch({ type: 'UPDATE_STEP', which, field, value }),
    saveAllAndCreate,
    generateAllImages,
    goBack: useCallback(() => {
      if (state.step > 0) dispatch({ type: 'SET_STEP', step: state.step - 1 });
      else router.back();
    }, [state.step, router]),
    setStep: (step: number) => dispatch({ type: 'SET_STEP', step }),
  };
}
