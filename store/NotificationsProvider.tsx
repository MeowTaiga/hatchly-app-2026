import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
import { api, type ApiNotification } from '@/lib/api';
import { useSocketEvent } from '@/lib/socket';

// ─── Types ─────────────────────────────────────────────────────────────────

interface NotificationsState {
  notifications: ApiNotification[];
  unreadCount: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
}

interface NotificationsActions {
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

type NotificationsContextValue = NotificationsState & NotificationsActions;

// ─── WebSocket event (matches server WS_EVENTS.NOTIFICATION) ────────────────

const WS_NOTIFICATION = 'notification';

// ─── Context ───────────────────────────────────────────────────────────────

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

// ─── Push registration ─────────────────────────────────────────────────────

/**
 * Requests permission and registers the Expo push token with the backend.
 * Runs when user is authenticated. Skips on simulators (no token).
 */
async function registerPushTokenIfNeeded(): Promise<void> {
  if (!Device.isDevice) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;

  try {
    const result = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const token = typeof result === 'string' ? result : (result as { data?: string })?.data ?? '';
    if (!token || !token.startsWith('ExponentPushToken[')) return;
    await api.registerPushToken(token, Platform.OS as 'ios' | 'android');
  } catch {
    // Non-fatal — push won't work but app continues
  }
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getNotifications({ limit: 20 });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || notifications.length === 0) return;
    const before = notifications[notifications.length - 1]?.id;
    if (!before) return;
    try {
      const data = await api.getNotifications({ limit: 20, before });
      setNotifications((prev) => [...prev, ...data.notifications]);
      setUnreadCount(data.unreadCount);
      setHasMore(data.hasMore);
    } catch {
      // Ignore
    }
  }, [hasMore, notifications]);

  const markRead = useCallback(async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Ignore
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
      );
      setUnreadCount(0);
    } catch {
      // Ignore
    }
  }, []);

  useSocketEvent<ApiNotification>(WS_NOTIFICATION, (payload) => {
    setNotifications((prev) => [payload, ...prev]);
    setUnreadCount((c) => c + 1);
  });

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    registerPushTokenIfNeeded();
  }, []);

  const value: NotificationsContextValue = {
    notifications,
    unreadCount,
    hasMore,
    isLoading,
    error,
    refresh,
    loadMore,
    markRead,
    markAllRead,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within <NotificationsProvider>');
  return ctx;
}
