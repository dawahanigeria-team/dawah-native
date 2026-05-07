import { useEffect } from "react";
import { useRouter } from "expo-router";

import { usePlayerActions, usePlayerStore } from "../src/stores";

export default function NotificationClick() {
  const router = useRouter();
  const { expandPlayer } = usePlayerActions();
  const { currentEpisode } = usePlayerStore();

  useEffect(() => {
    // Always keep this route silent and redirect away immediately.
    if (currentEpisode?.id) {
      expandPlayer();
    }

    // Return to the main tabs so no unmatched route is shown.
    router.replace("/(tabs)");
  }, [currentEpisode?.id, expandPlayer, router]);

  return null;
}
