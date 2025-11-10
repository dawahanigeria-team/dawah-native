import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";

import { useStorageState } from "../src/hooks/useStorageState";
import { playerStore } from "../src/stores/playerStore";

import { ErrorBoundary } from "../src/components/atoms";
import { Loading } from "../src/components/atoms/Loading";
import { MiniPlayer } from "../src/components/organisms";
import { AudioProvider } from "../src/components/providers/AudioProvider";
import { initSentry, Sentry } from "../src/services/config/sentry.config";
import { fetchFavorites } from "../src/stores/favoritesStore";
import { userService } from "../src/services/user.service";

// Initialize Sentry as early as possible
initSentry();

const NAVIGATION_PERSISTENCE_KEY = "NAVIGATION_STATE";
const PLAYER_STATE_KEY = "PLAYER_STATE";

function RootLayout() {
  const pathname = usePathname();
  const router = useRouter();

  const [isNavigationLoading, navigationState, setNavigationState] =
    useStorageState(NAVIGATION_PERSISTENCE_KEY);
  const [isPlayerStateLoading, playerState] = useStorageState(PLAYER_STATE_KEY);

  useEffect(() => {
    if (isNavigationLoading || isPlayerStateLoading) {
      return;
    }
    if (navigationState) {
      router.replace(navigationState);
    }
    if (playerState) {
      const parsedState = JSON.parse(playerState);
      // Don't resume playback automatically, just load the state
      playerStore.set({ ...parsedState, isPlaying: false });
    }
  }, [
    isNavigationLoading,
    navigationState,
    isPlayerStateLoading,
    playerState,
    router,
  ]);

  useEffect(() => {
    if (!isNavigationLoading) {
      setNavigationState(pathname);
    }
  }, [pathname, setNavigationState, isNavigationLoading]);

  // Initialize user and favorites on app start
  useEffect(() => {
    const initialize = async () => {
      try {
        // Ensure user ID exists (creates guest ID if needed)
        await userService.getUserId();
        console.log("✅ User initialized");

        // Load favorites from API
        await fetchFavorites();
        console.log("✅ Favorites loaded");
      } catch (error) {
        console.error("Failed to initialize app:", error);
      }
    };

    initialize();
  }, []);

  // Hide mini player on lecture detail page since it has full playback controls
  const shouldShowMiniPlayer = !pathname.startsWith("/lecture/");

  if (isNavigationLoading || isPlayerStateLoading) {
    return <Loading fullScreen />;
  }

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
