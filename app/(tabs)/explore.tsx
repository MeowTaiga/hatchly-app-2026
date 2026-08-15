import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { CachedImage } from '@/components/ui/CachedImage';
import { TAB_BAR_TOTAL_HEIGHT } from '@/components/ui/FloatingTabBar';
import { useTheme } from '@/store/ThemeProvider';
import { useAuth } from '@/store/AuthProvider';
import { usePetHero } from '@/store/PetHeroProvider';
import { api, type ChatMessageEntry } from '@/lib/api';
import { SuggestionCard } from '@/components/chat/SuggestionCard';
import { GoalChatCard } from '@/components/chat/GoalChatCard';
import { MoodPickerCard } from '@/components/chat/MoodPickerCard';
import { MOOD_OPTIONS } from '@/components/chat/moodOptions';
import { useGameSummary } from '@/hooks/useGameSummary';
import { useToast } from '@/store/ToastProvider';
import { useGoals } from '@/store/GoalsProvider';
import { showAppRewards } from '@/lib/showAppRewards';
import { spacing } from '@/constants/theme';
import * as SecureStore from 'expo-secure-store';

const STREAMING_PREF_KEY = 'chat_streaming_enabled';

const MAX_LENGTH = 500;
const STREAMING_CHAR_MS = 15;
/** Messages fetched per page. Older ones stream in as the user scrolls up. */
const PAGE_SIZE = 50;
/** Space kept below the input so the floating tab bar never covers it. */
const TAB_BAR_CLEARANCE = TAB_BAR_TOTAL_HEIGHT + 10;
/**
 * Resolved outside the worklet — reading `Platform.OS` inside one makes
 * Reanimated serialize the whole Platform module into the UI runtime, where the
 * lookup does not reliably return the host platform.
 */
const TRACKS_KEYBOARD = Platform.OS === 'ios';

function BlinkingCursor({ color }: { color: string }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0, { duration: 400 }), -1, true);
  }, [opacity]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.Text style={[{ color, fontSize: 15, lineHeight: 20 }, animatedStyle]}>▋</Animated.Text>
  );
}

export default function ExploreScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const { theme, themeMode } = useTheme();
  const { user, refreshUser } = useAuth();
  const { triggerXpGain } = usePetHero();
  const [messages, setMessages] = useState<ChatMessageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [completedSuggestions, setCompletedSuggestions] = useState<Set<string>>(new Set());
  const [suggestionRewards, setSuggestionRewards] = useState<Record<string, { gemsAwarded: number; item?: { itemType: string; label: string; imageUrl?: string; emoji?: string; qty: number } }>>({});
  const [needsMoodToday, setNeedsMoodToday] = useState(false);
  const [loggingMood, setLoggingMood] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamingRevealedLength, setStreamingRevealedLength] = useState(0);
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const listRef = useRef<FlatList>(null);
  const loadingOlderRef = useRef(false);

  useEffect(() => {
    SecureStore.getItemAsync(STREAMING_PREF_KEY).then((v) => {
      if (v !== null) setStreamingEnabled(v === 'true');
    });
  }, []);

  const setStreamingEnabledWithStore = useCallback((enabled: boolean) => {
    setStreamingEnabled(enabled);
    SecureStore.setItemAsync(STREAMING_PREF_KEY, String(enabled));
  }, []);

  const pet = user?.pet;
  const petName = pet?.customName || pet?.name || 'Your Pet';
  const isDark = themeMode === 'dark';
  const { refresh: refreshGameSummary } = useGameSummary();
  const { toast } = useToast();
  const { state: goalsState, completeGoal, refresh: refreshGoals } = useGoals();
  const [busyGoalKey, setBusyGoalKey] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setStreamingMessageId(null);
      const { messages: msgs, hasMore: more, needsMoodToday: needs } = await api.getChatHistory({
        limit: PAGE_SIZE,
      });
      setMessages(msgs);
      setHasMore(more);
      setNeedsMoodToday(!!needs);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load chat');
      setMessages([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Pages backwards from the oldest loaded message. Fired when the user scrolls up. */
  const loadOlder = useCallback(async () => {
    if (loadingOlderRef.current || !hasMore) return;
    const oldest = messages[0];
    if (!oldest) return;

    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const { messages: older, hasMore: more } = await api.getChatHistory({
        limit: PAGE_SIZE,
        before: oldest.id,
      });
      if (older.length) setMessages((prev) => [...older, ...prev]);
      setHasMore(more);
    } catch {
      // Leave the loaded range alone — scrolling up again retries.
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [hasMore, messages]);

  useEffect(() => {
    if (user?.pet) {
      loadHistory();
    } else {
      setLoading(false);
      setMessages([]);
    }
  }, [user?.pet, loadHistory]);

  // The list is inverted, so it is already anchored to the newest message —
  // no scroll-to-bottom pass is needed when the tab opens or the keyboard moves.
  const invertedMessages = useMemo(() => [...messages].reverse(), [messages]);

  // Keyboard height is read on the UI thread so the input tracks the system
  // animation curve instead of catching up after it via JS layout passes.
  // Shifting with a transform rather than padding keeps the message list out of
  // the layout pass entirely, which is what made the input lag behind the keyboard.
  const keyboard = useAnimatedKeyboard();
  const keyboardShiftStyle = useAnimatedStyle(() => {
    // Android resizes the window itself; shifting here would double-count it.
    const height = TRACKS_KEYBOARD ? keyboard.height.value : 0;
    return { transform: [{ translateY: -Math.max(height - TAB_BAR_CLEARANCE, 0) }] };
  });

  const streamingMessage = streamingMessageId ? messages.find((m) => m.id === streamingMessageId) : null;
  const fullLength = streamingMessage?.content.length ?? 0;

  useEffect(() => {
    if (!streamingEnabled || !streamingMessageId || fullLength === 0) return;
    const interval = setInterval(() => {
      setStreamingRevealedLength((prev) => {
        if (prev + 1 >= fullLength) {
          setStreamingMessageId(null);
          return fullLength;
        }
        return prev + 1;
      });
    }, STREAMING_CHAR_MS);
    return () => clearInterval(interval);
  }, [streamingEnabled, streamingMessageId, fullLength]);

  const sendMessage = useCallback(
    async (contentToSend: string) => {
      if (!contentToSend.trim() || sending || !user?.pet) return;

      setSending(true);
      setError(null);

      const optimisticUserMsg: ChatMessageEntry = {
        id: `opt-${Date.now()}`,
        role: 'user',
        content: contentToSend.trim(),
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticUserMsg]);
      // Offset 0 is the newest message on an inverted list.
      listRef.current?.scrollToOffset({ offset: 0, animated: true });

      try {
        const { message, reply, xpGained } = await api.sendChatMessage(contentToSend.trim());
        setMessages((prev) => {
          const withoutOpt = prev.filter((m) => m.id !== optimisticUserMsg.id);
          return [...withoutOpt, message, reply];
        });
        if ((xpGained ?? 0) > 0) {
          triggerXpGain?.(xpGained!, 'Social');
          void refreshUser();
        }
        if (streamingEnabled) {
          setStreamingRevealedLength(0);
          setStreamingMessageId(reply.id);
        }
        if (reply.goalCards?.length) void refreshGoals();
      } catch (err: any) {
        setError(err?.message ?? 'Failed to send');
        setMessages((prev) => prev.filter((m) => m.id !== optimisticUserMsg.id));
      } finally {
        setSending(false);
      }
    },
    [sending, user?.pet, streamingEnabled, triggerXpGain, refreshUser, refreshGoals],
  );

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    sendMessage(trimmed);
  }, [text, sendMessage]);

  const handleMoodSelect = useCallback(
    async (moodId: string) => {
      if (loggingMood || !user?.pet) return;
      setLoggingMood(true);
      try {
        const { xpGained, gemsAwarded, item, rewarded } = await api.logMood(moodId);
        setNeedsMoodToday(false);
        if (xpGained > 0) {
          triggerXpGain?.(xpGained, 'Health');
          void refreshUser();
        }
        if (xpGained > 0 || gemsAwarded > 0 || item) {
          showAppRewards({ xpGained, gemsAwarded, item });
          refreshGameSummary();
        } else if (!rewarded) {
          toast('Mood saved to your diary', 'success');
        }
        const label = MOOD_OPTIONS.find((o) => o.id === moodId)?.label ?? moodId;
        sendMessage(`I'm feeling ${label.toLowerCase()} today!`);
      } catch (err: any) {
        toast(err?.message ?? 'Failed to log mood', 'error');
      } finally {
        setLoggingMood(false);
      }
    },
    [loggingMood, user?.pet, sendMessage, refreshGameSummary, toast, triggerXpGain, refreshUser],
  );

  const handleGoalComplete = useCallback(
    async (messageId: string, goalId: string, title: string) => {
      const key = `${messageId}:${goalId}`;
      if (busyGoalKey) return;
      setBusyGoalKey(key);
      try {
        await completeGoal(goalId);
        sendMessage(`I finished ${title}!`);
      } catch (err: unknown) {
        toast(err instanceof Error ? err.message : 'Could not check off that goal', 'error');
      } finally {
        setBusyGoalKey(null);
      }
    },
    [busyGoalKey, completeGoal, sendMessage, toast],
  );

  const handleSuggestionDone = useCallback(
    async (messageId: string, title: string) => {
      setCompletedSuggestions((prev) => new Set(prev).add(messageId));
      try {
        const result = await api.completeSuggestion(messageId);
        if (result.limitReached) {
          toast("You've reached your daily limit (3 rewards)", 'info');
        } else if (result.gemsAwarded > 0 || result.item) {
          setSuggestionRewards((prev) => ({
            ...prev,
            [messageId]: { gemsAwarded: result.gemsAwarded, item: result.item },
          }));
          refreshGameSummary();
          showAppRewards({ gemsAwarded: result.gemsAwarded, item: result.item });
        }
      } catch {
        // Still send message even if reward fails
      }
      sendMessage(`I did the ${title} you suggested!`);
    },
    [sendMessage],
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatMessageEntry }) => {
      const isUser = item.role === 'user';
      const hasSuggest = item.role === 'assistant' && item.suggest;
      const hasGoalCards = item.role === 'assistant' && !!item.goalCards?.length;
      const completed = hasSuggest && completedSuggestions.has(item.id);
      const isStreamingThis = streamingEnabled && item.id === streamingMessageId;
      const streamComplete = !isStreamingThis || streamingRevealedLength >= item.content.length;
      const displayContent = isStreamingThis
        ? item.content.slice(0, streamingRevealedLength)
        : item.content;

      return (
        <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowPet]}>
          <View style={styles.bubbleWrapper}>
            <View
              style={[
                styles.bubble,
                isUser
                  ? { backgroundColor: theme.colors.primary }
                  : { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : theme.colors.surface },
              ]}
            >
              <Text style={[styles.bubbleText, { color: isUser ? theme.colors.onPrimary ?? '#fff' : theme.colors.text }]}>
                {displayContent}
                {isStreamingThis && <BlinkingCursor color={theme.colors.text} />}
              </Text>
            </View>
            {hasSuggest && item.suggest && streamComplete && (
              <View style={{ width: screenWidth * 0.85 }}>
                <SuggestionCard
                  component={item.suggest.component}
                  content={item.suggest.content}
                  title={item.suggest.title}
                  onDone={() => handleSuggestionDone(item.id, item.suggest!.title)}
                  completed={completed}
                  reward={suggestionRewards[item.id]}
                />
              </View>
            )}
            {hasGoalCards && item.goalCards && streamComplete && (
              <View style={{ width: screenWidth * 0.85 }}>
                {item.goalCards.map((card, i) => {
                  const live = goalsState.goals.find((g) => g.id === card.goal.id);
                  const done = live?.completedToday ?? card.goal.completedToday;
                  return (
                    <GoalChatCard
                      key={`${item.id}-${card.goal.id}-${i}`}
                      card={card}
                      completed={done}
                      busy={busyGoalKey === `${item.id}:${card.goal.id}`}
                      onComplete={() => void handleGoalComplete(item.id, card.goal.id, card.goal.title)}
                    />
                  );
                })}
              </View>
            )}
          </View>
        </View>
      );
    },
    [theme, isDark, completedSuggestions, handleSuggestionDone, handleGoalComplete, screenWidth, streamingMessageId, streamingRevealedLength, goalsState.goals, busyGoalKey],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1 },
        // Clips the body while it slides up, so messages can't ride over the header.
        bodyClip: { flex: 1, overflow: 'hidden' },
        chatBody: { flex: 1, paddingBottom: TAB_BAR_CLEARANCE },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          gap: spacing.sm,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
        },
        headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
        avatar: { width: 36, height: 36, overflow: 'hidden' },
        headerTitle: { ...theme.typography.title, fontSize: 18 },
        modalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.xl,
        },
        privacyModal: {
          width: '100%',
          maxWidth: 340,
          borderRadius: 16,
          padding: spacing.xl,
        },
        privacyTitle: { ...theme.typography.title, fontSize: 18, marginBottom: spacing.md },
        privacyBody: { ...theme.typography.body, fontSize: 15, lineHeight: 22, marginBottom: spacing.md },
        privacyStreamRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
        privacyStreamLabel: { fontSize: 15 },
        privacyCloseBtn: {
          paddingVertical: 12,
          borderRadius: 12,
          alignItems: 'center',
        },
        privacyCloseText: { color: '#fff', fontWeight: '600', fontSize: 16 },
        list: { flex: 1 },
        listContent: {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          paddingBottom: spacing.md,
        },
        olderLoader: { paddingVertical: spacing.md, alignItems: 'center' },
        bubbleRow: { marginBottom: spacing.sm },
        bubbleRowUser: { alignItems: 'flex-end' },
        bubbleRowPet: { alignItems: 'flex-start' },
        bubbleWrapper: { maxWidth: '85%' },
        bubble: {
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 18,
          alignSelf: 'flex-start',
        },
        bubbleText: { fontSize: 15, lineHeight: 20 },
        typingBubble: { minWidth: 120, paddingHorizontal: 14, paddingVertical: 10 },
        typingDots: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        typingText: { fontSize: 14 },
        empty: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: spacing.xl,
        },
        emptyText: { ...theme.typography.subtitle, textAlign: 'center' as const },
        errorText: { ...theme.typography.subtitle, color: theme.colors.error, textAlign: 'center' as const },
        inputRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          gap: spacing.sm,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
        },
        inputWrapper: {
          flex: 1,
          minHeight: 44,
          maxHeight: 100,
          justifyContent: 'center',
        },
        input: {
          borderRadius: 22,
          paddingHorizontal: 16,
          paddingVertical: 12,
          fontSize: 16,
          maxHeight: 100,
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
        },
        sendBtn: {
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.primary,
        },
      }),
    [theme, isDark],
  );

  if (!user?.pet) {
    return (
      <GradientBackground bubbleCount={3}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Set up your pet first to start chatting!</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground bubbleCount={3}>
      <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.avatar}>
                <CachedImage
                  source={pet?.imageUrl ? { uri: pet.imageUrl } : null}
                  style={[StyleSheet.absoluteFill, { transform: [{ scaleX: -1 }] }]}
                  resizeMode="cover"
                />
              </View>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{petName}</Text>
            </View>
            <View style={styles.headerRight}>
              <Pressable
                onPress={() => setPrivacyModalVisible(true)}
                hitSlop={8}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              >
                <Ionicons name="help-circle-outline" size={22} color={theme.colors.textMuted} />
              </Pressable>
            </View>
          </View>

          <Modal visible={privacyModalVisible} transparent animationType="fade">
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setPrivacyModalVisible(false)}
            >
              <Pressable style={[styles.privacyModal, { backgroundColor: isDark ? 'rgba(28,28,30,0.98)' : '#fff' }]} onPress={(e) => e.stopPropagation()}>
                <Text style={[styles.privacyTitle, { color: theme.colors.text }]}>Privacy & Info</Text>
                <Text style={[styles.privacyBody, { color: theme.colors.text }]}>
                  Your chat messages are stored in our database to enable conversation history and continuity with your pet. We do not read, sell, or share your chat history with anyone. Your data is used solely to provide and improve your experience within the app.
                </Text>
                <Text style={[styles.privacyBody, { color: theme.colors.text }]}>
                  Any health-related information your pet provides may not be accurate. Please consult a qualified healthcare professional for medical advice.
                </Text>
                <View style={styles.privacyStreamRow}>
                  <Text style={[styles.privacyStreamLabel, { color: theme.colors.text }]}>Stream replies</Text>
                  <Switch
                    value={streamingEnabled}
                    onValueChange={setStreamingEnabledWithStore}
                    trackColor={{ false: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)', true: theme.colors.primary }}
                    thumbColor="#fff"
                  />
                </View>
                <Pressable
                  style={[styles.privacyCloseBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={() => setPrivacyModalVisible(false)}
                >
                  <Text style={styles.privacyCloseText}>Got it</Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>

          {loading ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <View style={styles.bodyClip}>
            <Animated.View style={[styles.chatBody, keyboardShiftStyle]}>
              {error && (
                <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              {messages.length === 0 ? (
                <View style={styles.empty}>
                  {needsMoodToday ? (
                    <View style={{ width: screenWidth * 0.85 }}>
                      <MoodPickerCard
                        onSelect={handleMoodSelect}
                        subtitle={loggingMood ? 'Logging...' : undefined}
                      />
                    </View>
                  ) : (
                    <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Say hi to {petName}!</Text>
                  )}
                </View>
              ) : (
                <FlatList
                  ref={listRef}
                  inverted
                  data={invertedMessages}
                  keyExtractor={(m) => m.id}
                  renderItem={renderItem}
                  style={styles.list}
                  contentContainerStyle={styles.listContent}
                  onEndReached={loadOlder}
                  onEndReachedThreshold={0.4}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="interactive"
                  showsVerticalScrollIndicator={false}
                  // Keep the mounted cell count small — this screen stays mounted
                  // behind the other tabs, and every mounted node adds to the cost
                  // of each Fabric commit app-wide.
                  initialNumToRender={12}
                  maxToRenderPerBatch={8}
                  windowSize={5}
                  removeClippedSubviews={Platform.OS === 'android'}
                  // Inverted: the "header" sits at the visual bottom, next to the input.
                  ListHeaderComponent={
                    <>
                      {sending && (
                        <View style={[styles.bubbleRow, styles.bubbleRowPet]}>
                          <View style={styles.bubbleWrapper}>
                            <View
                              style={[
                                styles.bubble,
                                styles.typingBubble,
                                { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : theme.colors.surface },
                              ]}
                            >
                              <View style={styles.typingDots}>
                                <ActivityIndicator size="small" color={theme.colors.textMuted} />
                                <Text style={[styles.typingText, { color: theme.colors.textMuted }]}>
                                  {petName} is thinking...
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      )}
                      {needsMoodToday && (
                        <View style={{ paddingBottom: spacing.sm }}>
                          <View style={{ width: screenWidth * 0.85 }}>
                            <MoodPickerCard
                              onSelect={handleMoodSelect}
                              subtitle={loggingMood ? 'Logging...' : undefined}
                            />
                          </View>
                        </View>
                      )}
                    </>
                  }
                  // Inverted: the "footer" sits at the visual top, where older messages load in.
                  ListFooterComponent={
                    loadingOlder ? (
                      <View style={styles.olderLoader}>
                        <ActivityIndicator size="small" color={theme.colors.textMuted} />
                      </View>
                    ) : null
                  }
                />
              )}

              <View style={styles.inputRow}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, { color: theme.colors.text }]}
                  placeholder="Message..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={text}
                  onChangeText={(v) => setText(v.slice(0, MAX_LENGTH))}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                  maxLength={MAX_LENGTH}
                  multiline
                  editable={!sending}
                  {...(Platform.OS === 'android' && { includeFontPadding: false })}
                />
                </View>
                <Pressable
                  style={({ pressed }) => [styles.sendBtn, pressed && { opacity: 0.8 }]}
                  onPress={handleSend}
                  disabled={!text.trim() || sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color={theme.colors.onPrimary ?? '#fff'} />
                  ) : (
                    <Ionicons name="send" size={20} color={theme.colors.onPrimary ?? '#fff'} />
                  )}
                </Pressable>
              </View>
            </Animated.View>
            </View>
          )}
      </SafeAreaView>
    </GradientBackground>
  );
}
