import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutDown,
  LinearTransition,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/ThemeProvider';
import type { AppTheme } from '@/constants/theme';
import { radius } from '@/constants/theme';

// ─── Types ───────────────────────────────────────────────────────────────────

type ToastVariant = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  /** Show a toast message. Auto-dismisses after 3 seconds. */
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Access the global toast API. Must be used inside `<ToastProvider>`. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

// ─── Variant Styles (theme-aware) ────────────────────────────────────────────

function getVariantConfig(theme: AppTheme, themeMode: 'light' | 'dark'): Record<ToastVariant, { bg: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string }> {
  const isDark = themeMode === 'dark';
  return {
    success: {
      bg: isDark ? 'rgba(48,209,88,0.2)' : 'rgba(48,209,88,0.15)',
      icon: 'checkmark-circle',
      iconColor: theme.colors.success,
    },
    error: {
      bg: isDark ? 'rgba(255,69,58,0.2)' : 'rgba(255,69,58,0.12)',
      icon: 'alert-circle',
      iconColor: theme.colors.error,
    },
    info: {
      bg: isDark ? 'rgba(10,132,255,0.2)' : 'rgba(10,132,255,0.12)',
      icon: 'information-circle',
      iconColor: theme.colors.accent,
    },
  };
}

const TOAST_DURATION = 3000;

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { theme, themeMode } = useTheme();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const insets = useSafeAreaInsets();

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = String(++idRef.current);
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => dismiss(id), TOAST_DURATION);
  }, [dismiss]);

  const value = useMemo<ToastContextValue>(() => ({ toast: showToast }), [showToast]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: 'absolute',
          left: 16,
          right: 16,
          zIndex: 99999,
          alignItems: 'center',
          gap: 6,
        },
        toast: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: radius.md,
          ...theme.shadows.md,
          maxWidth: 400,
          width: '100%',
        },
        toastText: {
          flex: 1,
          fontSize: 14,
          fontWeight: '600',
          lineHeight: 18,
        },
      }),
    [theme.shadows],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 && (
        <View style={[styles.container, { bottom: insets.bottom + 30 }]} pointerEvents="box-none">
          {toasts.map((t) => {
            const cfg = getVariantConfig(theme, themeMode)[t.variant];
            return (
              <Animated.View
                key={t.id}
                entering={FadeInDown.duration(250).springify()}
                exiting={FadeOutDown.duration(200)}
                layout={LinearTransition.springify()}
              >
                <Pressable style={[styles.toast, { backgroundColor: cfg.bg }]} onPress={() => dismiss(t.id)}>
                  <Ionicons name={cfg.icon} size={20} color={cfg.iconColor} />
                  <Text style={[styles.toastText, { color: cfg.iconColor }]} numberOfLines={3}>
                    {t.message}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      )}
    </ToastContext.Provider>
  );
}
