// Backend contract (server-owned, see SUBSCRIPTION_FE_MOBILE_HANDOFF.md):
// - plan is exactly "free" | "premium" — trialing users get plan:"premium"
//   with subscription_status:"trialing".
// - subscription_status is one of the values below; free users get "inactive".
export type SubscriptionPlan = "free" | "premium";

export type SubscriptionStatus =
  | "inactive"
  | "active"
  | "trialing"
  | "past_due"
  | "cancelled"
  | "expired";

export interface PremiumFeatureFlags {
  premium_audio: boolean;
  offline_download: boolean;
  ad_free: boolean;
  background_play: boolean;
  multi_lecturer_follow: boolean;
  // Server pre-computed: isPremium || follow_count < free_follow_limit.
  // Use this to hard-gate the Follow button.
  can_follow_more: boolean;
  // Server pre-computed: isPremium || download_count < free_download_limit.
  // offline_download stays the plan flag (premium = unlimited); this is the
  // one to gate the Download button on, so free users get their monthly
  // allowance instead of a flat upsell.
  can_download_more: boolean;
}

export interface PremiumStateSnapshot {
  plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  feature_flags: PremiumFeatureFlags;
  follow_count: number;
  free_follow_limit: number;
  download_count: number;
  free_download_limit: number;
  /** Calendar-month bucket the count belongs to, e.g. "2026-08" (UTC). */
  download_period: string;
}

export type PremiumFeatureKey = keyof PremiumFeatureFlags;

export const DEFAULT_PREMIUM_FEATURE_FLAGS: PremiumFeatureFlags = {
  premium_audio: false,
  offline_download: false,
  ad_free: false,
  background_play: false,
  multi_lecturer_follow: false,
  can_follow_more: true,
  can_download_more: true,
};

export const DEFAULT_PREMIUM_STATE: PremiumStateSnapshot = {
  plan: "free",
  subscription_status: "inactive",
  feature_flags: DEFAULT_PREMIUM_FEATURE_FLAGS,
  follow_count: 0,
  free_follow_limit: 2,
  download_count: 0,
  free_download_limit: 5,
  download_period: "",
};
