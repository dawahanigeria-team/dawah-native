import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useStorageState } from "../src/hooks/useStorageState";

import { ErrorBoundary } from "../src/components/atoms";
import { Loading } from "../src/components/atoms/Loading";
import { MiniPlayer } from "../src/components/organisms";
import { AudioProvider } from "../src/components/providers/AudioProvider";
import { offlineFirstApi } from "../src/services/cache/offlineFirst.api";
import { initSentry, Sentry } from "../src/services/config/sentry.config";
import { downloadsService } from "../src/services/downloads.service";
import { linkingService } from "../src/services/linking.service";
import { userService } from "../src/services/user.service";
import { initializeAuth } from "../src/stores/authStore";
import { fetchFavorites } from "../src/stores/favoritesStore";
 

// Initialize Sentry as early as possible
initSentry();

const NAVIGATION_PERSISTENCE_KEY = "NAVIGATION_STATE";
const PLAYER_STATE_KEY = "PLAYER_STATE";

function RootLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const [isNavigationLoading] = useStorageState(NAVIGATION_PERSISTENCE_KEY);
  const [isPlayerStateLoading] = useStorageState(PLAYER_STATE_KEY);
  const hasInitializedApp = useRef(false);

  useEffect(() => {
    if (!__DEV__) return;
    // Helps confirm whether RootLayout is truly remounting during navigation.
    console.log("🧩 RootLayout mounted");
    return () => {
      console.log("🧩 RootLayout unmounted");
    };
  }, []);

  // Initialize user, auth, and favorites on app start
  useEffect(() => {
    if (hasInitializedApp.current) {
      return;
    }
    hasInitializedApp.current = true;

    // Track if component is still mounted to prevent state updates after unmount
    let isMounted = true;

    const initialize = async () => {
      try {
        // Initialize authentication state
        await initializeAuth();
        if (!isMounted) return;
        console.log('✅ Auth initialized');

        // Ensure user ID exists (creates guest ID if needed)
        await userService.getUserId();
        if (!isMounted) return;
        console.log("✅ User initialized");

        // Load favorites from API
        await fetchFavorites();
        if (!isMounted) return;
        console.log('✅ Favorites loaded');

        // Ensure downloads service is initialized
        await downloadsService.ensureInitialized();
        if (!isMounted) return;
        console.log('✅ Downloads service initialized');

        // Warm up essential cached data (popular lectures, lecturers list)
        await offlineFirstApi.warmupEssentialData();
        if (!isMounted) return;
        console.log('✅ Offline cache warmed');
      } catch (error) {
        if (!isMounted) return;
        console.error("Failed to initialize app:", error);
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
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

  const isHydrating = isNavigationLoading || isPlayerStateLoading;

  return (
    <SafeAreaProvider>
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

            {/* Keep the app tree mounted while AsyncStorage hydration happens.
                This prevents MiniPlayer/provider unmounts which look like "reloads". */}
            {isHydrating && (
              <View style={StyleSheet.absoluteFill} pointerEvents="auto">
                <Loading fullScreen />
              </View>
            )}
          </View>
        </AudioProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

// Wrap with Sentry for error tracking
export default Sentry.wrap(RootLayout);
