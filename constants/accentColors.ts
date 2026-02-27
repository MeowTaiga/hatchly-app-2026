/**
 * Curated accent color palette for theme picker.
 * Sections: pastel, light, creamy, vibrant, dark.
 * Colors ordered by hue (red → orange → yellow → green → cyan → blue → violet → pink).
 */

export type AccentColorSectionId = 'pastel' | 'light' | 'creamy' | 'vibrant' | 'dark';

export interface AccentColorOption {
  id: string;
  hex: string;
  label?: string;
}

export interface AccentColorSection {
  id: AccentColorSectionId;
  title: string;
  colors: readonly AccentColorOption[];
}

export const DEFAULT_ACCENT_HEX = '#FF6B9D';

// ─── Pastel (soft, muted) ───────────────────────────────────────────────────
const PASTEL: AccentColorSection = {
  id: 'pastel',
  title: 'Pastel',
  colors: [
    { id: 'pastel-rose', hex: '#FECDD3' },
    { id: 'pastel-pink', hex: '#FFB3D9' },
    { id: 'pastel-peach', hex: '#FED7AA' },
    { id: 'pastel-apricot', hex: '#FFE4C4' },
    { id: 'pastel-mint', hex: '#A7F3D0' },
    { id: 'pastel-sage', hex: '#BBF7D0' },
    { id: 'pastel-teal', hex: '#99F6E4' },
    { id: 'pastel-sky', hex: '#BAE6FD' },
    { id: 'pastel-lavender', hex: '#C4B5FD' },
    { id: 'pastel-violet', hex: '#DDD6FE' },
  ],
};

// ─── Light (airy, delicate) ─────────────────────────────────────────────────
const LIGHT: AccentColorSection = {
  id: 'light',
  title: 'Light',
  colors: [
    { id: 'light-coral', hex: '#FDA4AF' },
    { id: 'light-pink', hex: '#F9A8D4' },
    { id: 'light-salmon', hex: '#FBCFE8' },
    { id: 'light-peach', hex: '#FDBA74' },
    { id: 'light-amber', hex: '#FDE047' },
    { id: 'light-lime', hex: '#BEF264' },
    { id: 'light-green', hex: '#86EFAC' },
    { id: 'light-emerald', hex: '#6EE7B7' },
    { id: 'light-cyan', hex: '#67E8F9' },
    { id: 'light-blue', hex: '#7DD3FC' },
    { id: 'light-indigo', hex: '#A5B4FC' },
    { id: 'light-purple', hex: '#C4B5FD' },
  ],
};

// ─── Creamy (warm, soft neutrals) ───────────────────────────────────────────
const CREAMY: AccentColorSection = {
  id: 'creamy',
  title: 'Creamy',
  colors: [
    { id: 'cream-blush', hex: '#F5D0C5' },
    { id: 'cream-rose', hex: '#E8C4C0' },
    { id: 'cream-peach', hex: '#E8D5C4' },
    { id: 'cream-sand', hex: '#E8DCC4' },
    { id: 'cream-honey', hex: '#E8E0C4' },
    { id: 'cream-sage', hex: '#D4E8C4' },
    { id: 'cream-mint', hex: '#C4E8D8' },
    { id: 'cream-sky', hex: '#C4D8E8' },
    { id: 'cream-lavender', hex: '#D4C4E8' },
  ],
};

// ─── Vibrant (saturated, bold) ──────────────────────────────────────────────
const VIBRANT: AccentColorSection = {
  id: 'vibrant',
  title: 'Vibrant',
  colors: [
    { id: 'vib-red', hex: '#EF4444' },
    { id: 'vib-rose', hex: '#F43F5E' },
    { id: 'vib-pink', hex: '#FF6B9D' },
    { id: 'vib-coral', hex: '#FF7F6B' },
    { id: 'vib-orange', hex: '#F97316' },
    { id: 'vib-amber', hex: '#F59E0B' },
    { id: 'vib-lime', hex: '#84CC16' },
    { id: 'vib-green', hex: '#22C55E' },
    { id: 'vib-emerald', hex: '#10B981' },
    { id: 'vib-teal', hex: '#14B8A6' },
    { id: 'vib-cyan', hex: '#06B6D4' },
    { id: 'vib-sky', hex: '#0EA5E9' },
    { id: 'vib-blue', hex: '#3B82F6' },
    { id: 'vib-indigo', hex: '#6366F1' },
    { id: 'vib-violet', hex: '#8B5CF6' },
    { id: 'vib-purple', hex: '#A855F7' },
    { id: 'vib-fuchsia', hex: '#D946EF' },
  ],
};

// ─── Dark (deep, rich) ──────────────────────────────────────────────────────
const DARK: AccentColorSection = {
  id: 'dark',
  title: 'Dark',
  colors: [
    { id: 'dark-red', hex: '#B91C1C' },
    { id: 'dark-rose', hex: '#BE123C' },
    { id: 'dark-wine', hex: '#881337' },
    { id: 'dark-burgundy', hex: '#701A75' },
    { id: 'dark-violet', hex: '#5B21B6' },
    { id: 'dark-indigo', hex: '#3730A3' },
    { id: 'dark-navy', hex: '#1E3A8A' },
    { id: 'dark-blue', hex: '#1D4ED8' },
    { id: 'dark-teal', hex: '#0F766E' },
    { id: 'dark-emerald', hex: '#047857' },
    { id: 'dark-forest', hex: '#166534' },
    { id: 'dark-olive', hex: '#4D7C0F' },
    { id: 'dark-amber', hex: '#B45309' },
    { id: 'dark-slate', hex: '#475569' },
  ],
};

export const ACCENT_COLOR_SECTIONS: readonly AccentColorSection[] = [
  PASTEL,
  LIGHT,
  CREAMY,
  VIBRANT,
  DARK,
];

/** Flat list of all colors (for backward compatibility). */
export const ACCENT_COLORS = ACCENT_COLOR_SECTIONS.flatMap((s) => s.colors);

export function isValidAccentHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

export function getAccentHexOrDefault(hex: string | undefined): string {
  if (!hex || !isValidAccentHex(hex)) return DEFAULT_ACCENT_HEX;
  return hex;
}
