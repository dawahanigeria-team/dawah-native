import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
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
import { addSentryBreadcrumb, captureSentryException } from "../src/services/config/sentry.config";
import { useAuthStore } from "../src/stores";
import { designTokens } from "../src/theme/designTokens";
import tw from "../src/theme/twrnc";

export default function SignInScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const returnToRoute = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

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
    if (text.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const handleSignIn = async () => {
    // Clear previous errors
    clearError();

    // Validate inputs
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    try {
      // Use the login credentials provided
      const credentials = {
        email: email, // This will be the {{loginIdentifier}} value
        password: password
      };

      await login(credentials);
      if (returnToRoute) {
        router.replace(returnToRoute as any);
      } else {
        // Navigation will be handled by auth state change
        router.back();
      }
    } catch (err: any) {
      // Log to Sentry
      captureSentryException(err, {
        component: 'SignInScreen',
        action: 'handleSignIn',
        email: email, // Don't log password!
        level: 'warning',
      });

      addSentryBreadcrumb('Sign in failed', 'error', {
        error: err.message,
        email: email,
      });

      Alert.alert(
        "Sign In Failed",
        err.message || "Unable to sign in. Please check your credentials and try again.",
        [{ text: "OK" }]
      );
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      "Forgot Password",
      "Password recovery feature coming soon! Please contact support for assistance.",
      [{ text: "OK" }]
    );
  };

  const handleSignUp = () => {
    router.push("/sign-up");
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
                Welcome Back
              </Text>
              <Text
                variant="body"
                color="secondaryLabel"
                style={{ textAlign: "center" }}
              >
                Sign in to continue to dawahnigeria
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
          <View style={tw`mb-2`}>
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
                placeholder="Enter your password"
                placeholderTextColor={designTokens.colors.system.label.tertiary}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) validatePassword(text);
                }}
                onBlur={() => validatePassword(password)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
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

          {/* Forgot Password */}
          <Pressable onPress={handleForgotPassword} style={tw`mb-8 self-end`}>
            <Text
              variant="subheadline"
              weight="semibold"
              style={{ color: designTokens.colors.brand.primary }}
            >
              Forgot Password?
            </Text>
          </Pressable>

          {/* Sign In Button */}
          <TouchableOpacity
            onPress={handleSignIn}
            disabled={isLoading}
            activeOpacity={0.8}
            style={[
              tw`rounded-full py-4 items-center justify-center mb-4`,
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
                Sign In
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

          {/* Social Sign In Buttons */}
          <View style={tw`flex-row gap-4 mb-6`}>
            {/* Google Sign In */}
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  "Google Sign In",
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

            {/* Apple Sign In */}
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  "Apple Sign In",
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

          {/* Sign Up Link */}
          <View style={tw`flex-row items-center justify-center`}>
            <Text variant="body" color="secondaryLabel">
              Don&apos;t have an account?{" "}
            </Text>
            <Pressable onPress={handleSignUp}>
              <Text
                variant="body"
                weight="semibold"
                style={{ color: designTokens.colors.brand.primary }}
              >
                Sign Up
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
              By signing in, you agree to our{" "}
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
