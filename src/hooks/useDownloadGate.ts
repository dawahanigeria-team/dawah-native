import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Alert } from "react-native";

import { useAuthStore, usePremiumStore } from "../stores";

interface DownloadGate {
  canDownload: boolean;
  /**
   * Returns true if the caller may proceed with the download.
   * If the user lacks the offline_download flag, shows the upsell alert
   * and returns false so the caller can short-circuit.
   */
  requireDownloadAccess: () => boolean;
}

export function useDownloadGate(): DownloadGate {
  const router = useRouter();
  const { feature_flags } = usePremiumStore();
  const { isAuthenticated } = useAuthStore();
  const canDownload = feature_flags.offline_download;

  const requireDownloadAccess = useCallback((): boolean => {
    if (canDownload) return true;

    Alert.alert(
      "Premium feature",
      "Offline downloads are included with Premium.",
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Upgrade",
          onPress: () => {
            if (!isAuthenticated) {
              router.push({
                pathname: "/sign-in",
                params: { returnTo: "/premium" },
              } as never);
            } else {
              router.push("/premium" as never);
            }
          },
        },
      ],
    );
    return false;
  }, [canDownload, isAuthenticated, router]);

  return { canDownload, requireDownloadAccess };
}
