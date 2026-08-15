import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { requireOptionalNativeModule } from 'expo-modules-core';
import type { FastingSession } from '@/lib/api';

const APP_GROUP = 'group.com.hatchly.app';
const PET_FILE = 'fasting-pet.png';
const PENDING_DONE_EATING = 'pending-done-eating';
const PENDING_COMPLETE_TODOS = 'pending-complete-todos';
const MAX_LIVE_TODOS = 1;

export interface LiveTodo {
  id: string;
  title: string;
  emoji?: string;
  letter?: string;
  iconUrl?: string;
}

interface NativeFastingLiveActivity {
  areActivitiesEnabled(): boolean;
  start(
    startedAtMs: number,
    endsAtMs: number,
    goalHours: number,
    petName: string,
    petImageUri: string | null,
    showFasting: boolean,
    todosJson: string,
  ): Promise<boolean>;
  end(): Promise<void>;
}

const native =
  Platform.OS === 'ios'
    ? requireOptionalNativeModule<NativeFastingLiveActivity>('FastingLiveActivity')
    : null;

if (Platform.OS === 'ios' && !native) {
  console.warn(
    '[FastingLive] Native module is missing. Lock Screen / Dynamic Island will not start until you install a new iOS build that includes fasting-live-activity.',
  );
}

export function isFastingLiveActivityAvailable(): boolean {
  try {
    return !!native?.areActivitiesEnabled();
  } catch {
    return false;
  }
}

async function downloadPetImage(imageUrl: string | undefined): Promise<string | null> {
  if (!imageUrl) return null;
  try {
    const dest = new File(Paths.cache, PET_FILE);
    const file = await File.downloadFileAsync(imageUrl, dest, { idempotent: true });
    return file.uri || imageUrl;
  } catch {
    // Native start() can still fetch https URLs itself.
    return imageUrl;
  }
}

export async function startFastingLiveActivity(opts: {
  session: FastingSession | null;
  showFasting: boolean;
  petName: string;
  petImageUrl?: string;
  todos?: LiveTodo[];
}): Promise<void> {
  if (!native) {
    console.warn('[FastingLive] start skipped — native module not in this binary');
    return;
  }
  try {
    const petImageUri = await downloadPetImage(opts.petImageUrl);
    const todos = (opts.todos ?? []).slice(0, MAX_LIVE_TODOS).map((todo) => ({
      id: todo.id,
      title: todo.title.trim().slice(0, 40),
      emoji: todo.emoji ?? '',
      letter: (todo.letter || todo.title.trim().charAt(0) || '?').toUpperCase(),
      iconUrl: todo.iconUrl ?? '',
    }));
    const session = opts.session;
    const now = Date.now();
    const startedAtMs = session ? new Date(session.startedAt).getTime() : now;
    const endsAtMs = session
      ? new Date(session.endsAt).getTime()
      : now + 12 * 60 * 60 * 1000;
    const ok = await native.start(
      startedAtMs,
      endsAtMs,
      session?.goalHours ?? 0,
      opts.petName,
      petImageUri,
      opts.showFasting && !!session,
      JSON.stringify(todos),
    );
    if (!ok) {
      console.warn(
        '[FastingLive] ActivityKit start returned false. Check Settings → Hatchly → Live Activities.',
      );
    }
  } catch (error) {
    console.warn('[FastingLive] start failed', error);
  }
}

export async function endFastingLiveActivity(): Promise<void> {
  if (!native) return;
  try {
    await native.end();
  } catch {
    // ignore
  }
}

export async function syncFastingLiveActivity(
  session: FastingSession | null,
  opts: {
    enabled: boolean;
    fastingEnabled: boolean;
    petName: string;
    petImageUrl?: string;
    todos?: LiveTodo[];
  },
): Promise<void> {
  const showFasting = opts.fastingEnabled && !!session;
  const hasTodos = (opts.todos?.length ?? 0) > 0;
  if (!opts.enabled || (!showFasting && !hasTodos)) {
    await endFastingLiveActivity();
    return;
  }
  await startFastingLiveActivity({
    session,
    showFasting,
    petName: opts.petName,
    petImageUrl: opts.petImageUrl,
    todos: opts.todos,
  });
}

export function isDoneEatingDeepLink(url: string | null | undefined): boolean {
  return !!url && url.includes('fasting/done-eating');
}

let consumedInitialDoneEatingUrl = false;

export function takeInitialDoneEatingUrl(url: string | null | undefined): boolean {
  if (consumedInitialDoneEatingUrl || !isDoneEatingDeepLink(url)) return false;
  consumedInitialDoneEatingUrl = true;
  return true;
}

export function isCompleteTodoDeepLink(url: string | null | undefined): string | null {
  if (!url || !url.includes('goals/complete')) return null;
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('id');
  } catch {
    const match = url.match(/[?&]id=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }
}

export async function consumePendingTodoCompletions(): Promise<string[]> {
  if (Platform.OS !== 'ios') return [];
  try {
    const group = Paths.appleSharedContainers[APP_GROUP];
    if (!group) return [];
    const file = new File(group, PENDING_COMPLETE_TODOS);
    if (!file.exists) return [];
    const text = await file.text();
    file.delete();
    return text
      .split(/\r?\n/)
      .map((id) => id.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function consumePendingDoneEating(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    const group = Paths.appleSharedContainers[APP_GROUP];
    if (!group) return false;
    const file = new File(group, PENDING_DONE_EATING);
    if (!file.exists) return false;
    file.delete();
    return true;
  } catch {
    return false;
  }
}
