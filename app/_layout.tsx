import * as Notifications from "expo-notifications";
import { Image as ExpoImage } from "expo-image";
import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { useCallback, useEffect, useRef } from "react";
import { AppState, Linking, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PostHogProvider, PostHogErrorBoundary, usePostHog } from "posthog-react-native";

import { useStorageState } from "../src/hooks/useStorageState";
import { useTheme } from "../src/hooks/useTheme";
import { getPostHog } from "../src/services/config/posthog.config";
import { logger } from "../src/utils/logger";

import { ErrorBoundary } from "../src/components/atoms";
import { Loading } from "../src/components/atoms/Loading";
import { MiniPlayer } from "../src/components/organisms";
import { AudioProvider } from "../src/components/providers/AudioProvider";
import { UpdatesProvider } from "../src/components/providers/UpdatesProvider";
import { usePushNotifications } from "../src/hooks/usePushNotifications";
import { offlineFirstApi } from "../src/services/cache/offlineFirst.api";
import { addSentryBreadcrumb, captureSentryException, initSentry, Sentry } from "../src/services/config/sentry.config";
import { downloadsService } from "../src/services/downloads.service";
import { linkingService } from "../src/services/linking.service";
import { getNotificationRouteFromData } from "../src/services/notifications.service";
import { userService } from "../src/services/user.service";
import { initializeAuth } from "../src/stores/authStore";
import { fetchFavorites } from "../src/stores/favoritesStore";
import { usePlayerActions, usePlayerStore } from "../src/stores";
 

// Initialize Sentry as early as possible
initSentry();

const NAVIGATION_PERSISTENCE_KEY = "NAVIGATION_STATE";
const PLAYER_STATE_KEY = "PLAYER_STATE";
const NAVIGATION_DEDUPE_WINDOW_MS = 1500;
const IMAGE_CACHE_CLEANUP_THROTTLE_MS = 15000;
const PLAYER_NAVIGATION_PENDING_TIMEOUT_MS = 10000;
const recentNavigationState = {
  route: "",
  timestamp: 0,
};
const imageCacheCleanupState = {
  timestamp: 0,
};

const normalizeInternalRoute = (route: string | null | undefined): string | null => {
  if (!route) return null;

  const trimmed = route.trim();
  if (!trimmed.startsWith("/")) return null;

  const [pathOnly] = trimmed.split(/[?#]/);
  const normalizedPath = pathOnly.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!normalizedPath) {
    return "/";
  }

  return `/${normalizedPath}`;
};

function useSafeRoutePush() {
  const pathname = usePathname();
  const router = useRouter();

  return useCallback(
    (rawRoute: string, source: string) => {
      const route = normalizeInternalRoute(rawRoute);
      if (!route) {
        logger.debug("Ignoring invalid internal route", { rawRoute, source });
        return;
      }

      const currentRoute = normalizeInternalRoute(pathname);
      if (currentRoute === route) {
        return;
      }

      const now = Date.now();
      if (
        recentNavigationState.route === route &&
        now - recentNavigationState.timestamp < NAVIGATION_DEDUPE_WINDOW_MS
      ) {
        logger.debug("Ignoring duplicate navigation event", { route, source });
        return;
      }

      recentNavigationState.route = route;
      recentNavigationState.timestamp = now;
      router.push(route as any);
    },
    [pathname, router],
  );
}

function useNotificationObserver() {
  const safePush = useSafeRoutePush();

  useEffect(() => {
    const redirect = (notification: Notifications.Notification) => {
      const data = notification.request.content.data as Record<string, unknown>;
      const url = getNotificationRouteFromData(data);
      if (url) {
        safePush(url, "notification");
      }
    };

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response?.notification) {
        redirect(response.notification);
      }
    }).catch(() => {
      // Can fail on some Android devices with notification permission issues.
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        redirect(response.notification);
      }
    );

    return () => {
      subscription.remove();
    };
  }, [safePush]);
}

function PostHogAnalytics() {
  const posthog = usePostHog();
  const pathname = usePathname();
  const lastScreenRef = useRef<string | null>(null);
  const identifiedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!posthog || !pathname) return;
    if (lastScreenRef.current === pathname) return;
    lastScreenRef.current = pathname;
    posthog.screen(pathname);
  }, [pathname, posthog]);

  useEffect(() => {
    let isMounted = true;

    const identifyUser = async () => {
      try {
        const userId = await userService.getUserId();
        if (!isMounted || !userId) return;
        if (identifiedRef.current === userId) return;
        identifiedRef.current = userId;
        posthog?.identify(userId);
      } catch (error) {
        console.warn("PostHog identify failed:", error);
      }
    };

    void identifyUser();

    return () => {
      isMounted = false;
    };
  }, [posthog]);

  return null;
}

function RootLayout() {
  const pathname = usePathname();
  const safePush = useSafeRoutePush();
  const [isNavigationLoading] = useStorageState(NAVIGATION_PERSISTENCE_KEY);
  const [isPlayerStateLoading] = useStorageState(PLAYER_STATE_KEY);
  const hasInitializedApp = useRef(false);
  const { isDark } = useTheme();
  const { expandPlayer } = usePlayerActions();
  const { currentEpisode } = usePlayerStore();
  const currentEpisodeRef = useRef<typeof currentEpisode | null>(null);
  const pendingPlayerNavigationRef = useRef(false);
  const pendingPlayerNavigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);

  const clearPendingPlayerNavigationTimeout = useCallback(() => {
    const timeout = pendingPlayerNavigationTimeoutRef.current;
    if (!timeout) return;
    clearTimeout(timeout);
    pendingPlayerNavigationTimeoutRef.current = null;
  }, []);

  usePushNotifications();
  useNotificationObserver();

  useEffect(() => {
    if (fontError) {
      captureSentryException(fontError, {
        component: "RootLayout",
        action: "loadFonts",
        level: "warning",
      });
    }
  }, [fontError]);

  useEffect(() => {
    logger.debug("RootLayout mounted");
    return () => {
      logger.debug("RootLayout unmounted");
    };
  }, []);

  useEffect(() => {
    addSentryBreadcrumb("Route changed", "navigation", { pathname });
  }, [pathname]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") return;

      const now = Date.now();
      if (now - imageCacheCleanupState.timestamp < IMAGE_CACHE_CLEANUP_THROTTLE_MS) {
        return;
      }

      imageCacheCleanupState.timestamp = now;
      ExpoImage.clearMemoryCache().catch(() => {
        logger.debug("Failed to clear image memory cache");
      });
    });

    return () => {
      subscription.remove();
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
        logger.debug('Auth initialized');

        // Ensure user ID exists (creates guest ID if needed)
        await userService.getUserId();
        if (!isMounted) return;
        logger.debug("User initialized");

        // Load favorites from API
        await fetchFavorites();
        if (!isMounted) return;
        logger.debug('Favorites loaded');

        // Ensure downloads service is initialized
        await downloadsService.ensureInitialized();
        if (!isMounted) return;
        logger.debug('Downloads service initialized');

        // Warm up essential cached data (popular lectures, lecturers list)
        await offlineFirstApi.warmupEssentialData();
        if (!isMounted) return;
        logger.debug('Offline cache warmed');
      } catch (error) {
        if (!isMounted) return;
        console.error("Failed to initialize app:", error);
      }
    };

    initialize().catch((error) => {
      captureSentryException(error as Error, {
        component: "RootLayout",
        action: "initialize",
        level: "error",
      });
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle deep links when app opens
  useEffect(() => {
    currentEpisodeRef.current = currentEpisode;
  }, [currentEpisode]);

  useEffect(() => {
    const navigateToPlayer = () => {
      expandPlayer();
      const episodeId = currentEpisodeRef.current?.id;
      if (episodeId) {
        clearPendingPlayerNavigationTimeout();
        pendingPlayerNavigationRef.current = false;
        safePush(`/lecture/${episodeId}`, "player_notification");
        return;
      }

      pendingPlayerNavigationRef.current = true;
      clearPendingPlayerNavigationTimeout();
      pendingPlayerNavigationTimeoutRef.current = setTimeout(() => {
        pendingPlayerNavigationRef.current = false;
        pendingPlayerNavigationTimeoutRef.current = null;
      }, PLAYER_NAVIGATION_PENDING_TIMEOUT_MS);
    };

    const handleDeepLink = async () => {
      // Check if app was opened with a URL
      const initialUrl = await linkingService.getInitialURL();
      if (initialUrl) {
        logger.debug('App opened with URL:', initialUrl);
        const isPlayerNotification =
          initialUrl.startsWith('trackplayer://notification.click') ||
          initialUrl.startsWith('dawahnigeria://notification.click');
        if (isPlayerNotification) {
          navigateToPlayer();
          return;
        }
        const parsed = linkingService.parseURL(initialUrl);
        if (parsed && parsed.path) {
          logger.debug('Navigating to:', parsed.path);
          safePush(`/${parsed.path}`, "deep_link_initial");
        }
      }
    };

    handleDeepLink().catch((error) => {
      captureSentryException(error as Error, {
        component: "RootLayout",
        action: "handleDeepLink",
        level: "warning",
      });
    });

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      logger.debug('Deep link received:', event.url);
      const isPlayerNotification =
        event.url?.startsWith('trackplayer://notification.click') ||
        event.url?.startsWith('dawahnigeria://notification.click');
      if (isPlayerNotification) {
        navigateToPlayer();
        return;
      }
      const parsed = linkingService.parseURL(event.url);
      if (parsed && parsed.path) {
        logger.debug('Navigating to:', parsed.path);
        safePush(`/${parsed.path}`, "deep_link_runtime");
      }
    });

    return () => {
      clearPendingPlayerNavigationTimeout();
      subscription.remove();
    };
  }, [clearPendingPlayerNavigationTimeout, expandPlayer, safePush]);

  useEffect(() => {
    if (!pendingPlayerNavigationRef.current) {
      return;
    }
    const episodeId = currentEpisode?.id;
    if (!episodeId) {
      return;
    }
    clearPendingPlayerNavigationTimeout();
    pendingPlayerNavigationRef.current = false;
    expandPlayer();
    safePush(`/lecture/${episodeId}`, "pending_player_navigation");
  }, [clearPendingPlayerNavigationTimeout, currentEpisode?.id, expandPlayer, safePush]);

  useEffect(() => {
    return () => {
      clearPendingPlayerNavigationTimeout();
    };
  }, [clearPendingPlayerNavigationTimeout]);

  // Hide mini player on lecture detail page since it has full playback controls
  const shouldShowMiniPlayer = !pathname.startsWith("/lecture/");

  const isHydrating = isNavigationLoading || isPlayerStateLoading;

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <Loading fullScreen message="Loading assets..." />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AudioProvider>
          <StatusBar style={isDark ? "light" : "dark"} />
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
              <Stack.Screen
                name="edit-profile"
                options={{
                  presentation: "modal",
                  animation: "slide_from_bottom",
                }}
              />
              <Stack.Screen
                name="about"
                options={{
                  presentation: "modal",
                  animation: "slide_from_bottom",
                }}
              />
            </Stack>
            {shouldShowMiniPlayer && <MiniPlayer />}
            <UpdatesProvider />

            {isHydrating && (
              <View
                style={StyleSheet.absoluteFill}
                onStartShouldSetResponder={() => true}
              >
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
function RootLayoutWithProviders() {
  const posthogClient = getPostHog();

  if (!posthogClient) {
    return <RootLayout />;
  }

  return (
    <PostHogProvider
      client={posthogClient}
      autocapture={{ captureScreens: false, captureTouches: false }}
    >
      <PostHogErrorBoundary>
        <PostHogAnalytics />
        <RootLayout />
      </PostHogErrorBoundary>
    </PostHogProvider>
  );
}

export default Sentry.wrap(RootLayoutWithProviders);
