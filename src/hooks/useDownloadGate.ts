import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Alert } from "react-native";

import { resolveDownloadAllowance } from "../features/downloads/downloadAllowance";
import { useAuthStore, usePremiumStore } from "../stores";

interface DownloadGate {
  /** True when the caller may start a download right now. */
  canDownload: boolean;
  /** Premium: downloads are not metered. */
  isUnlimited: boolean;
  /** Free downloads left this calendar month; null when unlimited. */
  remaining: number | null;
  /** The free monthly allowance, for copy like "2 of 5 left". */
  limit: number;
  /**
   * Returns true if the caller may proceed with the download.
   * Shows the relevant prompt and returns false otherwise: sign-in when the
   * download cannot be attributed to a user, the upsell once the monthly
   * allowance is spent.
   *
   * `returnTo` is the route to come back to after signing in. It is a
   * parameter rather than a `usePathname()` inside this hook on purpose: the
   * hook runs in MiniPlayer, which is `memo`'d with no props and therefore
   * skips every re-render today. Subscribing it to the pathname would wake it
   * — and its thirteen Reanimated hooks — on every navigation in the app.
   */
  requireDownloadAccess: (returnTo?: string) => boolean;
}

export function useDownloadGate(): DownloadGate {
  const router = useRouter();
  const { feature_flags, download_count, free_download_limit } =
    usePremiumStore();
  const { isAuthenticated } = useAuthStore();

  const limit = free_download_limit;
  const { canDownload, isUnlimited, remaining, reason } =
    resolveDownloadAllowance({
      isUnlimited: feature_flags.offline_download,
      isAuthenticated,
      downloadCount: download_count,
      limit,
    });

  const goToPremium = useCallback(() => {
    if (!isAuthenticated) {
      router.push({
        pathname: "/sign-in",
        params: { returnTo: "/premium" },
      } as never);
    } else {
      router.push("/premium" as never);
    }
  }, [isAuthenticated, router]);

  const requireDownloadAccess = useCallback((returnTo?: string): boolean => {
    if (canDownload) return true;

    if (reason === "requires_sign_in") {
      Alert.alert(
        "Sign in to download",
        `Downloads are saved to your account. Sign in to use your ${limit} free downloads each month.`,
        [
          { text: "Not now", style: "cancel" },
          {
            text: "Sign in",
            // Back to the lecture they were on, not the paywall: this prompt
            // has just told them they have free downloads waiting, so landing
            // them on the upsell contradicts it and loses the lecture they
            // actually wanted.
            onPress: () =>
              router.push({
                pathname: "/sign-in",
                params: returnTo ? { returnTo } : {},
              } as never),
          },
        ],
      );
      return false;
    }

    Alert.alert(
      "Monthly downloads used",
      `You've used all ${limit} free downloads this month. Become a DN Supporter for unlimited offline listening, or wait for your allowance to reset next month.`,
      [
        { text: "Not now", style: "cancel" },
        { text: "Become a Supporter", onPress: goToPremium },
      ],
    );
    return false;
  }, [canDownload, reason, limit, router, goToPremium]);

  return { canDownload, isUnlimited, remaining, limit, requireDownloadAccess };
}
