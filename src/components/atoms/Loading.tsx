import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { designTokens } from "../../theme/designTokens";

interface LoadingProps {
  size?: "small" | "large";
  color?: string;
  fullScreen?: boolean;
  message?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  size = "large",
  color = designTokens.colors.brand.primary,
  fullScreen = false,
  message,
}) => {
  const containerStyle = fullScreen ? styles.fullScreen : styles.inline;

  return (
    <View style={containerStyle}>
      <ActivityIndicator
        size={size}
        color={color}
        accessibilityLabel="Loading indicator"
        accessibilityRole="progressbar"
      />
      {message && (
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: designTokens.colors.system.background.primary,
  },
  inline: {
    padding: designTokens.spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  messageContainer: {
    marginTop: designTokens.spacing.md,
    alignItems: "center",
  },
  messageText: {
    fontSize: designTokens.typography.fontSize.body,
    color: designTokens.colors.system.label.secondary,
    textAlign: "center",
  },
});
