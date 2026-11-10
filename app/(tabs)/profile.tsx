import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { AppMark } from "../../src/components/atoms/AppMark";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useGuardedPush } from "../../src/navigation/useGuardedPush";
import React from "react";
import { Alert, Linking, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../../src/components/atoms";
import { ErrorBoundary } from "../../src/components/atoms/ErrorBoundary";
import { ScreenHeader } from "../../src/components/molecules/ScreenHeader";
import { addSentryBreadcrumb, captureSentryException } from "../../src/services/config/sentry.config";
import { userService } from "../../src/services/user.service";
import { useAuthStore } from "../../src/stores";
import { usePremiumStore } from "../../src/stores/premiumStore";
import { useTheme } from "../../src/hooks/useTheme";
import { designTokens } from "../../src/theme/designTokens";
import tw from "../../src/theme/twrnc";
import { boxShadow } from "../../src/utils/shadow";

interface MenuItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  iconColor?: string;
  onPress: () => void;
  showChevron?: boolean;
  rightElement?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}

const ProfileScreen = () => {
  const router = useRouter();
  const guardedPush = useGuardedPush();
  const { colors, isDark, setTheme } = useTheme();
  const { user, isAuthenticated, logout, deleteAccount } = useAuthStore();
  const { plan, subscription_status } = usePremiumStore();
  const [isDeletingAccount, setIsDeletingAccount] = React.useState(false);

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

  const getDeleteAccountErrorMessage = (error: unknown) => {
    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof (error as { statusCode?: unknown }).statusCode === "number"
        ? (error as { statusCode: number }).statusCode
        : undefined;

    switch (statusCode) {
      case 400:
        return "Delete request was invalid. Please try again.";
      case 401:
        return "Your session is missing or expired. Please sign in and try again.";
      case 403:
        return "Account verification failed. Please contact support if this persists.";
      case 500:
        return "Server failed to delete your account. Please retry.";
      default:
        if (statusCode && statusCode >= 500) {
          return "Server failed to delete your account. Please retry.";
        }

        if (error instanceof Error && error.message) {
          return error.message;
        }

        return "Failed to delete account. Please try again.";
    }
  };

  const handleDeleteAccountConfirm = async () => {
    if (!user?.id || isDeletingAccount) {
      return;
    }

    setIsDeletingAccount(true);
    try {
      addSentryBreadcrumb("User deleting account", "user", {
        userId: user.id,
      });

      await deleteAccount();
      router.replace("/sign-in");
      setTimeout(() => {
        Alert.alert("Success", "Account deleted successfully.");
      }, 300);
    } catch (err: unknown) {
      const error = err as Error;
      captureSentryException(error, {
        component: "ProfileScreen",
        action: "handleDeleteAccountConfirm",
        userId: user.id,
        level: "error",
      });

      Alert.alert("Delete Account Failed", getDeleteAccountErrorMessage(err), [
        { text: "Close", style: "cancel" },
        { text: "Retry", onPress: handleDeleteAccountConfirm },
      ]);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleDeleteAccountPress = () => {
    Alert.alert(
      "Delete Account",
      "This permanently deletes your account and data.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: handleDeleteAccountConfirm,
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

  // Menu items organized by section
  const accountItems: MenuItem[] = isAuthenticated
    ? [
        {
          id: "edit-profile",
          title: "Edit Profile",
          subtitle: "Update your information",
          icon: "person-outline",
          onPress: () => guardedPush("/edit-profile" as any),
          showChevron: true,
        },
        {
          id: "sign-out",
          title: "Sign out",
          icon: "log-out-outline",
          onPress: handleSignOut,
          showChevron: false,
        },
        {
          id: "delete-account",
          title: "Delete Account",
          subtitle: isDeletingAccount
            ? "Deleting your account..."
            : "Permanently delete your account and data",
          icon: "trash-outline",
          iconColor: colors.semantic.red,
          onPress: handleDeleteAccountPress,
          showChevron: false,
          destructive: true,
          disabled: isDeletingAccount,
        },
      ]
    : [];

  const premiumSubtitle = (() => {
    const isPremium = plan !== "free";
    const status = String(subscription_status);
    const isNoteworthyStatus =
      status !== "none" && status !== "inactive" && status !== "active";
    if (!isPremium) {
      return "Free";
    }
    const planLabel = "DN Supporter";
    return isNoteworthyStatus
      ? `${planLabel} · ${status.replace(/_/g, " ")}`
      : planLabel;
  })();

  const settingsItems: MenuItem[] = [
    {
      id: "listening-preferences",
      title: "Listening Preferences",
      subtitle: "Choose your languages and scholars",
      icon: "options-outline",
      iconColor: colors.brand.primary,
      onPress: () => guardedPush("/listening-preferences" as any),
      showChevron: true,
    },
    {
      id: "premium",
      title: "DN Supporter",
      subtitle: premiumSubtitle,
      icon: "diamond-outline",
      iconColor: colors.brand.primary,
      onPress: () => guardedPush("/premium" as any),
      showChevron: true,
    },
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
      onPress: () => guardedPush("/notifications"),
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
      onPress: () => Linking.openURL("mailto:support@dawahnigeria.com?subject=Help%20%26%20Support"),
      showChevron: true,
    },
    {
      id: "feedback",
      title: "Send Feedback",
      subtitle: "Help us improve",
      icon: "chatbubble-outline",
      iconColor: colors.semantic.green,
      onPress: () => Linking.openURL("mailto:support@dawahnigeria.com?subject=App%20Feedback"),
      showChevron: true,
    },
    {
      id: "about",
      title: "About",
      subtitle: `Version ${Constants.expoConfig?.version ?? ""}`.trim(),
      icon: "information-circle-outline",
      iconColor: colors.system.label.secondary,
      onPress: () => guardedPush("/about" as any),
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
  ];

  const renderMenuItem = (item: MenuItem, isLast: boolean) => (
    <TouchableOpacity
      key={item.id}
      style={[
        tw`flex-row items-center py-3 px-4`,
        item.disabled && { opacity: 0.6 },
        !isLast && {
          borderBottomWidth: 0.5,
          borderBottomColor: colors.system.separator.primary,
        },
      ]}
      onPress={item.onPress}
      disabled={item.disabled}
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
          color={item.destructive ? "systemRed" : "label"}
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

  const renderSection = (title: string, items: MenuItem[], _delay: number) => {
    if (items.length === 0) return null;
    
    return (
      <View
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
      </View>
    );
  };

  return (
    <SafeAreaView
      edges={["left", "right"]}
      style={[
        tw`flex-1`,
        { backgroundColor: colors.system.background.primary },
      ]}
    >
      <ScreenHeader title="Profile" />
      <ScrollView
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
        accessibilityLabel="Profile content"
      >
        {/* Profile Card */}
        <View
          style={tw`px-5 mb-6`}
        >
          <View
            style={[
              tw`rounded-3xl p-5`,
              {
                backgroundColor: colors.system.background.secondary,
                // elevation 8 folded in: boxShadow renders on both platforms.
                boxShadow: boxShadow(colors.system.label.primary, 0.08, 16, 4, 0),
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
                    // elevation 4 folded in: boxShadow renders on both platforms.
                    boxShadow: boxShadow(colors.brand.primary, 0.3, 8, 4, 0),
                  },
                ]}
              >
                {isAuthenticated && user?.username ? (
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: '700',
                      color: colors.brand.onPrimary,
                    }}
                  >
                    {user.username.substring(0, 2).toUpperCase()}
                  </Text>
                ) : (
                  <Ionicons
                    name="person"
                    size={28}
                    color={colors.brand.onPrimary}
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

            {/* Signed-in users find Sign out in the Account group at the end. */}
            {!isAuthenticated && (
              <TouchableOpacity
                style={[
                  tw`mt-4 py-3 rounded-full items-center justify-center flex-row`,
                  { backgroundColor: colors.brand.primary, minHeight: 48 },
                ]}
                onPress={handleSignIn}
                activeOpacity={0.8}
                accessibilityLabel="Sign in"
                accessibilityRole="button"
              >
                <Ionicons
                  name="log-in-outline"
                  size={18}
                  color={colors.brand.onPrimary}
                  style={{ marginRight: 6 }}
                />
                <Text variant="subheadline" weight="semibold" style={{ color: colors.brand.onPrimary }}>
                  Sign in
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {plan === "free" && (
          <TouchableOpacity
            onPress={() => guardedPush("/premium" as any)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Become a DN Supporter. Keep knowledge free for everyone."
            style={tw`px-5 mb-6`}
          >
            <LinearGradient
              colors={["#0F4A3C", "#1F6B3E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={tw`rounded-2xl p-4 flex-row items-center`}
            >
              <View style={tw`flex-1`}>
                <Text variant="title3" style={{ color: "#FFFFFF" }}>
                  Become a DN Supporter
                </Text>
                <Text variant="footnote" style={{ color: "#E3EDDD", marginTop: 2 }}>
                  Keep knowledge free for everyone.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Menu Sections */}
        <View style={tw`px-5`}>
          {renderSection("Preferences", settingsItems, 300)}
          {renderSection("Support", supportItems, 400)}
          {renderSection("Account", accountItems, 200)}
          {__DEV__ && renderSection("Developer", debugItems, 500)}
        </View>

        {/* App Branding Footer */}
        <View
          style={tw`items-center mt-4 mb-8`}
        >
          <View style={tw`mb-3`}>
            <AppMark size={48} />
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
        </View>
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
