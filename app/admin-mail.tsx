import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ItemSearchDropdown, type SearchableItem } from '@/components/ui/ItemSearchDropdown';
import { api, type AdminGameItem } from '@/lib/api';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';

export default function AdminMailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors, typography, shadows } = theme;
  const [toUserId, setToUserId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachedItems, setAttachedItems] = useState<Array<{ itemType: string; qty: number }>>([]);
  const [addItemType, setAddItemType] = useState('');
  const [addQty, setAddQty] = useState('1');
  const searchableItems: SearchableItem[] = useMemo(
    () => itemDefs.map((i) => ({ key: i.itemType, label: i.label || i.itemType, imageUrl: i.imageUrl })),
    [itemDefs],
  );
  const [sending, setSending] = useState(false);
  const [itemDefs, setItemDefs] = useState<AdminGameItem[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string }[]>([]);
  const [searching, setSearching] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const items = await api.getGameItems();
      setItemDefs(items);
    } catch {
      setItemDefs([]);
    }
  }, []);

  React.useEffect(() => {
    loadItems();
  }, [loadItems]);

  const doUserSearch = useCallback(async () => {
    const q = userSearch.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const users = await api.adminSearchUsers(q);
      setSearchResults(users);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [userSearch]);

  const handleAddAttachment = useCallback(() => {
    const itemType = addItemType.trim();
    const qty = parseInt(addQty, 10);
    if (!itemType || isNaN(qty) || qty < 1) return;
    setAttachedItems((prev) => {
      const existing = prev.find((i) => i.itemType === itemType);
      if (existing) {
        return prev.map((i) =>
          i.itemType === itemType ? { ...i, qty: i.qty + qty } : i,
        );
      }
      return [...prev, { itemType, qty }];
    });
    setAddItemType('');
    setAddQty('1');
  }, [addItemType, addQty]);

  const handleRemoveAttachment = useCallback((itemType: string) => {
    setAttachedItems((prev) => prev.filter((i) => i.itemType !== itemType));
  }, []);

  const handleSend = useCallback(async () => {
    const sub = subject.trim();
    const b = body.trim();
    if (!sub || !b) {
      Alert.alert('Missing fields', 'Subject and body are required.');
      return;
    }
    const isBroadcast = !toUserId.trim();
    if (!isBroadcast && toUserId.trim().length < 10) {
      Alert.alert('Invalid user', 'Enter a valid user ID or search for a user.');
      return;
    }
    setSending(true);
    try {
      await api.sendAdminMail({
        toUserId: isBroadcast ? undefined : toUserId.trim(),
        subject: sub,
        body: b,
        attachedItems: attachedItems.length ? attachedItems : undefined,
      });
      Alert.alert(
        'Sent',
        isBroadcast ? 'Mail sent to all users.' : 'Mail sent to user.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to send mail');
    } finally {
      setSending(false);
    }
  }, [toUserId, subject, body, attachedItems, router]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        headerTitle: { flex: 1, textAlign: 'center', ...typography.title, fontSize: 20 },
        section: { marginBottom: spacing.xl },
        label: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 },
        input: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: 14,
          fontSize: 15,
          color: colors.text,
          backgroundColor: colors.surface,
        },
        textArea: { minHeight: 120, textAlignVertical: 'top' as const },
        searchRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
        searchBtn: {
          backgroundColor: colors.primary,
          borderRadius: radius.md,
          paddingHorizontal: 16,
          justifyContent: 'center',
        },
        userChip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingVertical: 8,
          paddingHorizontal: 12,
          backgroundColor: colors.border + '40',
          borderRadius: radius.md,
          marginBottom: 6,
        },
        attachRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
        },
        attachChip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 6,
          paddingHorizontal: 10,
          backgroundColor: colors.border + '40',
          borderRadius: radius.md,
        },
        sendBtn: {
          backgroundColor: colors.primary,
          borderRadius: radius.lg,
          paddingVertical: 16,
          alignItems: 'center',
          marginTop: spacing.lg,
        },
        sendBtnText: { ...typography.button, fontSize: 16, color: '#fff' },
        broadcastNote: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
      }),
    [colors, typography],
  );

  return (
    <GradientBackground bubbleCount={3}>
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Send Mail</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.label}>To (leave empty to broadcast to all users)</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="User ID or search username..."
              placeholderTextColor={colors.textMuted}
              value={userSearch}
              onChangeText={setUserSearch}
            />
            <Pressable style={styles.searchBtn} onPress={doUserSearch}>
              {searching ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendBtnText}>Search</Text>
              )}
            </Pressable>
          </View>
          {searchResults.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              {searchResults.map((u) => (
                <Pressable
                  key={u.id}
                  style={styles.userChip}
                  onPress={() => {
                    setToUserId(u.id);
                    setUserSearch(u.username);
                    setSearchResults([]);
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                    {u.username}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>{u.id}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {toUserId ? (
            <View style={styles.attachChip}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                To: {toUserId.slice(0, 8)}...
              </Text>
              <Pressable onPress={() => setToUserId('')}>
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : (
            <Text style={styles.broadcastNote}>Broadcast mode — all users will receive this mail.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Subject</Text>
          <TextInput
            style={styles.input}
            placeholder="Subject"
            placeholderTextColor={colors.textMuted}
            value={subject}
            onChangeText={setSubject}
            maxLength={200}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Message</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Write your message..."
            placeholderTextColor={colors.textMuted}
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={2000}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Attach items (optional)</Text>
          {attachedItems.map(({ itemType, qty }) => (
            <View key={itemType} style={[styles.attachRow, { justifyContent: 'space-between' }]}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                {itemType} ×{qty}
              </Text>
              <Pressable onPress={() => handleRemoveAttachment(itemType)}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </Pressable>
            </View>
          ))}
          <View style={styles.attachRow}>
            <View style={{ flex: 1 }}>
              <ItemSearchDropdown
                items={searchableItems}
                value={addItemType}
                onSelect={setAddItemType}
                placeholder="Search items…"
                allowCustom
              />
            </View>
            <TextInput
              style={[styles.input, { width: 60 }]}
              placeholder="qty"
              placeholderTextColor={colors.textMuted}
              value={addQty}
              onChangeText={setAddQty}
              keyboardType="number-pad"
            />
            <Pressable style={styles.searchBtn} onPress={handleAddAttachment}>
              <Text style={styles.sendBtnText}>Add</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          style={[styles.sendBtn, sending && { opacity: 0.6 }]}
          onPress={handleSend}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendBtnText}>
              {toUserId.trim() ? 'Send to User' : 'Broadcast to All'}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </GradientBackground>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },
});
