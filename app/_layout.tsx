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
import { useAuthStore } from "../src/stores/authStore";
import { downloadsService } from "../src/services/downloads.service"; 

// Initialize Sentry as early as possible
initSentry();

function RootLayout() {
  const pathname = usePathname();
  const { initializeAuth } = useAuthStore(); 

  // Initialize user, auth, and favorites on app start
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize authentication state
        await initializeAuth();
        console.log('✅ Auth initialized');

        // Ensure user ID exists (creates guest ID if needed)
        await userService.getUserId();
        console.log('✅ User initialized');

        // Load favorites from API
        await fetchFavorites();
        console.log('✅ Favorites loaded');

        // Ensure downloads service is initialized
        await downloadsService.ensureInitialized();
        console.log('✅ Downloads service initialized');
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
