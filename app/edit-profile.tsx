import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "../src/components/atoms";
import { ScreenHeader } from "../src/components/molecules/ScreenHeader";
import { useAuthStore } from "../src/stores";
import { useTheme } from "../src/hooks/useTheme";
import tw from "../src/theme/twrnc";

const EditProfileScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, isLoading, updateProfile } = useAuthStore();

  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");

  const hasChanges =
    username.trim() !== (user?.username || "") ||
    email.trim() !== (user?.email || "");

  const handleSave = async () => {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUsername) {
      Alert.alert("Validation Error", "Username cannot be empty.");
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      Alert.alert("Validation Error", "Please enter a valid email address.");
      return;
    }

    try {
      const updates: { username?: string; email?: string } = {};
      if (trimmedUsername !== user?.username) updates.username = trimmedUsername;
      if (trimmedEmail !== user?.email) updates.email = trimmedEmail;

      await updateProfile(updates);
      Alert.alert("Success", "Your profile has been updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      const message =
        error?.message || "Failed to update profile. Please try again.";
      Alert.alert("Error", message);
    }
  };

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[
        tw`flex-1`,
        { backgroundColor: colors.system.background.primary },
      ]}
    >
      <ScreenHeader
        title="Edit Profile"
        actions={[
          {
            label: "Save",
            accessibilityLabel: "Save profile",
            onPress: handleSave,
            disabled: !hasChanges || isLoading,
          },
        ]}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={tw`flex-1`}
      >
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`px-4 pb-8`}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={tw`items-center mt-4 mb-8`}>
            <View
              style={[
                tw`w-20 h-20 rounded-full items-center justify-center`,
                { backgroundColor: colors.brand.primary },
              ]}
            >
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: "700",
                  color: colors.brand.onPrimary,
                }}
              >
                {(user?.username || "G").substring(0, 2).toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Username Field */}
          <View style={tw`mb-6`}>
            <Text
              style={[
                tw`text-sm font-medium mb-2 ml-1`,
                { color: colors.system.label.secondary },
              ]}
            >
              Username
            </Text>
            <View
              style={[
                tw`rounded-xl px-4 py-3`,
                {
                  backgroundColor: colors.system.background.secondary,
                  borderWidth: 1,
                  borderColor: colors.system.separator.primary,
                },
              ]}
            >
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username"
                placeholderTextColor={colors.system.label.tertiary}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                style={[
                  tw`text-base`,
                  { color: colors.system.label.primary },
                ]}
                accessibilityLabel="Username"
              />
            </View>
          </View>

          {/* Email Field */}
          <View style={tw`mb-6`}>
            <Text
              style={[
                tw`text-sm font-medium mb-2 ml-1`,
                { color: colors.system.label.secondary },
              ]}
            >
              Email
            </Text>
            <View
              style={[
                tw`rounded-xl px-4 py-3`,
                {
                  backgroundColor: colors.system.background.secondary,
                  borderWidth: 1,
                  borderColor: colors.system.separator.primary,
                },
              ]}
            >
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={colors.system.label.tertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                style={[
                  tw`text-base`,
                  { color: colors.system.label.primary },
                ]}
                accessibilityLabel="Email address"
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={!hasChanges || isLoading}
            activeOpacity={0.8}
            accessibilityLabel="Save changes"
            accessibilityRole="button"
            style={[
              tw`mt-4 py-4 rounded-xl items-center justify-center`,
              {
                backgroundColor: hasChanges && !isLoading
                  ? colors.brand.primary
                  : colors.system.fill.tertiary,
              },
            ]}
          >
            <Text
              style={{
                color: hasChanges && !isLoading
                  ? colors.brand.onPrimary
                  : colors.system.label.tertiary,
                fontWeight: "600",
                fontSize: 16,
              }}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default EditProfileScreen;
