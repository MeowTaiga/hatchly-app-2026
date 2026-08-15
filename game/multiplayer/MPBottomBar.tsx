import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  Keyboard,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CachedImage } from '@/components/ui/CachedImage';
import { GameIcon } from '@/assets/icons/GameIcons';
import { useTheme } from '@/store/ThemeProvider';
import { useAuth } from '@/store/AuthProvider';
import { useGame } from '@/game/GameProvider';
import { PET_POSES } from '@/constants/pet';
import { useMultiplayer } from './MultiplayerProvider';
import { SPRING_CONFIG, CLOSE_DURATION } from '../GameHUD/constants';
import { TAB_BAR_TOTAL_HEIGHT } from '@/components/ui/FloatingTabBar';
import type { ChatMessage } from './types';

const MAX_LENGTH = 200;
const BUBBLE_LIFETIME_MS = 5000;
const MAX_VISIBLE_BUBBLES = 4;

const BASE_BOTTOM_CLOSED = TAB_BAR_TOTAL_HEIGHT + 12;
const KEYBOARD_OPEN_OFFSET = 80;

interface MPBottomBarProps {
  onBackToFarm: () => void;
  onOpenEquip?: () => void;
  onOpenBackpack?: () => void;
}

interface VisibleBubble {
  id: string;
  userId: string;
  username: string;
  text: string;
}

export function MPBottomBar({ onBackToFarm, onOpenEquip, onOpenBackpack }: MPBottomBarProps) {
  const { theme, themeMode } = useTheme();
  const colors = theme.colors;
  const isDark = themeMode === 'dark';
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { inventory, backpackSlots } = useGame();
  const { chatMessages, sendChat, setMyPose, myActivePose, players } = useMultiplayer();

  const backpackUsed = inventory.filter((s) => s.qty > 0).length;
  const backpackFull = backpackUsed >= backpackSlots;

  const [text, setText] = useState('');
  const [posePickerOpen, setPosePickerOpen] = useState(false);
  const [visibleBubbles, setVisibleBubbles] = useState<VisibleBubble[]>([]);
  const bottomValue = useSharedValue(BASE_BOTTOM_CLOSED);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const poseMap = user?.pet?.pose as Record<string, string> | undefined;
  const defaultImageUrl = user?.pet?.imageUrl;

  const availablePoses = useMemo(() => {
    if (!poseMap) return [];
    return PET_POSES.filter((p) => poseMap[p]);
  }, [poseMap]);

  const handlePoseSelect = useCallback(
    (pose: string | null) => {
      setMyPose(pose);
      setPosePickerOpen(false);
    },
    [setMyPose],
  );

  const targetBottomClosed = BASE_BOTTOM_CLOSED;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: { endCoordinates: { height: number } }) => {
      const kh = e.endCoordinates.height;
      const targetBottom = kh - insets.bottom + KEYBOARD_OPEN_OFFSET;
      bottomValue.value = withSpring(targetBottom, SPRING_CONFIG);
    };
    const onHide = () => {
      bottomValue.value = withTiming(targetBottomClosed, {
        duration: CLOSE_DURATION,
      });
    };
    const sub1 = Keyboard.addListener(showEvent, onShow);
    const sub2 = Keyboard.addListener(hideEvent, onHide);
    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, [insets.bottom, targetBottomClosed]);

  useEffect(() => {
    const newBubbles: VisibleBubble[] = [];
    for (const msg of chatMessages) {
      if (!seenIdsRef.current.has(msg.id)) {
        seenIdsRef.current.add(msg.id);
        newBubbles.push({ id: msg.id, userId: msg.userId, username: msg.username, text: msg.text });
      }
    }
    if (newBubbles.length > 0) {
      setVisibleBubbles((prev) => [...prev, ...newBubbles].slice(-MAX_VISIBLE_BUBBLES));
      for (const b of newBubbles) {
        const bubbleId = b.id;
        setTimeout(() => {
          setVisibleBubbles((prev) => prev.filter((bb) => bb.id !== bubbleId));
        }, BUBBLE_LIFETIME_MS);
      }
    }
  }, [chatMessages]);

  const animatedRootStyle = useAnimatedStyle(() => ({
    bottom: bottomValue.value,
  }));

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendChat(trimmed);
    setText('');
  }, [text, sendChat]);

  const barBg = isDark ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.92)';

  return (
    <Animated.View style={[s.root, animatedRootStyle]} pointerEvents="box-none">
      {posePickerOpen && (
        <View style={[s.posePanel, { backgroundColor: barBg }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.poseRow}>
            <Pressable
              style={[s.poseItem, myActivePose === null && s.poseItemActive]}
              onPress={() => handlePoseSelect(null)}
            >
              {defaultImageUrl ? (
                <CachedImage source={{ uri: defaultImageUrl }} style={s.poseImg} resizeMode="contain" />
              ) : (
                <Text style={s.poseFallback}>🐾</Text>
              )}
              <Text style={[s.poseName, { color: theme.colors.text }]}>Default</Text>
            </Pressable>
            {availablePoses.map((pose) => (
              <Pressable
                key={pose}
                style={[s.poseItem, myActivePose === pose && s.poseItemActive]}
                onPress={() => handlePoseSelect(pose)}
              >
                <CachedImage source={{ uri: poseMap![pose] }} style={s.poseImg} resizeMode="contain" />
                <Text style={[s.poseName, { color: theme.colors.text }]}>{pose}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Floating chat bubbles — pet dialog style */}
      {visibleBubbles.length > 0 && (
        <View style={s.bubbleStack} pointerEvents="none">
          {visibleBubbles.map((b) => {
            const isMe = b.userId === user?.id;
            const petImg = isMe
              ? user?.pet?.imageUrl
              : players.get(b.userId)?.petImageUrl;
            return (
              <Animated.View
                key={b.id}
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(300)}
                style={s.bubbleRow}
              >
                <View style={s.bubbleAvatarWrap}>
                  {petImg ? (
                    <CachedImage source={{ uri: petImg }} style={s.bubbleAvatar} resizeMode="contain" />
                  ) : (
                    <View style={[s.bubbleAvatar, s.bubbleAvatarFallback]}>
                      <Text style={s.bubbleAvatarEmoji}>🐾</Text>
                    </View>
                  )}
                </View>
                <View style={[s.chatBubble, { backgroundColor: colors.surface }]}>
                  <View style={[s.bubbleTail, { borderRightColor: colors.surface }]} />
                  <Text style={[s.bubbleName, { color: colors.primary }]}>{b.username}</Text>
                  <Text style={[s.bubbleText, { color: colors.text }]} numberOfLines={2}>{b.text}</Text>
                </View>
              </Animated.View>
            );
          })}
        </View>
      )}

      <View style={s.barsRow}>
        {/* Container 1: Input + Emotes (same background) */}
        <View style={[s.inputBar, { backgroundColor: barBg }]}>
          <TextInput
            style={[
              s.input,
              {
                color: theme.colors.text,
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              },
            ]}
            placeholder="Say something..."
            placeholderTextColor={theme.colors.textMuted}
            value={text}
            onChangeText={(v) => setText(v.slice(0, MAX_LENGTH))}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            maxLength={MAX_LENGTH}
          />
          <Pressable
            style={[s.emoteBtn, {
              backgroundColor: posePickerOpen
                ? theme.colors.primary
                : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }]}
            onPress={() => setPosePickerOpen((v) => !v)}
          >
            <Ionicons name="happy-outline" size={20} color={posePickerOpen ? '#fff' : theme.colors.text} />
          </Pressable>
        </View>

        {/* Container 2: Nav actions (matches farm toolbar: icon-only, 40x40, gap 6, surface bg) */}
        <View style={[s.navBar, { backgroundColor: colors.surface + 'EB' }]}>
          {onOpenBackpack && (
            <Pressable style={s.toolBtn} onPress={onOpenBackpack}>
              <GameIcon name="backpack" size={20} color={colors.textMuted} />
              <View
                style={[
                  s.backpackBadge,
                  {
                    backgroundColor: backpackFull ? colors.error : colors.surface,
                    borderColor: backpackFull ? colors.error : colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    s.backpackBadgeText,
                    { color: backpackFull ? '#fff' : colors.textMuted },
                  ]}
                >
                  {backpackUsed}/{backpackSlots}
                </Text>
              </View>
            </Pressable>
          )}
          {onOpenEquip && (
            <Pressable style={s.toolBtn} onPress={onOpenEquip}>
              <GameIcon name="pickaxe" size={20} color={colors.textMuted} />
            </Pressable>
          )}
          <Pressable style={s.toolBtn} onPress={onBackToFarm}>
            <Ionicons name="home-outline" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 10,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  emoteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 24,
    paddingHorizontal: 6,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toolBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backpackBadge: {
    position: 'absolute',
    right: -6,
    bottom: -4,
    minWidth: 28,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backpackBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },
  bubbleStack: {
    marginBottom: 6,
    gap: 5,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  bubbleAvatarWrap: {
    width: 30,
    height: 30,
  },
  bubbleAvatar: {
    width: 30,
    height: 30,
  },
  bubbleAvatarFallback: {
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleAvatarEmoji: {
    fontSize: 14,
  },
  chatBubble: {
    flex: 1,
    borderRadius: 14,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleTail: {
    position: 'absolute',
    left: -5,
    bottom: 6,
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderRightWidth: 6,
    borderBottomWidth: 5,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  bubbleName: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 1,
    letterSpacing: 0.2,
  },
  bubbleText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  posePanel: {
    borderRadius: 12,
    marginBottom: 6,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  poseRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
  },
  poseItem: {
    alignItems: 'center',
    width: 56,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  poseItemActive: {
    borderColor: '#4ADE80',
    backgroundColor: 'rgba(74,222,128,0.12)',
  },
  poseImg: {
    width: 36,
    height: 36,
  },
  poseFallback: {
    fontSize: 24,
  },
  poseName: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'capitalize',
  },
});
