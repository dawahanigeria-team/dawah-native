import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Linking, View } from "react-native";

import { useStorageState } from "../src/hooks/useStorageState";

import { ErrorBoundary } from "../src/components/atoms";
import { Loading } from "../src/components/atoms/Loading";
import { MiniPlayer } from "../src/components/organisms";
import { AudioProvider } from "../src/components/providers/AudioProvider";
import { initSentry, Sentry } from "../src/services/config/sentry.config";
import { linkingService } from "../src/services/linking.service";
import { downloadsService } from "../src/services/downloads.service";
import { userService } from "../src/services/user.service";
import { useAuthStore } from "../src/stores/authStore";
import { fetchFavorites } from "../src/stores/favoritesStore";
 

// Initialize Sentry as early as possible
initSentry();

const NAVIGATION_PERSISTENCE_KEY = "NAVIGATION_STATE";
const PLAYER_STATE_KEY = "PLAYER_STATE";

function RootLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { initializeAuth } = useAuthStore(); 
  const [isNavigationLoading] = useStorageState(NAVIGATION_PERSISTENCE_KEY);
  const [isPlayerStateLoading] = useStorageState(PLAYER_STATE_KEY);

  // Initialize user, auth, and favorites on app start
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize authentication state
        await initializeAuth();
        console.log('✅ Auth initialized');

        // Ensure user ID exists (creates guest ID if needed)
        await userService.getUserId();
        console.log("✅ User initialized");

        // Load favorites from API
        await fetchFavorites();
        console.log('✅ Favorites loaded');
        // Ensure downloads service is initialized
        await downloadsService.ensureInitialized();
        console.log('✅ Downloads service initialized');
      } catch (error) {
        console.error("Failed to initialize app:", error);
      }
    };

    initialize();
  }, []);

  // Handle deep links when app opens
  useEffect(() => {
    const handleDeepLink = async () => {
      // Check if app was opened with a URL
      const initialUrl = await linkingService.getInitialURL();
      if (initialUrl) {
        console.log('🔗 App opened with URL:', initialUrl);
        const parsed = linkingService.parseURL(initialUrl);
        if (parsed && parsed.path) {
          console.log('🔗 Navigating to:', parsed.path);
          router.push(`/${parsed.path}` as any);
        }
      }
    };

    handleDeepLink();

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('🔗 Deep link received:', event.url);
      const parsed = linkingService.parseURL(event.url);
      if (parsed && parsed.path) {
        console.log('🔗 Navigating to:', parsed.path);
        router.push(`/${parsed.path}` as any);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

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
