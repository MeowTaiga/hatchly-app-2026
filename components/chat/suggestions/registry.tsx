/**
 * Registry of suggestion components. Add new entries here to extend.
 * Maps component id -> icon and accent color.
 */
import { Ionicons } from '@expo/vector-icons';

export interface SuggestionConfig {
  icon: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
}

export const SUGGESTION_CONFIG: Record<string, SuggestionConfig> = {
  stretch: { icon: 'body-outline', accentColor: '#A78BFA' },
  walk: { icon: 'walk-outline', accentColor: '#6EE7B7' },
  zen: { icon: 'flower-outline', accentColor: '#67E8F9' },
  music: { icon: 'musical-notes-outline', accentColor: '#FBBF24' },
  bake: { icon: 'restaurant-outline', accentColor: '#F97316' },
  journal: { icon: 'book-outline', accentColor: '#8B5CF6' },
  call_friend: { icon: 'call-outline', accentColor: '#34D399' },
  read: { icon: 'library-outline', accentColor: '#6366F1' },
  breathe: { icon: 'leaf-outline', accentColor: '#67E8F9' },
  water: { icon: 'water-outline', accentColor: '#60A5FA' },
  gratitude: { icon: 'heart-outline', accentColor: '#F472B6' },
};
