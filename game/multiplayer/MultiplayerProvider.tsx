import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSocket } from '@/lib/socket';
import { useAuth } from '@/store/AuthProvider';
import type { RemotePlayer, ChatMessage } from './types';

const MOVE_THROTTLE_MS = 66;
let chatIdCounter = 0;

/** Apply a third-party player update; skips if userId is self. Reusable for move, pose, equipped. */
function applyRemotePlayerUpdate(
  prev: Map<string, RemotePlayer>,
  userId: string,
  myUserId: string | undefined,
  patch: Partial<RemotePlayer>,
): Map<string, RemotePlayer> {
  if (userId === myUserId) return prev;
  const existing = prev.get(userId);
  if (!existing) return prev;
  const next = new Map(prev);
  next.set(userId, { ...existing, ...patch });
  return next;
}

export type FishRarity = 'common' | 'rare' | 'epic' | 'unique' | 'legendary' | 'mythic';

export interface FishResultBubble {
  itemType: string;
  label: string;
  /** Numeric size (e.g. cm). Shown as "24.5 cm" */
  size: number;
  sizeLabel?: string;
  rarity?: FishRarity;
  imageUrl?: string;
}

export interface PendingFishData {
  fishLabel?: string;
  fishImageUrl?: string;
  difficulty?: number;
}

interface MultiplayerContextValue {
  isJoined: boolean;
  players: Map<string, RemotePlayer>;
  spawnPos: { x: number; y: number };
  chatMessages: ChatMessage[];
  moveMyPet: (x: number, y: number) => void;
  sendChat: (text: string) => void;
  setMyPose: (pose: string | null) => void;
  myActivePose: string | null;
  fishCast: (sceneSlug: string, col: number, row: number) => void;
  fishResult: (passed: boolean) => void;
  fishCancel: () => void;
  showFishingModal: boolean;
  pendingFishData: PendingFishData | null;
  fishingByUser: Map<string, { col: number; row: number }>;
  reelingByUser: Set<string>;
  fishResultByUser: Map<string, FishResultBubble>;
  fishFailedByUser: Set<string>;
}

const MultiplayerContext = createContext<MultiplayerContextValue>({
  isJoined: false,
  players: new Map(),
  spawnPos: { x: 400, y: 500 },
  chatMessages: [],
  moveMyPet: () => {},
  sendChat: () => {},
  setMyPose: () => {},
  myActivePose: null,
  fishCast: () => {},
  fishResult: () => {},
  fishCancel: () => {},
  showFishingModal: false,
  pendingFishData: null,
  fishingByUser: new Map(),
  reelingByUser: new Set(),
  fishResultByUser: new Map(),
  fishFailedByUser: new Set(),
});

interface MultiplayerProviderProps {
  sceneSlug: string;
  children: React.ReactNode;
}

export function MultiplayerProvider({ sceneSlug, children }: MultiplayerProviderProps) {
  const { socket } = useSocket();
  const { user } = useAuth();
  const myUserId = user?.id;
  const [isJoined, setIsJoined] = useState(false);
  const [players, setPlayers] = useState<Map<string, RemotePlayer>>(new Map());
  const [spawnPos, setSpawnPos] = useState<{ x: number; y: number }>({ x: 400, y: 500 });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [myActivePose, setMyActivePose] = useState<string | null>(null);
  const [showFishingModal, setShowFishingModal] = useState(false);
  const [pendingFishData, setPendingFishData] = useState<PendingFishData | null>(null);
  const [fishingByUser, setFishingByUser] = useState<Map<string, { col: number; row: number }>>(new Map());
  const [reelingByUser, setReelingByUser] = useState<Set<string>>(new Set());
  const [fishResultByUser, setFishResultByUser] = useState<Map<string, FishResultBubble>>(new Map());
  const [fishFailedByUser, setFishFailedByUser] = useState<Set<string>>(new Set());
  const lastMoveRef = useRef(0);
  const roomRef = useRef<string | null>(null);
  const myFishingPosRef = useRef<{ col: number; row: number } | null>(null);

  useEffect(() => {
    if (!socket || !myUserId) return;

    socket.emit('mp:join', { sceneSlug });

    const onJoined = (data: {
      instanceId: string;
      players: RemotePlayer[];
      spawnX: number;
      spawnY: number;
      fishingByUser?: Record<string, { col: number; row: number; isReeling: boolean }>;
    }) => {
      const map = new Map<string, RemotePlayer>();
      for (const p of data.players) {
        if (p.userId !== myUserId) {
          map.set(p.userId, { ...p, activePose: p.activePose ?? null });
        }
      }
      setPlayers(map);
      setIsJoined(true);
      roomRef.current = data.instanceId;
      setSpawnPos({ x: data.spawnX ?? 400, y: data.spawnY ?? 500 });
      // Populate fishing state for players already fishing when we joined
      if (data.fishingByUser && Object.keys(data.fishingByUser).length > 0) {
        const fishing = new Map<string, { col: number; row: number }>();
        const reeling = new Set<string>();
        for (const [uid, state] of Object.entries(data.fishingByUser)) {
          fishing.set(uid, { col: state.col, row: state.row });
          if (state.isReeling) reeling.add(uid);
        }
        setFishingByUser(fishing);
        setReelingByUser(reeling);
      }
    };

    const onPlayerJoined = (data: RemotePlayer) => {
      if (data.userId === myUserId) return;
      setPlayers((prev) => {
        const next = new Map(prev);
        next.set(data.userId, { ...data, activePose: data.activePose ?? null });
        return next;
      });
    };

    const onPlayerLeft = (data: { userId: string }) => {
      setPlayers((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    };

    const onPlayerMoved = (data: { userId: string; x: number; y: number }) => {
      setPlayers((prev) => applyRemotePlayerUpdate(prev, data.userId, myUserId, { x: data.x, y: data.y }));
    };

    const onChatMessage = (data: { userId: string; username: string; text: string; timestamp: number }) => {
      const msg: ChatMessage = {
        id: `chat_${++chatIdCounter}`,
        userId: data.userId,
        username: data.username,
        text: data.text,
        timestamp: data.timestamp,
      };
      setChatMessages((prev) => [...prev.slice(-49), msg]);
    };

    const onPlayerPose = (data: { userId: string; pose: string | null }) => {
      setPlayers((prev) => applyRemotePlayerUpdate(prev, data.userId, myUserId, { activePose: data.pose }));
    };

    const onPlayerEquipped = (data: {
      userId: string;
      equippedHandTool?: string | null;
      equippedBobber?: string | null;
      equippedChair?: string | null;
    }) => {
      const patch: Partial<RemotePlayer> = {};
      if ('equippedHandTool' in data) patch.equippedHandTool = data.equippedHandTool ?? undefined;
      if ('equippedBobber' in data) patch.equippedBobber = data.equippedBobber ?? undefined;
      if ('equippedChair' in data) patch.equippedChair = data.equippedChair ?? undefined;
      if (Object.keys(patch).length === 0) return;
      setPlayers((prev) => applyRemotePlayerUpdate(prev, data.userId, myUserId, patch));
    };

    const onFishBite = (data: { fishLabel?: string; fishImageUrl?: string; difficulty?: number }) => {
      setPendingFishData(
        data?.fishLabel || data?.fishImageUrl || data?.difficulty != null
          ? { fishLabel: data.fishLabel, fishImageUrl: data.fishImageUrl, difficulty: data.difficulty ?? 2 }
          : null
      );
      setShowFishingModal(true);
      if (myUserId) {
        setReelingByUser((prev) => new Set(prev).add(myUserId));
      }
    };
    const onFishStarted = (data: { userId: string; col: number; row: number }) => {
      if (data.userId === myUserId) {
        myFishingPosRef.current = { col: data.col, row: data.row };
      }
      setFishingByUser((prev) => {
        const next = new Map(prev);
        next.set(data.userId, { col: data.col, row: data.row });
        return next;
      });
    };
    const onFishReeling = (data: { userId: string }) => {
      setReelingByUser((prev) => new Set(prev).add(data.userId));
    };
    const onFishCanceled = (data: { userId: string }) => {
      if (data.userId === myUserId) myFishingPosRef.current = null;
      setReelingByUser((prev) => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
      setFishingByUser((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    };
    const onFishCaught = (data: {
      userId: string;
      itemType: string;
      label: string;
      size: number;
      sizeLabel?: string;
      rarity?: FishRarity;
      imageUrl?: string;
    }) => {
      setReelingByUser((prev) => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
      setFishResultByUser((prev) => {
        const next = new Map(prev);
        next.set(data.userId, {
          itemType: data.itemType,
          label: data.label,
          size: typeof data.size === 'number' ? data.size : 0,
          sizeLabel: data.sizeLabel,
          rarity: data.rarity ?? 'common',
          imageUrl: data.imageUrl,
        });
        return next;
      });
      setTimeout(() => {
        setFishResultByUser((prev) => {
          const next = new Map(prev);
          next.delete(data.userId);
          return next;
        });
      }, 5000);
      if (data.userId === myUserId) {
        const pos = myFishingPosRef.current;
        if (pos) {
          setTimeout(() => {
            fishCast(sceneSlug, pos.col, pos.row);
          }, 2000);
        }
      } else {
        setFishingByUser((prev) => {
          const next = new Map(prev);
          next.delete(data.userId);
          return next;
        });
      }
    };
    const onFishFailed = (data: { userId: string }) => {
      setReelingByUser((prev) => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
      if (data.userId === myUserId) myFishingPosRef.current = null;
      setFishFailedByUser((prev) => {
        const next = new Set(prev);
        next.add(data.userId);
        return next;
      });
      setTimeout(() => {
        setFishFailedByUser((prev) => {
          const next = new Set(prev);
          next.delete(data.userId);
          return next;
        });
      }, 5000);
      setFishingByUser((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    };

    socket.on('mp:joined', onJoined);
    socket.on('mp:player_joined', onPlayerJoined);
    socket.on('mp:player_left', onPlayerLeft);
    socket.on('mp:player_moved', onPlayerMoved);
    socket.on('mp:chat_message', onChatMessage);
    socket.on('mp:player_pose', onPlayerPose);
    socket.on('mp:player_equipped', onPlayerEquipped);
    socket.on('mp:fish_bite', onFishBite);
    socket.on('mp:fish_reeling', onFishReeling);
    socket.on('mp:fish_started', onFishStarted);
    socket.on('mp:fish_canceled', onFishCanceled);
    socket.on('mp:fish_caught', onFishCaught);
    socket.on('mp:fish_failed', onFishFailed);

    return () => {
      socket.emit('mp:leave');
      socket.off('mp:joined', onJoined);
      socket.off('mp:player_joined', onPlayerJoined);
      socket.off('mp:player_left', onPlayerLeft);
      socket.off('mp:player_moved', onPlayerMoved);
      socket.off('mp:chat_message', onChatMessage);
      socket.off('mp:player_pose', onPlayerPose);
      socket.off('mp:player_equipped', onPlayerEquipped);
      socket.off('mp:fish_bite', onFishBite);
      socket.off('mp:fish_reeling', onFishReeling);
      socket.off('mp:fish_started', onFishStarted);
      socket.off('mp:fish_canceled', onFishCanceled);
      socket.off('mp:fish_caught', onFishCaught);
      socket.off('mp:fish_failed', onFishFailed);
      setIsJoined(false);
      setPlayers(new Map());
      setChatMessages([]);
      setMyActivePose(null);
      setShowFishingModal(false);
      setPendingFishData(null);
      setFishingByUser(new Map());
      setReelingByUser(new Set());
      setFishResultByUser(new Map());
      setFishFailedByUser(new Set());
    };
  }, [socket, sceneSlug, myUserId]);

  const moveMyPet = useCallback(
    (x: number, y: number) => {
      if (!socket || !isJoined) return;
      const now = Date.now();
      if (now - lastMoveRef.current < MOVE_THROTTLE_MS) return;
      lastMoveRef.current = now;
      socket.emit('mp:move', { x, y });
    },
    [socket, isJoined],
  );

  const sendChat = useCallback(
    (text: string) => {
      if (!socket || !isJoined) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      socket.emit('mp:chat', { text: trimmed });
    },
    [socket, isJoined],
  );

  const setMyPose = useCallback(
    (pose: string | null) => {
      if (!socket || !isJoined) return;
      setMyActivePose(pose);
      socket.emit('mp:pose', { pose });
    },
    [socket, isJoined],
  );

  const fishCast = useCallback(
    (sceneSlug: string, col: number, row: number) => {
      if (!socket || !isJoined || !myUserId) return;
      myFishingPosRef.current = { col, row };
      setFishingByUser((prev) => {
        const next = new Map(prev);
        next.set(myUserId, { col, row });
        return next;
      });
      socket.emit('mp:fish_cast', { sceneSlug, col, row });
    },
    [socket, isJoined, myUserId],
  );

  const fishResult = useCallback(
    (passed: boolean) => {
      if (!socket || !isJoined) return;
      setShowFishingModal(false);
      setPendingFishData(null);
      if (myUserId) {
        setReelingByUser((prev) => {
          const next = new Set(prev);
          next.delete(myUserId);
          return next;
        });
      }
      socket.emit('mp:fish_result', { passed });
    },
    [socket, isJoined, myUserId],
  );

  const fishCancel = useCallback(
    () => {
      if (!socket || !isJoined) return;
      setShowFishingModal(false);
      setPendingFishData(null);
      if (myUserId) {
        setReelingByUser((prev) => {
          const next = new Set(prev);
          next.delete(myUserId);
          return next;
        });
      }
      socket.emit('mp:fish_cancel');
    },
    [socket, isJoined, myUserId],
  );

  const value: MultiplayerContextValue = {
    isJoined,
    players,
    spawnPos,
    chatMessages,
    moveMyPet,
    sendChat,
    setMyPose,
    myActivePose,
    fishCast,
    fishResult,
    fishCancel,
    showFishingModal,
    pendingFishData,
    fishingByUser,
    reelingByUser,
    fishResultByUser,
    fishFailedByUser,
  };

  return (
    <MultiplayerContext.Provider value={value}>
      {children}
    </MultiplayerContext.Provider>
  );
}

export function useMultiplayer() {
  return useContext(MultiplayerContext);
}
