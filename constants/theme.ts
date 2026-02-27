import { Platform } from 'react-native';

// ─── Theme Mode ──────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark';

/**
 * Returns a text color with sufficient contrast.
 * In light mode, nutrient colors (e.g. #67E8F9) on light backgrounds have low contrast;
 * use the theme text color instead. In dark mode, the accent color is fine.
 */
export function getMacroLabelColor(
  nutrientColor: string,
  themeMode: ThemeMode,
  colors: { text: string; textSecondary: string },
): string {
  return themeMode === 'light' ? colors.text : nutrientColor;
}

// ─── Color Palettes ──────────────────────────────────────────────────────────

export interface ColorPalette {
  primary: string;
  heroBarBackground?: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  accent: string;
  accentLight: string;
  success: string;
  successDark: string;
  error: string;
  errorDark: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  border: string;
  borderFocused: string;
  overlay: string;
  transparent: string;
  adminAccent?: string;
  /** Text/icon color on primary-colored backgrounds (e.g. primary button) */
  onPrimary?: string;
  /** Gem/currency number color — farm pastel brown */
  gemColor?: string;
  /** Accent-colored text on light backgrounds — darkened for contrast. Use for labels, icons on light surfaces. */
  primaryText?: string;
}

const lightColors: ColorPalette = {
  primary: '#FF6B9D',
  primaryLight: '#FF9DC2',
  primaryDark: '#E8457A',
  secondary: '#C084FC',
  secondaryLight: '#DDB4FE',
  accent: '#67E8F9',
  accentLight: '#A5F3FC',
  success: '#6EE7B7',
  successDark: '#34D399',
  error: '#FB7185',
  errorDark: '#F43F5E',
  background: '#FFF5F9',
  heroBarBackground: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceElevated: '#FFF0F5',
  text: '#2D1B4E',
  textSecondary: '#6B5080',
  textMuted: '#A78BBA',
  textInverse: '#FFFFFF',
  border: '#F3E4F0',
  borderFocused: '#FF6B9D',
  overlay: 'rgba(45, 27, 78, 0.4)',
  transparent: 'transparent',
  adminAccent: '#5856D6',
  onPrimary: '#FFFFFF',
  gemColor: '#B8956B',
};

const darkColors: ColorPalette = {
  primary: '#FF6B9D',
  primaryLight: '#FF9DC2',
  primaryDark: '#E8457A',
  secondary: '#C084FC',
  secondaryLight: '#DDB4FE',
  accent: '#67E8F9',
  accentLight: '#A5F3FC',
  success: '#6EE7B7',
  successDark: '#34D399',
  error: '#FF6961',
  errorDark: '#F43F5E',
  background: '#0D0D0F',
  heroBarBackground: '#121214',
  surface: '#1C1C1E',
  surfaceElevated: '#2C2C2E',
  text: '#F2F2F7',
  textSecondary: '#AEAEB2',
  textMuted: '#8E8E93',
  textInverse: '#1C1C1E',
  border: '#38383A',
  borderFocused: '#FF6B9D',
  overlay: 'rgba(0, 0, 0, 0.6)',
  transparent: 'transparent',
  adminAccent: '#5E5CE6',
  onPrimary: '#FFFFFF',
  gemColor: '#C4A484',
};

// ─── Gradient Presets ────────────────────────────────────────────────────────

export interface GradientPalette {
  primary: readonly [string, string];
  background: readonly [string, string, ...string[]];
  card: readonly [string, string];
  cool: readonly [string, string];
  dreamy: readonly [string, string, string, string];
}

const lightGradients: GradientPalette = {
  primary: ['#FF6B9D', '#FF9DC2'],
  background: ['#FFF5F9', '#FDE8F0', '#F3E4F7', '#FFF5F9'],
  card: ['#FFFFFF', '#FFF5F9'],
  cool: ['#C084FC', '#67E8F9'],
  dreamy: ['#FFF0F6', '#F5E6FF', '#E8F4FD', '#FFF0F6'],
};

const darkGradients: GradientPalette = {
  primary: ['#FF6B9D', '#E8457A'],
  background: ['#0D0D0F', '#120D11', '#0D0D0F', '#120D11'],
  card: ['#1C1C1E', '#1E1A1D'],
  cool: ['#C084FC', '#67E8F9'],
  dreamy: ['#0D0D0F', '#140E12', '#0D0D0F', '#130D11'],
};

// ─── Shadow Presets ──────────────────────────────────────────────────────────

export interface ShadowPalette {
  sm: { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number; elevation: number };
  md: { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number; elevation: number };
  lg: { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number; elevation: number };
}

const lightShadows: ShadowPalette = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
};

const darkShadows: ShadowPalette = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 8 },
};

// ─── Full Theme Objects ──────────────────────────────────────────────────────

export interface AppTheme {
  colors: ColorPalette;
  gradients: GradientPalette;
  shadows: ShadowPalette;
  typography: TypographyWithColors;
  /** rgba strings for FloatingBubbles */
  bubbleColors: readonly string[];
}

export interface TypographyStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: '400' | '600' | '700' | '800';
  lineHeight: number;
  color: string;
}

export interface TypographyWithColors {
  hero: TypographyStyle;
  title: TypographyStyle;
  subtitle: TypographyStyle;
  body: TypographyStyle;
  label: TypographyStyle;
  caption: TypographyStyle;
  button: TypographyStyle;
}

const fontFamily = Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }) ?? 'System';

function makeTypography(colors: ColorPalette): TypographyWithColors {
  return {
    hero: { fontFamily, fontSize: 34, fontWeight: '800', lineHeight: 40, color: colors.text },
    title: { fontFamily, fontSize: 26, fontWeight: '700', lineHeight: 32, color: colors.text },
    subtitle: { fontFamily, fontSize: 16, fontWeight: '400', lineHeight: 22, color: colors.textSecondary },
    body: { fontFamily, fontSize: 16, fontWeight: '400', lineHeight: 24, color: colors.text },
    label: { fontFamily, fontSize: 17, fontWeight: '600', lineHeight: 22, color: colors.text },
    caption: { fontFamily, fontSize: 13, fontWeight: '400', lineHeight: 18, color: colors.textMuted },
    button: { fontFamily, fontSize: 17, fontWeight: '700', lineHeight: 22, color: colors.onPrimary ?? colors.textInverse },
  };
}

const lightBubbleColors = [
  'rgba(255, 107, 157, 0.06)',
  'rgba(192, 132, 252, 0.05)',
  'rgba(103, 232, 249, 0.05)',
  'rgba(255, 157, 194, 0.04)',
  'rgba(221, 180, 254, 0.04)',
  'rgba(110, 231, 183, 0.05)',
] as const;

const darkBubbleColors = [
  'rgba(255, 107, 157, 0.06)',
  'rgba(192, 132, 252, 0.05)',
  'rgba(103, 232, 249, 0.04)',
  'rgba(255, 157, 194, 0.04)',
  'rgba(221, 180, 254, 0.03)',
  'rgba(110, 231, 183, 0.05)',
] as const;

export const lightTheme: AppTheme = {
  colors: lightColors,
  gradients: lightGradients,
  shadows: lightShadows,
  typography: makeTypography(lightColors),
  bubbleColors: lightBubbleColors,
};

export const darkTheme: AppTheme = {
  colors: darkColors,
  gradients: darkGradients,
  shadows: darkShadows,
  typography: makeTypography(darkColors),
  bubbleColors: darkBubbleColors,
};

// ─── Shared (mode-agnostic) ─────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

// ─── Legacy exports (for gradual migration) ─────────────────────────────────
// Components still importing these get light theme until migrated.

export const colors = lightColors;
export const gradients = lightGradients;
export const shadows = lightShadows;
export const typography = lightTheme.typography;
