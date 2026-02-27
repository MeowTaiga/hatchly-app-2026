import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ChatMessage } from './types';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  myUserId?: string;
}

const MAX_LENGTH = 200;

export function ChatPanel({ messages, onSend, myUserId }: ChatPanelProps) {
  const { theme, themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const listRef = useRef<FlatList>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  }, [text, onSend]);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isMe = item.userId === myUserId;
      return (
        <View style={styles.msgRow}>
          <Text style={[styles.msgName, { color: isMe ? theme.colors.primary : theme.colors.textMuted }]}>
            {item.username}
          </Text>
          <Text style={[styles.msgText, { color: theme.colors.text }]}>{item.text}</Text>
        </View>
      );
    },
    [myUserId, theme],
  );

  if (collapsed) {
    return (
      <Pressable
        style={[styles.collapsedBtn, { backgroundColor: isDark ? 'rgba(28,28,30,0.85)' : 'rgba(255,255,255,0.85)' }]}
        onPress={() => setCollapsed(false)}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.colors.text} />
      </Pressable>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(28,28,30,0.85)' : 'rgba(255,255,255,0.85)',
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Chat</Text>
        <Pressable onPress={() => setCollapsed(true)} hitSlop={8}>
          <Ionicons name="chevron-down" size={18} color={theme.colors.textMuted} />
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.inputRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
        <TextInput
          style={[styles.input, { color: theme.colors.text, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
          placeholder="Say something..."
          placeholderTextColor={theme.colors.textMuted}
          value={text}
          onChangeText={(v) => setText(v.slice(0, MAX_LENGTH))}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          maxLength={MAX_LENGTH}
        />
        <Pressable style={[styles.sendBtn, { backgroundColor: theme.colors.primary }]} onPress={handleSend}>
          <Ionicons name="send" size={16} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 8,
    bottom: 80,
    width: 220,
    maxHeight: 280,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  collapsedBtn: {
    position: 'absolute',
    left: 8,
    bottom: 80,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  messageList: {
    flex: 1,
    maxHeight: 180,
  },
  messageListContent: {
    paddingHorizontal: 10,
    paddingBottom: 4,
  },
  msgRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 3,
    gap: 4,
  },
  msgName: {
    fontSize: 11,
    fontWeight: '700',
  },
  msgText: {
    fontSize: 11,
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  input: {
    flex: 1,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
    fontSize: 12,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
