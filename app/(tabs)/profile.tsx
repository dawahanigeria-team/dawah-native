import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

const settingsItems: SettingItem[] = [
  {
    id: "1",
    title: "Appearance",
    icon: "color-palette-outline",
    subtitle: "Dark mode, theme settings",
    onPress: () => console.log("Appearance pressed"),
  },
  {
    id: "2",
    title: "Notifications",
    icon: "notifications-outline",
    subtitle: "Push notifications, alerts",
    onPress: () => console.log("Notifications pressed"),
  },
  {
    id: "3",
    title: "Playback",
    icon: "play-circle-outline",
    subtitle: "Audio quality, speed",
    onPress: () => console.log("Playback pressed"),
  },
  {
    id: "4",
    title: "About",
    icon: "information-circle-outline",
    subtitle: "App version, terms",
    onPress: () => console.log("About pressed"),
  },
];

export default function ProfileScreen() {
  const { isDark, toggleTheme } = useThemeStore();

  const handleSignIn = () => {
    console.log("Sign in pressed");
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
        contentContainerStyle={tw`pb-24`}
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
              Guest User
            </Text>

            <Text
              style={[
                tw`text-center mb-4`,
                { color: designTokens.colors.system.label.secondary },
              ]}
            >
              Sign in to sync your library and preferences across devices
            </Text>

            <TouchableOpacity
              style={[
                tw`px-6 py-3 rounded-full`,
                { backgroundColor: designTokens.colors.brand.primary },
              ]}
              onPress={handleSignIn}
              activeOpacity={0.8}
              accessibilityLabel="Sign in button"
              accessibilityHint="Tap to sign in to your account"
              accessibilityRole="button"
            >
              <Text
                style={[
                  tw`font-semibold text-base`,
                  { color: designTokens.colors.system.background.primary },
                ]}
              >
                Sign In
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
      </ScrollView>
    </SafeAreaView>
  );
}
