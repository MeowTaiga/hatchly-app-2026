import type { FoodDetail, FoodServing } from '@/lib/api';
import { NUTRIENT_KEYS, type NutrientKey } from '@/lib/nutrients';

export interface CustomFoodDraft {
  name: string;
  brand: string;
  servingDescription: string;
  calories: string;
  nutrients: Record<NutrientKey, string>;
}

const emptyNutrients = (): Record<NutrientKey, string> =>
  Object.fromEntries(NUTRIENT_KEYS.map((key) => [key, ''])) as Record<NutrientKey, string>;

export function emptyCustomDraft(): CustomFoodDraft {
  return {
    name: '',
    brand: '',
    servingDescription: '1 serving',
    calories: '',
    nutrients: emptyNutrients(),
  };
}

function field(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return '';
  return String(value);
}

export function draftFromFood(food: FoodDetail): CustomFoodDraft {
  const serving = food.servings[0];
  const nutrients = emptyNutrients();
  if (serving) {
    for (const key of NUTRIENT_KEYS) {
      nutrients[key] = field(serving[key]);
    }
  }
  return {
    name: food.name ?? '',
    brand: food.brand ?? '',
    servingDescription: serving?.description || '1 serving',
    calories: field(serving?.calories),
    nutrients,
  };
}

function parseAmount(value: string): number {
  const n = parseFloat(value.replace(/,/g, '').trim());
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function draftToFood(draft: CustomFoodDraft, foodId?: string): FoodDetail {
  const serving: FoodServing = {
    servingId: 'custom-serving',
    description: draft.servingDescription.trim() || '1 serving',
    calories: parseAmount(draft.calories),
    protein: parseAmount(draft.nutrients.protein),
    fat: parseAmount(draft.nutrients.fat),
    carbs: parseAmount(draft.nutrients.carbs),
  };
  for (const key of NUTRIENT_KEYS) {
    if (key === 'protein' || key === 'fat' || key === 'carbs') continue;
    const n = parseAmount(draft.nutrients[key]);
    if (n > 0) serving[key] = n;
  }
  return {
    foodId: foodId || `custom-${Date.now()}`,
    name: draft.name.trim() || 'Custom food',
    ...(draft.brand.trim() ? { brand: draft.brand.trim() } : {}),
    servings: [serving],
  };
}

export function isCustomDraftReady(draft: CustomFoodDraft): boolean {
  return draft.name.trim().length > 0 && Number.isFinite(parseFloat(draft.calories));
}
