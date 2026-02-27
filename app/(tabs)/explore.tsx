import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
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
import { api, type ChatMessageEntry } from '@/lib/api';
import { SuggestionCard } from '@/components/chat/SuggestionCard';
import { MoodPickerCard } from '@/components/chat/MoodPickerCard';
import { MOOD_OPTIONS } from '@/components/chat/moodOptions';
import { useGameSummary } from '@/hooks/useGameSummary';
import { useToast } from '@/store/ToastProvider';
import { spacing } from '@/constants/theme';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';

const STREAMING_PREF_KEY = 'chat_streaming_enabled';

const MAX_LENGTH = 500;
const STREAMING_CHAR_MS = 15;

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
  const { user } = useAuth();
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
  const listRef = useRef<FlatList>(null);
  const hasInitiallyScrolled = useRef(false);

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

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setStreamingMessageId(null);
      const { messages: msgs, needsMoodToday: needs } = await api.getChatHistory();
      setMessages(msgs);
      setNeedsMoodToday(needs);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load chat');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.pet) {
      loadHistory();
    } else {
      setLoading(false);
      setMessages([]);
    }
  }, [user?.pet, loadHistory]);

  useFocusEffect(
    useCallback(() => {
      hasInitiallyScrolled.current = false;
      // When navigating to this tab from another, scroll to bottom immediately with no animation
      const t = setTimeout(() => {
        if (listRef.current && messages.length > 0) {
          listRef.current.scrollToEnd({ animated: false });
        }
      }, 0);
      return () => clearTimeout(t);
    }, [messages.length]),
  );

  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
    });
    return () => sub.remove();
  }, []);

  const scrollToEnd = useCallback((animated: boolean) => {
    if (listRef.current && messages.length > 0) {
      listRef.current.scrollToEnd({ animated });
    }
  }, [messages.length]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      const animate = hasInitiallyScrolled.current;
      const t = setTimeout(() => {
        scrollToEnd(animate);
        hasInitiallyScrolled.current = true;
      }, 50);
      return () => clearTimeout(t);
    }
  }, [loading, messages.length, scrollToEnd]);

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

      try {
        const { message, reply } = await api.sendChatMessage(contentToSend.trim());
        setMessages((prev) => {
          const withoutOpt = prev.filter((m) => m.id !== optimisticUserMsg.id);
          return [...withoutOpt, message, reply];
        });
        if (streamingEnabled) {
          setStreamingRevealedLength(0);
          setStreamingMessageId(reply.id);
        }
      } catch (err: any) {
        setError(err?.message ?? 'Failed to send');
        setMessages((prev) => prev.filter((m) => m.id !== optimisticUserMsg.id));
      } finally {
        setSending(false);
      }
    },
    [sending, user?.pet, streamingEnabled],
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
        const { xpGained, gemsAwarded } = await api.logMood(moodId);
        setNeedsMoodToday(false);
        refreshGameSummary();
        const parts: string[] = [];
        if (xpGained > 0) parts.push(`+${xpGained} XP`);
        if (gemsAwarded > 0) parts.push(`+${gemsAwarded} gems`);
        if (parts.length) toast(parts.join(' · '), 'success');
        const label = MOOD_OPTIONS.find((o) => o.id === moodId)?.label ?? moodId;
        sendMessage(`I'm feeling ${label.toLowerCase()} today!`);
      } catch (err: any) {
        toast(err?.message ?? 'Failed to log mood', 'error');
      } finally {
        setLoggingMood(false);
      }
    },
    [loggingMood, user?.pet, sendMessage, refreshGameSummary, toast],
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
          const parts: string[] = [];
          if (result.gemsAwarded > 0) parts.push(`+${result.gemsAwarded} gems`);
          if (result.item) parts.push(result.item.label);
          if (parts.length) toast(parts.join(' · '), 'success');
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
          </View>
        </View>
      );
    },
    [theme, isDark, completedSuggestions, handleSuggestionDone, screenWidth, streamingMessageId, streamingRevealedLength],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1 },
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
          paddingBottom: TAB_BAR_TOTAL_HEIGHT + spacing.sm + 10,
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
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={-70}
      >
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
            <>
              {error && (
                <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(m) => m.id}
                renderItem={renderItem}
                style={styles.list}
                contentContainerStyle={[
                  styles.listContent,
                  messages.length === 0 && !needsMoodToday && { flexGrow: 1, justifyContent: 'flex-end' },
                  messages.length === 0 && needsMoodToday && { flexGrow: 1 },
                ]}
                onContentSizeChange={() => {
                  const animate = hasInitiallyScrolled.current;
                  listRef.current?.scrollToEnd({ animated: animate });
                  if (messages.length > 0) hasInitiallyScrolled.current = true;
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                  needsMoodToday ? (
                    <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
                      <View style={{ width: screenWidth * 0.85 }}>
                        <MoodPickerCard
                          onSelect={handleMoodSelect}
                          subtitle={loggingMood ? 'Logging...' : undefined}
                        />
                      </View>
                    </View>
                  ) : null
                }
                ListEmptyComponent={
                  !needsMoodToday ? (
                    <View style={styles.empty}>
                      <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Say hi to {petName}!</Text>
                    </View>
                  ) : null
                }
                ListFooterComponent={
                  sending ? (
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
                  ) : null
                }
              />

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
            </>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}
