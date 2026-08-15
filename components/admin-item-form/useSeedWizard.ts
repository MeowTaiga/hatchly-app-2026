/**
 * Hook for the seed creation wizard: manages 4-step state
 * (seed -> ingredient -> food -> recipe), progressive saves, and image generation.
 */

import { useCallback, useMemo, useReducer, useState } from 'react';
import { useRouter } from 'expo-router';
import { useToast } from '@/store/ToastProvider';
import { api, type AdminRecipeIngredient } from '@/lib/api';
import { nameToSlug } from './utils';
import { STYLE_FRAGMENT } from './constants';

// ─── Step data shapes ──────────────────────────────────────────────────────

export interface ItemStepData {
  label: string;
  slug: string;
  cols: string;
  rows: string;
  imagePrompt: string;
  promptTouched: boolean;
  imageUrl: string;
  saved: boolean;
  generating: boolean;
}

export interface SeedStep extends ItemStepData {
  growthMs: string;
  gemsGiven: string;
  gemPrice: string;
  farmLevel: string;
}

export interface FoodStep extends ItemStepData {
  foodHunger: string;
  foodHappiness: string;
  foodPetXp: string;
}

export interface RecipeStep {
  label: string;
  recipeId: string;
  difficulty: string;
  ingredients: AdminRecipeIngredient[];
  saved: boolean;
}

export interface WizardState {
  step: number;
  seed: SeedStep;
  ingredient: ItemStepData;
  ingredientLabelTouched: boolean;
  food: FoodStep;
  recipe: RecipeStep;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function deriveIngredientName(seedLabel: string): string {
  const stripped = seedLabel.replace(/\s*seeds?\s*$/i, '').trim();
  return stripped.split(/\s+/)[0] || stripped;
}

function buildSeedPrompt(label: string): string {
  const name = label.trim() || 'seed';
  return `A ${name}, 2D game sprite for a cozy top-down farming game. ${STYLE_FRAGMENT}`;
}

function buildIngredientPrompt(label: string): string {
  const name = label.trim() || 'crop';
  return `A ${name} fully grown plant, 2D game sprite for a cozy top-down farming game. ${STYLE_FRAGMENT}`;
}

function buildFoodPrompt(label: string): string {
  const name = label.trim() || 'food';
  return `A ${name}, 2D game sprite for a cozy top-down farming game. ${STYLE_FRAGMENT}`;
}

function makeItemStep(label: string): ItemStepData {
  return {
    label,
    slug: nameToSlug(label),
    cols: '1',
    rows: '1',
    imagePrompt: '',
    promptTouched: false,
    imageUrl: '',
    saved: false,
    generating: false,
  };
}

function initialState(): WizardState {
  return {
    step: 0,
    seed: {
      ...makeItemStep(''),
      growthMs: '60000',
      gemsGiven: '',
      gemPrice: '5',
      farmLevel: '1',
    },
    ingredient: makeItemStep(''),
    ingredientLabelTouched: false,
    food: {
      ...makeItemStep(''),
      foodHunger: '20',
      foodHappiness: '10',
      foodPetXp: '10',
    },
    recipe: {
      label: '',
      recipeId: '',
      difficulty: '1',
      ingredients: [],
      saved: false,
    },
  };
}

// ─── Reducer ────────────────────────────────────────────────────────────────

type WizardAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'UPDATE_SEED'; field: keyof SeedStep; value: string }
  | { type: 'UPDATE_INGREDIENT'; field: keyof ItemStepData; value: string }
  | { type: 'UPDATE_FOOD'; field: keyof FoodStep; value: string }
  | { type: 'UPDATE_RECIPE'; field: keyof RecipeStep; value: string }
  | { type: 'SET_RECIPE_INGREDIENTS'; ingredients: AdminRecipeIngredient[] }
  | { type: 'MARK_SAVED'; which: 'seed' | 'ingredient' | 'food' | 'recipe' }
  | { type: 'SET_GENERATING'; which: 'seed' | 'ingredient' | 'food'; value: boolean }
  | { type: 'SET_IMAGE_URL'; which: 'seed' | 'ingredient' | 'food'; url: string }
  | { type: 'SYNC_DOWNSTREAM' };

function syncDownstream(s: WizardState): WizardState {
  const seedLabel = s.seed.label;
  const derivedIngLabel = deriveIngredientName(seedLabel);
  const ingLabel = s.ingredientLabelTouched ? s.ingredient.label : (derivedIngLabel || s.ingredient.label);
  const ingSlug = nameToSlug(ingLabel);

  const ingredient: ItemStepData = {
    ...s.ingredient,
    label: ingLabel,
    slug: ingSlug,
    cols: !s.ingredient.saved ? s.seed.cols : s.ingredient.cols,
    rows: !s.ingredient.saved ? s.seed.rows : s.ingredient.rows,
  };

  const recipe: RecipeStep = {
    ...s.recipe,
    label: s.recipe.label || s.food.label,
    recipeId: s.recipe.recipeId || nameToSlug(s.food.label || ''),
    ingredients: s.recipe.ingredients.length > 0
      ? s.recipe.ingredients
      : [{ itemType: ingSlug, qty: 1 }],
  };

  return { ...s, ingredient, recipe };
}

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step };

    case 'UPDATE_SEED': {
      const seed = { ...state.seed, [action.field]: action.value };
      if (action.field === 'label') seed.slug = nameToSlug(action.value);
      if (action.field === 'imagePrompt') seed.promptTouched = true;
      return syncDownstream({ ...state, seed });
    }

    case 'UPDATE_INGREDIENT': {
      const ingredient = { ...state.ingredient, [action.field]: action.value };
      if (action.field === 'label') ingredient.slug = nameToSlug(action.value);
      if (action.field === 'imagePrompt') ingredient.promptTouched = true;
      const ingredientLabelTouched = action.field === 'label' ? true : state.ingredientLabelTouched;
      return { ...state, ingredient, ingredientLabelTouched };
    }

    case 'UPDATE_FOOD': {
      const food = { ...state.food, [action.field]: action.value };
      if (action.field === 'label') food.slug = nameToSlug(action.value);
      if (action.field === 'imagePrompt') food.promptTouched = true;
      const recipe = {
        ...state.recipe,
        label: state.recipe.label === state.food.label ? action.field === 'label' ? action.value : state.recipe.label : state.recipe.label,
        recipeId: state.recipe.recipeId === nameToSlug(state.food.label) && action.field === 'label'
          ? nameToSlug(action.value) : state.recipe.recipeId,
      };
      return { ...state, food, recipe };
    }

    case 'UPDATE_RECIPE': {
      const recipe = { ...state.recipe, [action.field]: action.value };
      if (action.field === 'label') recipe.recipeId = nameToSlug(action.value);
      return { ...state, recipe };
    }

    case 'SET_RECIPE_INGREDIENTS':
      return { ...state, recipe: { ...state.recipe, ingredients: action.ingredients } };

    case 'MARK_SAVED':
      if (action.which === 'recipe') return { ...state, recipe: { ...state.recipe, saved: true } };
      return { ...state, [action.which]: { ...state[action.which], saved: true } };

    case 'SET_GENERATING':
      return { ...state, [action.which]: { ...(state[action.which] as ItemStepData), generating: action.value } };

    case 'SET_IMAGE_URL':
      return { ...state, [action.which]: { ...(state[action.which] as ItemStepData), imageUrl: action.url } };

    case 'SYNC_DOWNSTREAM':
      return syncDownstream(state);

    default:
      return state;
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useSeedWizard() {
  const router = useRouter();
  const { toast } = useToast();
  const [state, dispatch] = useReducer(wizardReducer, undefined, initialState);
  const [saving, setSaving] = useState(false);

  const effectivePrompt = useCallback(
    (which: 'seed' | 'ingredient' | 'food') => {
      const step = state[which] as ItemStepData;
      if (step.promptTouched) return step.imagePrompt;
      if (which === 'seed') return buildSeedPrompt(step.label);
      if (which === 'ingredient') return buildIngredientPrompt(step.label);
      return buildFoodPrompt(step.label);
    },
    [state],
  );

  const allItemsSaved = state.seed.saved && state.ingredient.saved && state.food.saved;

  const ingredientSlug = state.ingredient.slug || nameToSlug(deriveIngredientName(state.seed.label));

  const harvestYield = useMemo(
    () => [{ itemType: ingredientSlug, qty: 1 }],
    [ingredientSlug],
  );

  // ── Save helpers ────────────────────────────────────────────────────────

  const saveSeed = useCallback(async () => {
    const s = state.seed;
    if (!s.label.trim()) { toast('Seed label is required', 'error'); return false; }
    const growthMs = parseInt(s.growthMs, 10) || 0;
    if (growthMs <= 0) { toast('Growth time must be > 0', 'error'); return false; }
    try {
      await api.createGameItem({
        itemType: s.slug,
        label: s.label.trim(),
        emoji: '🌱',
        color: '#A8D860',
        category: 'seed',
        placeable: true,
        cols: parseInt(s.cols, 10) || 1,
        rows: parseInt(s.rows, 10) || 1,
        growthMs,
        harvestYield,
        gemsGiven: parseInt(s.gemsGiven, 10) || undefined,
        buyable: true,
        gemPrice: parseInt(s.gemPrice, 10) || 5,
        farmLevel: parseInt(s.farmLevel, 10) || 1,
      });
      dispatch({ type: 'MARK_SAVED', which: 'seed' });
      return true;
    } catch (e: any) {
      if (e?.code === 'DUPLICATE_ITEM') {
        await api.updateGameItem(s.slug, {
          label: s.label.trim(),
          cols: parseInt(s.cols, 10) || 1,
          rows: parseInt(s.rows, 10) || 1,
          growthMs,
          harvestYield,
          gemsGiven: parseInt(s.gemsGiven, 10) || undefined,
          buyable: true,
          gemPrice: parseInt(s.gemPrice, 10) || 5,
          farmLevel: parseInt(s.farmLevel, 10) || 1,
        });
        dispatch({ type: 'MARK_SAVED', which: 'seed' });
        return true;
      }
      toast(e?.message ?? 'Failed to save seed', 'error');
      return false;
    }
  }, [state.seed, harvestYield, toast]);

  const saveIngredient = useCallback(async () => {
    const ing = state.ingredient;
    const label = ing.label || deriveIngredientName(state.seed.label);
    if (!label.trim()) { toast('Ingredient label is required', 'error'); return false; }
    const slug = ing.slug || nameToSlug(label);
    try {
      await api.createGameItem({
        itemType: slug,
        label: label.trim(),
        emoji: '🥕',
        color: '#E8D44D',
        category: 'ingredient',
        placeable: false,
        cols: parseInt(ing.cols, 10) || 1,
        rows: parseInt(ing.rows, 10) || 1,
        buyable: false,
      });
      dispatch({ type: 'MARK_SAVED', which: 'ingredient' });
      return true;
    } catch (e: any) {
      if (e?.code === 'DUPLICATE_ITEM') {
        dispatch({ type: 'MARK_SAVED', which: 'ingredient' });
        return true;
      }
      toast(e?.message ?? 'Failed to save ingredient', 'error');
      return false;
    }
  }, [state.ingredient, state.seed.label, toast]);

  const saveFood = useCallback(async () => {
    const f = state.food;
    if (!f.label.trim()) { toast('Food label is required', 'error'); return false; }
    try {
      await api.createGameItem({
        itemType: f.slug,
        label: f.label.trim(),
        emoji: '🍲',
        color: '#FF9E5E',
        category: 'food',
        placeable: true,
        cols: 1,
        rows: 1,
        buyable: false,
        foodHunger: parseInt(f.foodHunger, 10) || 20,
        foodHappiness: parseInt(f.foodHappiness, 10) || 10,
        foodPetXp: parseInt(f.foodPetXp, 10) || 10,
      });
      dispatch({ type: 'MARK_SAVED', which: 'food' });
      return true;
    } catch (e: any) {
      if (e?.code === 'DUPLICATE_ITEM') {
        await api.updateGameItem(f.slug, {
          label: f.label.trim(),
          placeable: true,
          foodHunger: parseInt(f.foodHunger, 10) || 20,
          foodHappiness: parseInt(f.foodHappiness, 10) || 10,
          foodPetXp: parseInt(f.foodPetXp, 10) || 10,
        });
        dispatch({ type: 'MARK_SAVED', which: 'food' });
        return true;
      }
      toast(e?.message ?? 'Failed to save food', 'error');
      return false;
    }
  }, [state.food, toast]);

  const saveRecipe = useCallback(async () => {
    const r = state.recipe;
    if (!r.label.trim()) { toast('Recipe label is required', 'error'); return false; }
    if (r.ingredients.length === 0 || r.ingredients.some((i) => !i.itemType)) {
      toast('At least one ingredient is required', 'error');
      return false;
    }
    try {
      await api.createAdminRecipe({
        recipeId: r.recipeId || nameToSlug(r.label),
        label: r.label.trim(),
        resultItemType: state.food.slug,
        resultQty: 1,
        difficulty: parseInt(r.difficulty, 10) || 1,
        ingredients: r.ingredients.filter((i) => i.itemType.trim()),
      });
      dispatch({ type: 'MARK_SAVED', which: 'recipe' });
      return true;
    } catch (e: any) {
      toast(e?.message ?? 'Failed to save recipe', 'error');
      return false;
    }
  }, [state.recipe, state.food.slug, toast]);

  const SAVE_FNS = useMemo(() => [saveSeed, saveIngredient, saveFood, saveRecipe], [saveSeed, saveIngredient, saveFood, saveRecipe]);

  // ── Navigation ──────────────────────────────────────────────────────────

  const saveCurrentStep = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    const ok = await SAVE_FNS[state.step]();
    setSaving(false);
    return ok;
  }, [state.step, SAVE_FNS]);

  // ── Image gen ───────────────────────────────────────────────────────────

  const resolveSlug = useCallback((which: 'seed' | 'ingredient' | 'food') => {
    const stepData = state[which] as ItemStepData;
    return which === 'ingredient'
      ? (stepData.slug || nameToSlug(deriveIngredientName(state.seed.label)))
      : stepData.slug;
  }, [state]);

  const saveAndContinue = useCallback(async () => {
    const ok = await saveCurrentStep();
    if (ok) {
      if (state.step < 3) {
        dispatch({ type: 'SET_STEP', step: state.step + 1 });
        dispatch({ type: 'SYNC_DOWNSTREAM' });
      } else {
        toast('Seed pipeline complete! Generating images...', 'success');
        const items: ('seed' | 'ingredient' | 'food')[] = ['seed', 'ingredient', 'food'];
        for (const w of items) dispatch({ type: 'SET_GENERATING', which: w, value: true });
        Promise.allSettled(
          items.map(async (which) => {
            const slug = resolveSlug(which);
            const result = await api.generateGameItemImage(slug, effectivePrompt(which));
            dispatch({ type: 'SET_IMAGE_URL', which, url: result.imageUrl });
          }),
        ).then((results) => {
          const failed = results.filter((r) => r.status === 'rejected').length;
          if (failed > 0) toast(`${failed} image(s) failed`, 'error');
          else toast('All images generated!', 'success');
        });
        router.back();
      }
    }
  }, [saveCurrentStep, state.step, resolveSlug, effectivePrompt, toast, router]);

  const saveAndExit = useCallback(async () => {
    const ok = await saveCurrentStep();
    if (ok) {
      toast('Saved!', 'success');
      router.back();
    }
  }, [saveCurrentStep, toast, router]);

  const goBack = useCallback(() => {
    if (state.step > 0) dispatch({ type: 'SET_STEP', step: state.step - 1 });
    else router.back();
  }, [state.step, router]);

  const generateImage = useCallback(async (which: 'seed' | 'ingredient' | 'food') => {
    const slug = resolveSlug(which);
    if (!slug) { toast('Save the item first', 'error'); return; }
    dispatch({ type: 'SET_GENERATING', which, value: true });
    try {
      const result = await api.generateGameItemImage(slug, effectivePrompt(which));
      dispatch({ type: 'SET_IMAGE_URL', which, url: result.imageUrl });
      toast(`${(state[which] as ItemStepData).label || which} image generated!`, 'success');
    } catch (e: any) {
      toast(e?.message ?? 'Image generation failed', 'error');
    } finally {
      dispatch({ type: 'SET_GENERATING', which, value: false });
    }
  }, [state, resolveSlug, effectivePrompt, toast]);

  const generateAllImages = useCallback(async () => {
    if (!allItemsSaved) { toast('Save all items first', 'error'); return; }
    const items: ('seed' | 'ingredient' | 'food')[] = ['seed', 'ingredient', 'food'];
    for (const w of items) dispatch({ type: 'SET_GENERATING', which: w, value: true });
    const results = await Promise.allSettled(
      items.map(async (which) => {
        const slug = resolveSlug(which);
        const result = await api.generateGameItemImage(slug, effectivePrompt(which));
        dispatch({ type: 'SET_IMAGE_URL', which, url: result.imageUrl });
        return which;
      }),
    );
    for (const w of items) dispatch({ type: 'SET_GENERATING', which: w, value: false });
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) toast(`${failed} image(s) failed`, 'error');
    else toast('All images generated!', 'success');
  }, [allItemsSaved, resolveSlug, effectivePrompt, toast]);

  // ── Field setters ──────────────────────────────────────────────────────

  const updateSeed = useCallback((field: keyof SeedStep, value: string) => {
    dispatch({ type: 'UPDATE_SEED', field, value });
  }, []);

  const updateIngredient = useCallback((field: keyof ItemStepData, value: string) => {
    dispatch({ type: 'UPDATE_INGREDIENT', field, value });
  }, []);

  const updateFood = useCallback((field: keyof FoodStep, value: string) => {
    dispatch({ type: 'UPDATE_FOOD', field, value });
  }, []);

  const updateRecipe = useCallback((field: keyof RecipeStep, value: string) => {
    dispatch({ type: 'UPDATE_RECIPE', field, value });
  }, []);

  const setRecipeIngredients = useCallback((ingredients: AdminRecipeIngredient[]) => {
    dispatch({ type: 'SET_RECIPE_INGREDIENTS', ingredients });
  }, []);

  const stepLabels = ['Seed', 'Ingredient', 'Food', 'Recipe'] as const;

  return {
    state,
    stepLabels,
    saving,
    allItemsSaved,
    effectivePrompt,
    updateSeed,
    updateIngredient,
    updateFood,
    updateRecipe,
    setRecipeIngredients,
    saveAndContinue,
    saveAndExit,
    goBack,
    generateImage,
    generateAllImages,
  };
}
