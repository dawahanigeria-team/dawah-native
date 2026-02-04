import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Loading, Text } from "../src/components/atoms";
import { useTheme } from "../src/hooks/useTheme";
import { resetPasswordWithCode } from "../src/services/api/passwordReset.api";
import {
  addSentryBreadcrumb,
  captureSentryException,
} from "../src/services/config/sentry.config";
import tw from "../src/theme/twrnc";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const userEmail = Array.isArray(email) ? email[0] : email || "";

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [codeError, setCodeError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const [codeFocused, setCodeFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const submitButtonOpacity = isLoading ? 0.7 : 1;

  const validateCode = (text: string): boolean => {
    const codeRegex = /^\d{6}$/;
    if (!text) {
      setCodeError("Verification code is required");
      return false;
    }
    if (!codeRegex.test(text)) {
      setCodeError("Code must be 6 digits");
      return false;
    }
    setCodeError("");
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

  const handleResetPassword = async () => {
    const isCodeValid = validateCode(code);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);

    if (!isCodeValid || !isPasswordValid || !isConfirmPasswordValid) {
      return;
    }

    try {
      setIsLoading(true);
      addSentryBreadcrumb("Resetting password", "user", { email: userEmail });

      const response = await resetPasswordWithCode(userEmail, code, password);

      const getFriendlyErrorMessage = (message: string) => {
        if (message.includes("Invalid") || message.includes("incorrect")) {
          return "Invalid verification code. Please check and try again.";
        }
        if (message.includes("expired")) {
          return "Verification code has expired. Please request a new code.";
        }
        if (message.includes("attempts")) {
          return "Too many failed attempts. Please request a new code.";
        }
        return message || "Unable to reset password. Please try again.";
      };

      if (response.success) {
        addSentryBreadcrumb("Password reset successful", "info", {
          email: userEmail,
        });

        // Navigate to sign-in screen
        // Use push to ensure navigation happens, even if there are modals
        router.push("/sign-in");

        // Show success message after navigation
        setTimeout(() => {
          Alert.alert(
            "Password Reset Successful",
            "Your password has been reset successfully. You can now sign in with your new password.",
            [{ text: "OK" }]
          );
        }, 300);
      } else {
        addSentryBreadcrumb("Password reset failed", "info", {
          error: response.message,
          email: userEmail,
        });

        const errorMessage = getFriendlyErrorMessage(response.message || "");
        Alert.alert("Reset Failed", errorMessage, [{ text: "OK" }]);
      }
    } catch (err: unknown) {
      const error = err as Error;
      captureSentryException(error, {
        component: "ResetPasswordScreen",
        action: "handleResetPassword",
        email: userEmail,
        level: "warning",
      });

      addSentryBreadcrumb("Password reset failed", "error", {
        error: error.message,
        email: userEmail,
      });

      const errorMessage = error.message || "Unable to reset password. Please try again.";
      Alert.alert("Reset Failed", errorMessage, [{ text: "OK" }]);
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

          {/* Icon */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
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
                name="key-outline"
                size={32}
                color={colors.brand.primary}
              />
            </View>
            <Text
              variant="title1"
              weight="bold"
              color="label"
              style={styles.titleText}
            >
              Reset Password
            </Text>
            <Text
              variant="subheadline"
              color="secondaryLabel"
              style={styles.subtitleText}
            >
              Enter the 6-digit code sent to{" "}
              <Text variant="subheadline" weight="semibold" color="label">
                {userEmail}
              </Text>{" "}
              and create a new password.
            </Text>
          </Animated.View>

          {/* Verification Code Input */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(400)}
            style={tw`mb-4`}
          >
            <Text
              variant="subheadline"
              weight="medium"
              color="label"
              style={styles.labelText}
            >
              Verification Code
            </Text>
            <View
              style={[
                tw`rounded-xl px-4 py-3 flex-row items-center`,
                styles.inputContainer,
                {
                  backgroundColor: colors.system.background.secondary,
                  borderColor: getInputBorderColor(!!codeError, codeFocused),
                },
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={
                  codeFocused ? colors.brand.primary : colors.system.label.tertiary
                }
                style={tw`mr-3`}
              />
              <TextInput
                style={[
                  tw`flex-1`,
                  styles.codeInput,
                  { color: colors.system.label.primary },
                ]}
                placeholder="000000"
                placeholderTextColor={colors.system.label.tertiary}
                value={code}
                onChangeText={(text) => {
                  // Only allow digits and limit to 6
                  const cleaned = text.replace(/\D/g, "").slice(0, 6);
                  setCode(cleaned);
                  if (codeError) validateCode(cleaned);
                }}
                onFocus={() => setCodeFocused(true)}
                onBlur={() => {
                  setCodeFocused(false);
                  validateCode(code);
                }}
                keyboardType="number-pad"
                maxLength={6}
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                editable={!isLoading}
              />
              {code.length > 0 && (
                <Pressable onPress={() => setCode("")} hitSlop={8}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={colors.system.label.tertiary}
                  />
                </Pressable>
              )}
            </View>
            {codeError && (
              <Text
                variant="caption1"
                style={[styles.errorText, { color: colors.semantic.red }]}
              >
                {codeError}
              </Text>
            )}
          </Animated.View>

          {/* New Password Input */}
          <Animated.View
            entering={FadeInDown.delay(250).duration(400)}
            style={tw`mb-4`}
          >
            <Text
              variant="subheadline"
              weight="medium"
              color="label"
              style={styles.labelText}
            >
              New Password
            </Text>
            <View
              style={[
                tw`rounded-xl px-4 py-3 flex-row items-center`,
                styles.inputContainer,
                {
                  backgroundColor: colors.system.background.secondary,
                  borderColor: getInputBorderColor(
                    !!passwordError,
                    passwordFocused
                  ),
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={
                  passwordFocused
                    ? colors.brand.primary
                    : colors.system.label.tertiary
                }
                style={tw`mr-3`}
              />
              <TextInput
                style={[
                  tw`flex-1`,
                  styles.passwordInput,
                  { color: colors.system.label.primary },
                ]}
                placeholder="Enter new password"
                placeholderTextColor={colors.system.label.tertiary}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) validatePassword(text);
                  if (confirmPassword && confirmPasswordError) {
                    validateConfirmPassword(confirmPassword);
                  }
                }}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => {
                  setPasswordFocused(false);
                  validatePassword(password);
                }}
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
                  size={18}
                  color={colors.system.label.tertiary}
                />
              </Pressable>
            </View>
            {passwordError && (
              <Text
                variant="caption1"
                style={[styles.errorText, { color: colors.semantic.red }]}
              >
                {passwordError}
              </Text>
            )}
          </Animated.View>

          {/* Confirm Password Input */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(400)}
            style={tw`mb-6`}
          >
            <Text
              variant="subheadline"
              weight="medium"
              color="label"
              style={styles.labelText}
            >
              Confirm Password
            </Text>
            <View
              style={[
                tw`rounded-xl px-4 py-3 flex-row items-center`,
                styles.inputContainer,
                {
                  backgroundColor: colors.system.background.secondary,
                  borderColor: getInputBorderColor(
                    !!confirmPasswordError,
                    confirmPasswordFocused
                  ),
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={
                  confirmPasswordFocused
                    ? colors.brand.primary
                    : colors.system.label.tertiary
                }
                style={tw`mr-3`}
              />
              <TextInput
                style={[
                  tw`flex-1`,
                  styles.passwordInput,
                  { color: colors.system.label.primary },
                ]}
                placeholder="Confirm new password"
                placeholderTextColor={colors.system.label.tertiary}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (confirmPasswordError) validateConfirmPassword(text);
                }}
                onFocus={() => setConfirmPasswordFocused(true)}
                onBlur={() => {
                  setConfirmPasswordFocused(false);
                  validateConfirmPassword(confirmPassword);
                }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoComplete="password-new"
                autoCorrect={false}
                editable={!isLoading}
                returnKeyType="done"
                onSubmitEditing={handleResetPassword}
              />
              <Pressable
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={8}
              >
                <Ionicons
                  name={
                    showConfirmPassword ? "eye-off-outline" : "eye-outline"
                  }
                  size={18}
                  color={colors.system.label.tertiary}
                />
              </Pressable>
            </View>
            {confirmPasswordError && (
              <Text
                variant="caption1"
                style={[styles.errorText, { color: colors.semantic.red }]}
              >
                {confirmPasswordError}
              </Text>
            )}
          </Animated.View>

          {/* Reset Password Button */}
          <Animated.View entering={FadeInDown.delay(350).duration(400)}>
            <TouchableOpacity
              onPress={handleResetPassword}
              disabled={isLoading}
              activeOpacity={0.8}
              style={[
                tw`rounded-xl py-4 items-center justify-center mb-5`,
                styles.submitButton,
                {
                  backgroundColor: colors.brand.primary,
                  opacity: submitButtonOpacity,
                  shadowColor: colors.brand.primary,
                },
              ]}
            >
              {isLoading ? (
                <Loading size="small" color={colors.fixed.black} />
              ) : (
                <Text
                  variant="body"
                  weight="semibold"
                  style={[styles.submitButtonText, { color: colors.fixed.black }]}
                >
                  Reset Password
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Help Text */}
          <Animated.View
            entering={FadeInDown.delay(400).duration(400)}
            style={tw`mt-4`}
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
                <View style={tw`flex-1`}>
                  <Text
                    variant="caption1"
                    color="secondaryLabel"
                    style={styles.helpTextFirst}
                  >
                    The verification code expires in 10 minutes.
                  </Text>
                  <Text
                    variant="caption1"
                    color="secondaryLabel"
                    style={styles.helpTextLast}
                  >
                    You have 5 attempts to enter the correct code.
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Resend Code Link */}
          <Animated.View
            entering={FadeInDown.delay(450).duration(400)}
            style={tw`flex-row items-center justify-center mt-6`}
          >
            <Text variant="subheadline" color="secondaryLabel">
              Didn&apos;t receive a code?{" "}
            </Text>
            <Pressable onPress={() => router.back()}>
              <Text
                variant="subheadline"
                weight="semibold"
                style={[styles.linkText, { color: colors.brand.primary }]}
              >
                Resend
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  titleText: {
    textAlign: "center",
    marginBottom: 8,
  },
  subtitleText: {
    textAlign: "center",
    paddingHorizontal: 20,
  },
  labelText: {
    marginBottom: 6,
  },
  inputContainer: {
    borderWidth: 1.5,
  },
  codeInput: {
    fontSize: 20,
    letterSpacing: 8,
    fontWeight: "600",
    paddingVertical: 0,
  },
  passwordInput: {
    fontSize: 16,
    paddingVertical: 0,
  },
  errorText: {
    marginTop: 4,
  },
  submitButton: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 16,
  },
  helpTextFirst: {
    lineHeight: 18,
    marginBottom: 4,
  },
  helpTextLast: {
    lineHeight: 18,
  },
  linkText: {
    // Color is dynamic, set via inline style
  },
});
