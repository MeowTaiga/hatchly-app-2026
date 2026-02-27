/**
 * HealthKit wrapper — uses react-native-health's native module directly.
 * Only available in iOS development builds (not Expo Go).
 */
import { useCallback, useEffect, useState } from 'react';
import { NativeModules, Platform } from 'react-native';

export const HKAuthorizationRequestStatus = {
  unknown: 0,
  shouldRequest: 1,
  unnecessary: 2,
} as const;

const STEP_COUNT = 'StepCount';
export const HEALTH_READ = [STEP_COUNT] as const;
export const HEALTH_WRITE = [] as const;

let NativeHK: Record<string, any> | null = null;
let HKConstants: { Permissions?: Record<string, string> } = {};

if (Platform.OS === 'ios') {
  try {
    const pkg = require('react-native-health');
    NativeHK = NativeModules.AppleHealthKit ?? NativeModules.RCTAppleHealthKit ?? null;
    HKConstants = pkg.Constants ?? pkg.default?.Constants ?? {};
  } catch {
    NativeHK = null;
  }
}

export const isHealthKitAvailable =
  NativeHK != null && typeof NativeHK.initHealthKit === 'function';

function getPermissions() {
  const stepPerm = HKConstants.Permissions?.StepCount ?? STEP_COUNT;
  return { permissions: { read: [stepPerm], write: [] as string[] } };
}

// ─── Authorization Hook ────────────────────────────────────────────────────

/**
 * Silently probes HealthKit on mount — if permissions are already granted,
 * `initHealthKit` resolves instantly with no dialog, so the user never sees
 * the "Allow" card again after accepting once.
 */
export function useHealthKitAuthorization(
  _read: readonly string[],
  _write: readonly string[],
) {
  const [authorizationStatus, setAuthorizationStatus] = useState<number | null>(
    isHealthKitAvailable ? HKAuthorizationRequestStatus.unknown : null,
  );

  // Silent probe on mount — no UI if already authorized
  useEffect(() => {
    if (!NativeHK) return;
    NativeHK.initHealthKit(getPermissions(), (error: string) => {
      setAuthorizationStatus(
        error
          ? HKAuthorizationRequestStatus.shouldRequest
          : HKAuthorizationRequestStatus.unnecessary,
      );
    });
  }, []);

  const requestAuthorization = useCallback((): Promise<number | boolean> => {
    if (!NativeHK) return Promise.resolve(false);
    return new Promise((resolve) => {
      NativeHK!.initHealthKit(getPermissions(), (error: string) => {
        if (error) {
          setAuthorizationStatus(HKAuthorizationRequestStatus.shouldRequest);
          resolve(false);
          return;
        }
        setAuthorizationStatus(HKAuthorizationRequestStatus.unnecessary);
        resolve(HKAuthorizationRequestStatus.unnecessary);
      });
    });
  }, []);

  return { authorizationStatus, requestAuthorization };
}

// ─── Step Count ────────────────────────────────────────────────────────────

export function getTodayStepCount(): Promise<number | null> {
  if (!NativeHK) return Promise.resolve(null);

  if (typeof NativeHK.getStepCount === 'function') {
    return new Promise((resolve) => {
      NativeHK!.getStepCount({}, (err: unknown, res: { value?: number }) => {
        if (err) { resolve(null); return; }
        resolve(typeof res?.value === 'number' ? Math.round(res.value) : 0);
      });
    });
  }

  if (typeof NativeHK.getDailyStepCountSamples === 'function') {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start.getTime() + 86_400_000);
    const opts = { startDate: start.toISOString(), endDate: end.toISOString() };
    return new Promise((resolve) => {
      NativeHK!.getDailyStepCountSamples(opts, (err: unknown, results: Array<{ value?: number }>) => {
        if (err || !Array.isArray(results)) { resolve(null); return; }
        resolve(Math.round(results.reduce((s, r) => s + (r?.value ?? 0), 0)));
      });
    });
  }

  return Promise.resolve(null);
}

// ─── Step Count Range ────────────────────────────────────────────────────────

/**
 * Returns daily step totals for the range. Uses getDailyStepCountSamples when available.
 * Returns empty array if HealthKit unavailable.
 */
export function getStepCountRange(
  startDate: Date,
  endDate: Date,
): Promise<Array<{ date: string; steps: number }>> {
  if (!NativeHK) return Promise.resolve([]);

  if (typeof NativeHK.getDailyStepCountSamples !== 'function') {
    return Promise.resolve([]);
  }

  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
  const opts = { startDate: start.toISOString(), endDate: end.toISOString() };

  return new Promise((resolve) => {
    NativeHK!.getDailyStepCountSamples(opts, (err: unknown, results: Array<{ startDate?: string; endDate?: string; value?: number }>) => {
      if (err || !Array.isArray(results)) {
        resolve([]);
        return;
      }
      const byDate = new Map<string, number>();
      for (const r of results) {
        const dateStr = r.startDate
          ? new Date(r.startDate).toISOString().slice(0, 10)
          : r.endDate
            ? new Date(r.endDate).toISOString().slice(0, 10)
            : '';
        if (dateStr) {
          byDate.set(dateStr, (byDate.get(dateStr) ?? 0) + (r?.value ?? 0));
        }
      }
      const daily = Array.from(byDate.entries()).map(([date, steps]) => ({
        date,
        steps: Math.round(steps),
      }));
      resolve(daily);
    });
  });
}
