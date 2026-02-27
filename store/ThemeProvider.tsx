import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { AppTheme, ThemeMode } from '@/constants/theme';
import { darkTheme, lightTheme } from '@/constants/theme';
import { useAuth } from '@/store/AuthProvider';
import { api } from '@/lib/api';
import { deriveThemeFromAccent } from '@/utils/colorUtils';
import {
  DEFAULT_ACCENT_HEX,
  getAccentHexOrDefault,
} from '@/constants/accentColors';

const ACCENT_KEY = 'hatchly_accent_color';
const THEME_KEY = 'hatchly_theme_mode';

function isValidThemeMode(v: string): v is ThemeMode {
  return v === 'light' || v === 'dark';
}

interface ThemeContextValue {
  theme: AppTheme;
  themeMode: ThemeMode;
  accentColor: string;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setAccentColor: (hex: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, mergeUserFromApi } = useAuth();
  const deviceScheme = useColorScheme();
  const [localAccentColor, setLocalAccentColor] = useState<string>(DEFAULT_ACCENT_HEX);
  const [localThemeMode, setLocalThemeMode] = useState<ThemeMode | null>(null);

  const themeMode: ThemeMode = useMemo(() => {
    if (localThemeMode) return localThemeMode;
    if (isAuthenticated && user?.theme && isValidThemeMode(user.theme)) {
      return user.theme;
    }
    return (deviceScheme === 'dark' ? 'dark' : 'light') as ThemeMode;
  }, [localThemeMode, isAuthenticated, user?.theme, deviceScheme]);

  useEffect(() => {
    SecureStore.getItemAsync(ACCENT_KEY).then((stored) => {
      if (stored) setLocalAccentColor(getAccentHexOrDefault(stored));
    });
    SecureStore.getItemAsync(THEME_KEY).then((stored) => {
      if (stored && isValidThemeMode(stored)) {
        setLocalThemeMode(stored as ThemeMode);
      }
    });
  }, []);

  const accentColor = useMemo(() => {
    if (isAuthenticated && user?.accentColor) {
      return getAccentHexOrDefault(user.accentColor);
    }
    return getAccentHexOrDefault(localAccentColor);
  }, [isAuthenticated, user?.accentColor, localAccentColor]);

  const setThemeMode = useCallback(
    async (mode: ThemeMode) => {
      setLocalThemeMode(mode);
      SecureStore.setItemAsync(THEME_KEY, mode); // fire-and-forget

      if (isAuthenticated) {
        try {
          const updated = await api.updateProfile({ theme: mode });
          await mergeUserFromApi(updated);
        } catch {
          // Offline or error — UI stays unchanged; next refresh will sync
        }
      }
    },
    [isAuthenticated, mergeUserFromApi],
  );

  const setAccentColor = useCallback(
    async (hex: string) => {
      const validHex = getAccentHexOrDefault(hex);
      if (isAuthenticated) {
        try {
          const updated = await api.updateProfile({ accentColor: validHex });
          await mergeUserFromApi(updated);
        } catch {
          // Offline or error — UI stays unchanged
        }
      } else {
        setLocalAccentColor(validHex);
        await SecureStore.setItemAsync(ACCENT_KEY, validHex);
      }
    },
    [isAuthenticated, mergeUserFromApi],
  );

  const theme = useMemo(() => {
    const baseTheme = themeMode === 'dark' ? darkTheme : lightTheme;
    const overrides = deriveThemeFromAccent(accentColor, themeMode);

    const mergedColors = { ...baseTheme.colors, ...overrides.colors };
    const mergedGradients = { ...baseTheme.gradients, ...overrides.gradients };
    const mergedBubbleColors = overrides.bubbleColors ?? baseTheme.bubbleColors;

    return {
      ...baseTheme,
      colors: mergedColors,
      gradients: mergedGradients,
      bubbleColors: mergedBubbleColors,
      typography: baseTheme.typography,
    } as AppTheme;
  }, [themeMode, accentColor]);

  const value: ThemeContextValue = {
    theme,
    themeMode,
    accentColor,
    setThemeMode,
    setAccentColor,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

/** Returns colors, gradients, shadows, typography for convenience. */
export function useThemeColors() {
  const { theme } = useTheme();
  return {
    colors: theme.colors,
    gradients: theme.gradients,
    shadows: theme.shadows,
    typography: theme.typography,
  };
}
