import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Tabs } from "expo-router";
import { Platform, View } from "react-native";
import { MiniPlayer } from "../../src/components/organisms";
import { designTokens } from "../../src/theme/designTokens";

export default function TabLayout() {
  const handleTabPress = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: designTokens.colors.brand.primary,
          tabBarInactiveTintColor: designTokens.colors.system.label.tertiary,
          tabBarStyle: {
            backgroundColor: designTokens.colors.system.background.secondary,
            borderTopColor: designTokens.colors.system.separator.primary,
            borderTopWidth: 0.5, // iOS standard separator width
            height: Platform.OS === "ios" ? 83 : 84, // iOS standard tab bar height
            paddingBottom: Platform.OS === "ios" ? 20 : 16,
            paddingTop: 8,
            // Add translucent effect for iOS
            ...(Platform.OS === "ios" && {
              backgroundColor: "rgba(28, 28, 30, 0.95)", // Semi-transparent
              backdropFilter: "blur(20px)", // iOS blur effect
            }),
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
            tabBarIcon: ({ color, size, focused }) => (
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
          name="search"
          options={{
            title: "Search",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name="search" size={focused ? 26 : 24} color={color} />
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
            tabBarIcon: ({ color, size, focused }) => (
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
            tabBarIcon: ({ color, size, focused }) => (
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

      {/* Mini Player - positioned above tab bar */}
      <MiniPlayer />
    </View>
  );
}
