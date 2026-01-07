import * as Haptics from "expo-haptics";
import React, { memo } from "react";
import {
  ActivityIndicator,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from "react-native";
import { BorderRadius, designTokens } from "../../theme/designTokens";
import { Text } from "./Text";

interface ButtonProps extends Omit<TouchableOpacityProps, "style"> {
  variant?: "filled" | "tinted" | "gray" | "plain" | "destructive";
  size?: "small" | "medium" | "large";
  borderRadius?: BorderRadius;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = memo(
  ({
    variant = "filled",
    size = "medium",
    borderRadius = "lg",
    fullWidth = false,
    loading = false,
    leftIcon,
    rightIcon,
    disabled,
    children,
    style,
    onPress,
    accessibilityLabel,
    accessibilityHint,
    ...props
  }) => {
    const handlePress = (event: any) => {
      if (!disabled && !loading) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(event);
      }
    };

    const getVariantStyles = (): ViewStyle => {
      const isDisabled = disabled || loading;

      switch (variant) {
        case "filled":
          return {
            backgroundColor: isDisabled
              ? designTokens.colors.control.disabled
              : designTokens.colors.brand.primary,
            borderWidth: 0,
          };
        case "tinted":
          return {
            backgroundColor: isDisabled
              ? designTokens.colors.control.disabled
              : designTokens.colors.system.fill.secondary,
            borderWidth: 0,
          };
        case "gray":
          return {
            backgroundColor: isDisabled
              ? designTokens.colors.control.disabled
              : designTokens.colors.system.fill.primary,
            borderWidth: 0,
          };
        case "plain":
          return {
            backgroundColor: "transparent",
            borderWidth: 0,
          };
        case "destructive":
          return {
            backgroundColor: isDisabled
              ? designTokens.colors.control.disabled
              : designTokens.colors.semantic.red,
            borderWidth: 0,
          };
        default:
          return {
            backgroundColor: designTokens.colors.brand.primary,
            borderWidth: 0,
          };
      }
    };

    const getSizeStyles = (): ViewStyle => {
      switch (size) {
        case "small":
          return {
            paddingHorizontal: designTokens.spacing.md,
            paddingVertical: designTokens.spacing.sm,
            minHeight: designTokens.hitTargets.minimum,
          };
        case "medium":
          return {
            paddingHorizontal: designTokens.spacing.lg,
            paddingVertical: designTokens.spacing.md,
            minHeight: designTokens.hitTargets.comfortable,
          };
        case "large":
          return {
            paddingHorizontal: designTokens.spacing.xl,
            paddingVertical: designTokens.spacing.lg,
            minHeight: designTokens.hitTargets.large,
          };
        default:
          return {
            paddingHorizontal: designTokens.spacing.lg,
            paddingVertical: designTokens.spacing.md,
            minHeight: designTokens.hitTargets.comfortable,
          };
      }
    };

    const getTextColor = () => {
      const isDisabled = disabled || loading;

      if (isDisabled) {
        return "quaternary";
      }

      switch (variant) {
        case "filled":
        case "destructive":
          return "primary"; // White on colored background
        case "tinted":
        case "gray":
          return "primary";
        case "plain":
        default:
          return "secondary";
      }
    };

    const getTextVariant = () => {
      switch (size) {
        case "small":
          return "footnote";
        case "medium":
          return "body";
        case "large":
          return "headline";
        default:
          return "body";
      }
    };

    const combinedStyle: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: designTokens.borderRadius[borderRadius],
      width: fullWidth ? "100%" : undefined,
      opacity: disabled || loading ? 0.6 : 1,
      ...getVariantStyles(),
      ...getSizeStyles(),
      ...style,
    };

    // Generate accessibility label if not provided
    const defaultAccessibilityLabel =
      typeof children === "string" ? children : "Button";
    const finalAccessibilityLabel =
      accessibilityLabel || defaultAccessibilityLabel;

    return (
      <TouchableOpacity
        style={combinedStyle}
        onPress={handlePress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={finalAccessibilityLabel}
        accessibilityHint={accessibilityHint || "Tap to activate"}
        accessibilityState={{ disabled: disabled || loading }}
        {...props}
      >
        {leftIcon && !loading && leftIcon}

        {loading ? (
          <ActivityIndicator
            size="small"
            color={
              getTextColor() === "primary"
                ? "#FFFFFF"
                : designTokens.colors.system.label.primary
            }
          />
        ) : (
          <Text
              variant={getTextVariant()}
            weight={variant === "plain" ? "regular" : "semibold"}
            style={{
              marginLeft: leftIcon ? designTokens.spacing.sm : 0,
              marginRight: rightIcon ? designTokens.spacing.sm : 0,
            }}
          >
            {children}
          </Text>
        )}

        {rightIcon && !loading && rightIcon}
      </TouchableOpacity>
    );
  }
);

Button.displayName = "Button";
