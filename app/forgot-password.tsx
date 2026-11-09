import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
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
import { ScreenHeader } from "../src/components/molecules";
import { useTheme } from "../src/hooks/useTheme";
import { requestPasswordReset } from "../src/services/api/passwordReset.api";
import {
  addSentryBreadcrumb,
  captureSentryException,
} from "../src/services/config/sentry.config";
import tw from "../src/theme/twrnc";
import { boxShadow } from "../src/utils/shadow";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleResetPassword = async () => {
    const isEmailValid = validateEmail(email);

    if (!isEmailValid) {
      return;
    }

    try {
      setIsLoading(true);
      addSentryBreadcrumb("Requesting password reset", "user", { email });

      const response = await requestPasswordReset(email);

      if (response.success) {
        addSentryBreadcrumb("Password reset email sent", "info", { email });

        // Navigate to reset password screen with email
        router.push({
          pathname: "/reset-password",
          params: { email: email },
        });
      } else {
        addSentryBreadcrumb("Password reset request failed", "info", {
          error: response.message,
          email: email,
        });

        Alert.alert(
          "Reset Failed",
          response.message ||
            "Unable to send password reset email. Please try again.",
          [{ text: "OK" }]
        );
      }
    } catch (err: unknown) {
      const error = err as Error;
      captureSentryException(error, {
        component: "ForgotPasswordScreen",
        action: "handleResetPassword",
        level: "warning",
      });

      addSentryBreadcrumb("Password reset request failed", "error", {
        error: error.message,
        email: email,
      });

      Alert.alert(
        "Reset Failed",
        error.message ||
          "Unable to send password reset email. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getInputBorderColor = (hasError: boolean, isFocused: boolean) => {
    if (hasError) return colors.semantic.red;
    if (isFocused) return colors.brand.primary;
    return "transparent";
  };

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={[
        tw`flex-1`,
        { backgroundColor: colors.system.background.primary },
      ]}
    >
      <ScreenHeader />
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
          {/* Icon */}
          <View
            style={tw`items-center mb-8`}
          >
            <View
              style={[
                tw`w-20 h-20 rounded-full items-center justify-center mb-6`,
                {
                  backgroundColor: `${colors.brand.primary}20`,
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={32}
                color={colors.brand.primary}
              />
            </View>
            <Text
              variant="title1"
              weight="bold"
              color="label"
              style={{ textAlign: "center", marginBottom: 8 }}
            >
              Reset your password
            </Text>
            <Text
              variant="subheadline"
              color="secondaryLabel"
              style={{ textAlign: "center", paddingHorizontal: 20 }}
            >
              Enter your email and we will send you a 6-digit code.
            </Text>
          </View>

          {/* Email Input */}
          <View
            style={tw`mb-6`}
          >
            <Text
              variant="subheadline"
              weight="medium"
              color="label"
              style={{ marginBottom: 6 }}
            >
              Email
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
                color={
                  emailFocused
                    ? colors.brand.primary
                    : colors.system.label.tertiary
                }
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
                returnKeyType="done"
                onSubmitEditing={handleResetPassword}
              />
              {email.length > 0 && (
                <Pressable onPress={() => setEmail("")} hitSlop={13}>
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

          {/* Send Code Button */}
          <View>
            <TouchableOpacity
              onPress={handleResetPassword}
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
                  Send code
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Back to Sign In */}
          <View
            style={tw`flex-row items-center justify-center mt-4`}
          >
            <Text variant="subheadline" color="secondaryLabel">
              Remembered it?{" "}
            </Text>
            <Pressable onPress={() => router.back()}>
              <Text
                variant="subheadline"
                weight="semibold"
                style={{ color: colors.brand.primary }}
              >
                Sign in
              </Text>
            </Pressable>
          </View>

          {/* Help Text */}
          <View
            style={tw`mt-12 items-center`}
          >
            <View
              style={[
                tw`rounded-xl p-4`,
                { backgroundColor: colors.system.background.secondary },
              ]}
            >
              <View style={tw`flex-row items-start mb-2`}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={colors.system.label.secondary}
                  style={tw`mr-2 mt-0.5`}
                />
                <Text
                  variant="caption1"
                  color="secondaryLabel"
                  style={{ flex: 1, lineHeight: 18 }}
                >
                  If it does not arrive in a few minutes, check your spam folder.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
