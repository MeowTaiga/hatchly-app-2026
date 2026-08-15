/**
 * Reusable companion profile drawer — self skills card OR another player's
 * public profile (multiplayer) with Add Friend / Trade actions.
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { useAuth } from '@/store/AuthProvider';
import { useTheme } from '@/store/ThemeProvider';
import { useToast } from '@/store/ToastProvider';
import { CachedImage } from '@/components/ui/CachedImage';
import { spacing, radius } from '@/constants/theme';
import {
  SKILL_IDS,
  SKILL_META,
  averageSkillProgress,
  emptySkills,
  resolveCompanionLevel,
  type SkillId,
  type SkillsMap,
} from '@/constants/skills';
import {
  craftingRecipeUnlockTiers,
  labelFromRecipeId,
} from '@/constants/craftingLevelRecipeUnlocks';
import { cookingRecipeUnlockTiers } from '@/constants/cookingLevelRecipeUnlocks';
import {
  FARMING_SOIL_ITEM_TYPE,
  farmingSoilGrantTiers,
} from '@/constants/farmingLevelSoilGrants';
import { farmingSeedShopUnlockTiers } from '@/constants/farmingLevelSeedShopUnlocks';
import { backpackSlotsFromCraftingLevel, perksForSkill } from '@/constants/skillPerks';
import { getPoseForContext } from '@/game/creature/pet';
import {
  api,
  type ApiPublicProfile,
  type PublicFriendshipStatus,
} from '@/lib/api';
import {
  ensureItemPreviewCache,
  resolveItemPreview,
} from '@/lib/itemPreviewCache';
import { requestTradeWith } from '@/game/multiplayer/tradeBridge';
import { hexToRgba } from '@/utils/colorUtils';

type UnlockGrantItem = {
  itemType: string;
  qty?: number;
};

type UnlockRow = {
  level: number;
  title: string;
  description: string;
  key: string;
  /** Granted / unlocked items shown with art + name. */
  items?: UnlockGrantItem[];
};

// ─── Public types ───────────────────────────────────────────────────────────

export type ProfileDrawerTarget =
  | { mode: 'self' }
  | {
      mode: 'other';
      userId: string;
      /** Presence seed while /public-profile loads */
      username?: string;
      petName?: string;
      petImageUrl?: string;
      petPose?: Record<string, string>;
      activePose?: string | null;
    };

export interface PetProfileDrawerRef {
  open: (target?: ProfileDrawerTarget) => void;
  close: () => void;
}

export interface PetProfileDrawerProps {
  /** Trade is not wired yet — called when the player taps Trade. */
  onTrade?: (userId: string) => void;
}

// ─── Compact vitals ─────────────────────────────────────────────────────────

function VitalMeter({
  icon,
  label,
  value,
  accent,
  track,
  text,
  muted,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  accent: string;
  track: string;
  text: string;
  muted: string;
  danger: string;
}) {
  const pct = Math.min(Math.max(value, 0), 100);
  const low = value < 50;
  const bar = low ? danger : accent;

  return (
    <View style={vitalStyles.row}>
      <View style={[vitalStyles.iconWrap, { backgroundColor: `${bar}18` }]}>
        <Ionicons name={icon} size={13} color={bar} />
      </View>
      <View style={vitalStyles.body}>
        <View style={vitalStyles.labelRow}>
          <Text style={[vitalStyles.label, { color: muted }]}>{label}</Text>
          <Text style={[vitalStyles.value, { color: text }]}>{Math.round(value)}</Text>
        </View>
        <View style={[vitalStyles.track, { backgroundColor: track }]}>
          <View style={[vitalStyles.fill, { width: `${pct}%`, backgroundColor: bar }]} />
        </View>
      </View>
    </View>
  );
}

const vitalStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 3 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});

// ─── Skill tile ─────────────────────────────────────────────────────────────

function SkillTile({
  skillId,
  progress,
  colors,
  onPress,
}: {
  skillId: SkillId;
  progress: { level: number; xp: number; xpToNextLevel: number };
  colors: {
    text: string;
    textMuted: string;
    surface: string;
    border: string;
  };
  onPress: () => void;
}) {
  const meta = SKILL_META[skillId];
  const pct = Math.min(100, Math.round((progress.xp / Math.max(progress.xpToNextLevel, 1)) * 100));

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        skillStyles.tile,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${meta.label} level ${progress.level}, ${pct}% to next. Open details.`}
    >
      <View style={skillStyles.top}>
        <View style={[skillStyles.iconPlate, { backgroundColor: `${meta.color}1F` }]}>
          <Ionicons name={meta.icon} size={18} color={meta.color} />
        </View>
        <Text style={[skillStyles.level, { color: colors.text }]}>{progress.level}</Text>
      </View>
      <Text style={[skillStyles.name, { color: colors.text }]} numberOfLines={1}>
        {meta.label}
      </Text>
      <View style={[skillStyles.xpTrack, { backgroundColor: colors.border }]}>
        <View style={[skillStyles.xpFill, { width: `${pct}%`, backgroundColor: meta.color }]} />
      </View>
    </Pressable>
  );
}

function SkillDetail({
  skillId,
  progress,
  colors,
  onBack,
}: {
  skillId: SkillId;
  progress: { level: number; xp: number; xpToNextLevel: number };
  colors: {
    text: string;
    textMuted: string;
    surface: string;
    border: string;
    primary: string;
  };
  onBack: () => void;
}) {
  const meta = SKILL_META[skillId];
  const perks = perksForSkill(skillId);
  const [, setPreviewTick] = useState(0);

  useEffect(() => {
    let alive = true;
    void ensureItemPreviewCache().then(() => {
      if (alive) setPreviewTick((n) => n + 1);
    });
    return () => {
      alive = false;
    };
  }, []);

  const recipeTiers: UnlockRow[] =
    skillId === 'crafting'
      ? craftingRecipeUnlockTiers().map((tier) => ({
          level: tier.level,
          title: tier.recipeIds.length === 1 ? 'New recipe' : 'New recipes',
          description: 'Unlocked in your crafting book',
          key: `recipes-${tier.level}`,
          items: tier.recipeIds.map((itemType) => ({ itemType })),
        }))
      : skillId === 'cooking'
        ? cookingRecipeUnlockTiers().map((tier) => ({
            level: tier.level,
            title: tier.recipeIds.length === 1 ? 'New recipe' : 'New recipes',
            description: 'Unlocked in your cooking book',
            key: `cook-recipes-${tier.level}`,
            items: tier.recipeIds.map((itemType) => ({ itemType })),
          }))
        : [];
  const soilTiers: UnlockRow[] =
    skillId === 'farming'
      ? farmingSoilGrantTiers().map((tier) => ({
          level: tier.level,
          title: tier.qty === 1 ? 'Soil grant' : `Soil grant ×${tier.qty}`,
          description:
            tier.qty === 1
              ? 'A fresh soil patch for planting'
              : `${tier.qty} soil patches for planting`,
          key: `soil-${tier.level}`,
          items: [{ itemType: FARMING_SOIL_ITEM_TYPE, qty: tier.qty }],
        }))
      : [];
  const seedShopTiers: UnlockRow[] =
    skillId === 'farming'
      ? farmingSeedShopUnlockTiers().map((tier) => ({
          level: tier.level,
          title: tier.seedItemTypes.length === 1 ? 'Shop seed' : 'Shop seeds',
          description: 'Now available to buy in the shop',
          key: `seed-shop-${tier.level}`,
          items: tier.seedItemTypes.map((itemType) => ({ itemType })),
        }))
      : [];
  const allUnlockRows: UnlockRow[] = [
    ...perks.map((p) => ({
      level: p.level,
      title: p.title,
      description: p.description,
      key: `perk-${p.level}-${p.title}`,
    })),
    ...recipeTiers,
    ...soilTiers,
    ...seedShopTiers,
  ].sort((a, b) => a.level - b.level || a.title.localeCompare(b.title));

  const unlockedRows = allUnlockRows.filter((p) => progress.level >= p.level);
  const NEXT_VISIBLE_REWARDS = 3;
  const upcomingRows = allUnlockRows
    .filter((p) => progress.level < p.level)
    .slice(0, NEXT_VISIBLE_REWARDS);
  const pct = Math.min(100, Math.round((progress.xp / Math.max(progress.xpToNextLevel, 1)) * 100));
  const backpackPreview =
    skillId === 'crafting' ? backpackSlotsFromCraftingLevel(progress.level) : null;

  const renderGrantItems = (items: UnlockGrantItem[]) => (
    <View style={detailStyles.grantList}>
      {items.map((grant) => {
        const preview = resolveItemPreview(grant.itemType);
        const name =
          grant.itemType === FARMING_SOIL_ITEM_TYPE
            ? 'Soil'
            : preview.label || labelFromRecipeId(grant.itemType);
        return (
          <View key={grant.itemType} style={detailStyles.grantChip}>
            <View style={[detailStyles.grantThumb, { backgroundColor: `${meta.color}18` }]}>
              {preview.imageUrl ? (
                <CachedImage
                  source={{ uri: preview.imageUrl }}
                  style={detailStyles.grantImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={detailStyles.grantEmoji}>{preview.emoji || '🎁'}</Text>
              )}
            </View>
            <Text style={[detailStyles.grantName, { color: colors.text }]} numberOfLines={1}>
              {name}
              {grant.qty != null && grant.qty > 1 ? ` ×${grant.qty}` : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );

  const renderUnlockRow = (perk: UnlockRow, unlocked: boolean) => (
    <View
      key={`${skillId}-${perk.key}`}
      style={[
        detailStyles.perkRow,
        {
          backgroundColor: colors.surface,
          borderColor: unlocked ? `${meta.color}55` : colors.border,
          opacity: unlocked ? 1 : 0.55,
        },
      ]}
    >
      <View style={[detailStyles.perkBadge, { backgroundColor: `${meta.color}1F` }]}>
        <Text style={[detailStyles.perkBadgeText, { color: meta.color }]}>{perk.level}</Text>
      </View>
      <View style={detailStyles.perkBody}>
        <Text style={[detailStyles.perkTitle, { color: colors.text }]}>
          {perk.title}
          {unlocked ? '' : ' · locked'}
        </Text>
        {perk.items?.length ? (
          <>
            {perk.key.startsWith('seed-shop-') ? (
              <Text style={[detailStyles.perkDesc, { color: colors.textMuted }]}>
                {perk.description}
              </Text>
            ) : null}
            {renderGrantItems(perk.items)}
          </>
        ) : (
          <Text style={[detailStyles.perkDesc, { color: colors.textMuted }]}>
            {perk.description}
          </Text>
        )}
      </View>
      <Ionicons
        name={unlocked ? 'checkmark-circle' : 'lock-closed'}
        size={18}
        color={unlocked ? meta.color : colors.textMuted}
        style={detailStyles.perkStatus}
      />
    </View>
  );

  return (
    <View style={detailStyles.root}>
      <Pressable
        onPress={onBack}
        style={detailStyles.backRow}
        accessibilityRole="button"
        accessibilityLabel="Back to skills"
      >
        <Ionicons name="chevron-back" size={18} color={colors.primary} />
        <Text style={[detailStyles.backText, { color: colors.primary }]}>Skills</Text>
      </Pressable>

      <View style={[detailStyles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[detailStyles.iconPlate, { backgroundColor: `${meta.color}22` }]}>
          <Ionicons name={meta.icon} size={26} color={meta.color} />
        </View>
        <View style={detailStyles.heroText}>
          <Text style={[detailStyles.title, { color: colors.text }]}>{meta.label}</Text>
          <Text style={[detailStyles.levelLine, { color: colors.textMuted }]}>
            Level {progress.level}
            {backpackPreview != null ? ` · ${backpackPreview} backpack slots` : ''}
          </Text>
        </View>
      </View>

      <Text style={[detailStyles.blurb, { color: colors.textMuted }]}>{meta.description}</Text>

      <View style={detailStyles.xpBlock}>
        <View style={detailStyles.xpMeta}>
          <Text style={[detailStyles.xpLabel, { color: colors.textMuted }]}>Progress</Text>
          <Text style={[detailStyles.xpNums, { color: colors.text }]}>
            {progress.xp}/{progress.xpToNextLevel} XP
          </Text>
        </View>
        <View style={[detailStyles.xpTrack, { backgroundColor: colors.border }]}>
          <View style={[detailStyles.xpFill, { width: `${pct}%`, backgroundColor: meta.color }]} />
        </View>
      </View>

      {unlockedRows.length > 0 ? (
        <>
          <View style={detailStyles.perksHeader}>
            <Text style={[detailStyles.sectionTitle, { color: colors.text }]}>Unlocked</Text>
            <Text style={[detailStyles.sectionHint, { color: colors.textMuted }]}>
              {unlockedRows.length}
            </Text>
          </View>
          <View style={detailStyles.perkList}>
            {unlockedRows.map((perk) => renderUnlockRow(perk, true))}
          </View>
        </>
      ) : null}

      <View style={detailStyles.perksHeader}>
        <Text style={[detailStyles.sectionTitle, { color: colors.text }]}>Coming up</Text>
        <Text style={[detailStyles.sectionHint, { color: colors.textMuted }]}>
          {upcomingRows.length > 0 ? `Next ${upcomingRows.length}` : 'Maxed'}
        </Text>
      </View>

      {upcomingRows.length === 0 ? (
        <Text style={[detailStyles.empty, { color: colors.textMuted }]}>
          No more unlocks on this skill — nice work.
        </Text>
      ) : (
        <View style={detailStyles.perkList}>
          {upcomingRows.map((perk) => renderUnlockRow(perk, false))}
        </View>
      )}
    </View>
  );
}

const detailStyles = StyleSheet.create({
  root: { gap: 12 },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    marginBottom: -2,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  iconPlate: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1, gap: 2 },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  levelLine: {
    fontSize: 13,
    fontWeight: '600',
  },
  blurb: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  xpBlock: { gap: 6 },
  xpMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  xpNums: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  xpTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 3,
  },
  perksHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  sectionHint: {
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    fontSize: 13,
    fontWeight: '500',
  },
  perkList: { gap: 8 },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  perkBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  perkBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  perkStatus: {
    marginTop: 8,
  },
  perkBody: { flex: 1, gap: 4, minWidth: 0 },
  perkTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  perkDesc: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  grantList: {
    gap: 4,
  },
  grantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  grantThumb: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  grantImage: {
    width: 24,
    height: 24,
  },
  grantEmoji: {
    fontSize: 14,
  },
  grantName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 0,
  },
});

const skillStyles = StyleSheet.create({
  tile: {
    width: '31.5%',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingTop: 9,
    paddingBottom: 8,
    gap: 5,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconPlate: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  level: {
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  name: {
    fontSize: 11,
    fontWeight: '700',
  },
  xpTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 1,
  },
  xpFill: {
    height: '100%',
    borderRadius: 2,
  },
});

// ─── Action button ──────────────────────────────────────────────────────────

function ActionButton({
  label,
  icon,
  onPress,
  disabled,
  variant,
  colors,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  variant: 'primary' | 'secondary';
  colors: {
    primary: string;
    onPrimary?: string;
    primaryText?: string;
    text: string;
    border: string;
    surface: string;
  };
}) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionBtn,
        isPrimary
          ? { backgroundColor: colors.primary }
          : {
              backgroundColor: colors.surface,
              borderWidth: 1.5,
              borderColor: colors.primary,
            },
        (pressed || disabled) && { opacity: disabled ? 0.45 : 0.88 },
      ]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={isPrimary ? colors.onPrimary ?? '#fff' : colors.primaryText ?? colors.primary}
      />
      <Text
        style={[
          styles.actionBtnText,
          {
            color: isPrimary
              ? colors.onPrimary ?? '#fff'
              : colors.primaryText ?? colors.primary,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Drawer ─────────────────────────────────────────────────────────────────

export const PetProfileDrawer = forwardRef<PetProfileDrawerRef, PetProfileDrawerProps>(
  function PetProfileDrawer({ onTrade }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const { user, refreshUser } = useAuth();
    const { toast } = useToast();
    const { theme } = useTheme();
    const { colors } = theme;

    const [target, setTarget] = useState<ProfileDrawerTarget>({ mode: 'self' });
    const [otherProfile, setOtherProfile] = useState<ApiPublicProfile | null>(null);
    const [loadingOther, setLoadingOther] = useState(false);
    const [actionBusy, setActionBusy] = useState(false);
    const [selectedSkill, setSelectedSkill] = useState<SkillId | null>(null);
    const fetchGen = useRef(0);

    const loadOther = useCallback(async (userId: string) => {
      const gen = ++fetchGen.current;
      setLoadingOther(true);
      try {
        const profile = await api.getPublicProfile(userId);
        if (gen !== fetchGen.current) return;
        setOtherProfile(profile);
      } catch (err) {
        if (gen !== fetchGen.current) return;
        toast(err instanceof Error ? err.message : 'Could not load profile', 'error');
      } finally {
        if (gen === fetchGen.current) setLoadingOther(false);
      }
    }, [toast]);

    useImperativeHandle(ref, () => ({
      open: (next?: ProfileDrawerTarget) => {
        const resolved: ProfileDrawerTarget = next ?? { mode: 'self' };
        setTarget(resolved);
        setSelectedSkill(null);
        if (resolved.mode === 'self') {
          setOtherProfile(null);
          void refreshUser?.();
        } else {
          setOtherProfile(null);
          void loadOther(resolved.userId);
        }
        drawerRef.current?.open();
      },
      close: () => drawerRef.current?.close(),
    }));

    const isOther = target.mode === 'other';
    const seed = target.mode === 'other' ? target : null;

    const display = useMemo(() => {
      if (!isOther) {
        const pet = user?.pet;
        const skillsMap = {
          ...emptySkills(),
          ...((user?.skills ?? pet?.skills) as Partial<SkillsMap> | undefined),
        } as SkillsMap;
        const hunger = pet?.hunger ?? 100;
        const happy = pet?.happy ?? 100;
        const mood = pet?.mood ?? 100;
        const poseKey = getPoseForContext(undefined, hunger, happy, mood, 'hero', pet?.pose);
        return {
          title: pet?.customName || pet?.name || 'Buddy',
          subtitle: (pet?.vibe || pet?.name || 'Companion').toString(),
          username: user?.username,
          totalLevel: resolveCompanionLevel({
            totalLevel: user?.totalLevel,
            petTotalLevel: pet?.totalLevel,
            petLevel: pet?.level,
            skills: skillsMap,
          }),
          skills: skillsMap,
          hunger,
          happy,
          mood,
          petImageUrl: (poseKey && pet?.pose?.[poseKey]) ?? pet?.imageUrl,
          petBaseColor: pet?.baseColor,
          petSecondaryColor: pet?.secondaryColor,
          friendshipStatus: 'self' as PublicFriendshipStatus,
          requestId: undefined as string | undefined,
          userId: user?.id,
          farmLevel: undefined as number | undefined,
        };
      }

      const p = otherProfile;
      const skillsMap = p
        ? ({ ...emptySkills(), ...p.skills } as SkillsMap)
        : emptySkills();
      const hunger = p?.pet.hunger ?? 100;
      const happy = p?.pet.happy ?? 100;
      const mood = p?.pet.mood ?? 100;
      const seededImage =
        (seed?.activePose && seed.petPose?.[seed.activePose]) ||
        seed?.petImageUrl;
      const poseKey = p
        ? getPoseForContext(undefined, hunger, happy, mood, 'hero', p.pet.pose)
        : null;
      const petImageUrl =
        (poseKey && p?.pet.pose?.[poseKey]) || p?.pet.imageUrl || seededImage;

      return {
        title: p?.pet.customName || seed?.petName || p?.username || seed?.username || 'Player',
        subtitle: p?.username || seed?.username || p?.pet.name || 'Player',
        username: p?.username || seed?.username,
        totalLevel: resolveCompanionLevel({
          totalLevel: p?.totalLevel,
          petTotalLevel: p?.pet.totalLevel,
          petLevel: p?.pet.level,
          skills: skillsMap,
        }),
        skills: skillsMap,
        hunger,
        happy,
        mood,
        petImageUrl,
        petBaseColor: p?.pet.baseColor,
        petSecondaryColor: p?.pet.secondaryColor,
        friendshipStatus: p?.friendship.status ?? ('none' as PublicFriendshipStatus),
        requestId: p?.friendship.requestId,
        userId: seed?.userId,
        farmLevel: p?.farmLevel,
      };
    }, [isOther, user, otherProfile, seed]);

    const petWash = display.petBaseColor || colors.primary;
    const petWashSecondary = display.petSecondaryColor || display.petBaseColor || colors.accent;

    const avgProgress = averageSkillProgress(display.skills);

    const handleAddFriend = useCallback(async () => {
      if (!display.userId || actionBusy) return;
      setActionBusy(true);
      try {
        await api.sendFriendRequest(display.userId);
        toast('Friend request sent', 'success');
        await loadOther(display.userId);
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Could not send request', 'error');
      } finally {
        setActionBusy(false);
      }
    }, [display.userId, actionBusy, toast, loadOther]);

    const handleAccept = useCallback(async () => {
      if (!display.requestId || !display.userId || actionBusy) return;
      setActionBusy(true);
      try {
        await api.respondToFriendRequest(display.requestId, 'accepted');
        toast('Friend request accepted', 'success');
        await loadOther(display.userId);
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Could not accept', 'error');
      } finally {
        setActionBusy(false);
      }
    }, [display.requestId, display.userId, actionBusy, toast, loadOther]);

    const handleTrade = useCallback(() => {
      if (!display.userId) return;
      if (onTrade) {
        onTrade(display.userId);
        drawerRef.current?.close();
        return;
      }
      const started = requestTradeWith(display.userId);
      if (started) {
        drawerRef.current?.close();
        return;
      }
      toast('Join a multiplayer area to trade', 'info');
    }, [display.userId, onTrade, toast]);

    const headerRight = (
      <View style={[styles.totalChip, { backgroundColor: `${colors.primary}18` }]}>
        <Text style={[styles.totalChipLabel, { color: colors.textMuted }]}>Lv.</Text>
        <Text style={[styles.totalChipValue, { color: colors.primaryText ?? colors.primary }]}>
          {display.totalLevel}
        </Text>
      </View>
    );

    const friendship = display.friendshipStatus;
    const showActions = isOther && friendship !== 'self';
    const isBotTarget =
      typeof display.userId === 'string' && display.userId.startsWith('bot_stress_');

    return (
      <AppDrawer
        ref={drawerRef}
        title={
          selectedSkill
            ? SKILL_META[selectedSkill].label
            : display.title
        }
        headerRight={selectedSkill ? undefined : headerRight}
        snapPoints={isOther ? ['78%', '94%'] : ['72%', '94%']}
        initialSnapIndex={0}
        onClose={() => setSelectedSkill(null)}
      >
        <View style={styles.root}>
          {selectedSkill ? (
            <SkillDetail
              skillId={selectedSkill}
              progress={display.skills[selectedSkill]}
              colors={{
                text: colors.text,
                textMuted: colors.textMuted,
                surface: colors.surface,
                border: colors.border,
                primary: colors.primary,
              }}
              onBack={() => setSelectedSkill(null)}
            />
          ) : (
          <>
          <LinearGradient
            colors={[
              hexToRgba(petWash, 0.28),
              hexToRgba(petWashSecondary, 0.14),
              colors.surfaceElevated,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.hero, { borderColor: colors.border }]}
          >
            <Pressable
              style={styles.petStage}
              onPress={() => {
                if (!isOther) void refreshUser?.();
                else if (display.userId) void loadOther(display.userId);
              }}
            >
              {display.petImageUrl ? (
                <CachedImage
                  source={{ uri: display.petImageUrl }}
                  style={styles.petImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={[styles.petFallback, { backgroundColor: `${colors.border}66` }]}>
                  {loadingOther ? (
                    <ActivityIndicator color={petWash} />
                  ) : (
                    <Ionicons name="paw" size={40} color={colors.textMuted} />
                  )}
                </View>
              )}
            </Pressable>

            <View style={styles.heroSide}>
              <View style={styles.identity}>
                <Text style={[styles.species, { color: colors.textMuted }]} numberOfLines={1}>
                  {isOther
                    ? display.username
                      ? `@${display.username}`
                      : display.subtitle
                    : display.subtitle}
                </Text>
                <View style={[styles.levelPill, { backgroundColor: hexToRgba(petWash, 0.18) }]}>
                  <Ionicons
                    name="trophy"
                    size={12}
                    color={petWash}
                  />
                  <Text
                    style={[styles.levelPillText, { color: petWash }]}
                  >
                    Lv. {display.totalLevel}
                    {display.farmLevel != null ? ` · Farm ${display.farmLevel}` : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.vitals}>
                <VitalMeter
                  icon="heart"
                  label="Happy"
                  value={display.happy}
                  accent={colors.primary}
                  track={colors.border}
                  text={colors.text}
                  muted={colors.textMuted}
                  danger={colors.error}
                />
                <VitalMeter
                  icon="nutrition"
                  label="Hunger"
                  value={display.hunger}
                  accent={colors.primary}
                  track={colors.border}
                  text={colors.text}
                  muted={colors.textMuted}
                  danger={colors.error}
                />
                <VitalMeter
                  icon="sparkles"
                  label="Mood"
                  value={display.mood}
                  accent={colors.primary}
                  track={colors.border}
                  text={colors.text}
                  muted={colors.textMuted}
                  danger={colors.error}
                />
              </View>
            </View>
          </LinearGradient>

          {showActions && (
            <View style={styles.actionsRow}>
              {!isBotTarget && friendship === 'none' && (
                <ActionButton
                  label="Add Friend"
                  icon="person-add"
                  variant="primary"
                  onPress={() => void handleAddFriend()}
                  disabled={actionBusy || loadingOther}
                  colors={colors}
                />
              )}
              {!isBotTarget && friendship === 'pending_outgoing' && (
                <ActionButton
                  label="Request Sent"
                  icon="time-outline"
                  variant="secondary"
                  onPress={() => toast('Friend request already sent', 'info')}
                  disabled
                  colors={colors}
                />
              )}
              {!isBotTarget && friendship === 'pending_incoming' && (
                <ActionButton
                  label="Accept"
                  icon="checkmark-circle"
                  variant="primary"
                  onPress={() => void handleAccept()}
                  disabled={actionBusy}
                  colors={colors}
                />
              )}
              {!isBotTarget && friendship === 'friends' && (
                <ActionButton
                  label="Friends"
                  icon="people"
                  variant="secondary"
                  onPress={() => toast('You are already friends', 'info')}
                  disabled
                  colors={colors}
                />
              )}
              <ActionButton
                label="Trade"
                icon="swap-horizontal"
                variant="secondary"
                onPress={handleTrade}
                disabled={actionBusy}
                colors={colors}
              />
            </View>
          )}

          <View style={styles.skillsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Skills</Text>
            <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
              {loadingOther && isOther
                ? 'Loading…'
                : `${Math.round(avgProgress * 100)}% avg to next`}
            </Text>
          </View>

          <View style={styles.skillGrid}>
            {SKILL_IDS.map((id) => (
              <SkillTile
                key={id}
                skillId={id}
                progress={display.skills[id]}
                colors={{
                  text: colors.text,
                  textMuted: colors.textMuted,
                  surface: colors.surface,
                  border: colors.border,
                }}
                onPress={() => setSelectedSkill(id)}
              />
            ))}
          </View>
          </>
          )}
        </View>
      </AppDrawer>
    );
  },
);

const styles = StyleSheet.create({
  root: {
    paddingBottom: 110,
    gap: spacing.base,
  },
  totalChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginRight: 4,
  },
  totalChipLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  totalChipValue: {
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 12,
    minHeight: 168,
    overflow: 'hidden',
  },
  petStage: {
    width: '38%',
    minHeight: 140,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  petImage: {
    width: '100%',
    height: 148,
  },
  petFallback: {
    width: '85%',
    height: 120,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSide: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
    gap: 12,
  },
  identity: {
    gap: 2,
  },
  species: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  levelPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 4,
  },
  levelPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  vitals: {
    gap: 9,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 10,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  skillsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 2,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionHint: {
    fontSize: 11,
    fontWeight: '600',
  },
  skillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
});
