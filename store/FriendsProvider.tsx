import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, type FriendEntry, type FriendUser } from '@/lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────

interface FriendsState {
  friends: FriendEntry[];
  sent: FriendEntry[];
  received: FriendEntry[];
  isLoading: boolean;
  error: string | null;
}

interface FriendsActions {
  refresh: () => Promise<void>;
  sendRequest: (userId: string) => Promise<void>;
  respondToRequest: (requestId: string, status: 'accepted' | 'rejected') => Promise<void>;
  removeFriend: (userId: string) => Promise<void>;
}

type FriendsContextValue = FriendsState & FriendsActions;

// ─── Context ─────────────────────────────────────────────────────────────────

const FriendsContext = createContext<FriendsContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function FriendsProvider({ children }: { children: React.ReactNode }) {
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [sent, setSent] = useState<FriendEntry[]>([]);
  const [received, setReceived] = useState<FriendEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getFriends();
      setFriends(data.friends);
      setSent(data.sent);
      setReceived(data.received);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load friends');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendRequest = useCallback(async (userId: string) => {
    await api.sendFriendRequest(userId);
    await refresh();
  }, [refresh]);

  const respondToRequest = useCallback(
    async (requestId: string, status: 'accepted' | 'rejected') => {
      await api.respondToFriendRequest(requestId, status);
      await refresh();
    },
    [refresh],
  );

  const removeFriend = useCallback(
    async (userId: string) => {
      await api.removeFriend(userId);
      await refresh();
    },
    [refresh],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value: FriendsContextValue = {
    friends,
    sent,
    received,
    isLoading,
    error,
    refresh,
    sendRequest,
    respondToRequest,
    removeFriend,
  };

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useFriends(): FriendsContextValue {
  const ctx = useContext(FriendsContext);
  if (!ctx) throw new Error('useFriends must be used within <FriendsProvider>');
  return ctx;
}
