import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Loading, Text } from "../src/components/atoms";
import { useAuthStore } from "../src/stores";
import { designTokens } from "../src/theme/designTokens";
import tw from "../src/theme/twrnc";
import { captureSentryException, addSentryBreadcrumb } from "../src/services/config/sentry.config";

export default function SignUpScreen() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const validateUsername = (text: string): boolean => {
    if (!text) {
      setUsernameError("Username is required");
      return false;
    }
    if (text.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return false;
    }
    setUsernameError("");
    return true;
  };

  const validateEmail = (text: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!text) {
      setEmailError("Email is required");
      return false;
    }
    if (!emailRegex.test(text)) {
      setEmailError("Please enter a valid email");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validatePassword = (text: string): boolean => {
    if (!text) {
      setPasswordError("Password is required");
      return false;
    }
    if (text.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const validateConfirmPassword = (text: string): boolean => {
    if (!text) {
      setConfirmPasswordError("Please confirm your password");
      return false;
    }
    if (text !== password) {
      setConfirmPasswordError("Passwords do not match");
      return false;
    }
    setConfirmPasswordError("");
    return true;
  };

  const handleSignUp = async () => {
    clearError();

    const isUsernameValid = validateUsername(username);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);

    if (!isUsernameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
      return;
    }

    try {
      await register({
        username,
        email,
        password,
      });
      router.back();
    } catch (err: any) {
      // Log to Sentry
      captureSentryException(err, {
        component: 'SignUpScreen',
        action: 'handleSignUp',
        email: email,
        username: username,
        level: 'warning',
      });

      addSentryBreadcrumb('Sign up failed', 'error', {
        error: err.message,
        email: email,
        username: username,
      });

      Alert.alert(
        "Sign Up Failed",
        err.message || "Unable to create account. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const handleSignIn = () => {
    router.back();
  };

  return (
    <SafeAreaView
      style={[
        tw`flex-1`,
        { backgroundColor: designTokens.colors.system.background.primary },
      ]}
    >
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`px-6 py-8 pb-32`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={tw`mb-8`}>
            <Pressable
              onPress={() => router.back()}
              style={tw`mb-6 self-start`}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="chevron-back"
                size={28}
                color={designTokens.colors.system.label.primary}
              />
            </Pressable>

            {/* Logo/Brand */}
            <View style={tw`items-center mb-8`}>
              <View
                style={[
                  tw`w-20 h-20 rounded-3xl items-center justify-center mb-4`,
                  { backgroundColor: designTokens.colors.brand.primary },
                ]}
              >
                <Text
                  style={{
                    fontSize: designTokens.typography.fontSize.largeTitle,
                    fontWeight: designTokens.typography.fontWeight.bold,
                    color: designTokens.colors.system.background.primary,
                  }}
                >
                  DN
                </Text>
              </View>
              <Text
                variant="largeTitle"
                weight="bold"
                color="label"
                style={{ textAlign: "center", marginBottom: 8 }}
              >
                Create Account
              </Text>
              <Text
                variant="body"
                color="secondaryLabel"
                style={{ textAlign: "center" }}
              >
                Join Dawah Nigeria community
              </Text>
            </View>
          </View>

          {/* Error Alert */}
          {error && (
            <View
              style={[
                tw`rounded-2xl p-4 mb-6 flex-row items-start`,
                { backgroundColor: designTokens.colors.system.fill.quaternary },
              ]}
            >
              <Ionicons
                name="alert-circle"
                size={20}
                color={designTokens.colors.semantic.red}
                style={tw`mr-3 mt-0.5`}
              />
              <Text
                variant="subheadline"
                style={{ color: designTokens.colors.semantic.red, flex: 1 }}
              >
                {error}
              </Text>
            </View>
          )}

          {/* Username Input */}
          <View style={tw`mb-4`}>
            <Text
              variant="subheadline"
              weight="semibold"
              color="label"
              style={{ marginBottom: 8 }}
            >
              Username
            </Text>
            <View
              style={[
                tw`rounded-2xl px-4 py-4 flex-row items-center`,
                {
                  backgroundColor:
                    designTokens.colors.system.background.secondary,
                  borderWidth: 2,
                  borderColor: usernameError
                    ? designTokens.colors.semantic.red
                    : "transparent",
                },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color={designTokens.colors.system.label.tertiary}
                style={tw`mr-3`}
              />
              <TextInput
                style={[
                  tw`flex-1`,
                  {
                    color: designTokens.colors.system.label.primary,
                    fontSize: designTokens.typography.fontSize.body,
                  },
                ]}
                placeholder="Enter your username"
                placeholderTextColor={designTokens.colors.system.label.tertiary}
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  if (usernameError) validateUsername(text);
                }}
                onBlur={() => validateUsername(username)}
                autoCapitalize="none"
                autoComplete="username"
                autoCorrect={false}
                editable={!isLoading}
              />
              {username.length > 0 && (
                <Pressable onPress={() => setUsername("")} hitSlop={8}>
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={designTokens.colors.system.label.tertiary}
                  />
                </Pressable>
              )}
            </View>
            {usernameError && (
              <Text
                variant="caption1"
                style={{ color: designTokens.colors.semantic.red, marginTop: 6 }}
              >
                {usernameError}
              </Text>
            )}
          </View>

          {/* Email Input */}
          <View style={tw`mb-4`}>
            <Text
              variant="subheadline"
              weight="semibold"
              color="label"
              style={{ marginBottom: 8 }}
            >
              Email Address
            </Text>
            <View
              style={[
                tw`rounded-2xl px-4 py-4 flex-row items-center`,
                {
                  backgroundColor:
                    designTokens.colors.system.background.secondary,
                  borderWidth: 2,
                  borderColor: emailError
                    ? designTokens.colors.semantic.red
                    : "transparent",
                },
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color={designTokens.colors.system.label.tertiary}
                style={tw`mr-3`}
              />
              <TextInput
                style={[
                  tw`flex-1`,
                  {
                    color: designTokens.colors.system.label.primary,
                    fontSize: designTokens.typography.fontSize.body,
                  },
                ]}
                placeholder="Enter your email"
                placeholderTextColor={designTokens.colors.system.label.tertiary}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) validateEmail(text);
                }}
                onBlur={() => validateEmail(email)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!isLoading}
              />
              {email.length > 0 && (
                <Pressable onPress={() => setEmail("")} hitSlop={8}>
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={designTokens.colors.system.label.tertiary}
                  />
                </Pressable>
              )}
            </View>
            {emailError && (
              <Text
                variant="caption1"
                style={{ color: designTokens.colors.semantic.red, marginTop: 6 }}
              >
                {emailError}
              </Text>
            )}
          </View>

          {/* Password Input */}
          <View style={tw`mb-4`}>
            <Text
              variant="subheadline"
              weight="semibold"
              color="label"
              style={{ marginBottom: 8 }}
            >
              Password
            </Text>
            <View
              style={[
                tw`rounded-2xl px-4 py-4 flex-row items-center`,
                {
                  backgroundColor:
                    designTokens.colors.system.background.secondary,
                  borderWidth: 2,
                  borderColor: passwordError
                    ? designTokens.colors.semantic.red
                    : "transparent",
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={designTokens.colors.system.label.tertiary}
                style={tw`mr-3`}
              />
              <TextInput
                style={[
                  tw`flex-1`,
                  {
                    color: designTokens.colors.system.label.primary,
                    fontSize: designTokens.typography.fontSize.body,
                  },
                ]}
                placeholder="Create a password"
                placeholderTextColor={designTokens.colors.system.label.tertiary}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) validatePassword(text);
                  if (confirmPassword) validateConfirmPassword(confirmPassword);
                }}
                onBlur={() => validatePassword(password)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password-new"
                autoCorrect={false}
                editable={!isLoading}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={8}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={designTokens.colors.system.label.tertiary}
                />
              </Pressable>
            </View>
            {passwordError && (
              <Text
                variant="caption1"
                style={{ color: designTokens.colors.semantic.red, marginTop: 6 }}
              >
                {passwordError}
              </Text>
            )}
          </View>

          {/* Confirm Password Input */}
          <View style={tw`mb-6`}>
            <Text
              variant="subheadline"
              weight="semibold"
              color="label"
              style={{ marginBottom: 8 }}
            >
              Confirm Password
            </Text>
            <View
              style={[
                tw`rounded-2xl px-4 py-4 flex-row items-center`,
                {
                  backgroundColor:
                    designTokens.colors.system.background.secondary,
                  borderWidth: 2,
                  borderColor: confirmPasswordError
                    ? designTokens.colors.semantic.red
                    : "transparent",
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={designTokens.colors.system.label.tertiary}
                style={tw`mr-3`}
              />
              <TextInput
                style={[
                  tw`flex-1`,
                  {
                    color: designTokens.colors.system.label.primary,
                    fontSize: designTokens.typography.fontSize.body,
                  },
                ]}
                placeholder="Confirm your password"
                placeholderTextColor={designTokens.colors.system.label.tertiary}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (confirmPasswordError) validateConfirmPassword(text);
                }}
                onBlur={() => validateConfirmPassword(confirmPassword)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoComplete="password-new"
                autoCorrect={false}
                editable={!isLoading}
              />
              <Pressable
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={8}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={designTokens.colors.system.label.tertiary}
                />
              </Pressable>
            </View>
            {confirmPasswordError && (
              <Text
                variant="caption1"
                style={{ color: designTokens.colors.semantic.red, marginTop: 6 }}
              >
                {confirmPasswordError}
              </Text>
            )}
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            onPress={handleSignUp}
            disabled={isLoading}
            activeOpacity={0.8}
            style={[
              tw`rounded-full py-4 items-center justify-center mb-6`,
              {
                backgroundColor: designTokens.colors.brand.primary,
                opacity: isLoading ? 0.6 : 1,
              },
            ]}
          >
            {isLoading ? (
              <Loading size="small" color={designTokens.colors.system.background.primary} />
            ) : (
              <Text
                variant="headline"
                weight="semibold"
                style={{ color: designTokens.colors.system.background.primary }}
              >
                Create Account
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={tw`flex-row items-center my-6`}>
            <View
              style={[
                tw`flex-1 h-px`,
                { backgroundColor: designTokens.colors.system.separator.primary },
              ]}
            />
            <Text
              variant="subheadline"
              color="secondaryLabel"
              style={{ marginHorizontal: 16 }}
            >
              or continue with
            </Text>
            <View
              style={[
                tw`flex-1 h-px`,
                { backgroundColor: designTokens.colors.system.separator.primary },
              ]}
            />
          </View>

          {/* Social Sign Up Buttons */}
          <View style={tw`flex-row gap-4 mb-6`}>
            {/* Google Sign Up */}
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  "Google Sign Up",
                  "Google authentication coming soon!",
                  [{ text: "OK" }]
                )
              }
              style={[
                tw`flex-1 py-3 rounded-2xl flex-row items-center justify-center`,
                {
                  backgroundColor:
                    designTokens.colors.system.background.secondary,
                  borderWidth: 1,
                  borderColor: designTokens.colors.system.separator.primary,
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name="logo-google"
                size={20}
                color={designTokens.colors.system.label.primary}
                style={{ marginRight: 8 }}
              />
              <Text variant="subheadline" weight="semibold" color="label">
                Google
              </Text>
            </TouchableOpacity>

            {/* Apple Sign Up */}
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  "Apple Sign Up",
                  "Apple authentication coming soon!",
                  [{ text: "OK" }]
                )
              }
              style={[
                tw`flex-1 py-3 rounded-2xl flex-row items-center justify-center`,
                {
                  backgroundColor:
                    designTokens.colors.system.background.secondary,
                  borderWidth: 1,
                  borderColor: designTokens.colors.system.separator.primary,
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name="logo-apple"
                size={20}
                color={designTokens.colors.system.label.primary}
                style={{ marginRight: 8 }}
              />
              <Text variant="subheadline" weight="semibold" color="label">
                Apple
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sign In Link */}
          <View style={tw`flex-row items-center justify-center`}>
            <Text variant="body" color="secondaryLabel">
              Already have an account?{" "}
            </Text>
            <Pressable onPress={handleSignIn}>
              <Text
                variant="body"
                weight="semibold"
                style={{ color: designTokens.colors.brand.primary }}
              >
                Sign In
              </Text>
            </Pressable>
          </View>

          {/* Terms & Privacy */}
          <View style={tw`mt-8 items-center`}>
            <Text
              variant="caption2"
              color="tertiaryLabel"
              style={{ textAlign: "center", lineHeight: 18 }}
            >
              By creating an account, you agree to our{" "}
              <Text
                variant="caption2"
                style={{ color: designTokens.colors.brand.primary }}
              >
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text
                variant="caption2"
                style={{ color: designTokens.colors.brand.primary }}
              >
                Privacy Policy
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
