import { entity } from "simpler-state";
import { premiumApi, type PlatformReceiptPayload } from "../services/api/premium.api";
import type {
  PremiumFeatureFlags,
  PremiumFeatureKey,
  PremiumStateSnapshot,
} from "../types/premium.types";
import {
  DEFAULT_PREMIUM_FEATURE_FLAGS,
  DEFAULT_PREMIUM_STATE,
} from "../types/premium.types";

interface PremiumStoreState extends PremiumStateSnapshot {
  isLoading: boolean;
  isSyncingReceipt: boolean;
  error: string | null;
  lastFetchedAt: number | null;
}

type PremiumUserFields = Partial<PremiumStateSnapshot> | null | undefined;

const initialState: PremiumStoreState = {
  ...DEFAULT_PREMIUM_STATE,
  feature_flags: { ...DEFAULT_PREMIUM_FEATURE_FLAGS },
  isLoading: false,
  isSyncingReceipt: false,
  error: null,
  lastFetchedAt: null,
};

export const premiumStore = entity(initialState);

const normalizeFeatureFlags = (
  featureFlags?: Partial<PremiumFeatureFlags>,
): PremiumFeatureFlags => ({
  ...DEFAULT_PREMIUM_FEATURE_FLAGS,
  ...(featureFlags ?? {}),
});

export const hydratePremiumFromUser = (user: PremiumUserFields): void => {
  premiumStore.set((prev) => ({
    ...prev,
    plan: user?.plan ?? DEFAULT_PREMIUM_STATE.plan,
    subscription_status:
      user?.subscription_status ?? DEFAULT_PREMIUM_STATE.subscription_status,
    feature_flags: normalizeFeatureFlags(user?.feature_flags),
    error: null,
  }));
};

export const resetPremiumState = (): void => {
  premiumStore.set(initialState);
};

/**
 * Applies the download counters returned by /api/download_api.php so the UI
 * reflects a spent slot without a second round trip. The server is the
 * authority: it may report no change when the same lecture is re-downloaded
 * inside the same month, which does not consume a slot.
 */
export const applyDownloadUsage = (usage: {
  download_count?: number;
  free_download_limit?: number;
  download_period?: string;
}): void => {
  if (typeof usage.download_count !== "number") return;

  premiumStore.set((prev) => {
    const limit = usage.free_download_limit ?? prev.free_download_limit;
    return {
      ...prev,
      download_count: usage.download_count as number,
      free_download_limit: limit,
      download_period: usage.download_period ?? prev.download_period,
      feature_flags: {
        ...prev.feature_flags,
        can_download_more:
          prev.feature_flags.offline_download ||
          (usage.download_count as number) < limit,
      },
    };
  });
};

export const refreshPremiumFeatures = async (): Promise<PremiumStateSnapshot> => {
  premiumStore.set((prev) => ({ ...prev, isLoading: true, error: null }));

  try {
    const nextState = await premiumApi.getUserFeatures();
    premiumStore.set((prev) => ({
      ...prev,
      ...nextState,
      feature_flags: normalizeFeatureFlags(nextState.feature_flags),
      isLoading: false,
      error: null,
      lastFetchedAt: Date.now(),
    }));
    return nextState;
  } catch (error: any) {
    premiumStore.set((prev) => ({
      ...prev,
      isLoading: false,
      error: error?.message || "Failed to load premium status",
    }));
    throw error;
  }
};

export const syncPlatformReceipt = async (
  payload: PlatformReceiptPayload,
): Promise<PremiumStateSnapshot> => {
  premiumStore.set((prev) => ({ ...prev, isSyncingReceipt: true, error: null }));

  try {
    const nextState = await premiumApi.syncPlatformReceipt(payload);
    premiumStore.set((prev) => ({
      ...prev,
      ...nextState,
      feature_flags: normalizeFeatureFlags(nextState.feature_flags),
      isSyncingReceipt: false,
      error: null,
      lastFetchedAt: Date.now(),
    }));
    return nextState;
  } catch (error: any) {
    premiumStore.set((prev) => ({
      ...prev,
      isSyncingReceipt: false,
      error: error?.message || "Failed to sync subscription",
    }));
    throw error;
  }
};

export const canUsePremiumFeature = (feature: PremiumFeatureKey): boolean => {
  const state = premiumStore.get() || initialState;
  return Boolean(state.feature_flags?.[feature]);
};

export const usePremiumStore = () => {
  const rawState = premiumStore.use();
  const state: PremiumStoreState = {
    ...initialState,
    ...(rawState || {}),
    feature_flags: normalizeFeatureFlags(rawState?.feature_flags),
  };

  return {
    ...state,
    refreshPremiumFeatures,
    syncPlatformReceipt,
    canUseFeature: canUsePremiumFeature,
  };
};
