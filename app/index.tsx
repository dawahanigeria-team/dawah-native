import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import OnboardingScreen from "../src/screens/OnboardingScreen";
import { Loading } from "../src/components/atoms/Loading";

export default function Index() {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const value = await AsyncStorage.getItem("hasSeenOnboarding");
        setHasSeenOnboarding(value === "true");
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        setHasSeenOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  if (hasSeenOnboarding === null) {
    return <Loading fullScreen />;
  }

  if (hasSeenOnboarding) {
    return <Redirect href="/(tabs)" />;
  }

  return <OnboardingScreen />;
}
