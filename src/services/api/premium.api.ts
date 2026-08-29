import { Platform } from "react-native";
import { API_CONFIG } from "../config/api.config";
import { apiClient } from "./base.api";
import type {
  PremiumFeatureFlags,
  PremiumStateSnapshot,
  SubscriptionPlan,
  SubscriptionStatus,
} from "../../types/premium.types";
import {
  DEFAULT_PREMIUM_FEATURE_FLAGS,
  DEFAULT_PREMIUM_STATE,
} from "../../types/premium.types";

type RawFeatureFlags = Partial<Record<keyof PremiumFeatureFlags, unknown>>;

interface UserFeaturesResponse {
  success?: boolean;
  message?: string;
  plan?: SubscriptionPlan;
  subscription_status?: SubscriptionStatus;
  feature_flags?: RawFeatureFlags;
  follow_count?: number;
  free_follow_limit?: number;
  download_count?: number;
  free_download_limit?: number;
  download_period?: string;
}

export interface PlatformReceiptPayload {
  productId: string;
  purchaseToken?: string;
  transactionId?: string;
  originalTransactionId?: string;
  packageName?: string;
  environment?: string;
  receipt?: string;
}

interface SubscriptionSyncResponse extends UserFeaturesResponse {
  receipt_valid?: boolean;
  entitlement_active?: boolean;
}

const normalizeBooleanFlag = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }
  return fallback;
};

const normalizeFeatureFlags = (raw?: RawFeatureFlags): PremiumFeatureFlags => ({
  ...DEFAULT_PREMIUM_FEATURE_FLAGS,
  premium_audio: normalizeBooleanFlag(raw?.premium_audio),
  offline_download: normalizeBooleanFlag(raw?.offline_download),
  ad_free: normalizeBooleanFlag(raw?.ad_free),
  background_play: normalizeBooleanFlag(raw?.background_play),
  multi_lecturer_follow: normalizeBooleanFlag(raw?.multi_lecturer_follow),
  // Default to true so a stale/missing field never hard-gates the UI.
  can_follow_more: normalizeBooleanFlag(raw?.can_follow_more, true),
  can_download_more: normalizeBooleanFlag(raw?.can_download_more, true),
});

const toFiniteNumber = (value: unknown, fallback: number): number => {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(n) ? n : fallback;
};

const normalizePremiumState = (response: UserFeaturesResponse): PremiumStateSnapshot => ({
  ...DEFAULT_PREMIUM_STATE,
  plan: response.plan ?? DEFAULT_PREMIUM_STATE.plan,
  subscription_status:
    response.subscription_status ?? DEFAULT_PREMIUM_STATE.subscription_status,
  feature_flags: normalizeFeatureFlags(response.feature_flags),
  follow_count: toFiniteNumber(response.follow_count, DEFAULT_PREMIUM_STATE.follow_count),
  free_follow_limit: toFiniteNumber(
    response.free_follow_limit,
    DEFAULT_PREMIUM_STATE.free_follow_limit,
  ),
  download_count: toFiniteNumber(
    response.download_count,
    DEFAULT_PREMIUM_STATE.download_count,
  ),
  free_download_limit: toFiniteNumber(
    response.free_download_limit,
    DEFAULT_PREMIUM_STATE.free_download_limit,
  ),
  download_period:
    response.download_period ?? DEFAULT_PREMIUM_STATE.download_period,
});

class PremiumApiService {
  async getUserFeatures(): Promise<PremiumStateSnapshot> {
    const response = await apiClient.post<UserFeaturesResponse>(
      "/api/user_features.php",
      {},
      {
        timeout: API_CONFIG.TIMEOUTS.DEFAULT,
        useCache: false,
      },
    );

    return normalizePremiumState(response.data);
  }

  async syncPlatformReceipt(
    payload: PlatformReceiptPayload,
  ): Promise<PremiumStateSnapshot> {
    // Server is idempotent on transaction_id (iOS) and purchase_token (Android),
    // so retrying on transient network failures is safe. 4xx (e.g. INVALID_RECEIPT)
    // is already excluded from retry by apiClient.
    const response = await apiClient.post<SubscriptionSyncResponse>(
      "/api/subscription_api.php",
      {
        action: "sync_platform_receipt",
        platform: Platform.OS === "ios" ? "ios" : "android",
        product_id: payload.productId,
        purchase_token: payload.purchaseToken,
        transaction_id: payload.transactionId,
        original_transaction_id: payload.originalTransactionId,
        package_name: payload.packageName,
        environment: payload.environment,
        receipt: payload.receipt,
      },
      {
        timeout: API_CONFIG.TIMEOUTS.DEFAULT,
        useCache: false,
        retry: true,
      },
    );

    return normalizePremiumState(response.data);
  }
}

export const premiumApi = new PremiumApiService();
export { normalizeFeatureFlags, normalizePremiumState };
