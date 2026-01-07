import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Tabs, usePathname } from "expo-router";
import { useMemo } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { designTokens } from "../../src/theme/designTokens";

export default function TabLayout() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

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
    if (pathname === "/" || pathname === "/library" || pathname === "/profile") {
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
    // Android soft-navigation/gesture bars vary a lot by device.
    // Use safe-area insets when available, with a small minimum so labels/icons don't get clipped.
    const minimum = Platform.OS === "ios" ? 16 : 10;
    return Math.max(insets.bottom, minimum);
  }, [insets.bottom]);

  const tabBarHeight = useMemo(() => {
    // Base bar height + adaptive bottom padding.
    // iOS base is ~49; Android is ~56 (material-ish). Keep paddingTop below for spacing.
    const base = Platform.OS === "ios" ? 49 : 56;
    return base + tabBarPaddingBottom;
  }, [tabBarPaddingBottom]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: designTokens.colors.brand.primary,
        tabBarInactiveTintColor: designTokens.colors.system.label.tertiary,
        tabBarHideOnKeyboard: true,
        tabBarStyle: tabBarVisible ? {
          backgroundColor: designTokens.colors.system.background.secondary,
          borderTopColor: designTokens.colors.system.separator.primary,
          borderTopWidth: 0.5, // iOS standard separator width
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 8,
          // Add translucent effect for iOS
          ...(Platform.OS === "ios" && {
            backgroundColor: "rgba(28, 28, 30, 0.95)", // Semi-transparent
            backdropFilter: "blur(20px)", // iOS blur effect
          }),
        } : {
          display: "none", // Hide tab bar completely
        },
        tabBarLabelStyle: {
          fontSize: designTokens.typography.fontSize.caption1,
          fontWeight: designTokens.typography.fontWeight.medium,
          fontFamily: designTokens.typography.fontFamily.system,
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 2,
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
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={focused ? 26 : 24}
              color={color}
            />
          ),
        }}
        listeners={{
          tabPress: handleTabPress,
        }}
      />
    </Tabs>
  );
}
