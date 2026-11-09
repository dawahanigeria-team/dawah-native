import Ionicons from "@expo/vector-icons/Ionicons";
import { AppMark } from "../src/components/atoms/AppMark";
import { SocialSignIn } from "../src/components/molecules/SocialSignIn";
import { statusCodes } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { ScreenHeader } from "../src/components/molecules";
import { useTheme } from "../src/hooks/useTheme";
import { addSentryBreadcrumb, captureSentryException } from "../src/services/config/sentry.config";
import { ensureGoogleSigninConfigured, signInWithGoogle } from "../src/services/googleSignIn.service";
import { useAuthStore } from "../src/stores";
import tw from "../src/theme/twrnc";
import { boxShadow } from "../src/utils/shadow";
import { toUserFacingError } from "../src/utils/userFacingError";

const plainAuthMessage = (err: unknown, fallback: string): string => {
  const { kind, message } = toUserFacingError(err, fallback);
  return kind === "credentials" ? fallback : message;
};

export default function SignUpScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const returnToRoute = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  const { colors } = useTheme();
  const { register, socialLogin, isLoading, error, clearError } = useAuthStore();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [usernameFocused, setUsernameFocused] = useState(false);
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
        component: "SignUpScreen",
        action: "configureGoogleSignIn",
        level: "warning",
      });
    }
  }, []);

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

  const handleSignUp = async () => {
    clearError();

    const isUsernameValid = validateUsername(username);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isUsernameValid || !isEmailValid || !isPasswordValid) {
      return;
    }

    try {
      await register({
        username,
        email,
        password,
      });
      router.replace((returnToRoute || '/(tabs)') as any);
    } catch (err: unknown) {
      const error = err as Error;
      captureSentryException(error, {
        component: 'SignUpScreen',
        action: 'handleSignUp',
        level: 'warning',
      });

      addSentryBreadcrumb('Sign up failed', 'error', {
        error: error.message,
        email: email,
        username: username,
      });

      Alert.alert(
        "Sign Up Failed",
        plainAuthMessage(error, "Unable to create account. Please try again."),
        [{ text: "OK" }]
      );
    }
  };

  const handleSignIn = () => {
    router.back();
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

      router.replace((returnToRoute || "/") as any);
    } catch (err: unknown) {
      const error = err as Error & { code?: string };
      if (error.code === "ERR_REQUEST_CANCELED") {
        return;
      }
      captureSentryException(error, {
        component: "SignUpScreen",
        action: "handleAppleSignIn",
        level: "warning",
      });
      Alert.alert(
        "Apple Sign In Failed",
        plainAuthMessage(error, "Unable to sign in with Apple. Please try again."),
        [{ text: "OK" }]
      );
    }
  };

  const handleGoogleSignIn = async () => {
    clearError();
    try {
      const credentials = await signInWithGoogle();
      if (!credentials) return;
      await socialLogin({ provider: "google", ...credentials });

      router.replace((returnToRoute || "/") as any);
    } catch (err: unknown) {
      const error = err as Error & { code?: string };
      if (
        error.code === statusCodes.SIGN_IN_CANCELLED ||
        error.code === "SIGN_IN_CANCELLED"
      ) {
        return;
      }
      captureSentryException(error, {
        component: "SignUpScreen",
        action: "handleGoogleSignIn",
        level: "warning",
      });
      Alert.alert(
        "Google Sign In Failed",
        plainAuthMessage(error, "Unable to sign in with Google. Please try again."),
        [{ text: "OK" }]
      );
    }
  };

  const getInputBorderColor = (hasError: boolean, isFocused: boolean) => {
    if (hasError) return colors.semantic.red;
    if (isFocused) return colors.brand.primary;
    return "transparent";
  };

  const renderInput = (
    label: string,
    icon: string,
    value: string,
    setValue: (text: string) => void,
    error: string,
    validate: (text: string) => boolean,
    focused: boolean,
    setFocused: (focused: boolean) => void,
    options: {
      placeholder: string;
      secureTextEntry?: boolean;
      showToggle?: boolean;
      showPassword?: boolean;
      setShowPassword?: (show: boolean) => void;
      keyboardType?: 'default' | 'email-address';
      autoComplete?: 'username' | 'email' | 'password' | 'password-new';
      delay: number;
    }
  ) => (
    <View
      style={tw`mb-4`}
    >
      <Text
        variant="subheadline"
        weight="medium"
        color="label"
        style={{ marginBottom: 6 }}
      >
        {label}
      </Text>
      <View
        style={[
          tw`rounded-xl px-4 py-3 flex-row items-center`,
          {
            backgroundColor: colors.system.background.secondary,
            borderWidth: 1.5,
            borderColor: getInputBorderColor(!!error, focused),
          },
        ]}
      >
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={18}
          color={focused ? colors.brand.primary : colors.system.label.tertiary}
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
          placeholder={options.placeholder}
          placeholderTextColor={colors.system.label.tertiary}
          value={value}
          onChangeText={(text) => {
            setValue(text);
            if (error) validate(text);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            validate(value);
          }}
          secureTextEntry={options.secureTextEntry && !options.showPassword}
          keyboardType={options.keyboardType || 'default'}
          autoCapitalize="none"
          autoComplete={options.autoComplete}
          autoCorrect={false}
          editable={!isLoading}
        />
        {options.showToggle && options.setShowPassword && (
          <Pressable
            onPress={() => options.setShowPassword!(!options.showPassword)}
            hitSlop={13}
            accessibilityRole="button"
            accessibilityLabel={options.showPassword ? "Hide password" : "Show password"}
          >
            <Ionicons
              name={options.showPassword ? "eye-off-outline" : "eye-outline"}
              size={18}
              color={colors.system.label.tertiary}
            />
          </Pressable>
        )}
        {!options.showToggle && value.length > 0 && (
          <Pressable
            onPress={() => setValue("")}
            hitSlop={13}
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label.toLowerCase()}`}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={colors.system.label.tertiary}
            />
          </Pressable>
        )}
      </View>
      {error && (
        <Text
          variant="caption1"
          style={{ color: colors.semantic.red, marginTop: 4 }}
        >
          {error}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={[
        tw`flex-1`,
        { backgroundColor: colors.system.background.primary },
      ]}
    >
      <ScreenHeader
        onBack={() => router.back()}
        actions={[{ label: "Not now", accessibilityLabel: "Continue without signing in", onPress: () => router.replace("/(tabs)") }]}
      />
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`px-6 pb-32 pt-2`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={tw`mb-6`}>
            <AppMark size={64} />
            <Text variant="title1" color="label" style={tw`mt-4 mb-2`}>
              Create your free account
            </Text>
            <Text variant="callout" color="secondaryLabel">
              Keep your library, downloads and scholars on every device.
            </Text>
          </View>

          <SocialSignIn
            onApple={() => void handleAppleSignIn()}
            onGoogle={() => void handleGoogleSignIn()}
            disabled={isLoading}
          />

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
                {plainAuthMessage(error, "Unable to create account. Please try again.")}
              </Text>
            </View>
          )}

          {/* Username Input */}
          {renderInput(
            "Username",
            "person-outline",
            username,
            setUsername,
            usernameError,
            validateUsername,
            usernameFocused,
            setUsernameFocused,
            {
              placeholder: "Enter your username",
              autoComplete: "username",
              delay: 200,
            }
          )}

          {/* Email Input */}
          {renderInput(
            "Email Address",
            "mail-outline",
            email,
            setEmail,
            emailError,
            validateEmail,
            emailFocused,
            setEmailFocused,
            {
              placeholder: "Enter your email",
              keyboardType: "email-address",
              autoComplete: "email",
              delay: 250,
            }
          )}

          {/* Password Input */}
          {renderInput(
            "Password",
            "lock-closed-outline",
            password,
            (text) => {
              setPassword(text);
            },
            passwordError,
            validatePassword,
            passwordFocused,
            setPasswordFocused,
            {
              placeholder: "Create a password",
              secureTextEntry: true,
              showToggle: true,
              showPassword: showPassword,
              setShowPassword: setShowPassword,
              autoComplete: "password-new",
              delay: 300,
            }
          )}

          {/* Sign Up Button */}
          <View
            style={tw`mt-2`}
          >
            <TouchableOpacity
              onPress={handleSignUp}
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
                <Loading size="small" color={colors.brand.onPrimary} />
              ) : (
                <Text
                  variant="body"
                  weight="semibold"
                  style={{ color: colors.brand.onPrimary, fontSize: 16 }}
                >
                  Create account
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Sign In Link */}
          <View
            style={tw`flex-row items-center justify-center`}
          >
            <Text variant="subheadline" color="secondaryLabel">
              Already have an account?{" "}
            </Text>
            <Pressable onPress={handleSignIn}>
              <Text
                variant="subheadline"
                weight="semibold"
                style={{ color: colors.brand.primary }}
              >
                Sign In
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
              By creating an account, you agree to our{" "}
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
