import React, { memo } from "react";
import { ViewStyle } from "react-native";
import { useTheme } from "../../hooks/useTheme";
import { designTokens, BorderRadius } from "../../theme/designTokens";
import { Touchable } from "./Touchable";
import { Text } from "./Text";

export type ChipVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "muted"
  | "selected"
  | "default";

interface ChipProps {
  label: string;
  variant?: ChipVariant;
  size?: "small" | "medium" | "large";
  borderRadius?: BorderRadius;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export const Chip: React.FC<ChipProps> = memo(
  ({
    label,
    variant = "primary",
    size = "medium",
    borderRadius = "full",
    selected = false,
    disabled = false,
    onPress,
    style,
  }) => {
    const { colors } = useTheme();

    const getVariantStyles = (): ViewStyle => {
      const isSelected = selected && !disabled;

      switch (variant) {
        case "primary":
          return {
            backgroundColor: isSelected
              ? colors.brand.primary
              : colors.system.background.secondary,
            borderWidth: isSelected ? 0 : 1,
            borderColor: isSelected
              ? "transparent"
              : colors.system.separator.primary,
          };
        case "secondary":
          return {
            backgroundColor: isSelected
              ? colors.brand.primary
              : colors.system.background.secondary,
            borderWidth: isSelected ? 0 : 1,
            borderColor: isSelected
              ? "transparent"
              : colors.system.separator.primary,
          };
        case "outline":
          return {
            backgroundColor: isSelected
              ? colors.brand.primary
              : colors.system.background.secondary,
            borderWidth: isSelected ? 0 : 1,
            borderColor: isSelected
              ? "transparent"
              : colors.system.separator.primary,
          };
        case "muted":
          return {
            backgroundColor: isSelected
              ? colors.brand.primary
              : colors.system.background.secondary,
            borderWidth: isSelected ? 0 : 1,
            borderColor: isSelected
              ? "transparent"
              : colors.system.separator.primary,
          };
        case "selected":
          return {
            backgroundColor: colors.brand.primary,
            borderWidth: 0,
          };
        case "default":
          return {
            backgroundColor: colors.system.background.secondary,
            borderWidth: 1,
            borderColor: colors.system.separator.primary,
          };
        default:
          return {
            backgroundColor: colors.system.background.secondary,
            borderWidth: 1,
            borderColor: colors.system.separator.primary,
          };
      }
    };

    const getSizeStyles = (): ViewStyle => {
      switch (size) {
        case "small":
          return {
            paddingHorizontal: designTokens.spacing.sm,
            paddingVertical: designTokens.spacing.xs,
            minHeight: 28,
          };
        case "medium":
          return {
            paddingHorizontal: designTokens.spacing.md,
            paddingVertical: 6,
            minHeight: 32,
          };
        case "large":
          return {
            paddingHorizontal: designTokens.spacing.lg,
            paddingVertical: designTokens.spacing.sm,
            minHeight: 40,
          };
        default:
          return {
            paddingHorizontal: designTokens.spacing.md,
            paddingVertical: 6,
            minHeight: 32,
          };
      }
    };

    const getTextColor = () => {
      if (disabled) return "quaternaryLabel";

      const isSelected = selected && !disabled;

      // When selected, use contrasting color for visibility on brand background
      if (isSelected) {
        return "label"; // Text component will handle the color
      }

      return "label";
    };

    const getTextVariant = () => {
      switch (size) {
        case "small":
          return "caption2";
        case "medium":
          return "footnote";
        case "large":
          return "callout";
        default:
          return "footnote";
      }
    };

    const combinedStyle: ViewStyle = {
      alignSelf: "flex-start",
      borderRadius: designTokens.borderRadius[borderRadius],
      opacity: disabled ? 0.6 : 1,
      marginRight: designTokens.spacing.sm,
      marginBottom: designTokens.spacing.sm,
      ...getVariantStyles(),
      ...getSizeStyles(),
      ...style,
    };

    // For selected chips on brand primary background, use black text for contrast
    const isSelected = selected && !disabled;
    const textStyle = isSelected ? { color: colors.fixed.black } : undefined;

    return (
      <Touchable
        style={combinedStyle}
        onPress={onPress}
        disabled={disabled || !onPress}
        accessibilityRole="button"
        accessibilityState={{
          disabled: disabled || !onPress,
          selected: selected,
        }}
        accessibilityLabel={`${label} chip${selected ? ", selected" : ""}`}
        accessibilityHint={onPress ? "Tap to select this option" : undefined}
      >
        <Text
          variant={getTextVariant()}
          color={getTextColor()}
          weight="medium"
          align="center"
          style={textStyle}
        >
          {label}
        </Text>
      </Touchable>
    );
  }
);

Chip.displayName = "Chip";
