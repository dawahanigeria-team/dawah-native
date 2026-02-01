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
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Loading, Text } from "../src/components/atoms";
import { useTheme } from "../src/hooks/useTheme";
import { addSentryBreadcrumb, captureSentryException } from "../src/services/config/sentry.config";
import { useAuthStore } from "../src/stores";
import tw from "../src/theme/twrnc";

export default function SignInScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const returnToRoute = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

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
    clearError();

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    try {
      const credentials = {
        email: email,
        password: password
      };

      await login(credentials);
      if (returnToRoute) {
        router.replace(returnToRoute as `/${string}`);
      } else {
        router.back();
      }
    } catch (err: unknown) {
      const error = err as Error;
      captureSentryException(error, {
        component: 'SignInScreen',
        action: 'handleSignIn',
        email: email,
        level: 'warning',
      });

      addSentryBreadcrumb('Sign in failed', 'error', {
        error: error.message,
        email: email,
      });

      Alert.alert(
        "Sign In Failed",
        error.message || "Unable to sign in. Please check your credentials and try again.",
        [{ text: "OK" }]
      );
    }
  };

  const handleForgotPassword = () => {
    router.push("/forgot-password");
  };

  const handleSignUp = () => {
    router.push("/sign-up");
  };

  const getInputBorderColor = (hasError: boolean, isFocused: boolean) => {
    if (hasError) return colors.semantic.red;
    if (isFocused) return colors.brand.primary;
    return "transparent";
  };

  return (
    <SafeAreaView
      style={[
        tw`flex-1`,
        { backgroundColor: colors.system.background.primary },
      ]}
    >
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`px-6 py-6 pb-32`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <Animated.View entering={FadeIn.duration(300)}>
            <Pressable
              onPress={() => router.back()}
              style={[
                tw`mb-6 self-start p-2 -ml-2 rounded-full`,
                { backgroundColor: colors.system.fill.tertiary },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={colors.system.label.primary}
              />
            </Pressable>
          </Animated.View>

          {/* Logo/Brand */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
            style={tw`items-center mb-8`}
          >
            <View
              style={[
                tw`w-16 h-16 rounded-2xl items-center justify-center mb-4`,
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
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '700',
                  color: colors.fixed.black,
                }}
              >
                DN
              </Text>
            </View>
            <Text
              variant="title1"
              weight="bold"
              color="label"
              style={{ textAlign: "center", marginBottom: 6 }}
            >
              Marhaban!
            </Text>
            <Text
              variant="subheadline"
              color="secondaryLabel"
              style={{ textAlign: "center" }}
            >
              Sign in to continue to dawahnigeria
            </Text>
          </Animated.View>

          {/* Error Alert */}
          {error && (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[
                tw`rounded-xl p-3 mb-5 flex-row items-center`,
                { backgroundColor: `${colors.semantic.red}15` },
              ]}
            >
              <Ionicons
                name="alert-circle"
                size={18}
                color={colors.semantic.red}
                style={tw`mr-2`}
              />
              <Text
                variant="subheadline"
                style={{ color: colors.semantic.red, flex: 1 }}
              >
                {error}
              </Text>
            </Animated.View>
          )}

          {/* Email Input */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(400)}
            style={tw`mb-4`}
          >
            <Text
              variant="subheadline"
              weight="medium"
              color="label"
              style={{ marginBottom: 6 }}
            >
              Email Address
            </Text>
            <View
              style={[
                tw`rounded-xl px-4 py-3 flex-row items-center`,
                {
                  backgroundColor: colors.system.background.secondary,
                  borderWidth: 1.5,
                  borderColor: getInputBorderColor(!!emailError, emailFocused),
                },
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={emailFocused ? colors.brand.primary : colors.system.label.tertiary}
                style={tw`mr-3`}
              />
              <TextInput
                style={[
                  tw`flex-1`,
                  {
                    color: colors.system.label.primary,
                    fontSize: 16,
                    paddingVertical: 0,
                  },
                ]}
                placeholder="Enter your email"
                placeholderTextColor={colors.system.label.tertiary}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) validateEmail(text);
                }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => {
                  setEmailFocused(false);
                  validateEmail(email);
                }}
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
                    size={18}
                    color={colors.system.label.tertiary}
                  />
                </Pressable>
              )}
            </View>
            {emailError && (
              <Text
                variant="caption1"
                style={{ color: colors.semantic.red, marginTop: 4 }}
              >
                {emailError}
              </Text>
            )}
          </Animated.View>

          {/* Password Input */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(400)}
            style={tw`mb-2`}
          >
            <Text
              variant="subheadline"
              weight="medium"
              color="label"
              style={{ marginBottom: 6 }}
            >
              Password
            </Text>
            <View
              style={[
                tw`rounded-xl px-4 py-3 flex-row items-center`,
                {
                  backgroundColor: colors.system.background.secondary,
                  borderWidth: 1.5,
                  borderColor: getInputBorderColor(!!passwordError, passwordFocused),
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={passwordFocused ? colors.brand.primary : colors.system.label.tertiary}
                style={tw`mr-3`}
              />
              <TextInput
                style={[
                  tw`flex-1`,
                  {
                    color: colors.system.label.primary,
                    fontSize: 16,
                    paddingVertical: 0,
                  },
                ]}
                placeholder="Enter your password"
                placeholderTextColor={colors.system.label.tertiary}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) validatePassword(text);
                }}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => {
                  setPasswordFocused(false);
                  validatePassword(password);
                }}
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
                  size={18}
                  color={colors.system.label.tertiary}
                />
              </Pressable>
            </View>
            {passwordError && (
              <Text
                variant="caption1"
                style={{ color: colors.semantic.red, marginTop: 4 }}
              >
                {passwordError}
              </Text>
            )}
          </Animated.View>

          {/* Forgot Password */}
          <Animated.View entering={FadeInDown.delay(350).duration(400)}>
            <Pressable onPress={handleForgotPassword} style={tw`mb-6 self-end py-1`}>
              <Text
                variant="subheadline"
                weight="semibold"
                style={{ color: colors.brand.primary }}
              >
                Forgot Password?
              </Text>
            </Pressable>
          </Animated.View>

          {/* Sign In Button */}
          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <TouchableOpacity
              onPress={handleSignIn}
              disabled={isLoading}
              activeOpacity={0.8}
              style={[
                tw`rounded-xl py-4 items-center justify-center mb-5`,
                {
                  backgroundColor: colors.brand.primary,
                  opacity: isLoading ? 0.7 : 1,
                  shadowColor: colors.brand.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                },
              ]}
            >
              {isLoading ? (
                <Loading size="small" color={colors.fixed.black} />
              ) : (
                <Text
                  variant="body"
                  weight="semibold"
                  style={{ color: colors.fixed.black, fontSize: 16 }}
                >
                  Sign In
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Divider */}
          <Animated.View
            entering={FadeInDown.delay(450).duration(400)}
            style={tw`flex-row items-center my-5`}
          >
            <View
              style={[
                tw`flex-1 h-px`,
                { backgroundColor: colors.system.separator.primary },
              ]}
            />
            <Text
              variant="caption1"
              color="tertiaryLabel"
              style={{ marginHorizontal: 12 }}
            >
              or continue with
            </Text>
            <View
              style={[
                tw`flex-1 h-px`,
                { backgroundColor: colors.system.separator.primary },
              ]}
            />
          </Animated.View>

          {/* Social Sign In Buttons */}
          <Animated.View
            entering={FadeInDown.delay(500).duration(400)}
            style={tw`flex-row gap-3 mb-6`}
          >
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
                tw`flex-1 py-3 rounded-xl flex-row items-center justify-center`,
                {
                  backgroundColor: colors.system.background.secondary,
                  borderWidth: 1,
                  borderColor: colors.system.separator.primary,
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name="logo-google"
                size={18}
                color={colors.system.label.primary}
                style={{ marginRight: 6 }}
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
                tw`flex-1 py-3 rounded-xl flex-row items-center justify-center`,
                {
                  backgroundColor: colors.system.background.secondary,
                  borderWidth: 1,
                  borderColor: colors.system.separator.primary,
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name="logo-apple"
                size={18}
                color={colors.system.label.primary}
                style={{ marginRight: 6 }}
              />
              <Text variant="subheadline" weight="semibold" color="label">
                Apple
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Sign Up Link */}
          <Animated.View
            entering={FadeInDown.delay(550).duration(400)}
            style={tw`flex-row items-center justify-center`}
          >
            <Text variant="subheadline" color="secondaryLabel">
              Don&apos;t have an account?{" "}
            </Text>
            <Pressable onPress={handleSignUp}>
              <Text
                variant="subheadline"
                weight="semibold"
                style={{ color: colors.brand.primary }}
              >
                Sign Up
              </Text>
            </Pressable>
          </Animated.View>

          {/* Terms & Privacy */}
          <Animated.View
            entering={FadeInDown.delay(600).duration(400)}
            style={tw`mt-8 items-center`}
          >
            <Text
              variant="caption2"
              color="tertiaryLabel"
              style={{ textAlign: "center", lineHeight: 16 }}
            >
              By signing in, you agree to our{" "}
              <Text
                variant="caption2"
                style={{ color: colors.brand.primary }}
              >
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text
                variant="caption2"
                style={{ color: colors.brand.primary }}
              >
                Privacy Policy
              </Text>
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
