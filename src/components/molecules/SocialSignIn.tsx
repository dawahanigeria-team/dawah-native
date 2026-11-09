import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { useTheme } from "../../hooks/useTheme";
import { designTokens } from "../../theme/designTokens";
import { Text } from "../atoms/Text";

interface SocialSignInProps {
  onApple: () => void;
  onGoogle: () => void;
  disabled?: boolean;
}

/** One-tap sign in, offered before the email form because it needs no typing. */
export const SocialSignIn: React.FC<SocialSignInProps> = ({ onApple, onGoogle, disabled }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      {Platform.OS === "ios" && (
        <Pressable
          onPress={onApple}
          disabled={disabled}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.system.label.primary },
            (pressed || disabled) && styles.dimmed,
          ]}
        >
          <Ionicons name="logo-apple" size={20} color={colors.system.background.primary} />
          <Text variant="headline" style={{ color: colors.system.background.primary }}>
            Continue with Apple
          </Text>
        </Pressable>
      )}
      <Pressable
        onPress={onGoogle}
        disabled={disabled}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.button,
          { borderWidth: 1, borderColor: colors.system.separator.primary },
          (pressed || disabled) && styles.dimmed,
        ]}
      >
        <Ionicons name="logo-google" size={18} color={colors.system.label.primary} />
        <Text variant="headline">Continue with Google</Text>
      </Pressable>

      <View style={styles.divider}>
        <View style={[styles.line, { backgroundColor: colors.system.separator.primary }]} />
        <Text variant="footnote" color="secondaryLabel">
          or use your email
        </Text>
        <View style={[styles.line, { backgroundColor: colors.system.separator.primary }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: designTokens.spacing.md,
    marginBottom: designTokens.spacing.lg,
  },
  button: {
    height: 52,
    borderRadius: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: designTokens.spacing.sm,
  },
  dimmed: {
    opacity: 0.7,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: designTokens.spacing.md,
    marginTop: designTokens.spacing.xs,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
});
