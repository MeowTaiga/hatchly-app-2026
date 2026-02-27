import { Ionicons } from '@expo/vector-icons';
import type { MealType } from './api';

export const MEAL_META: Record<
  MealType,
  { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }
> = {
  breakfast: { icon: 'sunny-outline', label: 'Breakfast', color: '#F59E0B' },
  lunch: { icon: 'restaurant-outline', label: 'Lunch', color: '#10B981' },
  dinner: { icon: 'moon-outline', label: 'Dinner', color: '#6366F1' },
  snack: { icon: 'cafe-outline', label: 'Snack', color: '#EF4444' },
};

export const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
