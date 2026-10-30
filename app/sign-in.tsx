import Ionicons from "@expo/vector-icons/Ionicons";
import { statusCodes } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
import { ENV } from "../src/config/env";
import { useTheme } from "../src/hooks/useTheme";
import { addSentryBreadcrumb, captureSentryException } from "../src/services/config/sentry.config";
import { ensureGoogleSigninConfigured, signInWithGoogle } from "../src/services/googleSignIn.service";
import { useAuthStore } from "../src/stores";
import tw from "../src/theme/twrnc";
import { boxShadow } from "../src/utils/shadow";
import { toUserFacingError } from "../src/utils/userFacingError";

export default function SignInScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const returnToRoute = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  const { login, socialLogin, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  useEffect(() => {
    if (!ENV.GOOGLE_WEB_CLIENT_ID) {
      return;
    }

    try {
      ensureGoogleSigninConfigured();
    } catch (error) {
      captureSentryException(error as Error, {
        component: "SignInScreen",
        action: "configureGoogleSignIn",
        level: "warning",
      });
    }
  }, []);

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

  const handleBack = () => {
    let canGoBack = false;
    try {
      canGoBack = navigation.canGoBack();
    } catch {
      canGoBack = false;
    }

    if (canGoBack) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const showAuthFailure = (title: string, err: unknown, fallback: string, retry: () => void) => {
    const { kind, message } = toUserFacingError(err, fallback);
    const buttons =
      kind === "network" || kind === "server"
        ? [{ text: "Not now", style: "cancel" as const }, { text: "Try again", onPress: retry }]
        : kind === "credentials"
          ? [{ text: "OK" }, { text: "Reset password", onPress: () => router.push("/forgot-password") }]
          : [{ text: "OK" }];
    Alert.alert(title, message, buttons);
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
        router.replace(returnToRoute as any);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: unknown) {
      const error = err as Error;
      captureSentryException(error, {
        component: 'SignInScreen',
        action: 'handleSignIn',
        level: 'warning',
      });

      addSentryBreadcrumb('Sign in failed', 'error', {
        error: error.message,
        email: email,
      });

      showAuthFailure(
        "Sign In Failed",
        error,
        "Unable to sign in. Please check your email and password and try again.",
        handleSignIn,
      );
    }
  };

  const handleAppleSignIn = async () => {
    clearError();
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("No identity token received from Apple");
      }

      const fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName]
            .filter(Boolean)
            .join(" ")
        : null;

      await socialLogin({
        provider: "apple",
        identityToken: credential.identityToken,
        email: credential.email,
        fullName: fullName || null,
      });

      if (returnToRoute) {
        router.replace(returnToRoute as any);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: unknown) {
      const error = err as Error & { code?: string };
      if (error.code === "ERR_REQUEST_CANCELED") {
        return;
      }
      captureSentryException(error, {
        component: "SignInScreen",
        action: "handleAppleSignIn",
        level: "warning",
      });
      showAuthFailure(
        "Apple Sign In Failed",
        error,
        "Unable to sign in with Apple. Please try again.",
        handleAppleSignIn,
      );
    }
  };

  const handleGoogleSignIn = async () => {
    clearError();
    try {
      const credentials = await signInWithGoogle();
      if (!credentials) return;
      await socialLogin({ provider: "google", ...credentials });

      if (returnToRoute) {
        router.replace(returnToRoute as any);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: unknown) {
      const error = err as Error & { code?: string };
      if (
        error.code === statusCodes.SIGN_IN_CANCELLED ||
        error.code === "SIGN_IN_CANCELLED"
      ) {
        return;
      }
      captureSentryException(error, {
        component: "SignInScreen",
        action: "handleGoogleSignIn",
        level: "warning",
      });
      showAuthFailure(
        "Google Sign In Failed",
        error,
        "Unable to sign in with Google. Please try again.",
        handleGoogleSignIn,
      );
    }
  };

  const handleForgotPassword = () => {
    router.push("/forgot-password");
  };

  const handleSignUp = () => {
    router.push({
      pathname: "/sign-up",
      params: returnToRoute ? { returnTo: returnToRoute } : {},
    });
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
          <View>
            <Pressable
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
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
          </View>

          {/* Logo/Brand */}
          <View
            style={tw`items-center mb-8`}
          >
            <View
              style={[
                tw`w-16 h-16 rounded-2xl items-center justify-center mb-4`,
                { 
                  backgroundColor: colors.brand.primary,
                  // elevation 4 folded in: boxShadow renders on both platforms.
                  boxShadow: boxShadow(colors.brand.primary, 0.3, 8, 4, 0),
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
          </View>

          {/* Error Alert */}
          {error && (
            <View
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
            </View>
          )}

          {/* Email Input */}
          <View
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
                <Pressable
                  onPress={() => setEmail("")}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Clear email"
                >
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
          </View>

          {/* Password Input */}
          <View
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
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
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
          </View>

          {/* Forgot Password */}
          <View>
            <Pressable onPress={handleForgotPassword} style={tw`mb-6 self-end py-1`}>
              <Text
                variant="subheadline"
                weight="semibold"
                style={{ color: colors.brand.primary }}
              >
                Forgot Password?
              </Text>
            </Pressable>
          </View>

          {/* Sign In Button */}
          <View>
            <TouchableOpacity
              onPress={handleSignIn}
              disabled={isLoading}
              activeOpacity={0.8}
              style={[
                tw`rounded-xl py-4 items-center justify-center mb-5`,
                {
                  backgroundColor: colors.brand.primary,
                  opacity: isLoading ? 0.7 : 1,
                  // elevation 4 folded in: boxShadow renders on both platforms.
                  boxShadow: boxShadow(colors.brand.primary, 0.3, 8, 4, 0),
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
          </View>

          {/* Divider */}
          <View
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
          </View>

          {/* Social Sign In Buttons */}
          <View
            style={tw`flex-row gap-3 mb-6`}
          >
            {/* Google Sign In */}
            <TouchableOpacity
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              style={[
                tw`flex-1 py-3 rounded-xl flex-row items-center justify-center`,
                {
                  backgroundColor: colors.system.background.secondary,
                  borderWidth: 1,
                  borderColor: colors.system.separator.primary,
                  opacity: isLoading ? 0.7 : 1,
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
            {Platform.OS === "ios" && (
              <TouchableOpacity
                onPress={handleAppleSignIn}
                disabled={isLoading}
                style={[
                  tw`flex-1 py-3 rounded-xl flex-row items-center justify-center`,
                  {
                    backgroundColor: colors.system.background.secondary,
                    borderWidth: 1,
                    borderColor: colors.system.separator.primary,
                    opacity: isLoading ? 0.7 : 1,
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
            )}
          </View>

          {/* Sign Up Link */}
          <View
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
          </View>

          {/* Terms & Privacy */}
          <View
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
