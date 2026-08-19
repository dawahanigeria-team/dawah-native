import AsyncStorage from "expo-sqlite/kv-store";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import WelcomeScreen from "../src/screens/WelcomeScreen";
import {
  hasCompletedPreferenceOnboarding,
  markPreferenceOnboardingComplete,
} from "../src/stores/listeningPreferencesStore";

export default function Index() {
  const [destination, setDestination] = useState<"welcome" | "home" | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const [completed, legacyOnboarding] = await Promise.all([
        hasCompletedPreferenceOnboarding(),
        AsyncStorage.getItem("hasSeenOnboarding"),
      ]);

      // Existing installations keep going straight to Home. New installs use
      // the useful preference flow instead of the retired four-slide tour.
      if (!completed && legacyOnboarding === "true") {
        await markPreferenceOnboardingComplete();
      }

      if (mounted) {
        setDestination(completed || legacyOnboarding === "true" ? "home" : "welcome");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (destination === "home") return <Redirect href="/(tabs)" />;
  if (destination === "welcome") return <WelcomeScreen />;

  // Paint immediately while the local key is read; no network or auth work is
  // allowed to block the first frame.
  return <View style={{ flex: 1, backgroundColor: "#07110d" }} />;
}
