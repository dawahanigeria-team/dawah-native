import { useEffect } from "react";
import { useRouter } from "expo-router";

import { usePlayerStore } from "../src/stores";

export default function NotificationClick() {
  const router = useRouter();
  const { currentEpisode } = usePlayerStore();

  useEffect(() => {
    // Always keep this route silent and redirect away immediately: to the
    // lecture screen, which is the full player, or back to the tabs.
    router.replace(currentEpisode?.id ? `/lecture/${currentEpisode.id}` : "/(tabs)");
  }, [currentEpisode?.id, router]);

  return null;
}
