import * as Notifications from "expo-notifications";
import { ObserveRoot } from "expo-observe";
import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFonts } from "expo-font";
import { useCallback, useEffect, useRef } from "react";
import { InteractionManager, Linking, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useTheme } from "../src/hooks/useTheme";
import { logger } from "../src/utils/logger";

import { ErrorBoundary } from "../src/components/atoms";
import { MiniPlayer } from "../src/components/organisms";
import { AudioProvider } from "../src/components/providers/AudioProvider";
import { UpdatesProvider } from "../src/components/providers/UpdatesProvider";
import { usePushNotifications } from "../src/hooks/usePushNotifications";
import { analytics } from "../src/services/analytics.service";
import { initObserve, setObserveAudience } from "../src/services/config/observe.config";
import { addSentryBreadcrumb, captureSentryException, initSentry, Sentry } from "../src/services/config/sentry.config";
import { downloadsService } from "../src/services/downloads.service";
import { linkingService } from "../src/services/linking.service";
import { getNotificationRouteFromData } from "../src/services/notifications.service";
import { userService } from "../src/services/user.service";
import { authStore, initializeAuth, subscribeToAuthChange } from "../src/stores/authStore";
import { fetchFavorites } from "../src/stores/favoritesStore";
import { usePlayerActions, usePlayerStore } from "../src/stores";

// Initialize Sentry as early as possible
initSentry();

// Must run before ObserveRoot mounts: the expo-router integration reads this
// config once at mount and throws if it is enabled afterwards.
initObserve();

const NAVIGATION_DEDUPE_WINDOW_MS = 1500;
const PLAYER_NAVIGATION_PENDING_TIMEOUT_MS = 10000;
const recentNavigationState = {
  route: "",
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

/**
 * App-open and session-length tracking.
 *
 * Screen views and user identification went with PostHog; both were features of
 * that SDK rather than of this app. The event taxonomy in analytics.service.ts
 * is unchanged and still called, so wiring a new transport is one file.
 */
function AppSessionTracker() {
  useEffect(() => {
    analytics.capture("app_opened");
    return analytics.trackAppSession();
  }, []);

  return null;
}

function RootLayout() {
  const pathname = usePathname();
  const safePush = useSafeRoutePush();
  const hasInitializedApp = useRef(false);
  const { isDark } = useTheme();
  const { expandPlayer } = usePlayerActions();
  const { currentEpisode } = usePlayerStore();
  const currentEpisodeRef = useRef<typeof currentEpisode | null>(null);
  const pendingPlayerNavigationRef = useRef(false);
  const pendingPlayerNavigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, fontError] = useFonts(Ionicons.font);

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

  // Fires only when authentication actually flips, so this is a handful of
  // calls per install rather than one per render.
  useEffect(
    () =>
      subscribeToAuthChange((isAuthenticated) => {
        setObserveAudience({ authState: isAuthenticated ? "signed_in" : "guest" });
      }),
    [],
  );

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

        // Signed-in and guest users take different code paths, so a startup
        // number that averages the two hides whichever one is slow.
        setObserveAudience({
          authState: authStore.get().isAuthenticated ? "signed_in" : "guest",
        });

        // Ensure user ID exists (creates guest ID if needed)
        await userService.getUserId();
        if (!isMounted) return;
        logger.debug("User initialized");

        // These stores are independent. Hydrate them after the first frame and
        // in parallel instead of creating a startup waterfall. Home owns its
        // own cached requests, so the old eager API warmup only duplicated
        // network traffic and has intentionally been removed.
        const task = InteractionManager.runAfterInteractions(() => {
          void Promise.allSettled([
            fetchFavorites(),
            downloadsService.ensureInitialized(),
          ]).then((results) => {
            if (!isMounted) return;
            const rejected = results.filter((result) => result.status === "rejected");
            if (rejected.length > 0) {
              logger.debug("Some background stores failed to hydrate", {
                rejected: rejected.length,
              });
            }
          });
        });

        if (!isMounted) task.cancel?.();
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
                name="listening-preferences"
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

          </View>
        </AudioProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

// Wrap with Sentry for error tracking
function RootLayoutWithProviders() {
  return (
    <>
      <AppSessionTracker />
      <RootLayout />
    </>
  );
}

// ObserveRoot is outermost so its first-render mark is taken at the earliest
// render of the tree; it also provides the router integration that fills in
// `routeName` for every markInteractive call below it.
export default ObserveRoot.wrap(Sentry.wrap(RootLayoutWithProviders));
