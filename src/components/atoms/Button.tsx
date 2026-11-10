import * as Haptics from "expo-haptics";
import React, { memo } from "react";
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  ViewStyle,
} from "react-native";
import { BorderRadius, designTokens } from "../../theme/designTokens";
import { useThemeColors } from "../../hooks/useTheme";
import { Text } from "./Text";

interface ButtonProps extends Omit<PressableProps, "style"> {
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
    const colors = useThemeColors();

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
              ? colors.control.disabled
              : colors.brand.primary,
            borderWidth: 0,
          };
        case "tinted":
          return {
            backgroundColor: isDisabled
              ? colors.control.disabled
              : colors.system.fill.secondary,
            borderWidth: 0,
          };
        case "gray":
          return {
            backgroundColor: isDisabled
              ? colors.control.disabled
              : colors.system.fill.primary,
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
              ? colors.control.disabled
              : colors.semantic.red,
            borderWidth: 0,
          };
        default:
          return {
            backgroundColor: colors.brand.primary,
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

    const getTextColor = (): { semanticColor?: string; fixedColor?: string } => {
      if (disabled || loading) {
        return { semanticColor: "quaternaryLabel" };
      }

      switch (variant) {
        case "filled":
          return { fixedColor: colors.brand.onPrimary };
        case "destructive":
          return { fixedColor: colors.fixed.black };
        case "tinted":
          return { semanticColor: "brand" };
        case "gray":
          return { semanticColor: "label" };
        case "plain":
        default:
          return { semanticColor: "brand" };
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

    const textColorConfig = getTextColor();

    // Determine loader color based on button variant
    const loaderColor = variant === 'filled'
      ? colors.brand.onPrimary
      : variant === 'destructive'
        ? colors.fixed.black
        : colors.system.label.primary;

    return (
      <Pressable
        style={({ pressed }) => [combinedStyle, pressed && !disabled && !loading ? { opacity: 0.8 } : undefined]}
        onPress={handlePress}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={finalAccessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: disabled || loading }}
        {...props}
      >
        {leftIcon && !loading && leftIcon}

        {loading ? (
          <ActivityIndicator size="small" color={loaderColor} />
        ) : (
          <Text
            variant={getTextVariant()}
            color={textColorConfig.semanticColor as any}
            weight={variant === "plain" ? "regular" : "semibold"}
            style={{
              marginLeft: leftIcon ? designTokens.spacing.sm : 0,
              marginRight: rightIcon ? designTokens.spacing.sm : 0,
              ...(textColorConfig.fixedColor && { color: textColorConfig.fixedColor })
            }}
          >
            {children}
          </Text>
        )}

        {rightIcon && !loading && rightIcon}
      </Pressable>
    );
  }
);

Button.displayName = "Button";
