// ─── Achievement Visual Definitions ─────────────────────────────────────────
//
// Maps each backend achievement ID to its frontend visual representation.
// Icons use Ionicons names. Colors define the badge gradient + glow.
// ─────────────────────────────────────────────────────────────────────────────

export interface AchievementVisual {
  /** Ionicons icon name */
  icon: string;
  /** Emoji fallback (shown in badge center) */
  emoji: string;
  /** Primary gradient color */
  color: string;
  /** Secondary gradient color */
  colorLight: string;
  /** Glow / ray color */
  glowColor: string;
}

const food = (emoji: string, color = '#FF6B9D', colorLight = '#FFB8D4', glowColor = '#FF6B9D'): AchievementVisual => ({
  icon: 'restaurant-outline',
  emoji,
  color,
  colorLight,
  glowColor,
});

const water = (emoji: string, color = '#60A5FA', colorLight = '#93C5FD', glowColor = '#60A5FA'): AchievementVisual => ({
  icon: 'water-outline',
  emoji,
  color,
  colorLight,
  glowColor,
});

const weight = (emoji: string, color = '#C084FC', colorLight = '#DDB4FE', glowColor = '#C084FC'): AchievementVisual => ({
  icon: 'scale-outline',
  emoji,
  color,
  colorLight,
  glowColor,
});

export const ACHIEVEMENT_VISUALS: Record<string, AchievementVisual> = {
  // ── Food ──────────────────────────────────────────────────────────────
  FIRST_FOOD_LOG:  food('🍎'),
  FOOD_LOGS_10:    food('🥗', '#34D399', '#6EE7B7', '#34D399'),
  FOOD_LOGS_50:    food('📋', '#F59E0B', '#FCD34D', '#F59E0B'),
  FOOD_LOGS_100:   food('💯', '#EF4444', '#FCA5A5', '#EF4444'),
  FOOD_LOGS_250:   food('🏅', '#8B5CF6', '#C4B5FD', '#8B5CF6'),
  FOOD_LOGS_500:   food('📖', '#EC4899', '#F9A8D4', '#EC4899'),
  FOOD_LOGS_1000:  food('🏆', '#F59E0B', '#FDE68A', '#F59E0B'),

  // ── Water ─────────────────────────────────────────────────────────────
  FIRST_WATER_LOG: water('💧'),
  WATER_LOGS_10:   water('🚰', '#3B82F6', '#93C5FD', '#3B82F6'),
  WATER_LOGS_50:   water('🌊', '#0EA5E9', '#7DD3FC', '#0EA5E9'),
  WATER_LOGS_100:  water('💦', '#06B6D4', '#67E8F9', '#06B6D4'),
  WATER_LOGS_500:  water('🏊', '#0284C7', '#38BDF8', '#0284C7'),

  // ── Weight ────────────────────────────────────────────────────────────
  FIRST_WEIGHT_LOG: weight('⚖️'),
  WEIGHT_LOGS_7:    weight('📊', '#A855F7', '#D8B4FE', '#A855F7'),
  WEIGHT_LOGS_30:   weight('📈', '#7C3AED', '#C4B5FD', '#7C3AED'),
  WEIGHT_LOGS_100:  weight('🎯', '#6D28D9', '#A78BFA', '#6D28D9'),
};

/** Get visuals for an achievement, with a sensible fallback */
export function getAchievementVisual(achievementId: string): AchievementVisual {
  return ACHIEVEMENT_VISUALS[achievementId] ?? {
    icon: 'trophy-outline',
    emoji: '🏅',
    color: '#F59E0B',
    colorLight: '#FCD34D',
    glowColor: '#F59E0B',
  };
}
