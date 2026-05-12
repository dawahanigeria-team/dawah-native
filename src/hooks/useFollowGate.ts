import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Alert } from "react-native";

import { usePremiumStore } from "../stores";

interface FollowGate {
  /**
   * `feature_flags.can_follow_more` — server pre-computed as
   * `isPremium || follow_count < free_follow_limit`. Use to render a
   * 💎 / lock indicator when false.
   */
  canFollowMore: boolean;
  followCount: number;
  freeFollowLimit: number;
  /**
   * Returns true if the caller may proceed with the follow action.
   * Unfollow is always allowed; new follows show an upsell when the
   * user is at the free limit.
   */
  requireFollowAccess: (isCurrentlyFollowing: boolean) => boolean;
}

export function useFollowGate(): FollowGate {
  const router = useRouter();
  const { feature_flags, follow_count, free_follow_limit } = usePremiumStore();
  const canFollowMore = feature_flags.can_follow_more;

  const requireFollowAccess = useCallback(
    (isCurrentlyFollowing: boolean): boolean => {
      if (isCurrentlyFollowing) return true;
      if (canFollowMore) return true;

      Alert.alert(
        "Premium feature",
        `Free users can follow up to ${free_follow_limit} lecturers. Upgrade to follow more.`,
        [
          { text: "Not now", style: "cancel" },
          { text: "Upgrade", onPress: () => router.push("/premium" as never) },
        ],
      );
      return false;
    },
    [canFollowMore, free_follow_limit, router],
  );

  return {
    canFollowMore,
    followCount: follow_count,
    freeFollowLimit: free_follow_limit,
    requireFollowAccess,
  };
}
