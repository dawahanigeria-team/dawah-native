import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { useEffect } from "react";
import { ErrorBoundary } from "../src/components/atoms/ErrorBoundary";
import { MiniPlayer } from "../src/components/organisms";
import { AudioProvider } from "../src/components/providers/AudioProvider";
import { initSentry, Sentry } from "../src/services/config/sentry.config";
import { fetchFavorites } from "../src/stores/favoritesStore";
import { userService } from "../src/services/user.service";

// Initialize Sentry as early as possible
initSentry();

function RootLayout() {
  const pathname = usePathname();

  // Initialize user and favorites on app start
  useEffect(() => {
    const initialize = async () => {
      try {
        // Ensure user ID exists (creates guest ID if needed)
        await userService.getUserId();
        console.log('✅ User initialized');

        // Load favorites from API
        await fetchFavorites();
        console.log('✅ Favorites loaded');
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initialize();
  }, []);

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
              name="charts"
              options={{
                headerShown: false,
                presentation: "modal",
                animation: "slide_from_bottom",
              }}
            />
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

// Wrap with Sentry for error tracking
export default Sentry.wrap(RootLayout);
