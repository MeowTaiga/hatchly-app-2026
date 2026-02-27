/**
 * Color utilities for deriving theme colors from a base accent hex.
 */

export type ThemeMode = 'light' | 'dark';

function parseHex(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace(/^#/, '');
  const num = parseInt(clean, 16);
  if (isNaN(num) || clean.length !== 6) {
    return { r: 255, g: 107, b: 157 }; // fallback pink
  }
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return '#' + [r, g, b].map((c) => clamp(c).toString(16).padStart(2, '0')).join('');
}

/**
 * Lighten a hex color by a percentage (0–100).
 */
export function lightenHex(hex: string, percent: number): string {
  const { r, g, b } = parseHex(hex);
  const amt = Math.round(2.55 * percent);
  return toHex(r + amt, g + amt, b + amt);
}

/**
 * Darken a hex color by a percentage (0–100).
 */
export function darkenHex(hex: string, percent: number): string {
  const { r, g, b } = parseHex(hex);
  const amt = Math.round(2.55 * percent);
  return toHex(r - amt, g - amt, b - amt);
}

/** Returns true if hex is perceptually dark (luminance < 0.5). */
export function isHexDark(hex: string): boolean {
  const { r, g, b } = parseHex(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance < 0.5;
}

/**
 * Convert hex to rgba string.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Blend accent into base by amount (0–1). Very low values (0.01–0.03) for subtle tint. */
function blendHex(base: string, accent: string, amount: number): string {
  const b = parseHex(base);
  const a = parseHex(accent);
  const r = b.r + (a.r - b.r) * amount;
  const g = b.g + (a.g - b.g) * amount;
  const bl = b.b + (a.b - b.b) * amount;
  return toHex(r, g, bl);
}

export interface DerivedThemeOverrides {
  colors: Partial<{ primary: string; primaryLight: string; primaryDark: string; primaryText: string; borderFocused: string }>;
  gradients: Partial<{
    primary: readonly [string, string];
    background: readonly [string, string, ...string[]];
  }>;
  bubbleColors: readonly string[];
}

/**
 * Derive theme overrides from a base accent hex.
 * Returns partial overrides to merge with lightTheme/darkTheme.
 */
export function deriveThemeFromAccent(
  baseHex: string,
  themeMode: ThemeMode,
): DerivedThemeOverrides {
  const primary = baseHex;
  const primaryLight = lightenHex(baseHex, 12);
  const primaryDark = darkenHex(baseHex, 12);

  // primaryText: for text on light/neutral backgrounds (pastels need darkening). For text ON accent surfaces, use onPrimary when accent is dark.
  const primaryText = themeMode === 'light' ? darkenHex(baseHex, 40) : primary;

  const colors = {
    primary,
    primaryLight,
    primaryDark,
    primaryText,
    borderFocused: primary,
  };

  const accentBubbles = [
    hexToRgba(baseHex, 0.06),
    hexToRgba(primaryLight, 0.04),
  ] as const;

  const secondaryBubbles = [
    'rgba(192, 132, 252, 0.05)',
    'rgba(103, 232, 249, 0.05)',
    'rgba(110, 231, 183, 0.05)',
  ] as const;

  // Neutral bases + subtle accent tint so user's color shows (not pink)
  const gradients = {
    primary: themeMode === 'dark'
      ? ([primary, primaryDark] as const)
      : ([primary, primaryLight] as const),
  };

  if (themeMode === 'light') {
    // Neutral off-white bases; very subtle accent (1–1.5%)
    const t1 = blendHex('#FFFBFB', baseHex, 0.01);
    const t2 = blendHex('#FAFAFA', baseHex, 0.015);
    const t3 = blendHex('#F5F5F5', baseHex, 0.01);
    return {
      colors,
      gradients: {
        ...gradients,
        background: [t1, t2, t3, t1] as const,
      },
      bubbleColors: [...accentBubbles, ...secondaryBubbles],
    };
  }

  // Neutral dark bases; very subtle accent (1–1.5%)
  const darkBase = '#0D0D0F';
  const d1 = blendHex('#0E0E0F', baseHex, 0.01);
  const d2 = blendHex('#101010', baseHex, 0.015);
  return {
    colors,
    gradients: {
      ...gradients,
      background: [darkBase, d1, darkBase, d2] as const,
    },
    bubbleColors: [
      ...accentBubbles,
      hexToRgba(primaryDark, 0.04),
      ...secondaryBubbles,
    ],
  };
}
