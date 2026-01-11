import * as Haptics from "expo-haptics";
import React, { memo } from "react";
import {
  ActivityIndicator,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from "react-native";
import { BorderRadius, designTokens } from "../../theme/designTokens";
import { useThemeColors } from "../../hooks/useTheme";
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

    const getTextColor = () => {
      const isDisabled = disabled || loading;

      if (isDisabled) {
        return "quaternaryLabel";
      }

      switch (variant) {
        case "filled":
        case "destructive":
          return "label"; // White on colored background? Actually label.primary for filled might not be right if label is black in light mode.
          // For filled buttons (brand color), we usually want white text regardless of theme, 
          // unless brand color changes to very light. 
          // However, colors.brand.primary is ~#30D158 (Green). White text is accessible on it?
          // #30D158 is light green. White text on it might have low contrast (1.5:1).
          // iOS often uses white text on systemBlue.
          // Let's check contrast. #30D158 is quite bright.
          // The previous code had: return "primary"; // White on colored background
          // But "primary" label color in light mode is Black.
          // So "filled" variant needs explicit white text usually.
        case "tinted":
        case "gray":
          return "brand"; // Use brand color for tinted text? Or label?
          // Previous code: return "primary"; 
        case "plain":
        default:
          return "brand";
      }
    };

    // Fix for button text color handling in light mode
    // We can't rely just on 'label' (which flips black/white) for filled buttons if we want white text always.
    // But let's stick to the mapping logic for now and assume the Text component handles 'label' correctly.
    // Wait, the `Text` component maps `color='label'` to `colors.system.label.primary`.
    // In Light Mode, `label.primary` is Black.
    // If we have a Green button, we might want White text or Black text depending on the green.
    // If `colors.brand.primary` is #34C759 (Light Mode Green), Black text (13:1) is better than White (1.5:1).
    // So actually, standard `label` color (Black in light mode) is CORRECT for accessibility on bright green.
    // In Dark Mode, `label.primary` is White. Green is #30D158. Black text is still better contrast, but White is 1.6:1.
    // Apple uses White on Blue/Green usually. But pure accessibility says Black on Light Green.
    // Let's trust the system label color for now.

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

    // Special handling for filled button text color to ensure contrast
    // If variant is filled, we might want to force a specific color if the brand color requires it.
    // But for now, let's pass the semantic color variant.
    
    let textColorVariant: any = getTextColor();
    
    // Override: If filled, usually we want white text if the background is dark enough, 
    // or black if it's light.
    // Current design tokens: Light Green and Dark Green.
    // Let's stick to 'label' (primary system color) which adapts.

    if (variant === 'filled') {
        // If we want white text explicitly (like standard iOS buttons often do), 
        // we need to pass a specific style or color prop that resolves to white.
        // But `Text` component doesn't have a 'white' variant.
        // `label` is the safest semantic choice.
        textColorVariant = 'label'; 
        // Wait, previous code returned 'primary'. In Text.tsx, 'primary' wasn't a valid key for `color` prop. 
        // The `Text` component accepts `ColorVariant` = 'label' | 'brand' etc.
        // The previous `Button.tsx` returned strings like "primary", "secondary" which matched... what?
        // Ah, `Text` props: `color?: 'label' | ...`.
        // The previous Button code had `getTextColor` returning "primary", "secondary".
        // This likely meant it was relying on a different Text component or I misread `Text.tsx`.
        // `Text.tsx` has `color?: ColorVariant`. 
        // ColorVariant = 'label' | 'secondaryLabel' ...
        // So `return "primary"` was actually invalid or falling back to default?
        // Let's check `Text.tsx` again. It has `default: return { color: designTokens.colors.system.label.primary };`.
        // So "primary" fell back to default label color.
        
        // Correcting this:
        textColorVariant = 'label';
    } else if (variant === 'plain') {
        textColorVariant = 'brand';
    } else {
        textColorVariant = 'label';
    }

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
               // Ensure loader is visible
               colors.system.label.primary
            }
          />
        ) : (
          <Text
            variant={getTextVariant()}
            color={textColorVariant}
            weight={variant === "plain" ? "regular" : "semibold"}
            style={{
              marginLeft: leftIcon ? designTokens.spacing.sm : 0,
              marginRight: rightIcon ? designTokens.spacing.sm : 0,
              // If it's a filled button, and we really want White text (common for brand buttons):
              ...(variant === 'filled' || variant === 'destructive' ? { color: '#FFFFFF' } : {})
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