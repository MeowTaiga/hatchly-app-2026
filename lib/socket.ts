import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { WS_URL } from '@/constants/api';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

// ─── Context ────────────────────────────────────────────────────────────────

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
});

// ─── Provider ───────────────────────────────────────────────────────────────

interface SocketProviderProps {
  token: string | null;
  children: React.ReactNode;
}

/**
 * Wraps the app (or authenticated subtree) and manages a single Socket.IO
 * connection. Connects when `token` is non-null, disconnects when it's null
 * or on unmount. Exposes the socket via `useSocket()`.
 */
export function SocketProvider({ token, children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const s = io(WS_URL!, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 15000,
    });

    s.on('connect', () => setIsConnected(true));
    s.on('disconnect', () => setIsConnected(false));

    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [token]);

  const value: SocketContextValue = { socket, isConnected };

  return React.createElement(SocketContext.Provider, { value }, children);
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/** Access the Socket.IO instance and connection status. */
export function useSocket() {
  return useContext(SocketContext);
}

/**
 * Subscribes to a specific Socket.IO event and calls `handler` whenever
 * it fires. Automatically cleans up on unmount or when deps change.
 *
 * @example
 * useSocketEvent('user:updated', (data) => {
 *   console.log('User updated:', data);
 * });
 */
export function useSocketEvent<T = unknown>(event: string, handler: (data: T) => void) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler]);
}
