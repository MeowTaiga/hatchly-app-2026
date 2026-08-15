/**
 * Check off today’s goals, toggle the catalog, and create custom repeats.
 */

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { GoalIcon } from '@/components/goals/GoalIcon';
import { GoalIconPicker } from '@/components/goals/GoalIconPicker';
import { ItemGainToastHost } from '@/game/ItemGainToastHost';
import { useTheme } from '@/store/ThemeProvider';
import { useGoals } from '@/store/GoalsProvider';
import { useToast } from '@/store/ToastProvider';
import { spacing, radius } from '@/constants/theme';
import type { GoalRepeat, PublicGoal, UpdateGoalBody } from '@/lib/api';
import { GoalMeta } from '@/components/goals/GoalMeta';
import { ReminderPicker } from '@/components/goals/ReminderPicker';
import { DAY_FULL, formatGoalRepeat, CUSTOM_DEFAULT_CLOCK, parseHHmm, toHHmm, type ClockTime } from '@/components/goals/goalSchedule';
import { ensureItemPreviewCache } from '@/lib/itemPreviewCache';

/** Mirrors server GoalService — shown as a tease on each check-off. */
const GOAL_XP_TOTAL = 16;
const GOAL_REWARD_CAP = 4;
const SNAP_POINTS = ['72%', '92%'];
const DEFAULT_SECTIONS = [
  'Household',
  'Bills',
  'Work',
  'Health',
  'Fitness',
  'Groceries',
  'Pets',
  'Family',
  'Errands',
  'Finance',
  'School',
  'Self-care',
  'Travel',
];

const DEFAULT_SECTION_ICONS: Record<string, string> = {
  __general: 'open_notebook',
  Household: 'cleaning_bucket',
  Bills: 'bulletin_board',
  Work: 'computer_desk',
  Health: 'water_bowl',
  Fitness: 'walking_shoes',
  Groceries: 'grocery_bag',
  Pets: 'calico_cat_plush',
  Family: 'bunny_plush',
  Errands: 'camp_backpack',
  Finance: 'hourglass',
  School: 'open_book',
  'Self-care': 'aroma_diffuser',
  Travel: 'sleeping_bag',
};

function sectionStorageKey(name: string): string {
  return isGeneralSection(name) ? '__general' : name.trim();
}

function iconForSection(name: string, pool: PublicGoal[]): string {
  const key = sectionStorageKey(name);
  for (const g of pool) {
    if (sectionStorageKey(g.section ?? '') === key && g.sectionIconItemType) return g.sectionIconItemType;
  }
  return DEFAULT_SECTION_ICONS[key] ?? 'open_notebook';
}

function isGeneralSection(raw: string | null | undefined): boolean {
  const t = raw?.trim() ?? '';
  return !t || /^none$/i.test(t);
}

function groupGoalsBySection(goals: PublicGoal[]): {
  key: string;
  label: string;
  goals: PublicGoal[];
}[] {
  const map = new Map<string, PublicGoal[]>();
  for (const g of goals) {
    const key = isGeneralSection(g.section) ? '' : (g.section?.trim() ?? '');
    const list = map.get(key);
    if (list) list.push(g);
    else map.set(key, [g]);
  }
  const named = [...map.keys()]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const keys = map.has('') ? [...named, ''] : named.length ? named : [''];
  return keys
    .filter((key) => (map.get(key) ?? []).length > 0)
    .map((key) => ({
      key: key || '__general',
      label: key || 'General',
      goals: map.get(key) ?? [],
    }));
}

function GoalSection({
  label,
  count,
  collapsed,
  onToggle,
  colors,
  iconItemType,
  flat,
  children,
}: {
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  colors: {
    text: string;
    textMuted: string;
    surface: string;
    surfaceElevated: string;
    border: string;
    primary: string;
  };
  iconItemType?: string;
  flat?: boolean;
  children: React.ReactNode;
}) {
  if (flat) return <>{children}</>;
  return (
    <View style={{ gap: 8 }}>
      <Pressable
        onPress={onToggle}
        hitSlop={4}
        style={({ pressed }) => [
          styles.sectionHeader,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: collapsed ? colors.border : colors.primary + '55',
            opacity: pressed ? 0.86 : 1,
          },
        ]}
      >
        <View style={[styles.sectionHeaderIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {iconItemType ? (
            <GoalIcon itemType={iconItemType} size={18} />
          ) : (
            <Ionicons
              name={collapsed ? 'folder-outline' : 'folder-open-outline'}
              size={16}
              color={colors.primary}
            />
          )}
        </View>
        <Text style={[styles.sectionHeaderTitle, { color: colors.text }]} numberOfLines={1}>
          {label}
        </Text>
        <View style={[styles.sectionCount, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionCountText, { color: colors.textMuted }]}>{count}</Text>
        </View>
        <Ionicons name={collapsed ? 'chevron-forward' : 'chevron-down'} size={18} color={colors.textMuted} />
      </Pressable>
      {collapsed ? null : children}
    </View>
  );
}

function waitForKeyboardHide(): Promise<void> {
  if (typeof Keyboard.isVisible === 'function' && !Keyboard.isVisible()) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      sub.remove();
      resolve();
    };
    const sub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      finish,
    );
    Keyboard.dismiss();
    setTimeout(finish, Platform.OS === 'ios' ? 420 : 180);
  });
}

export interface GoalsDrawerRef {
  open: () => void;
  close: () => void;
}

export const GoalsDrawer = forwardRef<GoalsDrawerRef>(function GoalsDrawer(_props, ref) {
  const drawerRef = useRef<AppDrawerRef>(null);
  const { theme } = useTheme();
  const { colors } = theme;
  const { toast } = useToast();
  const {
    state,
    refresh,
    completeGoal,
    uncompleteGoal,
    createCustom,
    updateGoal,
    archiveGoal,
    createShared,
    shareCustom,
    updateShared,
    archiveShared,
    completeShared,
    uncompleteShared,
    respondToMarriage,
    endMarriage,
  } = useGoals();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [composingShared, setComposingShared] = useState(false);
  const [listTab, setListTab] = useState<'today' | 'saved'>('today');
  const [scope, setScope] = useState<'single' | 'together'>('single');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [formSession, setFormSession] = useState(0);
  const [iconItemType, setIconItemType] = useState('open_notebook');
  const [repeat, setRepeat] = useState<GoalRepeat>('once');
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [remindOn, setRemindOn] = useState(false);
  const [remindTime, setRemindTime] = useState<ClockTime>(CUSTOM_DEFAULT_CLOCK);
  const [section, setSection] = useState('');
  const [sectionIconItemType, setSectionIconItemType] = useState('open_notebook');
  const [addingSection, setAddingSection] = useState(false);
  const [sectionMenuOpen, setSectionMenuOpen] = useState(false);
  const [sectionDraft, setSectionDraft] = useState('');
  const [pickingIconFor, setPickingIconFor] = useState<'goal' | 'section' | null>(null);
  const [viewingGoal, setViewingGoal] = useState<PublicGoal | null>(null);
  const [saving, setSaving] = useState(false);

  useImperativeHandle(ref, () => ({
    open: () => {
      void refresh();
      drawerRef.current?.open();
    },
    close: () => drawerRef.current?.close(),
  }));

  const dueToday = useMemo(
    () => state.goals.filter((g) => g.dueToday),
    [state.goals],
  );
  const sharedDueToday = useMemo(
    () => (state.sharedGoals ?? []).filter((g) => g.dueToday),
    [state.sharedGoals],
  );
  const customGoals = useMemo(
    () => state.goals.filter((g) => g.source === 'custom'),
    [state.goals],
  );

  const resetForm = useCallback(() => {
    setEditingId(null);
    setComposingShared(false);
    setTitle('');
    setNotes('');
    setIconItemType(state.iconPicker[0] ?? 'open_notebook');
    setRepeat('once');
    setRepeatDays([]);
    setRemindOn(false);
    setRemindTime(CUSTOM_DEFAULT_CLOCK);
    setSection('');
    setSectionIconItemType('open_notebook');
    setAddingSection(false);
    setSectionMenuOpen(false);
    setSectionDraft('');
    setPickingIconFor(null);
    setViewingGoal(null);
  }, [state.iconPicker]);

  const bumpFormSession = useCallback(() => {
    setFormSession((n) => n + 1);
  }, []);

  const startCompose = useCallback((shared?: boolean) => {
    resetForm();
    bumpFormSession();
    setComposingShared(shared ?? (state.marriage?.status === 'married' && scope === 'together'));
    setComposing(true);
    void ensureItemPreviewCache();
    drawerRef.current?.snapTo(1);
  }, [resetForm, bumpFormSession, scope, state.marriage?.status]);

  const stopCompose = useCallback(() => {
    Keyboard.dismiss();
    setComposing(false);
    resetForm();
    drawerRef.current?.snapTo(0);
  }, [resetForm]);
  const stopComposeRef = useRef(stopCompose);
  stopComposeRef.current = stopCompose;

  const handleDrawerClose = useCallback(() => {
    Keyboard.dismiss();
    setComposing(false);
    resetForm();
  }, [resetForm]);

  const startEdit = useCallback((goal: PublicGoal) => {
    const live =
      (goal.source === 'shared' ? state.sharedGoals : state.goals)?.find((g) => g.id === goal.id) ?? goal;
    setEditingId(live.id);
    setTitle(live.title);
    setNotes(live.notes ?? '');
    setIconItemType(live.iconItemType);
    setRepeat(live.repeat);
    setRepeatDays(live.repeatDays ?? []);
    setSection(isGeneralSection(live.section) ? '' : (live.section ?? ''));
    setSectionIconItemType(
      live.sectionIconItemType
        || iconForSection(live.section ?? '', live.source === 'shared' ? (state.sharedGoals ?? []) : state.goals),
    );
    setAddingSection(false);
    setSectionMenuOpen(false);
    setSectionDraft('');
    setPickingIconFor(null);
    setViewingGoal(null);
    if (live.remindAt) {
      const parsed = parseHHmm(live.remindAt);
      setRemindOn(true);
      setRemindTime(parsed ?? CUSTOM_DEFAULT_CLOCK);
    } else {
      setRemindOn(false);
      setRemindTime(CUSTOM_DEFAULT_CLOCK);
    }
    setComposingShared(live.source === 'shared');
    setComposing(true);
    bumpFormSession();
    void ensureItemPreviewCache();
    drawerRef.current?.snapTo(1);
  }, [state.goals, state.sharedGoals, bumpFormSession]);

  const openGoalDetail = useCallback((goal: PublicGoal) => {
    Keyboard.dismiss();
    setViewingGoal(goal);
    drawerRef.current?.snapTo(1);
  }, []);

  const toggleSection = useCallback((key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleDay = useCallback((day: number) => {
    setRepeatDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  }, []);

  const handleToggleComplete = useCallback(
    async (goal: PublicGoal) => {
      if (busyId) return;
      setBusyId(goal.id);
      try {
        if (goal.source === 'shared') {
          if (goal.completedToday) await uncompleteShared(goal.id);
          else await completeShared(goal.id);
        } else if (goal.completedToday) {
          await uncompleteGoal(goal.id);
        } else {
          await completeGoal(goal.id);
        }
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Could not update goal', 'error');
      } finally {
        setBusyId(null);
      }
    },
    [busyId, completeGoal, uncompleteGoal, completeShared, uncompleteShared, toast],
  );

  const handleCatalogToggle = useCallback(
    async (catalogId: string, enabled: boolean) => {
      const goal = state.goals.find((g) => g.catalogId === catalogId);
      if (!goal) return;
      setBusyId(goal.id);
      try {
        await updateGoal(goal.id, { enabled });
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Could not update recommended', 'error');
      } finally {
        setBusyId(null);
      }
    },
    [state.goals, updateGoal, toast],
  );

  const handleSaveCustom = useCallback(async () => {
    if (saving) return;
    const nextTitle = title.trim();
    if (!nextTitle) {
      toast('Give this goal a name', 'error');
      return;
    }
    if (repeat === 'weekdays' && repeatDays.length === 0) {
      toast('Pick at least one day', 'error');
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: nextTitle,
        notes: notes.trim() || undefined,
        iconItemType,
        repeat,
        repeatDays: repeat === 'weekdays' ? repeatDays : undefined,
        remindAt: remindOn ? toHHmm(remindTime.hour, remindTime.minute, remindTime.am) : null,
        section: isGeneralSection(section) ? null : section.trim(),
        sectionIconItemType,
      };
      if (editingId) {
        if (composingShared) await updateShared(editingId, body);
        else await updateGoal(editingId, body);
      } else if (composingShared) {
        await createShared(body);
      } else {
        await createCustom(body);
      }
      await waitForKeyboardHide();
      setComposing(false);
      setScope(composingShared ? 'together' : 'single');
      setListTab('today');
      resetForm();
      drawerRef.current?.snapTo(0);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save goal', 'error');
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    title,
    notes,
    iconItemType,
    repeat,
    repeatDays,
    remindOn,
    remindTime,
    section,
    sectionIconItemType,
    editingId,
    updateGoal,
    createCustom,
    updateShared,
    createShared,
    composingShared,
    resetForm,
    toast,
  ]);

  const handleSaveCustomRef = useRef(handleSaveCustom);
  handleSaveCustomRef.current = handleSaveCustom;

  const handleDeleteCustom = useCallback(
    (goal: PublicGoal) => {
      Alert.alert('Remove this goal?', goal.title, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const run = goal.source === 'shared' ? archiveShared(goal.id) : archiveGoal(goal.id);
            void run.catch((err) => {
              toast(err instanceof Error ? err.message : 'Could not remove goal', 'error');
            });
          },
        },
      ]);
    },
    [archiveGoal, archiveShared, toast],
  );

  const married = state.marriage?.status === 'married';
  const partnerName = state.marriage?.partner.username ?? 'your partner';
  const togetherChip = `w/${state.marriage?.partner.username ?? 'Partner'}`;

  const formBody = useCallback((): UpdateGoalBody => ({
    title: title.trim(),
    notes: notes.trim() || null,
    iconItemType,
    repeat,
    repeatDays: repeat === 'weekdays' ? repeatDays : undefined,
    remindAt: remindOn ? toHHmm(remindTime.hour, remindTime.minute, remindTime.am) : null,
    section: isGeneralSection(section) ? null : section.trim(),
    sectionIconItemType,
  }), [title, notes, iconItemType, repeat, repeatDays, remindOn, remindTime, section, sectionIconItemType]);

  const handleShareCustom = useCallback(
    (goal: PublicGoal, body?: UpdateGoalBody, fromForm = false) => {
      if (!married || goal.source !== 'custom') return;
      Alert.alert(
        'Share this goal?',
        `It’ll move to Together. ${partnerName} will see it, and it won’t stay on Yours.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Share',
            onPress: () => {
              void (async () => {
                if (fromForm) setSaving(true);
                else setBusyId(goal.id);
                try {
                  await shareCustom(goal.id, body);
                  setScope('together');
                  setListTab('saved');
                  if (fromForm) {
                    await waitForKeyboardHide();
                    setComposing(false);
                    resetForm();
                    drawerRef.current?.snapTo(0);
                  }
                } catch (err) {
                  toast(err instanceof Error ? err.message : 'Could not share goal', 'error');
                } finally {
                  setSaving(false);
                  setBusyId(null);
                }
              })();
            },
          },
        ],
      );
    },
    [married, partnerName, shareCustom, resetForm, toast],
  );

  const picker = state.iconPicker.length ? state.iconPicker : [iconItemType];
  const sectionPool = composingShared ? (state.sharedGoals ?? []) : state.goals;
  const sectionOptions = useMemo(() => {
    const extras: string[] = [];
    const seen = new Set(DEFAULT_SECTIONS.map((name) => name.toLowerCase()));
    for (const g of [...state.goals, ...(state.sharedGoals ?? [])]) {
      const name = g.section?.trim();
      if (!name || isGeneralSection(name) || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      extras.push(name);
    }
    const current = section.trim();
    if (current && !isGeneralSection(current) && !seen.has(current.toLowerCase())) extras.push(current);
    extras.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return [...DEFAULT_SECTIONS, ...extras];
  }, [state.goals, state.sharedGoals, section]);
  const allDone = state.dueCount > 0 && state.completedCount >= state.dueCount;
  const progress = state.dueCount > 0 ? state.completedCount / state.dueCount : 0;
  const lootLeft = Math.max(0, GOAL_REWARD_CAP - state.rewardedCount);
  const catalogOn = state.catalog.filter((c) => c.enabled).length;
  const onPrimary = colors.onPrimary ?? colors.textInverse;

  const todayBlurb =
    state.dueCount === 0
      ? 'Tap New to add one — check-offs give XP and a treat.'
      : allDone
        ? lootLeft > 0
          ? 'All done — your pet is beaming.'
          : 'All done. Daily loot is full, still counts!'
        : lootLeft > 0
          ? `Check off for +${GOAL_XP_TOTAL} XP and a surprise (${lootLeft} left today).`
          : 'Loot cap reached — checking off still feels good.';

  const headerRight = !composing ? (
    <Pressable
      onPress={() => startCompose()}
      hitSlop={8}
      style={[styles.newBtn, { backgroundColor: colors.primary }]}
    >
      <Ionicons name="add" size={16} color={onPrimary} />
      <Text style={[styles.newBtnText, { color: onPrimary }]}>New</Text>
    </Pressable>
  ) : undefined;

  const form = (
    <View style={[styles.form, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
      <Text style={[styles.formKicker, { color: colors.primary }]}>
        {editingId ? 'TWEAK IT' : composingShared ? 'TOGETHER' : 'MAKE IT YOURS'}
      </Text>
      {married && !editingId ? (
        <View style={styles.tabs}>
          <Pressable
            onPress={() => setComposingShared(false)}
            style={[
              styles.tabChip,
              {
                borderColor: !composingShared ? colors.primary : colors.border,
                backgroundColor: !composingShared ? colors.primary + '18' : colors.surface,
              },
            ]}
          >
            <Ionicons name="person-outline" size={14} color={!composingShared ? colors.primary : colors.text} />
            <Text style={[styles.tabChipText, { color: !composingShared ? colors.primary : colors.text }]}>
              Mine
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setComposingShared(true)}
            style={[
              styles.tabChip,
              {
                borderColor: composingShared ? colors.primary : colors.border,
                backgroundColor: composingShared ? colors.primary + '18' : colors.surface,
              },
            ]}
          >
            <Ionicons name="heart-outline" size={14} color={composingShared ? colors.primary : colors.text} />
            <Text
              style={[styles.tabChipText, { color: composingShared ? colors.primary : colors.text }]}
              numberOfLines={1}
            >
              {togetherChip}
            </Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.inlineField}>
        <Pressable
          onPress={() => {
            Keyboard.dismiss();
            setPickingIconFor('goal');
            drawerRef.current?.snapTo(1);
          }}
          style={[
            styles.iconSlot,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <GoalIcon
            itemType={iconItemType}
            size={28}
            imageUrl={state.iconArt[iconItemType]?.imageUrl}
            emoji={state.iconArt[iconItemType]?.emoji}
          />
        </Pressable>
        <BottomSheetTextInput
          key={`goal-title-${formSession}`}
          defaultValue={title}
          onChangeText={setTitle}
          placeholder="Clean the kitchen"
          placeholderTextColor={colors.textMuted}
          maxLength={80}
          returnKeyType="done"
          blurOnSubmit
          autoCorrect={false}
          autoCapitalize="sentences"
          onSubmitEditing={() => Keyboard.dismiss()}
          style={[styles.input, styles.inlineInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
        />
      </View>
      <BottomSheetTextInput
        key={`goal-notes-${formSession}`}
        defaultValue={notes}
        onChangeText={setNotes}
        placeholder="Optional description"
        placeholderTextColor={colors.textMuted}
        multiline
        autoCapitalize="sentences"
        style={[styles.input, styles.notesInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
      />
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>SECTION</Text>
      <View style={styles.inlineField}>
        <Pressable
          onPress={() => {
            Keyboard.dismiss();
            setPickingIconFor('section');
            drawerRef.current?.snapTo(1);
          }}
          style={[
            styles.iconSlot,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <GoalIcon
            itemType={sectionIconItemType}
            size={28}
            imageUrl={state.iconArt[sectionIconItemType]?.imageUrl}
            emoji={state.iconArt[sectionIconItemType]?.emoji}
          />
        </Pressable>
        <Pressable
          onPress={() => setSectionMenuOpen((open) => !open)}
          style={[
            styles.select,
            styles.inlineInput,
            {
              borderColor: sectionMenuOpen ? colors.primary : colors.border,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <Text style={[styles.selectValue, { color: colors.text }]} numberOfLines={1}>
            {addingSection ? 'New section' : section || 'General'}
          </Text>
          <Ionicons
            name={sectionMenuOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textMuted}
          />
        </Pressable>
      </View>
      {sectionMenuOpen ? (
        <View style={[styles.selectMenu, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Pressable
            onPress={() => {
              setAddingSection(true);
              setSectionMenuOpen(false);
              setSectionDraft('');
            }}
            style={({ pressed }) => [
              styles.selectItem,
              addingSection && { backgroundColor: colors.primary + '14' },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={[styles.selectItemText, { color: colors.primary }]}>New section</Text>
          </Pressable>
          <View style={[styles.selectDivider, { backgroundColor: colors.border }]} />
          <Pressable
            onPress={() => {
              setSection('');
              setSectionIconItemType(iconForSection('', sectionPool));
              setAddingSection(false);
              setSectionDraft('');
              setSectionMenuOpen(false);
            }}
            style={({ pressed }) => [
              styles.selectItem,
              !section && !addingSection && { backgroundColor: colors.primary + '14' },
              pressed && { opacity: 0.85 },
            ]}
          >
            <GoalIcon itemType={iconForSection('', sectionPool)} size={20} />
            <Text style={[styles.selectItemText, { color: colors.text }]}>General</Text>
            {!section && !addingSection ? (
              <Ionicons name="checkmark" size={16} color={colors.primary} />
            ) : null}
          </Pressable>
          {sectionOptions.map((name) => {
            const on = !addingSection && section === name;
            return (
              <Pressable
                key={name}
                onPress={() => {
                  setSection(name);
                  setSectionIconItemType(iconForSection(name, sectionPool));
                  setAddingSection(false);
                  setSectionDraft('');
                  setSectionMenuOpen(false);
                }}
                style={({ pressed }) => [
                  styles.selectItem,
                  on && { backgroundColor: colors.primary + '14' },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <GoalIcon itemType={iconForSection(name, sectionPool)} size={20} />
                <Text style={[styles.selectItemText, { color: colors.text }]}>{name}</Text>
                {on ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {addingSection ? (
        <View style={styles.sectionAddRow}>
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              setPickingIconFor('section');
              drawerRef.current?.snapTo(1);
            }}
            style={[
              styles.iconSlot,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <GoalIcon
              itemType={sectionIconItemType}
              size={28}
              imageUrl={state.iconArt[sectionIconItemType]?.imageUrl}
              emoji={state.iconArt[sectionIconItemType]?.emoji}
            />
          </Pressable>
          <BottomSheetTextInput
            key={`goal-section-new-${formSession}`}
            defaultValue={sectionDraft}
            onChangeText={setSectionDraft}
            placeholder="Name this section"
            placeholderTextColor={colors.textMuted}
            maxLength={32}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => {
              const next = sectionDraft.trim();
              if (!next) return;
              setSection(isGeneralSection(next) ? '' : next);
              setAddingSection(false);
              setSectionDraft('');
            }}
            style={[styles.input, styles.sectionAddInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
          />
          <Pressable
            onPress={() => {
              setAddingSection(false);
              setSectionDraft('');
            }}
            hitSlop={8}
            style={styles.iconBtn}
          >
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => {
              const next = sectionDraft.trim();
              if (!next) return;
              setSection(isGeneralSection(next) ? '' : next);
              setAddingSection(false);
              setSectionDraft('');
            }}
            style={[styles.sectionAddGo, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.sectionAddGoText, { color: onPrimary }]}>Add</Text>
          </Pressable>
        </View>
      ) : null}
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>REPEAT</Text>
      <View style={styles.repeatRow}>
        {([
          ['daily', 'repeat', 'Every day'],
          ['weekdays', 'calendar-outline', 'Certain days'],
          ['once', 'flag-outline', 'One time'],
        ] as const).map(([kind, icon, label]) => {
          const on = repeat === kind;
          return (
            <Pressable
              key={kind}
              onPress={() => setRepeat(kind)}
              style={[
                styles.chip,
                {
                  borderColor: on ? colors.primary : colors.border,
                  backgroundColor: on ? colors.primary + '18' : colors.surface,
                },
              ]}
            >
              <Ionicons name={icon} size={14} color={on ? colors.primary : colors.text} />
              <Text style={[styles.chipText, { color: on ? colors.primary : colors.text }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {repeat === 'weekdays' ? (
        <View style={styles.dayList}>
          {DAY_FULL.map((name, i) => {
            const on = repeatDays.includes(i);
            return (
              <Pressable
                key={name}
                onPress={() => toggleDay(i)}
                style={[
                  styles.dayChip,
                  {
                    borderColor: on ? colors.primary : colors.border,
                    backgroundColor: on ? colors.primary + '18' : colors.surface,
                  },
                ]}
              >
                <Ionicons
                  name={on ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={on ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.dayChipText, { color: on ? colors.primary : colors.text }]}>
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {repeat === 'weekdays' && repeatDays.length > 0 ? (
        <View style={styles.repeatPreview}>
          <Ionicons name="repeat" size={14} color={colors.primary} />
          <Text style={[styles.repeatPreviewText, { color: colors.primary }]}>
            {formatGoalRepeat('weekdays', repeatDays)}
          </Text>
        </View>
      ) : null}
      <ReminderPicker
        enabled={remindOn}
        time={remindTime}
        onEnabledChange={setRemindOn}
        onTimeChange={setRemindTime}
        colors={{
          text: colors.text,
          textMuted: colors.textMuted,
          textInverse: colors.textInverse,
          primary: colors.primary,
          surface: colors.surface,
          border: colors.border,
        }}
      />
      {editingId && !composingShared && married ? (
        <Pressable
          onPress={() => {
            const nextTitle = title.trim();
            if (!nextTitle) {
              toast('Give this goal a name', 'error');
              return;
            }
            if (repeat === 'weekdays' && repeatDays.length === 0) {
              toast('Pick at least one day', 'error');
              return;
            }
            const goal = customGoals.find((g) => g.id === editingId);
            if (!goal) return;
            handleShareCustom(goal, formBody(), true);
          }}
          disabled={saving}
          style={[styles.shareBtn, { borderColor: colors.primary }]}
        >
          <Ionicons name="heart-outline" size={16} color={colors.primary} />
          <Text style={[styles.shareBtnText, { color: colors.primary }]}>
            Share with {partnerName}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  const canModifyViewing =
    viewingGoal && (viewingGoal.source === 'custom' || viewingGoal.source === 'shared');

  const detailView = viewingGoal ? (
    <View style={[styles.form, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
      <Pressable onPress={() => setViewingGoal(null)} style={styles.detailBack} hitSlop={8}>
        <Ionicons name="chevron-back" size={20} color={colors.primary} />
        <Text style={[styles.detailBackText, { color: colors.primary }]}>Back</Text>
      </Pressable>
      <View style={styles.detailHero}>
        <View style={[styles.detailIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <GoalIcon
            itemType={viewingGoal.iconItemType}
            imageUrl={viewingGoal.iconImageUrl}
            emoji={viewingGoal.iconEmoji}
            size={44}
          />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.detailTitle, { color: colors.text }]}>{viewingGoal.title}</Text>
          {viewingGoal.section && !isGeneralSection(viewingGoal.section) ? (
            <Text style={[styles.detailSection, { color: colors.textMuted }]}>{viewingGoal.section}</Text>
          ) : null}
          {viewingGoal.completedToday ? (
            <Text style={[styles.detailDone, { color: colors.primary }]}>Checked off today</Text>
          ) : viewingGoal.dueToday ? (
            <Text style={[styles.detailDue, { color: colors.textSecondary }]}>Due today</Text>
          ) : null}
        </View>
      </View>
      <GoalMeta
        repeat={viewingGoal.repeat}
        repeatDays={viewingGoal.repeatDays}
        remindAt={viewingGoal.remindAt}
        notes={viewingGoal.notes}
        color={colors.textMuted}
        notesColor={colors.text}
        notesMax={0}
      />
      {viewingGoal.completedByUsername ? (
        <Text style={[styles.detailDue, { color: colors.textSecondary }]}>
          Checked off by {viewingGoal.completedByUsername}
        </Text>
      ) : null}
    </View>
  ) : null;

  const detailFooter = canModifyViewing ? (
    <View style={[styles.formActions, { paddingHorizontal: spacing.xl, paddingBottom: 8 }]}>
      <Pressable onPress={() => setViewingGoal(null)} style={[styles.secondaryBtn, { borderColor: colors.border }]}>
        <Text style={[styles.secondaryText, { color: colors.text }]}>Close</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          const goal = viewingGoal;
          if (!goal) return;
          setViewingGoal(null);
          startEdit(goal);
        }}
        style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.primaryText, { color: onPrimary }]}>Modify</Text>
      </Pressable>
    </View>
  ) : (
    <View style={[styles.formActions, { paddingHorizontal: spacing.xl, paddingBottom: 8 }]}>
      <Pressable
        onPress={() => setViewingGoal(null)}
        style={[styles.primaryBtn, { backgroundColor: colors.primary, flex: 1 }]}
      >
        <Text style={[styles.primaryText, { color: onPrimary }]}>Close</Text>
      </Pressable>
    </View>
  );

  const formFooter = (
    <View style={[styles.formActions, { paddingHorizontal: spacing.xl, paddingBottom: 8 }]}>
      <Pressable onPress={() => stopComposeRef.current()} style={[styles.secondaryBtn, { borderColor: colors.border }]}>
        <Text style={[styles.secondaryText, { color: colors.text }]}>Cancel</Text>
      </Pressable>
      <Pressable
        onPress={() => void handleSaveCustomRef.current()}
        disabled={saving}
        style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
      >
        {saving ? (
          <ActivityIndicator color={onPrimary} />
        ) : (
          <Text style={[styles.primaryText, { color: onPrimary }]}>
              {editingId ? 'Save' : composingShared ? 'Add shared' : 'Add goal'}
          </Text>
        )}
      </Pressable>
    </View>
  );

  return (
    <AppDrawer
      ref={drawerRef}
      title={
        pickingIconFor
          ? pickingIconFor === 'section'
            ? 'Section icon'
            : 'Goal icon'
          : composing
            ? editingId
              ? composingShared
                ? 'Edit shared goal'
                : 'Edit goal'
              : composingShared
                ? 'New shared goal'
                : 'New goal'
            : viewingGoal
              ? 'Goal'
              : 'Goals'
      }
      snapPoints={SNAP_POINTS}
      keyboardBehavior="extend"
      headerRight={pickingIconFor || viewingGoal ? undefined : headerRight}
      footerKey={
        pickingIconFor
          ? `icon-${pickingIconFor}`
          : composing
            ? `form-${editingId ?? 'new'}-${saving ? 'saving' : 'idle'}`
            : viewingGoal
              ? `detail-${viewingGoal.id}`
              : 'list'
      }
      footer={
        composing && !pickingIconFor
          ? formFooter
          : viewingGoal && !pickingIconFor
            ? detailFooter
            : undefined
      }
      overlayAbove={<ItemGainToastHost toneFilter="got" />}
      onClose={handleDrawerClose}
    >
      <View style={styles.body}>
        {pickingIconFor ? (
          <GoalIconPicker
            icons={picker}
            selected={pickingIconFor === 'section' ? sectionIconItemType : iconItemType}
            art={state.iconArt}
            onBack={() => setPickingIconFor(null)}
            onSelect={(itemType) => {
              if (pickingIconFor === 'section') setSectionIconItemType(itemType);
              else setIconItemType(itemType);
              setPickingIconFor(null);
            }}
          />
        ) : composing ? (
          form
        ) : viewingGoal ? (
          detailView
        ) : (
          <>
            <View
              style={[
                styles.hero,
                {
                  backgroundColor: allDone ? colors.primary + '16' : colors.surfaceElevated,
                  borderColor: allDone ? colors.primary + '44' : colors.border,
                },
              ]}
            >
              <View style={styles.heroTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.heroKicker, { color: colors.primary }]}>
                    {allDone ? 'NICE WORK' : 'TODAY'}
                  </Text>
                  <Text style={[styles.heroTitle, { color: colors.text }]}>
                    {state.dueCount === 0
                      ? 'No goals yet'
                      : `${state.completedCount} of ${state.dueCount}`}
                  </Text>
                </View>
                {allDone ? (
                  <Ionicons name="sparkles" size={22} color={colors.primary} />
                ) : lootLeft > 0 && state.dueCount > 0 ? (
                  <View style={[styles.lootPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name="gift-outline" size={12} color={colors.primary} />
                    <Text style={[styles.lootPillText, { color: colors.primary }]}>
                      {lootLeft}/{GOAL_REWARD_CAP}
                    </Text>
                  </View>
                ) : null}
              </View>
              {state.dueCount > 0 ? (
                <View style={[styles.bar, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${Math.round(progress * 100)}%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
              ) : null}
              <Text style={[styles.heroBlurb, { color: colors.textSecondary }]}>{todayBlurb}</Text>
            </View>

            {state.marriage?.status === 'pending' ? (
              <View style={[styles.marryCard, { borderColor: colors.primary, backgroundColor: colors.primary + '12' }]}>
                <Ionicons name="heart" size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.marryTitle, { color: colors.text }]}>
                    {state.marriage.proposedByMe
                      ? `Waiting on ${state.marriage.partner.username ?? 'them'}`
                      : `${state.marriage.partner.username ?? 'Someone'} wants to marry you`}
                  </Text>
                  <Text style={[styles.marrySub, { color: colors.textSecondary }]}>
                    Shared goals live in a Together list, apart from your own.
                  </Text>
                </View>
                {!state.marriage.proposedByMe ? (
                  <View style={{ gap: 6 }}>
                    <Pressable
                      onPress={() => void respondToMarriage(state.marriage!.id, 'accepted')}
                      style={[styles.marryBtn, { backgroundColor: colors.primary }]}
                    >
                      <Text style={[styles.marryBtnText, { color: onPrimary }]}>Yes</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void respondToMarriage(state.marriage!.id, 'rejected')}
                      style={[styles.marryBtn, { borderWidth: 1, borderColor: colors.border }]}
                    >
                      <Text style={[styles.marryBtnText, { color: colors.text }]}>Not now</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.tabs}>
              <Pressable
                onPress={() => setListTab('today')}
                style={[
                  styles.tabChip,
                  {
                    borderColor: listTab === 'today' ? colors.primary : colors.border,
                    backgroundColor: listTab === 'today' ? colors.primary + '18' : colors.surface,
                  },
                ]}
              >
                <Ionicons
                  name="checkbox-outline"
                  size={14}
                  color={listTab === 'today' ? colors.primary : colors.text}
                />
                <Text style={[styles.tabChipText, { color: listTab === 'today' ? colors.primary : colors.text }]}>
                  Today
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setListTab('saved')}
                style={[
                  styles.tabChip,
                  {
                    borderColor: listTab === 'saved' ? colors.primary : colors.border,
                    backgroundColor: listTab === 'saved' ? colors.primary + '18' : colors.surface,
                  },
                ]}
              >
                <Ionicons
                  name="albums-outline"
                  size={14}
                  color={listTab === 'saved' ? colors.primary : colors.text}
                />
                <Text style={[styles.tabChipText, { color: listTab === 'saved' ? colors.primary : colors.text }]}>
                  Saved
                </Text>
              </Pressable>
              {married ? (
                <>
                  <View style={[styles.tabSplit, { backgroundColor: colors.border }]} />
                  <Pressable
                    onPress={() => setScope('single')}
                    style={[
                      styles.tabChip,
                      {
                        borderColor: scope === 'single' ? colors.primary : colors.border,
                        backgroundColor: scope === 'single' ? colors.primary + '18' : colors.surface,
                      },
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={14}
                      color={scope === 'single' ? colors.primary : colors.text}
                    />
                    <Text style={[styles.tabChipText, { color: scope === 'single' ? colors.primary : colors.text }]}>
                      Mine
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setScope('together')}
                    style={[
                      styles.tabChip,
                      {
                        borderColor: scope === 'together' ? colors.primary : colors.border,
                        backgroundColor: scope === 'together' ? colors.primary + '18' : colors.surface,
                      },
                    ]}
                  >
                    <Ionicons
                      name="heart-outline"
                      size={14}
                      color={scope === 'together' ? colors.primary : colors.text}
                    />
                    <Text
                      style={[styles.tabChipText, { color: scope === 'together' ? colors.primary : colors.text }]}
                      numberOfLines={1}
                    >
                      {togetherChip}
                    </Text>
                  </Pressable>
                </>
              ) : null}
            </View>

            {listTab === 'today' && !(married && scope === 'together') ? (
              dueToday.length === 0 ? (
                <Pressable
                  onPress={() => startCompose(false)}
                  style={({ pressed }) => [
                    styles.emptyCard,
                    { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  <Ionicons name="add-circle" size={22} color={colors.primary} />
                  <Text style={[styles.emptyCardTitle, { color: colors.primary }]}>Create a goal</Text>
                  <Text style={[styles.emptyCardSub, { color: colors.textSecondary }]}>
                    Or turn one on from Saved
                  </Text>
                </Pressable>
              ) : (
                groupGoalsBySection(dueToday).map((group, _i, groups) => (
                  <GoalSection
                    key={group.key}
                    label={group.label}
                    count={group.goals.length}
                    collapsed={collapsedSections.has(group.key)}
                    onToggle={() => toggleSection(group.key)}
                    colors={colors}
                    iconItemType={iconForSection(group.key === '__general' ? '' : group.key, group.goals)}
                    flat={groups.length === 1 && group.key === '__general'}
                  >
                    {group.goals.map((goal) => {
                  const done = goal.completedToday;
                  return (
                    <Pressable
                      key={goal.id}
                      onPress={() => void handleToggleComplete(goal)}
                      onLongPress={() => openGoalDetail(goal)}
                      delayLongPress={320}
                      style={({ pressed }) => [
                        styles.row,
                        {
                          borderColor: done ? colors.primary + '55' : colors.border,
                          backgroundColor: done ? colors.primary + '12' : colors.surfaceElevated,
                        },
                        pressed && { opacity: 0.88 },
                      ]}
                    >
                      <View
                        style={[
                          styles.check,
                          {
                            borderColor: done ? colors.primary : colors.border,
                            backgroundColor: done ? colors.primary : colors.surface,
                          },
                        ]}
                      >
                        {busyId === goal.id ? (
                          <ActivityIndicator size="small" color={done ? onPrimary : colors.primary} />
                        ) : done ? (
                          <Ionicons name="checkmark" size={16} color={onPrimary} />
                        ) : null}
                      </View>
                      <View style={[styles.iconPad, { backgroundColor: colors.surface }]}>
                        <GoalIcon
                          itemType={goal.iconItemType}
                          imageUrl={goal.iconImageUrl}
                          emoji={goal.iconEmoji}
                          size={28}
                        />
                      </View>
                      <View style={styles.rowBody}>
                        <Text
                          style={[
                            styles.rowTitle,
                            { color: colors.text, textDecorationLine: done ? 'line-through' : 'none' },
                          ]}
                          numberOfLines={2}
                        >
                          {goal.title}
                        </Text>
                        <GoalMeta
                          repeat={goal.repeat}
                          repeatDays={goal.repeatDays}
                          remindAt={goal.remindAt}
                          notes={goal.notes}
                          color={colors.textMuted}
                          notesColor={colors.textSecondary}
                        />
                      </View>
                      <View
                        style={[
                          styles.rewardPeek,
                          {
                            backgroundColor: colors.surface,
                            borderColor: lootLeft > 0 && !done ? colors.primary + '55' : colors.border,
                            opacity: lootLeft > 0 && !done ? 1 : 0.45,
                          },
                        ]}
                      >
                        <Ionicons
                          name={done ? 'gift' : 'gift-outline'}
                          size={16}
                          color={lootLeft > 0 ? colors.primary : colors.textMuted}
                        />
                      </View>
                    </Pressable>
                  );
                })}
                  </GoalSection>
                ))
              )
            ) : null}

            {listTab === 'today' && married && scope === 'together' ? (
              sharedDueToday.length === 0 ? (
                <Pressable
                  onPress={() => startCompose(true)}
                  style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                >
                  <Ionicons name="heart-outline" size={20} color={colors.primary} />
                  <Text style={[styles.emptyCardTitle, { color: colors.text }]}>Nothing due together</Text>
                  <Text style={[styles.emptyCardSub, { color: colors.textSecondary }]}>
                    Add a shared goal, or check Saved
                  </Text>
                </Pressable>
              ) : (
                groupGoalsBySection(sharedDueToday).map((group, _i, groups) => (
                  <GoalSection
                    key={group.key}
                    label={group.label}
                    count={group.goals.length}
                    collapsed={collapsedSections.has(group.key)}
                    onToggle={() => toggleSection(group.key)}
                    colors={colors}
                    iconItemType={iconForSection(group.key === '__general' ? '' : group.key, group.goals)}
                    flat={groups.length === 1 && group.key === '__general'}
                  >
                    {group.goals.map((goal) => {
                  const done = goal.completedToday;
                  return (
                    <Pressable
                      key={goal.id}
                      onPress={() => void handleToggleComplete(goal)}
                      onLongPress={() => openGoalDetail(goal)}
                      delayLongPress={320}
                      style={({ pressed }) => [
                        styles.row,
                        {
                          borderColor: done ? colors.primary + '55' : colors.border,
                          backgroundColor: done ? colors.primary + '12' : colors.surfaceElevated,
                        },
                        pressed && { opacity: 0.88 },
                      ]}
                    >
                      <View
                        style={[
                          styles.check,
                          {
                            borderColor: done ? colors.primary : colors.border,
                            backgroundColor: done ? colors.primary : colors.surface,
                          },
                        ]}
                      >
                        {busyId === goal.id ? (
                          <ActivityIndicator size="small" color={done ? onPrimary : colors.primary} />
                        ) : done ? (
                          <Ionicons name="checkmark" size={16} color={onPrimary} />
                        ) : null}
                      </View>
                      <View style={[styles.iconPad, { backgroundColor: colors.surface }]}>
                        <GoalIcon
                          itemType={goal.iconItemType}
                          imageUrl={goal.iconImageUrl}
                          emoji={goal.iconEmoji}
                          size={26}
                        />
                      </View>
                      <View style={styles.rowBody}>
                        <Text
                          style={[
                            styles.rowTitle,
                            { color: colors.text, textDecorationLine: done ? 'line-through' : 'none' },
                          ]}
                          numberOfLines={2}
                        >
                          {goal.title}
                        </Text>
                        <GoalMeta
                          repeat={goal.repeat}
                          repeatDays={goal.repeatDays}
                          remindAt={goal.remindAt}
                          notes={
                            done && goal.completedByUsername
                              ? `Checked off by ${goal.completedByUsername}`
                              : goal.notes
                          }
                          color={colors.textMuted}
                          notesColor={colors.textSecondary}
                        />
                      </View>
                      <View
                        style={[
                          styles.rewardPeek,
                          {
                            backgroundColor: colors.surface,
                            borderColor: lootLeft > 0 && !done ? colors.primary + '55' : colors.border,
                            opacity: lootLeft > 0 && !done ? 1 : 0.45,
                          },
                        ]}
                      >
                        <Ionicons
                          name={done ? 'gift' : 'gift-outline'}
                          size={16}
                          color={lootLeft > 0 ? colors.primary : colors.textMuted}
                        />
                      </View>
                    </Pressable>
                  );
                })}
                  </GoalSection>
                ))
              )
            ) : null}

            {listTab === 'saved' && married && scope === 'together' ? (
              <>
                <View style={styles.sectionToggle}>
                  <Text style={[styles.section, { color: colors.textMuted, marginBottom: 0 }]}>
                    TOGETHER
                  </Text>
                  <View style={styles.sectionToggleRight}>
                    <Text style={[styles.sectionMeta, { color: colors.textMuted }]} numberOfLines={1}>
                      {state.marriage?.partner.username ?? 'Partner'}
                    </Text>
                    <Pressable
                      onPress={() =>
                        Alert.alert(
                          'End this marriage?',
                          'Your Together goals will be put away. Personal goals stay yours.',
                          [
                            { text: 'Keep', style: 'cancel' },
                            {
                              text: 'End',
                              style: 'destructive',
                              onPress: () => {
                                void endMarriage().catch((err) =>
                                  toast(err instanceof Error ? err.message : 'Could not end marriage', 'error'),
                                );
                              },
                            },
                          ],
                        )
                      }
                      hitSlop={8}
                      style={styles.iconBtn}
                    >
                      <Ionicons name="heart-dislike-outline" size={16} color={colors.textMuted} />
                    </Pressable>
                  </View>
                </View>
                {(state.sharedGoals ?? []).length === 0 ? (
                  <Pressable
                    onPress={() => startCompose(true)}
                    style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                  >
                    <Ionicons name="heart-outline" size={20} color={colors.primary} />
                    <Text style={[styles.emptyCardTitle, { color: colors.text }]}>Add a shared goal</Text>
                    <Text style={[styles.emptyCardSub, { color: colors.textSecondary }]}>
                      Only the two of you see this list
                    </Text>
                  </Pressable>
                ) : (
                  groupGoalsBySection(state.sharedGoals ?? []).map((group, _i, groups) => (
                    <GoalSection
                      key={group.key}
                      label={group.label}
                      count={group.goals.length}
                      collapsed={collapsedSections.has(group.key)}
                      onToggle={() => toggleSection(group.key)}
                      colors={colors}
                      iconItemType={iconForSection(group.key === '__general' ? '' : group.key, group.goals)}
                      flat={groups.length === 1 && group.key === '__general'}
                    >
                      {group.goals.map((goal) => {
                    const done = goal.completedToday;
                    return (
                      <Pressable
                        key={goal.id}
                        onPress={() => void handleToggleComplete(goal)}
                        onLongPress={() => openGoalDetail(goal)}
                        delayLongPress={320}
                        style={[
                          styles.row,
                          {
                            borderColor: done ? colors.primary + '55' : colors.border,
                            backgroundColor: done ? colors.primary + '12' : colors.surfaceElevated,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.check,
                            {
                              borderColor: done ? colors.primary : colors.border,
                              backgroundColor: done ? colors.primary : colors.surface,
                            },
                          ]}
                        >
                          {busyId === goal.id ? (
                            <ActivityIndicator size="small" color={done ? onPrimary : colors.primary} />
                          ) : done ? (
                            <Ionicons name="checkmark" size={16} color={onPrimary} />
                          ) : null}
                        </View>
                        <View style={[styles.iconPad, { backgroundColor: colors.surface }]}>
                          <GoalIcon
                            itemType={goal.iconItemType}
                            imageUrl={goal.iconImageUrl}
                            emoji={goal.iconEmoji}
                            size={26}
                          />
                        </View>
                        <View style={styles.rowBody}>
                          <Text
                            style={[
                              styles.rowTitle,
                              { color: colors.text, textDecorationLine: done ? 'line-through' : 'none' },
                            ]}
                            numberOfLines={2}
                          >
                            {goal.title}
                          </Text>
                          <GoalMeta
                            repeat={goal.repeat}
                            repeatDays={goal.repeatDays}
                            remindAt={goal.remindAt}
                            notes={
                              done && goal.completedByUsername
                                ? `Checked off by ${goal.completedByUsername}`
                                : goal.notes
                            }
                            color={colors.textMuted}
                            notesColor={colors.textSecondary}
                          />
                        </View>
                        <Pressable onPress={() => startEdit(goal)} hitSlop={8} style={styles.iconBtn}>
                          <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
                        </Pressable>
                        <Pressable onPress={() => handleDeleteCustom(goal)} hitSlop={8} style={styles.iconBtn}>
                          <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                        </Pressable>
                      </Pressable>
                    );
                  })}
                    </GoalSection>
                  ))
                )}
              </>
            ) : null}

            {listTab === 'saved' && !(married && scope === 'together') ? (
              <>
                {customGoals.length > 0 ? (
                  <>
                    <Text style={[styles.section, { color: colors.textMuted, marginTop: 6 }]}>YOURS</Text>
                    {groupGoalsBySection(customGoals).map((group, _i, groups) => (
                      <GoalSection
                        key={group.key}
                        label={group.label}
                        count={group.goals.length}
                        collapsed={collapsedSections.has(group.key)}
                        onToggle={() => toggleSection(group.key)}
                        colors={colors}
                        iconItemType={iconForSection(group.key === '__general' ? '' : group.key, group.goals)}
                        flat={groups.length === 1 && group.key === '__general'}
                      >
                        {group.goals.map((goal) => (
                      <Pressable
                        key={goal.id}
                        onLongPress={() => openGoalDetail(goal)}
                        delayLongPress={320}
                        style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}
                      >
                        <View style={[styles.iconPad, { backgroundColor: colors.surfaceElevated }]}>
                          <GoalIcon
                            itemType={goal.iconItemType}
                            imageUrl={goal.iconImageUrl}
                            emoji={goal.iconEmoji}
                            size={26}
                          />
                        </View>
                        <View style={styles.rowBody}>
                          <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={2}>
                            {goal.title}
                          </Text>
                          <GoalMeta
                            repeat={goal.repeat}
                            repeatDays={goal.repeatDays}
                            remindAt={goal.remindAt}
                            notes={goal.notes}
                            color={colors.textMuted}
                            notesColor={colors.textSecondary}
                          />
                        </View>
                        <Pressable onPress={() => startEdit(goal)} hitSlop={8} style={styles.iconBtn}>
                          <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
                        </Pressable>
                        {married ? (
                          <Pressable
                            onPress={() => handleShareCustom(goal)}
                            hitSlop={8}
                            style={styles.iconBtn}
                          >
                            {busyId === goal.id ? (
                              <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                              <Ionicons name="heart-outline" size={16} color={colors.primary} />
                            )}
                          </Pressable>
                        ) : null}
                        <Pressable onPress={() => handleDeleteCustom(goal)} hitSlop={8} style={styles.iconBtn}>
                          <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                        </Pressable>
                      </Pressable>
                    ))}
                      </GoalSection>
                    ))}
                  </>
                ) : (
                  <Pressable
                    onPress={() => startCompose(false)}
                    style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                  >
                    <Ionicons name="create-outline" size={20} color={colors.primary} />
                    <Text style={[styles.emptyCardTitle, { color: colors.text }]}>No custom goals yet</Text>
                    <Text style={[styles.emptyCardSub, { color: colors.textSecondary }]}>
                      Make one, or turn on a recommended habit
                    </Text>
                  </Pressable>
                )}

                <View style={styles.sectionToggle}>
                  <Text style={[styles.section, { color: colors.textMuted, marginBottom: 0 }]}>RECOMMENDED</Text>
                  <Text style={[styles.sectionMeta, { color: colors.textMuted }]}>{catalogOn} on</Text>
                </View>
                {state.catalog.map((entry) => {
                  const catalogGoal = state.goals.find((g) => g.catalogId === entry.id);
                  return (
                    <Pressable
                      key={entry.id}
                      onLongPress={() =>
                        openGoalDetail({
                          id: catalogGoal?.id ?? entry.id,
                          source: 'catalog',
                          catalogId: entry.id,
                          title: entry.title,
                          iconItemType: entry.iconItemType,
                          iconImageUrl: entry.iconImageUrl,
                          iconEmoji: entry.iconEmoji,
                          rewardItemType: catalogGoal?.rewardItemType ?? '',
                          repeat: 'daily',
                          repeatDays: [],
                          remindAt: catalogGoal?.remindAt,
                          enabled: entry.enabled,
                          dueToday: catalogGoal?.dueToday ?? false,
                          completedToday: catalogGoal?.completedToday ?? false,
                          notes: catalogGoal?.notes,
                          sortOrder: catalogGoal?.sortOrder ?? 0,
                        })
                      }
                      delayLongPress={320}
                      style={[styles.row, styles.rowCenter, { borderColor: colors.border, backgroundColor: colors.surface }]}
                    >
                      <View style={[styles.iconPad, { backgroundColor: colors.surfaceElevated }]}>
                        <GoalIcon
                          itemType={entry.iconItemType}
                          imageUrl={entry.iconImageUrl}
                          emoji={entry.iconEmoji}
                          size={26}
                        />
                      </View>
                      <View style={styles.rowBody}>
                        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                          {entry.title}
                        </Text>
                        <GoalMeta
                          repeat="daily"
                          remindAt={catalogGoal?.remindAt}
                          color={colors.textMuted}
                          notesColor={colors.textSecondary}
                        />
                      </View>
                      <Switch
                        value={entry.enabled}
                        onValueChange={(v) => void handleCatalogToggle(entry.id, v)}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={colors.textInverse}
                      />
                    </Pressable>
                  );
                })}
              </>
            ) : null}

            {listTab === 'saved' ? (
              <Pressable
                onPress={() => startCompose(married && scope === 'together')}
                style={({ pressed }) => [
                  styles.addSavedBtn,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.88 },
                ]}
              >
                <Ionicons name="add" size={18} color={onPrimary} />
                <Text style={[styles.addSavedBtnText, { color: onPrimary }]} numberOfLines={1}>
                  {married && scope === 'together' ? `Add ${togetherChip}` : 'Add a goal'}
                </Text>
              </Pressable>
            ) : null}

          </>
        )}
      </View>
    </AppDrawer>
  );
});

const styles = StyleSheet.create({
  body: { paddingBottom: spacing.xl, gap: 8 },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginRight: 4,
  },
  newBtnText: { fontSize: 13, fontWeight: '800' },
  hero: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 12,
    gap: 8,
    marginBottom: 4,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroKicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  heroTitle: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  heroBlurb: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  lootPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  lootPillText: { fontSize: 12, fontWeight: '800' },
  bar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  emptyCard: {
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  emptyCardTitle: { fontSize: 16, fontWeight: '800' },
  emptyCardSub: { fontSize: 12, fontWeight: '600' },
  section: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, marginBottom: 2 },
  sectionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingVertical: 4,
  },
  sectionToggleRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionMeta: { fontSize: 11, fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sectionHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderTitle: { flex: 1, fontSize: 15, fontWeight: '800' },
  sectionCount: {
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
  },
  sectionCountText: { fontSize: 12, fontWeight: '800' },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inlineField: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineInput: { flex: 1, minHeight: 48 },
  iconSlot: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectValue: { flex: 1, fontSize: 15, fontWeight: '700' },
  selectMenu: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginTop: -4,
  },
  selectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectItemText: { flex: 1, fontSize: 15, fontWeight: '700' },
  selectDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 12 },
  catalogHint: { fontSize: 12, fontWeight: '500', marginTop: -2, marginBottom: 4 },
  marryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 12,
  },
  marryTitle: { fontSize: 14, fontWeight: '800' },
  marrySub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  marryBtn: {
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  marryBtnText: { fontSize: 12, fontWeight: '800' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  rowCenter: { alignItems: 'center' },
  check: {
    width: 26,
    height: 26,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  iconPad: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  rowBody: { flex: 1, gap: 4, paddingTop: 1 },
  rowTitle: { fontSize: 15, fontWeight: '800' },
  rewardPeek: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  iconBtn: { padding: 4, marginTop: 2 },
  form: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 12,
    gap: 10,
    marginTop: 4,
  },
  formKicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  notesInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  fieldLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  tabChipText: { fontSize: 13, fontWeight: '800' },
  tabSplit: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    marginHorizontal: 2,
  },
  iconScroll: { maxHeight: 96, marginHorizontal: -4 },
  iconScrollContent: { gap: 8, paddingHorizontal: 4, paddingVertical: 2 },
  iconCol: { gap: 8 },
  iconPick: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexGrow: 1,
    flexBasis: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 13, fontWeight: '700' },
  sectionAddRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAddInput: { flex: 1, minHeight: undefined, paddingVertical: 10 },
  sectionAddGo: {
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sectionAddGoText: { fontSize: 14, fontWeight: '800' },
  detailBack: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  detailBackText: { fontSize: 15, fontWeight: '800' },
  detailHero: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  detailIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTitle: { fontSize: 20, fontWeight: '800' },
  detailSection: { fontSize: 12, fontWeight: '700' },
  detailDone: { fontSize: 12, fontWeight: '800' },
  detailDue: { fontSize: 12, fontWeight: '600' },
  dayList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  dayChipText: { fontSize: 14, fontWeight: '700' },
  repeatPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  repeatPreviewText: { fontSize: 13, fontWeight: '700' },
  formActions: { flexDirection: 'row', gap: 8 },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingVertical: 12,
  },
  shareBtnText: { fontSize: 14, fontWeight: '800' },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: { fontSize: 15, fontWeight: '700' },
  primaryBtn: {
    flex: 1,
    borderRadius: radius.full,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { fontSize: 15, fontWeight: '800' },
  addSavedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.full,
    paddingVertical: 14,
    marginTop: 8,
  },
  addSavedBtnText: { fontSize: 15, fontWeight: '800' },
});
