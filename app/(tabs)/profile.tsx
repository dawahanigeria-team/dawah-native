import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "expo-sqlite/kv-store";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Text } from "../../src/components/atoms";
import { ErrorBoundary } from "../../src/components/atoms/ErrorBoundary";
import { addSentryBreadcrumb, captureSentryException } from "../../src/services/config/sentry.config";
import { userService } from "../../src/services/user.service";
import { useAuthStore } from "../../src/stores";
import { useTheme } from "../../src/hooks/useTheme";
import { designTokens } from "../../src/theme/designTokens";
import tw from "../../src/theme/twrnc";

interface MenuItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  iconColor?: string;
  onPress: () => void;
  showChevron?: boolean;
  rightElement?: React.ReactNode;
}

const ProfileScreen = () => {
  const router = useRouter();
  const { colors, isDark, setTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuthStore();

  // Get time-based greeting (Arabic)
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Sabah al-Khayr"; // Good Morning
    if (hour < 17) return "Masa al-Khayr"; // Good Afternoon/Evening
    return "Assalamu Alaikum"; // Peace be upon you
  };

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
            } catch (err: unknown) {
              const error = err as Error;
              console.error("Sign out error:", error);
              captureSentryException(error, {
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

  // Menu items organized by section
  const accountItems: MenuItem[] = isAuthenticated ? [
    {
      id: "edit-profile",
      title: "Edit Profile",
      subtitle: "Update your information",
      icon: "person-outline",
      onPress: () => Alert.alert("Coming Soon", "Profile editing will be available soon!"),
      showChevron: true,
    },
  ] : [];

  const settingsItems: MenuItem[] = [
    {
      id: "appearance",
      title: "Appearance",
      subtitle: isDark ? "Dark mode" : "Light mode",
      icon: isDark ? "moon-outline" : "sunny-outline",
      iconColor: isDark ? colors.semantic.purple : colors.semantic.orange,
      onPress: handleAppearancePress,
      showChevron: true,
    },
    {
      id: "notifications",
      title: "Notifications",
      subtitle: "Manage alerts & sounds",
      icon: "notifications-outline",
      iconColor: colors.semantic.red,
      onPress: () => router.push("/notifications"),
      showChevron: true,
    },
  ];

  const supportItems: MenuItem[] = [
    {
      id: "help",
      title: "Help & Support",
      subtitle: "FAQs and contact us",
      icon: "help-circle-outline",
      iconColor: colors.semantic.blue,
      onPress: () => Alert.alert("Coming Soon", "Help center will be available soon!"),
      showChevron: true,
    },
    {
      id: "feedback",
      title: "Send Feedback",
      subtitle: "Help us improve",
      icon: "chatbubble-outline",
      iconColor: colors.semantic.green,
      onPress: () => Alert.alert("Coming Soon", "Feedback feature will be available soon!"),
      showChevron: true,
    },
    {
      id: "about",
      title: "About",
      subtitle: "Version 1.0.0",
      icon: "information-circle-outline",
      iconColor: colors.system.label.secondary,
      onPress: () => Alert.alert("dawahnigeria", "Version 1.0.0\n\nReviving the Ummah byte by byte"),
      showChevron: true,
    },
  ];

  const debugItems: MenuItem[] = [
    {
      id: "reset-user",
      title: "Reset User ID",
      subtitle: "Clear local user data",
      icon: "refresh-outline",
      iconColor: colors.semantic.orange,
      onPress: handleResetUserId,
      showChevron: false,
    },
    {
      id: "reset-onboarding",
      title: "Reset Onboarding",
      subtitle: "Show welcome screens again",
      icon: "refresh-circle-outline",
      iconColor: colors.semantic.orange,
      onPress: handleResetOnboarding,
      showChevron: false,
    },
  ];

  const renderMenuItem = (item: MenuItem, isLast: boolean) => (
    <TouchableOpacity
      key={item.id}
      style={[
        tw`flex-row items-center py-3 px-4`,
        !isLast && {
          borderBottomWidth: 0.5,
          borderBottomColor: colors.system.separator.primary,
        },
      ]}
      onPress={item.onPress}
      activeOpacity={0.7}
      accessibilityLabel={item.title}
      accessibilityHint={item.subtitle}
      accessibilityRole="button"
    >
      {/* Icon */}
      <View
        style={[
          tw`w-9 h-9 rounded-xl items-center justify-center mr-3`,
          { backgroundColor: `${item.iconColor || colors.brand.primary}15` },
        ]}
      >
        <Ionicons
          name={item.icon as keyof typeof Ionicons.glyphMap}
          size={18}
          color={item.iconColor || colors.brand.primary}
        />
      </View>

      {/* Content */}
      <View style={tw`flex-1`}>
        <Text
          variant="body"
          color="label"
          weight="medium"
          style={{ fontSize: 15 }}
        >
          {item.title}
        </Text>
        {item.subtitle && (
          <Text
            variant="caption1"
            color="secondaryLabel"
            style={{ marginTop: 1 }}
          >
            {item.subtitle}
          </Text>
        )}
      </View>

      {/* Right element or chevron */}
      {item.rightElement || (item.showChevron && (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.system.label.tertiary}
        />
      ))}
    </TouchableOpacity>
  );

  const renderSection = (title: string, items: MenuItem[], delay: number) => {
    if (items.length === 0) return null;
    
    return (
      <Animated.View
        entering={FadeInDown.delay(delay).duration(400)}
        style={tw`mb-6`}
      >
        <Text
          variant="footnote"
          color="secondaryLabel"
          weight="semibold"
          style={{ 
            marginBottom: designTokens.spacing.sm,
            marginLeft: designTokens.spacing.xs,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {title}
        </Text>
        <View
          style={[
            tw`rounded-2xl overflow-hidden`,
            { backgroundColor: colors.system.background.secondary },
          ]}
        >
          {items.map((item, index) => renderMenuItem(item, index === items.length - 1))}
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView
      style={[
        tw`flex-1`,
        { backgroundColor: colors.system.background.primary },
      ]}
    >
      <ScrollView
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
        accessibilityLabel="Profile content"
      >
        {/* Header with Greeting */}
        <Animated.View 
          entering={FadeIn.duration(400)}
          style={tw`px-5 pt-2 pb-4`}
        >
          <Text
            variant="caption1"
            color="secondaryLabel"
            style={{ marginBottom: 2 }}
          >
            {getGreeting()}
          </Text>
          <Text
            variant="title1"
            color="label"
            weight="bold"
          >
            {isAuthenticated && user ? user.username : "Guest"}
          </Text>
        </Animated.View>

        {/* Profile Card */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={tw`px-5 mb-6`}
        >
          <View
            style={[
              tw`rounded-3xl p-5`,
              {
                backgroundColor: colors.system.background.secondary,
                shadowColor: colors.system.label.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 16,
                elevation: 8,
              },
            ]}
          >
            <View style={tw`flex-row items-center`}>
              {/* Avatar */}
              <View
                style={[
                  tw`w-16 h-16 rounded-2xl items-center justify-center`,
                  { 
                    backgroundColor: colors.brand.primary,
                    shadowColor: colors.brand.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4,
                  },
                ]}
              >
                {isAuthenticated && user?.username ? (
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: '700',
                      color: colors.fixed.black,
                    }}
                  >
                    {user.username.substring(0, 2).toUpperCase()}
                  </Text>
                ) : (
                  <Ionicons
                    name="person"
                    size={28}
                    color={colors.fixed.black}
                  />
                )}
              </View>

              {/* User Info */}
              <View style={tw`flex-1 ml-4`}>
                <Text
                  variant="headline"
                  color="label"
                  weight="bold"
                  style={{ marginBottom: 2 }}
                >
                  {isAuthenticated && user ? user.username : "Guest User"}
                </Text>
                {isAuthenticated && user?.email ? (
                  <Text variant="subheadline" color="secondaryLabel">
                    {user.email}
                  </Text>
                ) : (
                  <Text variant="subheadline" color="secondaryLabel">
                    Sign in to sync your data
                  </Text>
                )}
              </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={[
                tw`mt-4 py-3 rounded-xl items-center justify-center`,
                {
                  backgroundColor: isAuthenticated
                    ? colors.system.fill.tertiary
                    : colors.brand.primary,
                },
              ]}
              onPress={isAuthenticated ? handleSignOut : handleSignIn}
              activeOpacity={0.8}
              accessibilityLabel={isAuthenticated ? "Sign out" : "Sign in"}
              accessibilityRole="button"
            >
              <View style={tw`flex-row items-center`}>
                <Ionicons
                  name={isAuthenticated ? "log-out-outline" : "log-in-outline"}
                  size={18}
                  color={isAuthenticated ? colors.semantic.red : colors.fixed.black}
                  style={{ marginRight: 6 }}
                />
                <Text
                  variant="subheadline"
                  weight="semibold"
                  style={{
                    color: isAuthenticated ? colors.semantic.red : colors.fixed.black,
                  }}
                >
                  {isAuthenticated ? "Sign Out" : "Sign In"}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Menu Sections */}
        <View style={tw`px-5`}>
          {renderSection("Account", accountItems, 200)}
          {renderSection("Preferences", settingsItems, 300)}
          {renderSection("Support", supportItems, 400)}
          {renderSection("Developer", debugItems, 500)}
        </View>

        {/* App Branding Footer */}
        <Animated.View
          entering={FadeInDown.delay(600).duration(400)}
          style={tw`items-center mt-4 mb-8`}
        >
          <View
            style={[
              tw`w-12 h-12 rounded-xl items-center justify-center mb-3`,
              { backgroundColor: colors.brand.primary },
            ]}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: colors.fixed.black,
              }}
            >
              DN
            </Text>
          </View>
          <Text variant="footnote" color="tertiaryLabel">
            dawahnigeria
          </Text>
          <Text
            variant="caption2"
            color="tertiaryLabel"
            style={{ marginTop: 2 }}
          >
            Reviving the Ummah byte by byte
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default function ProfileScreenWithBoundary() {
  return (
    <ErrorBoundary>
      <ProfileScreen />
    </ErrorBoundary>
  );
}
