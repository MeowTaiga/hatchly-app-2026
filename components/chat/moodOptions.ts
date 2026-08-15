/** Mood options for diary check-ins. Must match backend MOOD_OPTIONS. */
export const MOOD_OPTIONS = [
  { id: 'great' as const, emoji: '😄', label: 'Great' },
  { id: 'good' as const, emoji: '🙂', label: 'Good' },
  { id: 'okay' as const, emoji: '😐', label: 'Okay' },
  { id: 'meh' as const, emoji: '😕', label: 'Meh' },
  { id: 'down' as const, emoji: '😢', label: 'Down' },
  { id: 'anxious' as const, emoji: '😰', label: 'Anxious' },
  { id: 'excited' as const, emoji: '🤩', label: 'Excited' },
] as const;

export type MoodId = (typeof MOOD_OPTIONS)[number]['id'];
