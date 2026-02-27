import React, { forwardRef, useImperativeHandle, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { GemIcon } from '@/components/ui/GemIcon';
import { useTheme } from '@/store/ThemeProvider';
import { spacing } from '@/constants/theme';
import type { FarmMeta, FarmLevelDef, QuestProgress, ItemDefinition } from './types';
// Level is provided by backend (accounts for quest completion)

// ─── Ref API ────────────────────────────────────────────────────────────────

export interface FarmInfoDrawerRef {
  open: () => void;
  close: () => void;
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface FarmInfoDrawerProps {
  farm: FarmMeta;
  farmLevel: number;
  farmLevels: readonly FarmLevelDef[];
  quests: QuestProgress[];
  canUpgrade: boolean;
  itemDefs: Record<string, ItemDefinition>;
  equipped?: { handTool?: string; bobber?: string; bait?: string; chair?: string };
  onRename: (name: string) => void;
  onCompleteQuest: (questId: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const FarmInfoDrawer = forwardRef<FarmInfoDrawerRef, FarmInfoDrawerProps>(
  function FarmInfoDrawer({ farm, farmLevel, farmLevels, quests, canUpgrade, itemDefs, equipped, onRename, onCompleteQuest }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(farm.name);
    const { theme } = useTheme();
    const { colors, shadows } = theme;

    useImperativeHandle(ref, () => ({
      open: () => {
        setDraft(farm.name);
        setEditing(false);
        drawerRef.current?.open();
      },
      close: () => drawerRef.current?.close(),
    }));

    const handleSaveName = useCallback(() => {
      const trimmed = draft.trim();
      if (trimmed.length > 0 && trimmed !== farm.name) {
        onRename(trimmed);
      } else {
        setDraft(farm.name);
      }
      setEditing(false);
    }, [draft, farm.name, onRename]);

    const { current, next, progress } = useMemo(() => {
      const lvl = farmLevels.find((l) => l.level === farmLevel) ?? farmLevels[0];
      const idx = farmLevels.findIndex((l) => l.level === lvl.level);
      const nxt = idx < farmLevels.length - 1 ? farmLevels[idx + 1] : null;
      const range = nxt ? nxt.xpRequired - lvl.xpRequired : 1;
      const earned = farm.xp - lvl.xpRequired;
      return { current: lvl, next: nxt, progress: range > 0 ? Math.min(1, earned / range) : 1 };
    }, [farmLevels, farmLevel, farm.xp]);

    const isXpCapped = next != null && farm.xp >= next.xpRequired;

    const upgradeQuest = useMemo(
      () => quests.find((q) => q.type === 'farm_upgrade' && q.status === 'active'),
      [quests],
    );

    const cardShadow = useMemo(
      () => Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
        android: { elevation: 2 },
      }) as object,
      [],
    );

    const styles = useMemo(
      () => StyleSheet.create({
        nameSection: { marginBottom: spacing.lg },
        nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        farmName: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
        nameInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        nameInput: {
          flex: 1, fontSize: 22, fontWeight: '700', color: colors.text,
          borderBottomWidth: 2, borderBottomColor: colors.primary, paddingVertical: 4,
        },
        levelCard: {
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 12,
          marginBottom: spacing.lg, ...cardShadow,
          borderWidth: 1, borderColor: colors.border,
        },
        levelBadge: {
          width: 48, height: 48, borderRadius: 24,
          backgroundColor: `${colors.primary}18`,
          alignItems: 'center', justifyContent: 'center',
        },
        levelEmoji: { fontSize: 24 },
        levelInfo: { flex: 1 },
        levelTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
        levelLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 1 },
        xpPill: {
          flexDirection: 'row', alignItems: 'center', gap: 4,
          backgroundColor: `${colors.primary}14`,
          paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
        },
        xpText: { fontSize: 12, fontWeight: '700', color: colors.primary },
        progressSection: { marginBottom: spacing.xl },
        progressHeader: {
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
        },
        progressLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
        progressPercent: { fontSize: 13, fontWeight: '800', color: colors.primary },
        progressTrack: {
          height: 10, borderRadius: 5, backgroundColor: `${colors.text}0F`, overflow: 'hidden',
        },
        progressFill: { height: '100%', borderRadius: 5, backgroundColor: colors.primary },
        progressFillCapped: { height: '100%', borderRadius: 5, backgroundColor: '#F59E0B' },
        progressSub: {
          fontSize: 11, fontWeight: '600', color: colors.textMuted, marginTop: 4, textAlign: 'right',
        },
        cappedBanner: {
          flexDirection: 'row', alignItems: 'center', gap: 6,
          backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: 10,
          paddingHorizontal: 12, paddingVertical: 8, marginTop: 8,
        },
        cappedText: { fontSize: 12, fontWeight: '700', color: '#B45309', flex: 1 },
        maxLevelBanner: {
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          gap: 8, paddingVertical: 14, backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 12,
        },
        maxLevelEmoji: { fontSize: 24 },
        maxLevelText: { fontSize: 16, fontWeight: '800', color: '#B8860B' },
        questCard: {
          backgroundColor: colors.surface, borderRadius: 16, padding: 16,
          marginBottom: spacing.lg, ...cardShadow,
          borderWidth: 1.5, borderColor: canUpgrade ? '#F59E0B' : colors.border,
        },
        questTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 4 },
        questDesc: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
        reqRow: {
          flexDirection: 'row', alignItems: 'center', gap: 8,
          paddingVertical: 6,
        },
        reqCheck: {
          width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
        },
        reqCheckDone: { backgroundColor: colors.successDark },
        reqCheckPending: { backgroundColor: `${colors.text}14` },
        reqLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
        reqProgress: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
        upgradeBtn: {
          marginTop: 14, paddingVertical: 12, borderRadius: 12,
          alignItems: 'center', justifyContent: 'center',
        },
        upgradeBtnEnabled: { backgroundColor: '#F59E0B' },
        upgradeBtnDisabled: { backgroundColor: `${colors.text}14` },
        upgradeBtnText: { fontSize: 15, fontWeight: '800' },
        upgradeBtnTextEnabled: { color: '#fff' },
        upgradeBtnTextDisabled: { color: colors.textMuted },
        rewardsRow: {
          flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap',
        },
        rewardChip: {
          flexDirection: 'row', alignItems: 'center', gap: 4,
          backgroundColor: `${colors.success}18`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
        },
        rewardText: { fontSize: 11, fontWeight: '700', color: colors.successDark },
        roadmapSection: { marginBottom: spacing.lg },
        roadmapTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 10 },
        levelRow: {
          flexDirection: 'row', alignItems: 'center', gap: 10,
          paddingVertical: 9, paddingHorizontal: 10, borderRadius: 12, marginBottom: 4,
        },
        levelRowCurrent: { backgroundColor: `${colors.primary}0F` },
        rowDot: {
          width: 22, height: 22, borderRadius: 11,
          backgroundColor: `${colors.text}14`, alignItems: 'center', justifyContent: 'center',
        },
        rowDotReached: { backgroundColor: colors.successDark },
        rowDotText: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
        rowEmoji: { fontSize: 18 },
        rowContent: { flex: 1 },
        rowTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
        rowTitleReached: { color: colors.text },
        rowXp: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
        currentTag: {
          backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
        },
        currentTagText: { fontSize: 10, fontWeight: '800', color: '#fff' },
        lockIcon: { marginLeft: 'auto' },
        rowReqPreview: { fontSize: 10, fontWeight: '600', color: colors.textMuted, marginTop: 1 },
      }),
      [colors, shadows, cardShadow, canUpgrade],
    );

    return (
      <AppDrawer
        ref={drawerRef}
        title=""
        snapPoints={['70%']}
        showCloseButton
        scrollable
      >
        {/* ── Farm name ──────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.nameSection}>
          {editing ? (
            <View style={styles.nameInputRow}>
              <TextInput
                style={styles.nameInput}
                value={draft}
                onChangeText={setDraft}
                maxLength={24}
                autoFocus
                selectTextOnFocus
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
                onBlur={handleSaveName}
              />
              <Pressable onPress={handleSaveName} hitSlop={8}>
                <Ionicons name="checkmark-circle" size={26} color={colors.success} />
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.nameRow} onPress={() => setEditing(true)}>
              <Text style={styles.farmName}>{farm.name}</Text>
              <Ionicons name="pencil" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </Animated.View>

        {/* ── Level badge ─────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(80).duration(300)} style={styles.levelCard}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelEmoji}>{current.emoji}</Text>
          </View>
          <View style={styles.levelInfo}>
            <Text style={styles.levelTitle}>{current.title}</Text>
            <Text style={styles.levelLabel}>Level {current.level}</Text>
          </View>
          <View style={styles.xpPill}>
            <Ionicons name="sparkles" size={12} color={colors.primary} />
            <Text style={styles.xpText}>{farm.xp} XP</Text>
          </View>
        </Animated.View>

        {/* ── Progress to next level ──────────────────────────────────── */}
        {next ? (
          <Animated.View entering={FadeInDown.delay(160).duration(300)} style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Next: {next.title}</Text>
              <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  isXpCapped ? styles.progressFillCapped : styles.progressFill,
                  { width: `${Math.round(progress * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressSub}>
              {farm.xp - current.xpRequired} / {next.xpRequired - current.xpRequired} XP
            </Text>
            {isXpCapped && (
              <View style={styles.cappedBanner}>
                <Ionicons name="alert-circle" size={16} color="#F59E0B" />
                <Text style={styles.cappedText}>XP Capped — Complete the upgrade quest to continue leveling!</Text>
              </View>
            )}
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(160).duration(300)} style={styles.progressSection}>
            <View style={styles.maxLevelBanner}>
              <Text style={styles.maxLevelEmoji}>👑</Text>
              <Text style={styles.maxLevelText}>Max Level Reached!</Text>
            </View>
          </Animated.View>
        )}

        {/* ── Upgrade Quest Card ──────────────────────────────────────── */}
        {upgradeQuest && (
          <Animated.View entering={FadeInDown.delay(240).duration(300)} style={styles.questCard}>
            <Text style={styles.questTitle}>{upgradeQuest.title}</Text>
            {upgradeQuest.description ? (
              <Text style={styles.questDesc}>{upgradeQuest.description}</Text>
            ) : null}

            {/* Requirements checklist */}
            {upgradeQuest.requirements.items?.map((req) => {
              const have = upgradeQuest.progress.items?.[req.itemType] ?? 0;
              const def = itemDefs[req.itemType];
              const label = def?.label ?? req.itemType;
              return (
                <RequirementRow
                  key={`item-${req.itemType}`}
                  label={`${label}`}
                  current={Math.min(have, req.qty)}
                  target={req.qty}
                  suffix="in inventory"
                  styles={styles}
                  colors={colors}
                />
              );
            })}
            {upgradeQuest.requirements.buildings?.map((req) => {
              const placed = upgradeQuest.progress.buildings?.[req.itemType] ?? 0;
              const def = itemDefs[req.itemType];
              const label = def?.label ?? req.itemType;
              return (
                <RequirementRow
                  key={`bld-${req.itemType}`}
                  label={`${label} placed`}
                  current={Math.min(placed, req.count)}
                  target={req.count}
                  suffix=""
                  styles={styles}
                  colors={colors}
                />
              );
            })}
            {upgradeQuest.requirements.actions?.map((req) => {
              const key = req.itemType ? `${req.action}:${req.itemType}` : req.action;
              const current = upgradeQuest.progress.actions[key] ?? 0;
              const actionLabel = req.action.charAt(0).toUpperCase() + req.action.slice(1);
              const itemLabel = req.itemType
                ? ` ${itemDefs?.[req.itemType]?.label ?? req.itemType}`
                : '';
              return (
                <RequirementRow
                  key={`act-${key}`}
                  label={`${actionLabel}${itemLabel}`}
                  current={current}
                  target={req.count}
                  suffix=""
                  styles={styles}
                  colors={colors}
                />
              );
            })}
            {upgradeQuest.requirements.equips?.map((req) => {
              const slotKey = req.slot as keyof NonNullable<typeof equipped>;
              const current = equipped?.[slotKey];
              const met = req.itemType ? current === req.itemType : !!current;
              const def = req.itemType ? itemDefs[req.itemType] : null;
              const label = req.itemType
                ? `${req.slot}: ${def?.label ?? req.itemType}`
                : `${req.slot} equipped`;
              return (
                <RequirementRow
                  key={`equip-${req.slot}-${req.itemType ?? 'any'}`}
                  label={label}
                  current={met ? 1 : 0}
                  target={1}
                  suffix=""
                  styles={styles}
                  colors={colors}
                />
              );
            })}
            {upgradeQuest.requirements.talk_to_npc?.map((req) => {
              const key = req.npcItemType;
              const current = upgradeQuest.progress.npcTalks?.[key] ?? 0;
              const target = req.count ?? 1;
              const def = itemDefs[req.npcItemType];
              return (
                <RequirementRow
                  key={`npc-${key}`}
                  label={`Talk to ${def?.label ?? req.npcItemType}`}
                  current={current}
                  target={target}
                  suffix=""
                  styles={styles}
                  colors={colors}
                />
              );
            })}
            {upgradeQuest.requirements.crop_grown?.map((req) => {
              const key = req.itemType;
              const current = upgradeQuest.progress.cropsGrown?.[key] ?? 0;
              const target = req.count ?? 1;
              const def = itemDefs[req.itemType];
              return (
                <RequirementRow
                  key={`crop-${key}`}
                  label={`Grow ${def?.label ?? req.itemType}`}
                  current={current}
                  target={target}
                  suffix=""
                  styles={styles}
                  colors={colors}
                />
              );
            })}
            {upgradeQuest.requirements.open_modal?.map((req) => {
              const key = req.payload;
              const current = upgradeQuest.progress.modalsOpened?.[key] ?? 0;
              const target = req.count ?? 1;
              return (
                <RequirementRow
                  key={`modal-${key}`}
                  label={`Open ${req.payload}`}
                  current={current}
                  target={target}
                  suffix=""
                  styles={styles}
                  colors={colors}
                />
              );
            })}

            {/* Rewards preview */}
            {(upgradeQuest.rewards.gems || upgradeQuest.rewards.xp || upgradeQuest.rewards.items?.length) ? (
              <View style={styles.rewardsRow}>
                {upgradeQuest.rewards.gems ? (
                  <View style={styles.rewardChip}>
                    <GemIcon size={11} />
                    <Text style={[styles.rewardText, { color: colors.gemColor ?? colors.successDark }]}>+{upgradeQuest.rewards.gems}</Text>
                  </View>
                ) : null}
                {upgradeQuest.rewards.xp ? (
                  <View style={styles.rewardChip}>
                    <Ionicons name="sparkles" size={11} color={colors.successDark} />
                    <Text style={styles.rewardText}>+{upgradeQuest.rewards.xp} XP</Text>
                  </View>
                ) : null}
                {upgradeQuest.rewards.items?.map((r) => {
                  const def = itemDefs[r.itemType];
                  return (
                    <View key={r.itemType} style={styles.rewardChip}>
                      <Text style={{ fontSize: 11 }}>{def?.emoji ?? '📦'}</Text>
                      <Text style={styles.rewardText}>+{r.qty} {def?.label ?? r.itemType}</Text>
                    </View>
                  );
                })}
              </View>
            ) : null}

            <Pressable
              style={[
                styles.upgradeBtn,
                upgradeQuest.canComplete ? styles.upgradeBtnEnabled : styles.upgradeBtnDisabled,
              ]}
              onPress={() => upgradeQuest.canComplete && onCompleteQuest(upgradeQuest.questId)}
              disabled={!upgradeQuest.canComplete}
            >
              <Text style={[
                styles.upgradeBtnText,
                upgradeQuest.canComplete ? styles.upgradeBtnTextEnabled : styles.upgradeBtnTextDisabled,
              ]}>
                {upgradeQuest.canComplete ? 'Upgrade Farm' : 'Requirements Not Met'}
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* ── Level roadmap ───────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(320).duration(300)} style={styles.roadmapSection}>
          <Text style={styles.roadmapTitle}>Level Roadmap</Text>
          {farmLevels.map((lvl) => {
            const reached = farm.xp >= lvl.xpRequired;
            const isCurrent = lvl.level === current.level;
            const questForLevel = quests.find((q) => q.type === 'farm_upgrade' && q.farmLevel === lvl.level);
            const isCompleted = questForLevel?.status === 'completed';
            const isLocked = lvl.level > 1 && !isCompleted && !isCurrent;

            return (
              <View key={lvl.level} style={[styles.levelRow, isCurrent && styles.levelRowCurrent]}>
                <View style={[styles.rowDot, (reached && (isCompleted || lvl.level === 1)) && styles.rowDotReached]}>
                  {reached && (isCompleted || lvl.level === 1) ? (
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  ) : (
                    <Text style={styles.rowDotText}>{lvl.level}</Text>
                  )}
                </View>
                <Text style={styles.rowEmoji}>{lvl.emoji}</Text>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowTitle, (reached && (isCompleted || lvl.level === 1)) && styles.rowTitleReached]}>
                    {lvl.title}
                  </Text>
                  <Text style={styles.rowXp}>{lvl.xpRequired} XP</Text>
                  {questForLevel && isLocked && questForLevel.requirements.items?.length ? (
                    <Text style={styles.rowReqPreview}>
                      Requires: {questForLevel.requirements.items.map((i) => {
                        const def = itemDefs[i.itemType];
                        return `${i.qty}x ${def?.label ?? i.itemType}`;
                      }).join(', ')}
                    </Text>
                  ) : null}
                </View>
                {isCurrent && (
                  <View style={styles.currentTag}>
                    <Text style={styles.currentTagText}>You</Text>
                  </View>
                )}
                {isLocked && (
                  <Ionicons name="lock-closed" size={14} color={colors.textMuted} style={styles.lockIcon} />
                )}
              </View>
            );
          })}
        </Animated.View>
      </AppDrawer>
    );
  },
);

// ─── Requirement Row ────────────────────────────────────────────────────────

function RequirementRow({ label, current, target, suffix, styles, colors }: {
  label: string;
  current: number;
  target: number;
  suffix: string;
  styles: any;
  colors: any;
}) {
  const met = current >= target;
  return (
    <View style={styles.reqRow}>
      <View style={[styles.reqCheck, met ? styles.reqCheckDone : styles.reqCheckPending]}>
        {met ? (
          <Ionicons name="checkmark" size={12} color="#fff" />
        ) : (
          <Ionicons name="ellipse-outline" size={12} color={colors.textMuted} />
        )}
      </View>
      <Text style={styles.reqLabel}>{label} {suffix}</Text>
      <Text style={styles.reqProgress}>{current}/{target}</Text>
    </View>
  );
}
