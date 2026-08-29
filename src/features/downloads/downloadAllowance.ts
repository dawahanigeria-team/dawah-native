/**
 * Free-tier download allowance, mirroring the server's rule in
 * app/Utils/DownloadQuota.php: FREE_DOWNLOAD_LIMIT downloads per calendar
 * month, premium unlimited, slots not returned when a file is deleted.
 *
 * The server is the authority - this only decides what the UI offers, so the
 * user is not sent into a download that will be refused with a 403.
 */

export type DownloadBlockReason =
  | "none"
  | "requires_sign_in"
  | "monthly_limit_reached";

export interface DownloadAllowanceInputs {
  /** feature_flags.offline_download - the plan-level flag. */
  isUnlimited: boolean;
  isAuthenticated: boolean;
  downloadCount: number;
  limit: number;
}

export interface DownloadAllowance {
  canDownload: boolean;
  isUnlimited: boolean;
  /** Downloads left this month; null when unlimited. */
  remaining: number | null;
  reason: DownloadBlockReason;
}

export function resolveDownloadAllowance(
  inputs: DownloadAllowanceInputs,
): DownloadAllowance {
  const { isUnlimited, isAuthenticated, downloadCount, limit } = inputs;

  if (isUnlimited) {
    return {
      canDownload: true,
      isUnlimited: true,
      remaining: null,
      reason: "none",
    };
  }

  // Never render a negative allowance: a stale client count can exceed the
  // limit after the server has already moved on.
  const remaining = Math.max(0, limit - downloadCount);

  // The quota is counted per user server-side, so an anonymous download
  // cannot be metered at all. Sign-in is the gate, not the upsell - telling a
  // signed-out user to buy Premium hides the free allowance they already have.
  if (!isAuthenticated) {
    return {
      canDownload: false,
      isUnlimited: false,
      remaining,
      reason: "requires_sign_in",
    };
  }

  if (remaining <= 0) {
    return {
      canDownload: false,
      isUnlimited: false,
      remaining: 0,
      reason: "monthly_limit_reached",
    };
  }

  return {
    canDownload: true,
    isUnlimited: false,
    remaining,
    reason: "none",
  };
}
