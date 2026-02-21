import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { useRouter } from "expo-router";
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
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { Loading, Text } from "../src/components/atoms";
import { ENV } from "../src/config/env";
import { useTheme } from "../src/hooks/useTheme";
import { addSentryBreadcrumb, captureSentryException } from "../src/services/config/sentry.config";
import { useAuthStore } from "../src/stores";
import tw from "../src/theme/twrnc";

export default function SignUpScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { register, socialLogin, isLoading, error, clearError } = useAuthStore();

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

  const [usernameFocused, setUsernameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  useEffect(() => {
    if (ENV.GOOGLE_WEB_CLIENT_ID) {
      GoogleSignin.configure({
        webClientId: ENV.GOOGLE_WEB_CLIENT_ID,
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
      router.replace('/');
    } catch (err: unknown) {
      const error = err as Error;
      captureSentryException(error, {
        component: 'SignUpScreen',
        action: 'handleSignUp',
        email: email,
        username: username,
        level: 'warning',
      });

      addSentryBreadcrumb('Sign up failed', 'error', {
        error: error.message,
        email: email,
        username: username,
      });

      Alert.alert(
        "Sign Up Failed",
        error.message || "Unable to create account. Please try again.",
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

      router.replace("/");
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
        error.message || "Unable to sign in with Apple. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const handleGoogleSignIn = async () => {
    clearError();
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      const idToken = response.data?.idToken;
      if (!idToken) {
        throw new Error("No ID token received from Google");
      }

      const email = response.data?.user?.email || null;
      const fullName = response.data?.user?.name || null;

      await socialLogin({
        provider: "google",
        identityToken: idToken,
        email,
        fullName,
      });

      router.replace("/");
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
        error.message || "Unable to sign in with Google. Please try again.",
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
    <Animated.View
      entering={FadeInDown.delay(options.delay).duration(400)}
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
            hitSlop={8}
          >
            <Ionicons
              name={options.showPassword ? "eye-off-outline" : "eye-outline"}
              size={18}
              color={colors.system.label.tertiary}
            />
          </Pressable>
        )}
        {!options.showToggle && value.length > 0 && (
          <Pressable onPress={() => setValue("")} hitSlop={8}>
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
    </Animated.View>
  );

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
            style={tw`items-center mb-6`}
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
              Ahlan wa Sahlan!
            </Text>
            <Text
              variant="subheadline"
              color="secondaryLabel"
              style={{ textAlign: "center" }}
            >
              Join dawahnigeria community
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
              if (confirmPassword) validateConfirmPassword(confirmPassword);
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

          {/* Confirm Password Input */}
          {renderInput(
            "Confirm Password",
            "lock-closed-outline",
            confirmPassword,
            setConfirmPassword,
            confirmPasswordError,
            validateConfirmPassword,
            confirmPasswordFocused,
            setConfirmPasswordFocused,
            {
              placeholder: "Confirm your password",
              secureTextEntry: true,
              showToggle: true,
              showPassword: showConfirmPassword,
              setShowPassword: setShowConfirmPassword,
              autoComplete: "password-new",
              delay: 350,
            }
          )}

          {/* Sign Up Button */}
          <Animated.View
            entering={FadeInDown.delay(400).duration(400)}
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
                  Create Account
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

          {/* Social Sign Up Buttons */}
          <Animated.View
            entering={FadeInDown.delay(500).duration(400)}
            style={tw`flex-row gap-3 mb-6`}
          >
            {/* Google Sign Up */}
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

            {/* Apple Sign Up */}
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
          </Animated.View>

          {/* Sign In Link */}
          <Animated.View
            entering={FadeInDown.delay(550).duration(400)}
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
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
