import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Tabs, usePathname } from "expo-router";
import { useMemo } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { designTokens } from "../../src/theme/designTokens";
import { useThemeColors } from "../../src/hooks/useTheme";
import {
  getTabBarHeight,
  getTabBarPaddingBottom,
} from "../../src/utils/layout";

export default function TabLayout() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const handleTabPress = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  /**
   * Determine if tabs should be visible based on current route
   * Following iOS/Android best practices:
   * - Show tabs on main navigation screens (tab screens)
   * - Hide tabs on detail pages, modals, and single-task screens
   * - Hide tabs on deep navigation levels
   *
   * Memoized to prevent recalculation on every render
   */
  const tabBarVisible = useMemo(() => {
    // Always show on main tab screens
    if (pathname === "/" || pathname === "/explore" || pathname === "/library" || pathname === "/profile") {
      return true;
    }

    // Hide on detail pages (deep navigation)
    const hideOnRoutes = [
      "/lecture/",      // Lecture detail
      "/lecturer/",     // Lecturer detail
      "/album/",        // Album detail
      "/quran-reciter/",// Quran reciter detail
      "/playlist/",     // Playlist detail
      "/section/",      // Section list pages
      "/search",        // Search (single-task focus)
      "/charts",        // Charts modal
      "/notifications", // Notification settings
      "/sign-in",       // Auth modals
      "/sign-up",       // Auth modals
      "/lecturers",     // Full list pages
      "/playlists",     // Full list pages
    ];

    return !hideOnRoutes.some(route => pathname.startsWith(route));
  }, [pathname]);

  const tabBarPaddingBottom = useMemo(() => {
    return getTabBarPaddingBottom(insets.bottom);
  }, [insets.bottom]);

  const tabBarHeight = useMemo(() => {
    return getTabBarHeight(insets.bottom);
  }, [insets.bottom]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.system.label.secondary,
        tabBarHideOnKeyboard: true,
        tabBarStyle: tabBarVisible ? {
          backgroundColor: colors.system.background.secondary,
          borderTopColor: colors.system.separator.primary,
          borderTopWidth: 0.5, // iOS standard separator width
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 8,
          // Add translucent effect for iOS
          ...(Platform.OS === "ios" && {
            // We need to use hex with alpha if we want translucency, 
            // but `colors.system.background.secondary` might be hex or rgba.
            // If it's hex, we can't easily add alpha without conversion.
            // However, the previous code hardcoded a specific rgba.
            // Let's stick to the color token. If it's opaque, it's opaque.
            // Or we could map it if we really want that glass effect.
            // For now, let's just use the theme color.
            backgroundColor: colors.system.background.secondary,
            // opacity: 0.95? No, that affects content too.
          }),
        } : {
          display: "none", // Hide tab bar completely
        },
        tabBarLabelStyle: {
          fontSize: designTokens.typography.fontSize.caption1,
          fontWeight: designTokens.typography.fontWeight.medium,
          fontFamily: designTokens.typography.fontFamily.system,
          marginTop: 0,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={focused ? 26 : 24}
              color={color}
            />
          ),
        }}
        listeners={{
          tabPress: handleTabPress,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "compass" : "compass-outline"}
              size={focused ? 26 : 24}
              color={color}
            />
          ),
        }}
        listeners={{
          tabPress: handleTabPress,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "library" : "library-outline"}
              size={focused ? 26 : 24}
              color={color}
            />
          ),
        }}
        listeners={{
          tabPress: handleTabPress,
        }}
      />
      {/* Opened from the Home avatar; it stays a route here so the tab bar remains. */}
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
