import React, { forwardRef, useImperativeHandle, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { GemIcon } from '@/components/ui/GemIcon';
import { useTheme } from '@/store/ThemeProvider';
import type { FarmMeta, FarmLevelDef, QuestProgress, ItemDefinition, RequirementClause } from './types';

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
  onOpenChange?: (open: boolean) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const FarmInfoDrawer = forwardRef<FarmInfoDrawerRef, FarmInfoDrawerProps>(
  function FarmInfoDrawer({ farm, farmLevel, farmLevels, quests, canUpgrade, itemDefs, equipped, onRename, onCompleteQuest, onOpenChange }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(farm.name);
    const { theme } = useTheme();
    const { colors } = theme;

    useImperativeHandle(ref, () => ({
      open: () => {
        setDraft(farm.name);
        setEditing(false);
        drawerRef.current?.open();
        onOpenChange?.(true);
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

    const hasEarnedNextLevel = next != null && farm.xp >= next.xpRequired;

    const upgradeQuest = useMemo(
      () => quests.find((q) => q.type === 'farm_upgrade' && q.status === 'active' && q.farmLevel === farmLevel + 1),
      [quests, farmLevel],
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
        nameSection: { marginBottom: 14 },
        nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
        farmName: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
        nameInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        nameInput: {
          flex: 1, fontSize: 16, fontWeight: '700', color: colors.text,
          borderBottomWidth: 2, borderBottomColor: colors.primary, paddingVertical: 4,
        },
        hero: {
          overflow: 'hidden', borderRadius: 24, padding: 18, marginBottom: 14,
          backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
          ...cardShadow,
        },
        heroGlow: {
          position: 'absolute', width: 150, height: 150, borderRadius: 75,
          right: -48, top: -58, backgroundColor: `${colors.primary}16`,
        },
        heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
        levelBadge: {
          width: 60, height: 60, borderRadius: 18, backgroundColor: `${colors.primary}18`,
          borderWidth: 1, borderColor: `${colors.primary}35`,
          alignItems: 'center', justifyContent: 'center',
        },
        levelEmoji: { fontSize: 30 },
        levelInfo: { flex: 1 },
        kicker: {
          fontSize: 10, fontWeight: '900', letterSpacing: 1.2,
          textTransform: 'uppercase', color: colors.primary,
        },
        levelTitle: { fontSize: 22, fontWeight: '900', color: colors.text, marginTop: 2 },
        plotLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
        xpPill: {
          flexDirection: 'row', alignItems: 'center', gap: 4,
          backgroundColor: `${colors.primary}14`, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 12,
        },
        xpText: { fontSize: 11, fontWeight: '800', color: colors.primary },
        journey: { marginTop: 18 },
        journeyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
        journeyLabel: { fontSize: 12, fontWeight: '800', color: colors.textSecondary },
        journeyValue: { fontSize: 11, fontWeight: '800', color: colors.textMuted },
        progressTrack: {
          height: 8, borderRadius: 4, backgroundColor: `${colors.text}12`, overflow: 'hidden',
        },
        progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
        progressFillCapped: { height: '100%', borderRadius: 4, backgroundColor: '#F59E0B' },
        destinationRow: {
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8,
        },
        destinationText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
        destinationNext: { fontSize: 11, fontWeight: '800', color: colors.text },
        section: {
          borderRadius: 22, padding: 16, backgroundColor: colors.surface,
          borderWidth: 1, borderColor: canUpgrade ? '#F59E0B' : colors.border,
          marginBottom: 12, ...cardShadow,
        },
        sectionTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
        sectionIcon: {
          width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
          backgroundColor: canUpgrade ? 'rgba(245,158,11,0.15)' : `${colors.primary}14`,
        },
        sectionCopy: { flex: 1 },
        sectionKicker: {
          fontSize: 9, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase',
          color: canUpgrade ? '#F59E0B' : colors.textMuted,
        },
        questTitle: { fontSize: 17, fontWeight: '900', color: colors.text, marginTop: 1 },
        questDesc: { fontSize: 12, lineHeight: 17, color: colors.textSecondary, marginTop: 8, marginBottom: 6 },
        reqRow: {
          borderRadius: 14, padding: 11, marginTop: 8,
          backgroundColor: `${colors.text}08`, borderWidth: 1, borderColor: `${colors.text}0B`,
        },
        reqTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
        reqCheck: {
          width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
        },
        reqCheckDone: { backgroundColor: colors.success },
        reqCheckPending: { backgroundColor: `${colors.primary}16` },
        reqLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
        reqProgress: { fontSize: 12, fontWeight: '900', color: colors.textSecondary },
        reqTrack: {
          height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 9,
          marginLeft: 33, backgroundColor: `${colors.text}10`,
        },
        reqFill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
        reqFillDone: { backgroundColor: colors.success },
        rewardsLabel: {
          fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase',
          color: colors.textMuted, marginTop: 15, marginBottom: 7,
        },
        rewardsRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
        rewardChip: {
          flexDirection: 'row', alignItems: 'center', gap: 5,
          backgroundColor: `${colors.primary}10`, borderWidth: 1, borderColor: `${colors.primary}20`,
          paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10,
        },
        rewardText: { fontSize: 11, fontWeight: '800', color: colors.text },
        upgradeBtn: {
          marginTop: 16, minHeight: 48, borderRadius: 15, flexDirection: 'row',
          gap: 7, alignItems: 'center', justifyContent: 'center',
        },
        upgradeBtnEnabled: { backgroundColor: '#F59E0B' },
        upgradeBtnDisabled: { backgroundColor: `${colors.text}0D` },
        upgradeBtnText: { fontSize: 14, fontWeight: '900' },
        upgradeBtnTextEnabled: { color: '#fff' },
        upgradeBtnTextDisabled: { color: colors.textMuted },
        noQuest: {
          borderRadius: 20, padding: 18, alignItems: 'center',
          backgroundColor: `${colors.primary}0C`, borderWidth: 1, borderColor: `${colors.primary}1F`,
        },
        noQuestEmoji: { fontSize: 28, marginBottom: 7 },
        noQuestTitle: { fontSize: 15, fontWeight: '900', color: colors.text },
        noQuestBody: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
      }),
      [colors, cardShadow, canUpgrade],
    );

    return (
      <AppDrawer
        ref={drawerRef}
        title=""
        snapPoints={['70%']}
        showCloseButton
        scrollable
        onClose={() => onOpenChange?.(false)}
      >
        <Animated.View entering={FadeInDown.duration(260)} style={styles.nameSection}>
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
              <Ionicons name="pencil" size={13} color={colors.textMuted} />
            </Pressable>
          )}
        </Animated.View>

        {/* One strong status card: where the player is and where they are going. */}
        <Animated.View entering={FadeInDown.delay(60).duration(280)} style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroTop}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelEmoji}>{current.emoji}</Text>
            </View>
            <View style={styles.levelInfo}>
              <Text style={styles.kicker}>Farm level {current.level}</Text>
              <Text style={styles.levelTitle}>{current.title}</Text>
              <Text style={styles.plotLabel}>{current.cols} × {current.rows} growing space</Text>
            </View>
            <View style={styles.xpPill}>
              <Ionicons name="sparkles" size={12} color={colors.primary} />
              <Text style={styles.xpText}>{farm.xp} XP</Text>
            </View>
          </View>
          {next ? (
            <View style={styles.journey}>
              <View style={styles.journeyHeader}>
                <Text style={styles.journeyLabel}>Journey to level {next.level}</Text>
                <Text style={styles.journeyValue}>
                  {Math.max(0, farm.xp - current.xpRequired)} / {next.xpRequired - current.xpRequired} XP
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    hasEarnedNextLevel ? styles.progressFillCapped : styles.progressFill,
                    { width: `${Math.round(progress * 100)}%` },
                  ]}
                />
              </View>
              <View style={styles.destinationRow}>
                <Text style={styles.destinationText}>{current.title}</Text>
                <Text style={styles.destinationNext}>{next.emoji} {next.title}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.journey}>
              <View style={styles.journeyHeader}>
                <Text style={styles.journeyLabel}>Farm mastery</Text>
                <Text style={styles.journeyValue}>Complete</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFillCapped, { width: '100%' }]} />
              </View>
              <View style={styles.destinationRow}>
                <Text style={styles.destinationText}>Every farm level reached</Text>
                <Text style={styles.destinationNext}>👑 Master farmer</Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Only the active gate matters. Future levels stay hidden until relevant. */}
        {upgradeQuest ? (
          <Animated.View entering={FadeInDown.delay(130).duration(280)} style={styles.section}>
            <View style={styles.sectionTop}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name={upgradeQuest.canComplete ? 'trophy' : 'flag'}
                  size={19}
                  color={upgradeQuest.canComplete ? '#F59E0B' : colors.primary}
                />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionKicker}>
                  {upgradeQuest.canComplete ? 'Ready to advance' : 'Active level challenge'}
                </Text>
                <Text style={styles.questTitle}>{upgradeQuest.title}</Text>
              </View>
              <Text style={styles.journeyValue}>
                {upgradeQuest.clauses.filter((clause) => clause.met).length}/{upgradeQuest.clauses.length}
              </Text>
            </View>

            {upgradeQuest.description ? (
              <Text style={styles.questDesc}>{upgradeQuest.description}</Text>
            ) : null}

            {upgradeQuest.clauses.map((clause) => (
              <RequirementRow key={clause.key} clause={clause} styles={styles} colors={colors} />
            ))}

            {(upgradeQuest.rewards.gems || upgradeQuest.rewards.xp || upgradeQuest.rewards.items?.length) ? (
              <>
                <Text style={styles.rewardsLabel}>Level-up rewards</Text>
                <View style={styles.rewardsRow}>
                  {upgradeQuest.rewards.gems ? (
                    <View style={styles.rewardChip}>
                      <GemIcon size={12} />
                      <Text style={[styles.rewardText, { color: colors.gemColor ?? colors.text }]}>
                        +{upgradeQuest.rewards.gems}
                      </Text>
                    </View>
                  ) : null}
                  {upgradeQuest.rewards.xp ? (
                    <View style={styles.rewardChip}>
                      <Ionicons name="sparkles" size={12} color={colors.primary} />
                      <Text style={styles.rewardText}>+{upgradeQuest.rewards.xp} XP</Text>
                    </View>
                  ) : null}
                  {upgradeQuest.rewards.items?.map((reward) => {
                    const def = itemDefs[reward.itemType];
                    return (
                      <View key={reward.itemType} style={styles.rewardChip}>
                        <Text style={{ fontSize: 12 }}>{def?.emoji ?? '📦'}</Text>
                        <Text style={styles.rewardText}>×{reward.qty} {def?.label ?? reward.itemType}</Text>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : null}

            <Pressable
              style={[
                styles.upgradeBtn,
                upgradeQuest.canComplete ? styles.upgradeBtnEnabled : styles.upgradeBtnDisabled,
              ]}
              onPress={() => upgradeQuest.canComplete && onCompleteQuest(upgradeQuest.questId)}
              disabled={!upgradeQuest.canComplete}
            >
              <Ionicons
                name={upgradeQuest.canComplete ? 'arrow-up-circle' : 'lock-closed'}
                size={18}
                color={upgradeQuest.canComplete ? '#fff' : colors.textMuted}
              />
              <Text
                style={[
                  styles.upgradeBtnText,
                  upgradeQuest.canComplete ? styles.upgradeBtnTextEnabled : styles.upgradeBtnTextDisabled,
                ]}
              >
                {upgradeQuest.canComplete
                  ? `Claim level ${next?.level ?? farmLevel + 1}`
                  : `${upgradeQuest.clauses.filter((clause) => !clause.met).length} goals remaining`}
              </Text>
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(130).duration(280)} style={styles.noQuest}>
            <Text style={styles.noQuestEmoji}>{next ? '🌱' : '👑'}</Text>
            <Text style={styles.noQuestTitle}>{next ? 'Keep growing' : 'Farm mastered'}</Text>
            <Text style={styles.noQuestBody}>
              {next
                ? 'Your next farm challenge will appear here when it becomes active.'
                : 'You have reached the highest farm level.'}
            </Text>
          </Animated.View>
        )}
      </AppDrawer>
    );
  },
);

// ─── Requirement Row ────────────────────────────────────────────────────────

function RequirementRow({ clause, styles, colors }: {
  clause: RequirementClause;
  styles: any;
  colors: any;
}) {
  const percent = clause.need > 0
    ? Math.min(100, Math.round((clause.have / clause.need) * 100))
    : 100;

  return (
    <View style={styles.reqRow}>
      <View style={styles.reqTop}>
        <View style={[styles.reqCheck, clause.met ? styles.reqCheckDone : styles.reqCheckPending]}>
          <Ionicons
            name={clause.met ? 'checkmark' : 'flag-outline'}
            size={13}
            color={clause.met ? '#fff' : colors.primary}
          />
        </View>
        <Text style={styles.reqLabel}>{clause.label}</Text>
        <Text style={styles.reqProgress}>
          {Math.min(clause.have, clause.need)}/{clause.need}
        </Text>
      </View>
      <View style={styles.reqTrack}>
        <View
          style={[
            styles.reqFill,
            clause.met && styles.reqFillDone,
            { width: `${percent}%` },
          ]}
        />
      </View>
    </View>
  );
}
