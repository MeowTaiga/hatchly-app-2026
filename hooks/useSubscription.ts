import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from '@/lib/api';

// ─── Subscription Product IDs ────────────────────────────────────────────────

type SupportedPlatform = 'ios' | 'android';

const PRODUCT_IDS: Record<SupportedPlatform, { monthly: string; yearly: string }> = {
  ios: {
    monthly: 'weekly',
    yearly: 'hatchlyYearly',
  },
  android: {
    monthly: 'com.hatchly.subscription.monthly',
    yearly: 'com.hatchly.subscription.yearly',
  },
};

// ─── Types ───────────────────────────────────────────────────────────────────

export type SubscriptionPlan = 'monthly' | 'yearly';

/** Possible outcomes from a purchaseSubscription() call */
export type PurchaseResult = 'success' | 'cancelled' | 'error';

export interface SubscriptionPricing {
  monthly: number;
  yearly: number;
  monthlyEquivalent: number;
  savingsPercent: number;
}

interface UseSubscriptionReturn {
  loading: boolean;
  error: string | null;
  isIAPAvailable: boolean;
  isExpoGo: boolean;
  pricing: SubscriptionPricing;
  startTrial: (plan?: SubscriptionPlan) => Promise<boolean>;
  purchaseSubscription: (plan: SubscriptionPlan) => Promise<PurchaseResult>;
  clearError: () => void;
}

// ─── Default Pricing ─────────────────────────────────────────────────────────

const DEFAULT_MONTHLY = 7.99;
const DEFAULT_YEARLY = 49.99;
const DEFAULT_MONTHLY_EQ = Number((DEFAULT_YEARLY / 12).toFixed(2));
const DEFAULT_SAVINGS = Math.round(100 - (DEFAULT_MONTHLY_EQ / DEFAULT_MONTHLY) * 100);

const defaultPricing: SubscriptionPricing = {
  monthly: DEFAULT_MONTHLY,
  yearly: DEFAULT_YEARLY,
  monthlyEquivalent: DEFAULT_MONTHLY_EQ,
  savingsPercent: DEFAULT_SAVINGS,
};

// ─── Expo Go Detection ──────────────────────────────────────────────────────

const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

// ─── Lazy IAP Loader ────────────────────────────────────────────────────────

let _iapModule: any = null;

async function getIAP(): Promise<any> {
  if (_iapModule) return _iapModule;
  try {
    const mod: any = await import('react-native-iap');
    const resolved = typeof mod?.initConnection === 'function' ? mod : mod?.default;
    if (typeof resolved?.initConnection !== 'function') return null;
    _iapModule = resolved;
    return resolved;
  } catch {
    return null;
  }
}

// ─── Cancellation Detection ─────────────────────────────────────────────────

const CANCEL_CODES = ['E_USER_CANCELLED', 'E_USER_CANCELED'];

function isCancellation(errOrCode: any): boolean {
  if (!errOrCode) return false;
  const code = typeof errOrCode === 'string' ? errOrCode : errOrCode?.code ?? '';
  if (CANCEL_CODES.includes(code)) return true;
  const msg = (typeof errOrCode === 'string' ? errOrCode : errOrCode?.message ?? '').toLowerCase();
  return msg.includes('cancel') || msg.includes('user cancelled') || msg.includes('user canceled');
}

// Sentinel value: purchaseUpdatedListener resolves with this for cancellations
const CANCELLED_SENTINEL = Symbol('cancelled');

// "Already owned" error codes from stores
const ALREADY_OWNED_CODES = ['E_ALREADY_OWNED', 'E_ITEM_ALREADY_OWNED', 'ITEM_ALREADY_OWNED'];

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSubscription(): UseSubscriptionReturn {
  /** True while a purchase or trial is actively in progress (not IAP init). */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isIAPAvailable, setIsIAPAvailable] = useState(false);

  const platform = Platform.OS as SupportedPlatform;
  const isSupportedPlatform = platform === 'ios' || platform === 'android';

  const purchaseResolveRef = useRef<((purchase: any) => void) | null>(null);
  const purchaseRejectRef = useRef<((err: Error) => void) | null>(null);
  const listenerCleanupRef = useRef<(() => void) | null>(null);

  // ── Initialise IAP connection & attach listeners ─────────────────────────

  useEffect(() => {
    if (!isSupportedPlatform || IS_EXPO_GO) {
      console.info('[useSubscription] Skipping IAP init (Expo Go or unsupported platform)');
      return;
    }

    let mounted = true;

    (async () => {
      const iap = await getIAP();
      if (!iap || !mounted) return;

      try {
        console.info('[useSubscription] Initialising IAP connection…');
        await iap.initConnection();
        if (!mounted) return;

        // Flush stale pending transactions from previous failed attempts.
        // The store queues unfinished purchases and replays them via
        // purchaseUpdatedListener on every init — if we don't finish them,
        // new requestPurchase() calls hang because the store considers the
        // product "already being purchased."
        try {
          const pending = await iap.getAvailablePurchases();
          if (pending?.length) {
            console.info(`[useSubscription] Flushing ${pending.length} stale pending transaction(s)…`);
            for (const p of pending) {
              try {
                await iap.finishTransaction({ purchase: p, isConsumable: false });
              } catch (e: any) {
                console.warn('[useSubscription] finishTransaction (flush) warning:', e?.message);
              }
            }
            console.info('[useSubscription] Stale transactions flushed');
          }
        } catch (flushErr: any) {
          console.warn('[useSubscription] Could not flush pending transactions:', flushErr?.message);
        }

        const updateSub = iap.purchaseUpdatedListener((purchase: any) => {
          // During init, stale purchases may still fire — only resolve if
          // we're actively waiting on a purchase (ref is set).
          if (purchaseResolveRef.current) {
            console.info('[useSubscription] purchaseUpdatedListener → resolving active purchase');
            purchaseResolveRef.current(purchase);
            purchaseResolveRef.current = null;
            purchaseRejectRef.current = null;
          } else {
            // Stale transaction replay — finish it silently
            console.info('[useSubscription] purchaseUpdatedListener (stale) → finishing transaction');
            iap.finishTransaction({ purchase, isConsumable: false }).catch(() => {});
          }
        });

        const errorSub = iap.purchaseErrorListener((err: any) => {
          console.info('[useSubscription] purchaseErrorListener fired:', err?.code, err?.message);
          if (purchaseResolveRef.current) {
            if (isCancellation(err)) {
              purchaseResolveRef.current(CANCELLED_SENTINEL);
            } else if (purchaseRejectRef.current) {
              purchaseRejectRef.current(new Error(err?.message ?? 'Purchase failed'));
            }
            purchaseResolveRef.current = null;
            purchaseRejectRef.current = null;
          }
        });

        listenerCleanupRef.current = () => {
          updateSub?.remove?.();
          errorSub?.remove?.();
        };

        setIsIAPAvailable(true);
        console.info('[useSubscription] IAP connection ready, isIAPAvailable=true');

        const skus = Object.values(PRODUCT_IDS[platform]);
        iap.fetchProducts({ skus, type: 'subs' }).catch(() => {});
      } catch (err) {
        if (mounted) {
          console.warn('[useSubscription] IAP init failed:', err);
          setIsIAPAvailable(false);
        }
      }
    })();

    return () => {
      mounted = false;
      listenerCleanupRef.current?.();
      listenerCleanupRef.current = null;
      getIAP().then((iap) => iap?.endConnection?.()).catch(() => {});
    };
  }, []);

  // ── Restore existing purchases (handles "already owned") ────────────────

  const restoreExistingPurchase = useCallback(
    async (iap: any, plan: SubscriptionPlan): Promise<PurchaseResult> => {
      try {
        const available = await iap.getAvailablePurchases();
        if (!available || available.length === 0) return 'error';

        const sku = PRODUCT_IDS[platform][plan];
        const match = available.find(
          (p: any) => p.productId === sku || p.productIds?.includes(sku),
        ) ?? available[0];

        if (!match) return 'error';

        console.info('[useSubscription] Restoring existing purchase:', match.productId);

        try {
          await api.validateSubscription({
            platform,
            plan,
            receipt: match.transactionReceipt ?? '',
            purchaseToken: match.purchaseToken ?? '',
          });
        } catch {
          if (!__DEV__) throw new Error('Receipt validation failed');
        }

        try {
          await iap.finishTransaction({ purchase: match, isConsumable: false });
        } catch (finishErr: any) {
          console.warn('[useSubscription] finishTransaction (restore) warning:', finishErr?.message);
        }

        return 'success';
      } catch (restoreErr: any) {
        console.warn('[useSubscription] restore failed:', restoreErr?.message);
        return 'error';
      }
    },
    [platform],
  );

  // ── Purchase (v14 event-based flow) ──────────────────────────────────────

  const purchaseSubscription = useCallback(
    async (plan: SubscriptionPlan): Promise<PurchaseResult> => {
      if (IS_EXPO_GO) {
        setError('In-app purchases are not available in Expo Go.');
        return 'error';
      }
      if (!isSupportedPlatform || !isIAPAvailable) {
        setError('In-app purchases are not available on this device');
        return 'error';
      }

      const iap = await getIAP();
      if (!iap) {
        setError('In-app purchase module could not be loaded');
        return 'error';
      }

      try {
        setLoading(true);
        setError(null);

        const sku = PRODUCT_IDS[platform][plan];

        const purchasePromise = new Promise<any>((resolve, reject) => {
          purchaseResolveRef.current = resolve;
          purchaseRejectRef.current = reject;

          setTimeout(() => {
            if (purchaseRejectRef.current) {
              reject(new Error('Purchase timed out'));
              purchaseResolveRef.current = null;
              purchaseRejectRef.current = null;
            }
          }, 120_000);
        });

        const purchaseRequest = platform === 'ios'
          ? { request: { apple: { sku, andDangerouslyFinishTransactionAutomatically: false } }, type: 'subs' }
          : { request: { google: { skus: [sku] } }, type: 'subs' };

        iap.requestPurchase(purchaseRequest).catch((requestErr: any) => {
          if (purchaseResolveRef.current) {
            if (isCancellation(requestErr)) {
              purchaseResolveRef.current(CANCELLED_SENTINEL);
            } else if (purchaseRejectRef.current) {
              purchaseRejectRef.current(requestErr instanceof Error ? requestErr : new Error(String(requestErr)));
            }
            purchaseResolveRef.current = null;
            purchaseRejectRef.current = null;
          }
        });

        const purchase = await purchasePromise;

        if (purchase === CANCELLED_SENTINEL) {
          return 'cancelled';
        }

        if (!purchase) {
          setError('Purchase was cancelled');
          return 'cancelled';
        }

        // ── Validate receipt with backend ─────────────────────────────────
        try {
          await api.validateSubscription({
            platform,
            plan,
            receipt: purchase.transactionReceipt ?? '',
            purchaseToken: purchase.purchaseToken ?? '',
          });
        } catch {
          if (!__DEV__) throw new Error('Receipt validation failed');
        }

        // ── Finish transaction ────────────────────────────────────────────
        try {
          await iap.finishTransaction({ purchase, isConsumable: false });
        } catch (finishErr: any) {
          console.warn('[useSubscription] finishTransaction warning:', finishErr?.message);
        }

        return 'success';
      } catch (err: any) {
        if (isCancellation(err)) return 'cancelled';

        // ── "Already owned" → try restoring the existing purchase ─────────
        const errCode = err?.code ?? '';
        const errMsg = (err?.message ?? '').toUpperCase();
        const isAlreadyOwned =
          ALREADY_OWNED_CODES.includes(errCode) ||
          errMsg.includes('ALREADY') ||
          errMsg.includes('ITEM_ALREADY_OWNED');

        if (isAlreadyOwned) {
          console.info('[useSubscription] Item already owned — attempting restore');
          const restored = await restoreExistingPurchase(iap, plan);
          if (restored === 'success') return 'success';
        }

        setError(err?.message ?? 'Subscription purchase failed');
        return 'error';
      } finally {
        setLoading(false);
      }
    },
    [isIAPAvailable, platform, restoreExistingPurchase],
  );

  // ── Free trial (server-side fallback) ────────────────────────────────────

  const startTrial = useCallback(
    async (plan: SubscriptionPlan = 'yearly'): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        try {
          await api.startTrial(plan);
        } catch {
          if (!__DEV__) throw new Error('Failed to start trial');
        }

        return true;
      } catch (err: any) {
        setError(err?.message ?? 'Failed to start trial');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    loading,
    error,
    isIAPAvailable,
    isExpoGo: IS_EXPO_GO,
    pricing: defaultPricing,
    startTrial,
    purchaseSubscription,
    clearError,
  };
}
