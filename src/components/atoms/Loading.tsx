import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../hooks/useTheme";

interface LoadingProps {
  size?: "small" | "large";
  color?: string;
  fullScreen?: boolean;
  message?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  size = "large",
  color,
  fullScreen = false,
  message,
}) => {
  const { colors, spacing, typography } = useTheme();
  
  // Use brand color as default if not provided
  const activityColor = color || colors.brand.primary;

  const containerStyle = fullScreen 
    ? [styles.fullScreen, { backgroundColor: colors.system.background.primary }] 
    : [styles.inline, { padding: spacing.xl }];

  return (
    <View style={containerStyle}>
      <ActivityIndicator
        size={size}
        color={activityColor}
        accessibilityLabel="Loading indicator"
        accessibilityRole="progressbar"
      />
      {message && (
        <View style={[styles.messageContainer, { marginTop: spacing.md }]}>
          <Text style={[
            styles.messageText, 
            { 
              fontSize: typography.fontSize.body,
              color: colors.system.label.secondary 
            }
          ]}>
            {message}
          </Text>
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
  },
  inline: {
    justifyContent: "center",
    alignItems: "center",
  },
  messageContainer: {
    alignItems: "center",
  },
  messageText: {
    textAlign: "center",
  },
});
