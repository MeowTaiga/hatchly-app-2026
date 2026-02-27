/**
 * MailBoxDrawer — Inbox and compose mail.
 * Opened by interacting with the mail_box placement on the farm.
 */

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
  useMemo,
  useState,
  useEffect,
} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { CachedImage } from '@/components/ui/CachedImage';
import { useTheme } from '@/store/ThemeProvider';
import { useFriends } from '@/store/FriendsProvider';
import { api, type ApiMailEntry } from '@/lib/api';
import { useHoldToAdd } from '@/hooks/useHoldToAdd';
import { spacing } from '@/constants/theme';
import type { ItemDefinition, InventorySlot } from './types';

export interface MailBoxDrawerRef {
  open: () => void;
  close: () => void;
}

type Tab = 'inbox' | 'compose';

const MAX_ATTACHMENTS = 6;
const HOLD_DELAY_MS = 400;
const HOLD_INTERVAL_MS = 150;

interface MailBoxDrawerProps {
  itemDefs: Record<string, ItemDefinition>;
  inventory: InventorySlot[];
  onRefreshGame?: () => void;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

export const MailBoxDrawer = forwardRef<MailBoxDrawerRef, MailBoxDrawerProps>(
  function MailBoxDrawer({ itemDefs, inventory, onRefreshGame }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const { theme } = useTheme();
    const { friends } = useFriends();
    const colors = theme.colors;

    const [tab, setTab] = useState<Tab>('inbox');
    const [mail, setMail] = useState<ApiMailEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedMail, setSelectedMail] = useState<ApiMailEntry | null>(null);
    const [claiming, setClaiming] = useState<string | null>(null);

    // Compose state
    const [toUserId, setToUserId] = useState<string | null>(null);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [attachedItems, setAttachedItems] = useState<Array<{ itemType: string; qty: number }>>([]);
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);

    const acceptedFriends = useMemo(
      () => friends.filter((f) => f.status === 'accepted'),
      [friends],
    );

    const fetchInbox = useCallback(async () => {
      setLoading(true);
      try {
        const { mail: inbox } = await api.getMailInbox();
        setMail(inbox);
      } catch {
        setMail([]);
      } finally {
        setLoading(false);
      }
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        open: () => {
          setTab('inbox');
          setSelectedMail(null);
          setToUserId(null);
          setSubject('');
          setBody('');
          setAttachedItems([]);
          setSendError(null);
          drawerRef.current?.open();
          fetchInbox();
        },
        close: () => drawerRef.current?.close(),
      }),
      [fetchInbox],
    );

    const handleClaim = useCallback(
      async (m: ApiMailEntry) => {
        if (m.claimedAt || claiming) return;
        setClaiming(m._id);
        try {
          await api.claimMail(m._id);
          onRefreshGame?.();
          await fetchInbox();
          setSelectedMail(null);
        } catch {
          // ignore
        } finally {
          setClaiming(null);
        }
      },
      [claiming, onRefreshGame, fetchInbox],
    );

    const addAttachment = useCallback((itemType: string) => {
      setAttachedItems((prev) => {
        const slot = inventory.find((s) => s.itemType === itemType);
        const maxQty = slot?.qty ?? 0;
        const existing = prev.find((i) => i.itemType === itemType);
        const currentInSelected = existing?.qty ?? 0;
        if (currentInSelected >= maxQty) return prev;
        if (prev.length >= MAX_ATTACHMENTS && !existing) return prev;
        if (existing) {
          return prev.map((i) =>
            i.itemType === itemType ? { ...i, qty: Math.min(i.qty + 1, maxQty) } : i,
          );
        }
        return [...prev, { itemType, qty: 1 }];
      });
    }, [inventory]);

    const removeAttachment = useCallback((itemType: string) => {
      setAttachedItems((prev) => {
        const existing = prev.find((i) => i.itemType === itemType);
        if (!existing) return prev;
        if (existing.qty <= 1) return prev.filter((i) => i.itemType !== itemType);
        return prev.map((i) =>
          i.itemType === itemType ? { ...i, qty: i.qty - 1 } : i,
        );
      });
    }, []);

    const { handlePressIn, handlePressOut, handlePress } = useHoldToAdd(addAttachment, {
      holdDelayMs: HOLD_DELAY_MS,
      holdIntervalMs: HOLD_INTERVAL_MS,
    });

    const availableSlots = useMemo(() => {
      const selectedMap = new Map(attachedItems.map((s) => [s.itemType, s.qty]));
      return inventory
        .map((slot) => {
          const selectedQty = selectedMap.get(slot.itemType) ?? 0;
          const remaining = slot.qty - selectedQty;
          if (remaining <= 0) return null;
          return { ...slot, qty: remaining };
        })
        .filter((s): s is InventorySlot => s != null);
    }, [inventory, attachedItems]);

    const handleSend = useCallback(async () => {
      if (!toUserId || !subject.trim() || !body.trim()) {
        setSendError('Please select a friend, add a subject, and write a message.');
        return;
      }
      setSending(true);
      setSendError(null);
      try {
        await api.sendMail({
          toUserId,
          subject: subject.trim(),
          body: body.trim(),
          attachedItems: attachedItems.length ? attachedItems : undefined,
        });
        setTab('inbox');
        setToUserId(null);
        setSubject('');
        setBody('');
        setAttachedItems([]);
        fetchInbox();
      } catch (err) {
        setSendError(err instanceof Error ? err.message : 'Failed to send mail');
      } finally {
        setSending(false);
      }
    }, [toUserId, subject, body, attachedItems, fetchInbox]);

    const cardShadow = useMemo(
      () =>
        Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
          },
          android: { elevation: 2 },
        }) as object,
      [],
    );

    const styles = useMemo(
      () =>
        StyleSheet.create({
          tabRow: {
            flexDirection: 'row',
            gap: 8,
            marginBottom: spacing.lg,
          },
          tab: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 20,
            backgroundColor: colors.border + '80',
          },
          tabActive: { backgroundColor: colors.primary },
          tabText: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
          tabTextActive: { color: colors.onPrimary ?? '#fff' },
          mailCard: {
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 14,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: colors.border,
            ...cardShadow,
          },
          mailRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          },
          mailSubject: { fontSize: 16, fontWeight: '700', color: colors.text },
          mailFrom: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 4 },
          mailDate: { fontSize: 11, color: colors.textMuted },
          emptyText: { fontSize: 15, color: colors.textMuted, textAlign: 'center', paddingVertical: 48 },
          detailBack: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: spacing.lg,
            paddingVertical: 8,
          },
          detailBody: { fontSize: 15, color: colors.text, lineHeight: 22 },
          detailAttachments: {
            marginTop: spacing.lg,
            paddingTop: spacing.md,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
          },
          attachLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: spacing.sm },
          attachRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
          attachChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 8,
            backgroundColor: colors.border + '40',
          },
          claimBtn: {
            marginTop: spacing.lg,
            backgroundColor: colors.primary,
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: 'center',
          },
          claimBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
          input: {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            padding: 14,
            fontSize: 15,
            color: colors.text,
            marginBottom: spacing.md,
          },
          inputLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 },
          friendRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: spacing.md,
          },
          friendChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 12,
            backgroundColor: colors.border + '80',
          },
          friendChipActive: { backgroundColor: colors.primary },
          friendChipText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
          friendChipTextActive: { color: colors.onPrimary ?? '#fff' },
          sendBtn: {
            backgroundColor: colors.primary,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
            marginTop: spacing.md,
          },
          sendBtnDisabled: { opacity: 0.5 },
          errorText: { fontSize: 13, color: '#e74c3c', marginTop: spacing.sm },
          attachGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
          attachSlot: {
            width: 48,
            height: 48,
            borderRadius: 8,
            backgroundColor: colors.border + '30',
            borderWidth: 2,
            borderColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          },
          attachSlotEmpty: { borderStyle: 'dashed', borderColor: colors.border },
        }),
      [colors, cardShadow],
    );

    const content = selectedMail ? (
      <View style={{ paddingBottom: spacing.xl * 2 }}>
        <Pressable style={styles.detailBack} onPress={() => setSelectedMail(null)}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={[styles.mailSubject, { color: colors.primary, fontSize: 16 }]}>Back</Text>
        </Pressable>
        <Text style={styles.mailSubject}>{selectedMail.subject}</Text>
        <Text style={styles.mailFrom}>From: {selectedMail.fromUsername ?? 'Unknown'}</Text>
        <Text style={styles.mailDate}>{formatDate(selectedMail.sentAt)}</Text>
        <Text style={[styles.detailBody, { marginTop: spacing.md }]}>{selectedMail.body}</Text>
        {selectedMail.attachedItems?.length ? (
          <View style={styles.detailAttachments}>
            <Text style={styles.attachLabel}>Attachments</Text>
            <View style={styles.attachRow}>
              {selectedMail.attachedItems.map(({ itemType, qty }) => {
                const def = itemDefs[itemType];
                return (
                  <View key={itemType} style={styles.attachChip}>
                    {def?.imageUrl ? (
                      <CachedImage source={{ uri: def.imageUrl }} style={{ width: 24, height: 24 }} />
                    ) : null}
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                      {def?.label ?? itemType} ×{qty}
                    </Text>
                  </View>
                );
              })}
            </View>
            {!selectedMail.claimedAt && (
              <Pressable
                style={styles.claimBtn}
                onPress={() => handleClaim(selectedMail)}
                disabled={!!claiming}
              >
                {claiming === selectedMail._id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.claimBtnText}>Claim Items</Text>
                )}
              </Pressable>
            )}
          </View>
        ) : null}
      </View>
    ) : tab === 'inbox' ? (
      <View style={{ paddingBottom: spacing.xl * 2 }}>
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tab, styles.tabActive]}
            onPress={() => setTab('inbox')}
          >
            <Ionicons name="mail" size={18} color={colors.onPrimary ?? '#fff'} />
            <Text style={[styles.tabText, styles.tabTextActive]}>Inbox</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, { backgroundColor: colors.border + '80' }]}
            onPress={() => setTab('compose')}
          >
            <Ionicons name="create" size={18} color={colors.textSecondary} />
            <Text style={styles.tabText}>Compose</Text>
          </Pressable>
        </View>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
        ) : mail.length === 0 ? (
          <Text style={styles.emptyText}>No mail yet. Send a letter to a friend!</Text>
        ) : (
          mail.map((m) => (
            <Pressable
              key={m._id}
              style={styles.mailCard}
              onPress={() => setSelectedMail(m)}
            >
              <View style={styles.mailRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mailSubject} numberOfLines={1}>{m.subject}</Text>
                  <Text style={styles.mailFrom}>{m.fromUsername ?? 'Unknown'}</Text>
                </View>
                <Text style={styles.mailDate}>{formatDate(m.sentAt)}</Text>
              </View>
              {(m.attachedItems?.length && !m.claimedAt) ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                  <Ionicons name="gift" size={14} color={colors.primary} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
                    {m.attachedItems.length} item(s) to claim
                  </Text>
                </View>
              ) : null}
            </Pressable>
          ))
        )}
      </View>
    ) : (
      <View style={{ paddingBottom: spacing.xl * 2 }}>
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tab, { backgroundColor: colors.border + '80' }]}
            onPress={() => setTab('inbox')}
          >
            <Ionicons name="mail" size={18} color={colors.textSecondary} />
            <Text style={styles.tabText}>Inbox</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, styles.tabActive]}
            onPress={() => setTab('compose')}
          >
            <Ionicons name="create" size={18} color={colors.onPrimary ?? '#fff'} />
            <Text style={[styles.tabText, styles.tabTextActive]}>Compose</Text>
          </Pressable>
        </View>
        <Text style={styles.inputLabel}>To (friend)</Text>
        <View style={styles.friendRow}>
          {acceptedFriends.map((f) => (
            <Pressable
              key={f.user.id}
              style={[styles.friendChip, toUserId === f.user.id && styles.friendChipActive]}
              onPress={() => setToUserId(toUserId === f.user.id ? null : f.user.id)}
            >
              <Text
                style={[
                  styles.friendChipText,
                  toUserId === f.user.id && styles.friendChipTextActive,
                ]}
              >
                {f.user.username ?? f.user.phone}
              </Text>
            </Pressable>
          ))}
          {acceptedFriends.length === 0 && (
            <Text style={styles.emptyText}>Add friends to send mail.</Text>
          )}
        </View>
        <Text style={styles.inputLabel}>Subject</Text>
        <TextInput
          style={styles.input}
          placeholder="Subject"
          placeholderTextColor={colors.textMuted}
          value={subject}
          onChangeText={setSubject}
          maxLength={200}
        />
        <Text style={styles.inputLabel}>Message</Text>
        <TextInput
          style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
          placeholder="Write your message..."
          placeholderTextColor={colors.textMuted}
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={2000}
        />
        <Text style={styles.inputLabel}>Attach items (optional)</Text>
        <View style={styles.attachGrid}>
          {Array.from({ length: MAX_ATTACHMENTS }).map((_, i) => {
            const item = attachedItems[i];
            const def = item ? itemDefs[item.itemType] : null;
            return (
              <Pressable
                key={`attach-${i}`}
                style={[styles.attachSlot, !item && styles.attachSlotEmpty]}
                onPress={item ? () => removeAttachment(item.itemType) : undefined}
              >
                {item && def?.imageUrl ? (
                  <CachedImage source={{ uri: def.imageUrl }} style={{ width: 40, height: 40 }} />
                ) : item ? (
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>
                    {def?.label ?? item.itemType} ×{item.qty}
                  </Text>
                ) : (
                  <Ionicons name="add" size={24} color={colors.border} />
                )}
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.attachLabel, { marginTop: 4 }]}>Tap items below to attach</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {availableSlots.map((slot) => {
            const def = itemDefs[slot.itemType];
            return (
              <Pressable
                key={slot.itemType}
                onPressIn={() => handlePressIn(slot.itemType)}
                onPressOut={handlePressOut}
                onPress={() => handlePress(slot.itemType)}
                style={[styles.attachChip, { paddingVertical: 10, paddingHorizontal: 12 }]}
              >
                {def?.imageUrl ? (
                  <CachedImage source={{ uri: def.imageUrl }} style={{ width: 28, height: 28 }} />
                ) : null}
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                  {def?.label ?? slot.itemType} ×{slot.qty}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {sendError ? <Text style={styles.errorText}>{sendError}</Text> : null}
        <Pressable
          style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.claimBtnText}>Send Mail</Text>
          )}
        </Pressable>
      </View>
    );

    return (
      <AppDrawer ref={drawerRef} title="Mailbox" snapPoints={['70%', '95%']}>
        {content}
      </AppDrawer>
    );
  },
);
