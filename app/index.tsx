import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import OnboardingScreen from "../src/screens/OnboardingScreen";

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const checkOnboardingStatus = useCallback(async () => {
    try {
      const value = await AsyncStorage.getItem("hasSeenOnboarding");
      if (value === "true") {
        router.replace("/(tabs)");
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C3E50" />
      </View>
    );
  }

  return <OnboardingScreen />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
});
