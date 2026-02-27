import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { useTheme } from '@/store/ThemeProvider';
import { spacing } from '@/constants/theme';
import { TILE_SIZE } from './constants';
import type { RemotePlayer } from './multiplayer/types';

// ─── Ref API ────────────────────────────────────────────────────────────────

export interface PlayerDrawerRef {
  open: (player: RemotePlayer) => void;
  close: () => void;
}

// ─── Props ───────────────────────────────────────────────────────────────

interface PlayerDrawerProps {
  onClose?: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

const PET_SIZE = TILE_SIZE * 2;

export const PlayerDrawer = forwardRef<PlayerDrawerRef, PlayerDrawerProps>(
  function PlayerDrawer({ onClose }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const [player, setPlayer] = useState<RemotePlayer | null>(null);
    const { theme } = useTheme();
    const { colors } = theme;

    useImperativeHandle(ref, () => ({
      open: (p: RemotePlayer) => {
        setPlayer(p);
        drawerRef.current?.open();
      },
      close: () => drawerRef.current?.close(),
    }));

    const displayImageUrl =
      player && (player.activePose && player.petPose?.[player.activePose])
        ? player.petPose[player.activePose]
        : player?.petImageUrl;

    return (
      <AppDrawer
        ref={drawerRef}
        title={player?.username ?? 'Player'}
        snapPoints={['40%']}
        showCloseButton
        scrollable
        onClose={onClose}
      >
        {player && (
          <View style={[styles.content, { backgroundColor: colors.surface }]}>
            <View style={[styles.avatarWrap, { backgroundColor: colors.surfaceElevated }]}>
              {displayImageUrl ? (
                <CachedImage
                  source={{ uri: displayImageUrl }}
                  style={styles.avatar}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.avatarEmoji}>🐾</Text>
              )}
            </View>
            <Text style={[styles.username, { color: colors.text }]}>{player.username}</Text>
            <Text style={[styles.petName, { color: colors.textSecondary }]}>{player.petName}</Text>
          </View>
        )}
      </AppDrawer>
    );
  },
);

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: 16,
  },
  avatarWrap: {
    width: PET_SIZE * 2,
    height: PET_SIZE * 2,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  avatar: {
    width: PET_SIZE * 1.5,
    height: PET_SIZE * 1.5,
  },
  avatarEmoji: {
    fontSize: 64,
  },
  username: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  petName: {
    fontSize: 14,
    fontWeight: '600',
  },
});
