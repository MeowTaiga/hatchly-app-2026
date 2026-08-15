/**
 * Multiplayer trade session — socket wiring + request modal + trade drawer.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useSocket, useSocketEvent } from '@/lib/socket';
import { useToast } from '@/store/ToastProvider';
import { TradeDrawer, type TradeDrawerRef } from './TradeDrawer';
import { TradeRequestModal } from './TradeRequestModal';
import { registerTradeRequestHandler } from './tradeBridge';
import {
  isTradeTerminal,
  type IncomingTradeRequest,
  type TradeOfferItem,
  type TradeState,
} from './tradeTypes';

const EV = {
  REQUEST: 'mp:trade_request',
  REQUESTED: 'mp:trade_requested',
  ACCEPT: 'mp:trade_accept',
  DECLINE: 'mp:trade_decline',
  DECLINED: 'mp:trade_declined',
  OPEN: 'mp:trade_open',
  UPDATE: 'mp:trade_update',
  STATE: 'mp:trade_state',
  CONFIRM: 'mp:trade_confirm',
  CANCEL: 'mp:trade_cancel',
  CANCELLED: 'mp:trade_cancelled',
  COMPLETE: 'mp:trade_complete',
  ERROR: 'mp:trade_error',
} as const;

interface TradeContextValue {
  requestTrade: (targetUserId: string) => void;
  activeTrade: TradeState | null;
}

const TradeContext = createContext<TradeContextValue | null>(null);

export function useTrade(): TradeContextValue {
  const ctx = useContext(TradeContext);
  if (!ctx) throw new Error('useTrade must be used within <TradeProvider>');
  return ctx;
}

/** Optional — returns null outside multiplayer trade scope. */
export function useTradeOptional(): TradeContextValue | null {
  return useContext(TradeContext);
}

export function TradeProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket();
  const { toast } = useToast();
  const drawerRef = useRef<TradeDrawerRef>(null);
  const [incoming, setIncoming] = useState<IncomingTradeRequest | null>(null);
  const [trade, setTrade] = useState<TradeState | null>(null);
  const tradeRef = useRef<TradeState | null>(null);
  tradeRef.current = trade;
  const [busy, setBusy] = useState(false);

  const clearTrade = useCallback(() => {
    setTrade(null);
    drawerRef.current?.close();
  }, []);

  const requestTrade = useCallback(
    (targetUserId: string) => {
      if (!socket) {
        toast('Not connected', 'error');
        return;
      }
      socket.emit(EV.REQUEST, { targetUserId });
    },
    [socket, toast],
  );

  useEffect(() => {
    registerTradeRequestHandler(requestTrade);
    return () => registerTradeRequestHandler(null);
  }, [requestTrade]);

  useSocketEvent<IncomingTradeRequest>(EV.REQUESTED, (data) => {
    setIncoming(data);
  });

  useSocketEvent<TradeState>(EV.STATE, (data) => {
    if (isTradeTerminal(tradeRef.current?.status)) return;
    setTrade(data);
    if (data.status === 'pending' || data.waitingForAccept) {
      drawerRef.current?.open();
    }
  });

  useSocketEvent<TradeState>(EV.OPEN, (data) => {
    setIncoming(null);
    setTrade(data);
    drawerRef.current?.open();
  });

  useSocketEvent<{ tradeId: string; byUserId?: string }>(EV.DECLINED, (data) => {
    setIncoming((prev) => (prev?.tradeId === data.tradeId ? null : prev));
    setTrade((prev) => {
      if (!prev || prev.tradeId !== data.tradeId) {
        // Drawer wasn't open locally — nothing to show.
        return prev;
      }
      return {
        ...prev,
        status: 'declined',
        waitingForAccept: false,
        youReady: false,
        theyReady: false,
        endMessage: `@${prev.partner.username} declined the trade`,
      };
    });
    drawerRef.current?.open();
  });

  useSocketEvent<{ tradeId: string; reason?: string }>(EV.CANCELLED, (data) => {
    setIncoming((prev) => (prev?.tradeId === data.tradeId ? null : prev));
    // Decline already paints the drawer — skip duplicate cancelled for "declined".
    if (data.reason === 'declined') return;
    setTrade((prev) => {
      if (!prev || prev.tradeId !== data.tradeId) return prev;
      if (isTradeTerminal(prev.status)) return prev;
      return {
        ...prev,
        status: 'cancelled',
        waitingForAccept: false,
        youReady: false,
        theyReady: false,
        endMessage: data.reason?.trim() || 'Trade cancelled',
      };
    });
    drawerRef.current?.open();
  });

  useSocketEvent<{ tradeId: string }>(EV.COMPLETE, (data) => {
    setTrade((prev) => {
      if (!prev || prev.tradeId !== data.tradeId) return prev;
      return {
        ...prev,
        status: 'completed',
        waitingForAccept: false,
        youReady: true,
        theyReady: true,
        endMessage: 'Trade complete!',
      };
    });
    drawerRef.current?.open();
  });

  useSocketEvent<{ message?: string }>(EV.ERROR, (data) => {
    setBusy(false);
    toast(data.message ?? 'Trade error', 'error');
  });

  const acceptIncoming = useCallback(() => {
    if (!socket || !incoming) return;
    setBusy(true);
    socket.emit(EV.ACCEPT, { tradeId: incoming.tradeId });
    setBusy(false);
  }, [socket, incoming]);

  const declineIncoming = useCallback(() => {
    if (!socket || !incoming) return;
    socket.emit(EV.DECLINE, { tradeId: incoming.tradeId });
    setIncoming(null);
  }, [socket, incoming]);

  const updateOffer = useCallback(
    (items: TradeOfferItem[]) => {
      if (!socket || !trade || isTradeTerminal(trade.status)) return;
      setBusy(true);
      socket.emit(EV.UPDATE, { tradeId: trade.tradeId, items });
      setBusy(false);
    },
    [socket, trade],
  );

  const confirm = useCallback(() => {
    if (!socket || !trade || isTradeTerminal(trade.status)) return;
    setBusy(true);
    socket.emit(EV.CONFIRM, { tradeId: trade.tradeId, version: trade.version });
    setBusy(false);
  }, [socket, trade]);

  const cancelOrDismiss = useCallback(() => {
    if (!trade || isTradeTerminal(trade.status)) {
      clearTrade();
      return;
    }
    if (!socket) {
      clearTrade();
      return;
    }
    socket.emit(EV.CANCEL, { tradeId: trade.tradeId });
  }, [socket, trade, clearTrade]);

  return (
    <TradeContext.Provider value={{ requestTrade, activeTrade: trade }}>
      {children}
      <TradeRequestModal
        request={incoming}
        busy={busy}
        onAccept={acceptIncoming}
        onDecline={declineIncoming}
      />
      <TradeDrawer
        ref={drawerRef}
        trade={trade}
        busy={busy}
        onUpdateOffer={updateOffer}
        onConfirm={confirm}
        onCancel={cancelOrDismiss}
      />
    </TradeContext.Provider>
  );
}
