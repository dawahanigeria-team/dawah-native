import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { ErrorBoundary } from "../src/components/atoms/ErrorBoundary";
import { MiniPlayer } from "../src/components/organisms";
import { AudioProvider } from "../src/components/providers/AudioProvider";

export default function RootLayout() {
  const pathname = usePathname();

  // Hide mini player on lecture detail page since it has full playback controls
  const shouldShowMiniPlayer = !pathname.startsWith('/lecture/');

  return (
    <ErrorBoundary>
      <AudioProvider>
        <StatusBar style="light" />
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="sign-in"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen
              name="sign-up"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
              }}
            />
          </Stack>
          {/* Mini Player - hidden on lecture detail page */}
          {shouldShowMiniPlayer && <MiniPlayer />}
        </View>
      </AudioProvider>
    </ErrorBoundary>
  );
}
