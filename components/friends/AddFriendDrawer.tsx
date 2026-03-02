import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { api, type FriendUser, type FriendEntry } from '@/lib/api';
import { useFriends } from '@/store/FriendsProvider';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AddFriendDrawerRef {
  open: () => void;
  close: () => void;
}

type Tab = 'search' | 'received' | 'sent';

const DEBOUNCE_MS = 400;

// ─── Chip Tab Bar ───────────────────────────────────────────────────────────

function ChipBar({
  active,
  onChange,
  receivedCount,
  sentCount,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  receivedCount: number;
  sentCount: number;
}) {
  const { theme } = useTheme();
  const { colors } = theme;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'search', label: 'Search' },
    { key: 'received', label: 'Received', count: receivedCount },
    { key: 'sent', label: 'Sent', count: sentCount },
  ];

  return (
    <View style={chipStyles.row}>
      {tabs.map(({ key, label, count }) => {
        const isActive = active === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={[
              chipStyles.chip,
              { backgroundColor: isActive ? colors.primary : colors.surfaceElevated },
              !isActive && { borderWidth: 1, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                chipStyles.chipText,
                { color: isActive ? '#fff' : colors.textSecondary },
              ]}
            >
              {label}
              {count != null && count > 0 ? ` (${count})` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginBottom: spacing.base },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  chipText: { fontSize: 13, fontWeight: '700' },
});

// ─── User Row (shared between search results, received, sent) ───────────────

function UserRow({
  avatar,
  name,
  subtitle,
  right,
}: {
  avatar: string | undefined;
  name: string;
  subtitle?: string;
  right: React.ReactNode;
}) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={[rowStyles.row, { borderBottomColor: colors.border }]}>
      <View style={[rowStyles.avatar, { backgroundColor: colors.border + '60' }]}>
        {avatar ? (
          <CachedImage source={{ uri: avatar }} style={rowStyles.avatarImg} />
        ) : (
          <Text style={rowStyles.avatarEmoji}>👤</Text>
        )}
      </View>
      <View style={rowStyles.body}>
        <Text style={[rowStyles.name, { color: colors.text }]} numberOfLines={1}>{name}</Text>
        {subtitle ? (
          <Text style={[rowStyles.sub, { color: colors.textMuted }]} numberOfLines={1}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarEmoji: { fontSize: 20 },
  body: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700' },
  sub: { fontSize: 12, marginTop: 1 },
});

// ─── Component ──────────────────────────────────────────────────────────────

export const AddFriendDrawer = forwardRef<AddFriendDrawerRef, { onAdd?: () => void }>(
  function AddFriendDrawer({ onAdd }, ref) {
    const { theme } = useTheme();
    const { colors } = theme;
    const drawerRef = useRef<AppDrawerRef>(null);
    const { received, sent, respondToRequest, removeFriend, refresh } = useFriends();

    // Search state
    const [activeTab, setActiveTab] = useState<Tab>('search');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<FriendUser[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const searchTimer = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => () => clearTimeout(searchTimer.current), []);

    useImperativeHandle(ref, () => ({
      open: () => {
        setActiveTab('search');
        setQuery('');
        setResults([]);
        setError(null);
        drawerRef.current?.open();
      },
      close: () => drawerRef.current?.close(),
    }));

    // ── Search ────────────────────────────────────────────────────────────

    const performSearch = useCallback(async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) { setResults([]); return; }
      setIsSearching(true);
      setError(null);
      try {
        setResults(await api.searchFriends(trimmed));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Search failed');
      } finally {
        setIsSearching(false);
      }
    }, []);

    const handleQueryChange = useCallback(
      (text: string) => {
        setQuery(text);
        clearTimeout(searchTimer.current);
        if (!text.trim()) { setResults([]); return; }
        searchTimer.current = setTimeout(() => performSearch(text), DEBOUNCE_MS);
      },
      [performSearch],
    );

    const handleSendRequest = useCallback(
      async (userId: string) => {
        Keyboard.dismiss();
        setSendingId(userId);
        setError(null);
        try {
          await api.sendFriendRequest(userId);
          setResults((prev) => prev.filter((u) => u.id !== userId));
          onAdd?.();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Could not send request');
        } finally {
          setSendingId(null);
        }
      },
      [onAdd],
    );

    // ── Respond / Remove ──────────────────────────────────────────────────

    const handleAccept = useCallback(
      async (id: string) => {
        await respondToRequest(id, 'accepted');
        refresh();
      },
      [respondToRequest, refresh],
    );

    const handleReject = useCallback(
      async (id: string) => {
        await respondToRequest(id, 'rejected');
        refresh();
      },
      [respondToRequest, refresh],
    );

    const handleCancelSent = useCallback(
      async (userId: string) => {
        await removeFriend(userId);
        refresh();
      },
      [removeFriend, refresh],
    );

    // ── Styles ────────────────────────────────────────────────────────────

    const st = useMemo(
      () =>
        StyleSheet.create({
          inner: { gap: spacing.base, paddingBottom: spacing.base },
          searchWrap: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 12,
            gap: 8,
            marginBottom: spacing.base,
          },
          searchInput: {
            flex: 1,
            fontSize: 15,
            fontWeight: '600',
            color: colors.text,
            paddingVertical: 10,
          },
          card: {
            backgroundColor: colors.surfaceElevated,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
          },
          errorBanner: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            padding: 12,
            borderRadius: radius.md,
            backgroundColor: `${colors.error}20`,
            marginBottom: spacing.base,
          },
          errorText: { fontSize: 13, fontWeight: '600', color: colors.error },
          centered: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: spacing['3xl'],
            gap: spacing.base,
          },
          centeredText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
          addBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: radius.md,
            backgroundColor: colors.primary,
          },
          addBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
          acceptBtn: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#34D399',
            alignItems: 'center',
            justifyContent: 'center',
          },
          rejectBtn: {
            width: 36,
            height: 36,
            borderRadius: 18,
            borderWidth: 2,
            borderColor: colors.error,
            alignItems: 'center',
            justifyContent: 'center',
          },
          actionRow: { flexDirection: 'row', gap: 8 },
          cancelBtn: {
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
          },
          cancelText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
        }),
      [colors],
    );

    // ── Tab content renderers ─────────────────────────────────────────────

    const renderSearch = () => (
      <>
        <View style={st.searchWrap}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <BottomSheetTextInput
            style={st.searchInput}
            value={query}
            onChangeText={handleQueryChange}
            placeholder="Phone or username..."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(''); setResults([]); }} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {isSearching ? (
          <View style={st.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : results.length > 0 ? (
          <View style={st.card}>
            {results.map((user) => {
              const busy = sendingId === user.id;
              return (
                <UserRow
                  key={user.id}
                  avatar={user.pet?.imageUrl}
                  name={user.username ?? user.phone}
                  subtitle={user.username ? user.phone : undefined}
                  right={
                    <Pressable
                      onPress={() => handleSendRequest(user.id)}
                      disabled={busy}
                      style={({ pressed }) => [st.addBtn, pressed && { opacity: 0.8 }, busy && { opacity: 0.5 }]}
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="person-add" size={14} color="#fff" />
                          <Text style={st.addBtnText}>Add</Text>
                        </>
                      )}
                    </Pressable>
                  }
                />
              );
            })}
          </View>
        ) : query.trim() ? (
          <View style={st.centered}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={st.centeredText}>No users found. Try a different search.</Text>
          </View>
        ) : (
          <View style={st.centered}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} />
            <Text style={st.centeredText}>Search by phone or username.</Text>
          </View>
        )}
      </>
    );

    const renderReceived = () =>
      received.length === 0 ? (
        <View style={st.centered}>
          <Ionicons name="mail-outline" size={48} color={colors.textMuted} />
          <Text style={st.centeredText}>No pending requests.</Text>
        </View>
      ) : (
        <View style={st.card}>
          {received.map((entry) => (
            <UserRow
              key={entry.id}
              avatar={entry.user.pet?.imageUrl}
              name={entry.user.username ?? entry.user.phone}
              subtitle={entry.user.username ? entry.user.phone : undefined}
              right={
                <View style={st.actionRow}>
                  <Pressable
                    onPress={() => handleAccept(entry.id)}
                    style={({ pressed }) => [st.acceptBtn, pressed && { opacity: 0.7 }]}
                  >
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  </Pressable>
                  <Pressable
                    onPress={() => handleReject(entry.id)}
                    style={({ pressed }) => [st.rejectBtn, pressed && { opacity: 0.7 }]}
                  >
                    <Ionicons name="close" size={18} color={colors.error} />
                  </Pressable>
                </View>
              }
            />
          ))}
        </View>
      );

    const renderSent = () =>
      sent.length === 0 ? (
        <View style={st.centered}>
          <Ionicons name="paper-plane-outline" size={48} color={colors.textMuted} />
          <Text style={st.centeredText}>No pending sent requests.</Text>
        </View>
      ) : (
        <View style={st.card}>
          {sent.map((entry) => (
            <UserRow
              key={entry.id}
              avatar={entry.user.pet?.imageUrl}
              name={entry.user.username ?? entry.user.phone}
              subtitle={entry.user.username ? entry.user.phone : undefined}
              right={
                <Pressable
                  onPress={() => handleCancelSent(entry.user.id)}
                  style={({ pressed }) => [st.cancelBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={st.cancelText}>Cancel</Text>
                </Pressable>
              }
            />
          ))}
        </View>
      );

    return (
      <AppDrawer ref={drawerRef} title="Add Friend" snapPoints={['75%']} scrollable showCloseButton>
        <View style={st.inner}>
          <ChipBar
            active={activeTab}
            onChange={setActiveTab}
            receivedCount={received.length}
            sentCount={sent.length}
          />

          {error && (
            <View style={st.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={st.errorText}>{error}</Text>
            </View>
          )}

          {activeTab === 'search' && renderSearch()}
          {activeTab === 'received' && renderReceived()}
          {activeTab === 'sent' && renderSent()}
        </View>
      </AppDrawer>
    );
  },
);
