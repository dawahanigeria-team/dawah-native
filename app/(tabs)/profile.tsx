import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "expo-sqlite/kv-store";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { addSentryBreadcrumb, captureSentryException } from "../../src/services/config/sentry.config";
import { userService } from "../../src/services/user.service";
import { useAuthStore } from "../../src/stores";
import { useThemeStore } from "../../src/stores/themeStore";
import { designTokens } from "../../src/theme/designTokens";
import tw from "../../src/theme/twrnc";

interface SettingItem {
  id: string;
  title: string;
  icon: string;
  subtitle?: string;
  onPress: () => void;
}

const ProfileScreen = () => {
  const router = useRouter();
  const { isDark, toggleTheme, setTheme } = useThemeStore();
  const { user, isAuthenticated, logout } = useAuthStore();

  const handleAppearancePress = () => {
    Alert.alert(
      "Appearance",
      "Choose your preferred theme",
      [
        {
          text: "Light",
          onPress: () => setTheme(false),
        },
        {
          text: "Dark",
          onPress: () => setTheme(true),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const settingsItems: SettingItem[] = [
    {
      id: "1",
      title: "Appearance",
      icon: "color-palette-outline",
      subtitle: `${isDark ? "Dark" : "Light"} mode`,
      onPress: handleAppearancePress,
    },
  {
    id: "2",
    title: "Notifications",
    icon: "notifications-outline",
    subtitle: "Push notifications, alerts",
    onPress: () => router.push("/notifications"),
  },
  {
    id: "3",
    title: "About",
    icon: "information-circle-outline",
    subtitle: "App version, terms",
    onPress: () => console.log("About pressed"),
  },
];

  const handleResetUserId = () => {
    Alert.alert(
      "Reset User ID",
      "Are you sure you want to reset your user ID? This will clear your local history and favorites.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await userService.clearUserId();
            Alert.alert("User ID Reset", "Your user ID has been reset. Please restart the app.");
          },
        },
      ]
    );
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      "Reset Onboarding",
      "Are you sure you want to see the welcome screens again?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem("hasSeenOnboarding");
            Alert.alert("Onboarding Reset", "Please restart the app to see the welcome screens again.");
          },
        },
      ]
    );
  };

  const debugItems: SettingItem[] = [
    {
      id: "1",
      title: "Reset User ID",
      icon: "refresh-outline",
      subtitle: "Clear local user data",
      onPress: handleResetUserId,
    },
    {
      id: "2",
      title: "Reset Onboarding",
      icon: "refresh-circle-outline",
      subtitle: "Show welcome screens again",
      onPress: handleResetOnboarding,
    },
  ];

  const handleSignIn = () => {
    router.push("/sign-in");
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              addSentryBreadcrumb('User signing out', 'user', {
                userId: user?.id,
              });
              await logout();
            } catch (err: any) {
              console.error("Sign out error:", err);
              captureSentryException(err, {
                component: 'ProfileScreen',
                action: 'handleSignOut',
                userId: user?.id,
                level: 'error',
              });
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleThemeToggle = () => {
    toggleTheme();
  };

  return (
    <SafeAreaView
      style={[
        tw`flex-1`,
        { backgroundColor: designTokens.colors.system.background.primary },
      ]}
    >
      {/* Header */}
      <View style={tw`px-4 py-3`}>
        <Text
          style={[
            tw`text-white text-2xl font-bold`,
            { color: designTokens.colors.system.label.primary },
          ]}
          accessibilityRole="header"
        >
          Profile
        </Text>
      </View>

      <ScrollView
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        // Extra bottom padding so content doesn’t disappear under the mini-player + tab bar
        contentContainerStyle={tw`pb-40`}
        accessibilityLabel="Profile content"
      >
        {/* Identity Card */}
        <View style={tw`px-4 mb-6`}>
          <View
            style={[
              tw`rounded-3xl p-6 items-center`,
              {
                backgroundColor:
                  designTokens.colors.system.background.secondary,
              },
            ]}
          >
            <View
              style={[
                tw`w-20 h-20 rounded-full items-center justify-center mb-4`,
                { backgroundColor: designTokens.colors.brand.primary },
              ]}
            >
              <Ionicons
                name="person"
                size={40}
                color={designTokens.colors.system.background.primary}
                accessibilityLabel="Profile avatar"
              />
            </View>

            <Text
              style={[
                tw`text-white text-xl font-bold mb-2`,
                { color: designTokens.colors.system.label.primary },
              ]}
              accessibilityRole="header"
            >
              {isAuthenticated && user ? user.username : "Guest User"}
            </Text>

            {isAuthenticated && user?.email && (
              <Text
                style={[
                  tw`text-center mb-4`,
                  { color: designTokens.colors.system.label.secondary },
                ]}
              >
                {user.email}
              </Text>
            )}

            {!isAuthenticated && (
              <Text
                style={[
                  tw`text-center mb-4`,
                  { color: designTokens.colors.system.label.secondary },
                ]}
              >
                Sign in to sync your library and preferences across devices
              </Text>
            )}

            <TouchableOpacity
              style={[
                tw`px-6 py-3 rounded-full`,
                { backgroundColor: isAuthenticated
                  ? designTokens.colors.system.fill.secondary
                  : designTokens.colors.brand.primary
                },
              ]}
              onPress={isAuthenticated ? handleSignOut : handleSignIn}
              activeOpacity={0.8}
              accessibilityLabel={isAuthenticated ? "Sign out button" : "Sign in button"}
              accessibilityHint={isAuthenticated ? "Tap to sign out of your account" : "Tap to sign in to your account"}
              accessibilityRole="button"
            >
              <Text
                style={[
                  tw`font-semibold text-base`,
                  { color: isAuthenticated
                    ? designTokens.colors.semantic.red
                    : designTokens.colors.system.background.primary
                  },
                ]}
              >
                {isAuthenticated ? "Sign Out" : "Sign In"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Settings List */}
        <View style={tw`px-4`}>
          <Text
            style={[
              tw`text-white text-lg font-semibold mb-4`,
              { color: designTokens.colors.system.label.primary },
            ]}
            accessibilityRole="header"
          >
            Settings
          </Text>

          <View
            style={[
              tw`rounded-2xl overflow-hidden`,
              {
                backgroundColor:
                  designTokens.colors.system.background.secondary,
              },
            ]}
          >
            {settingsItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  tw`flex-row items-center p-4`,
                  index < settingsItems.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor:
                      designTokens.colors.system.separator.primary,
                  },
                ]}
                onPress={item.onPress}
                activeOpacity={0.7}
                accessibilityLabel={item.title}
                accessibilityHint={item.subtitle}
                accessibilityRole="button"
              >
                <View
                  style={[
                    tw`w-10 h-10 rounded-full items-center justify-center mr-4`,
                    {
                      backgroundColor:
                        designTokens.colors.system.background.tertiary,
                    },
                  ]}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={20}
                    color={designTokens.colors.system.label.secondary}
                  />
                </View>

                <View style={tw`flex-1`}>
                  <Text
                    style={[
                      tw`text-base font-medium`,
                      { color: designTokens.colors.system.label.primary },
                    ]}
                  >
                    {item.title}
                  </Text>
                  {item.subtitle && (
                    <Text
                      style={[
                        tw`text-sm mt-1`,
                        { color: designTokens.colors.system.label.secondary },
                      ]}
                    >
                      {item.subtitle}
                    </Text>
                  )}
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={designTokens.colors.system.label.secondary}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Theme Toggle */}
        <View style={tw`px-4 mt-6`}>
          <View
            style={[
              tw`rounded-2xl p-4`,
              {
                backgroundColor:
                  designTokens.colors.system.background.secondary,
              },
            ]}
          >
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-row items-center`}>
                <View
                  style={[
                    tw`w-10 h-10 rounded-full items-center justify-center mr-4`,
                    {
                      backgroundColor:
                        designTokens.colors.system.background.tertiary,
                    },
                  ]}
                >
                  <Ionicons
                    name={isDark ? "moon" : "sunny"}
                    size={20}
                    color={designTokens.colors.system.label.secondary}
                    accessibilityLabel={
                      isDark ? "Dark mode icon" : "Light mode icon"
                    }
                  />
                </View>

                <View>
                  <Text
                    style={[
                      tw`text-base font-medium`,
                      { color: designTokens.colors.system.label.primary },
                    ]}
                  >
                    {isDark ? "Dark Mode" : "Light Mode"}
                  </Text>
                  <Text
                    style={[
                      tw`text-sm mt-1`,
                      { color: designTokens.colors.system.label.secondary },
                    ]}
                  >
                    {isDark
                      ? "Currently using dark theme"
                      : "Currently using light theme"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  tw`w-12 h-6 rounded-full p-0.5`,
                  isDark
                    ? { backgroundColor: designTokens.colors.brand.primary }
                    : {
                        backgroundColor:
                          designTokens.colors.system.fill.quaternary,
                      },
                ]}
                onPress={handleThemeToggle}
                activeOpacity={0.8}
                accessibilityLabel={`Switch to ${
                  isDark ? "light" : "dark"
                } mode`}
                accessibilityHint="Tap to toggle theme"
                accessibilityRole="switch"
                accessibilityState={{ checked: isDark }}
              >
                <View
                  style={[
                    tw`w-5 h-5 bg-white rounded-full`,
                    isDark && tw`ml-6`,
                  ]}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* App Info */}
        <View style={tw`px-4 mt-6`}>
          <View
            style={[
              tw`rounded-2xl p-4 items-center`,
              {
                backgroundColor:
                  designTokens.colors.system.background.secondary,
              },
            ]}
          >
            <View
              style={[
                tw`w-12 h-12 rounded-xl items-center justify-center mb-3`,
                { backgroundColor: designTokens.colors.brand.primary },
              ]}
            >
              <Text
                style={[
                  tw`font-bold text-lg`,
                  { color: designTokens.colors.system.background.primary },
                ]}
              >
                DN
              </Text>
            </View>

            <Text
              style={[
                tw`text-lg font-bold mb-1`,
                { color: designTokens.colors.system.label.primary },
              ]}
            >
              Dawah Nigeria
            </Text>

            <Text
              style={[
                tw`text-sm`,
                { color: designTokens.colors.system.label.secondary },
              ]}
            >
              Version 1.0.0
            </Text>

            <Text
              style={[
                tw`text-xs text-center mt-2`,
                { color: designTokens.colors.system.label.secondary },
              ]}
            >
              Islamic content platform for Nigeria
            </Text>
          </View>
        </View>

        {/* Debug Settings List */}
        <View style={tw`px-4 mt-6`}>
          <Text
            style={[
              tw`text-white text-lg font-semibold mb-4`,
              { color: designTokens.colors.system.label.primary },
            ]}
            accessibilityRole="header"
          >
            Debug
          </Text>

          <View
            style={[
              tw`rounded-2xl overflow-hidden`,
              {
                backgroundColor:
                  designTokens.colors.system.background.secondary,
              },
            ]}
          >
            {debugItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  tw`flex-row items-center p-4`,
                  index < debugItems.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor:
                      designTokens.colors.system.separator.primary,
                  },
                ]}
                onPress={item.onPress}
                activeOpacity={0.7}
                accessibilityLabel={item.title}
                accessibilityHint={item.subtitle}
                accessibilityRole="button"
              >
                <View
                  style={[
                    tw`w-10 h-10 rounded-full items-center justify-center mr-4`,
                    {
                      backgroundColor:
                        designTokens.colors.system.background.tertiary,
                    },
                  ]}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={20}
                    color={designTokens.colors.system.label.secondary}
                  />
                </View>

                <View style={tw`flex-1`}>
                  <Text
                    style={[
                      tw`text-base font-medium`,
                      { color: designTokens.colors.system.label.primary },
                    ]}
                  >
                    {item.title}
                  </Text>
                  {item.subtitle && (
                    <Text
                      style={[
                        tw`text-sm mt-1`,
                        { color: designTokens.colors.system.label.secondary },
                      ]}
                    >
                      {item.subtitle}
                    </Text>
                  )}
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={designTokens.colors.system.label.secondary}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;
