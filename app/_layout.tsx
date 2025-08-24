import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { ErrorBoundary } from "../src/components/atoms/ErrorBoundary";
import { MiniPlayer } from "../src/components/organisms";

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
        {/* Mini Player - positioned at the bottom of all screens */}
        <MiniPlayer />
      </View>
    </ErrorBoundary>
  );
}
