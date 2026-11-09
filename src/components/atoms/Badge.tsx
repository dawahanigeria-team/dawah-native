import React, { memo } from 'react';
import { View, ViewStyle } from 'react-native';
import { BorderRadius, designTokens } from '../../theme/designTokens';
import { useThemeColors } from '../../hooks/useTheme';
import { Text } from './Text';

interface BadgeProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'small' | 'medium' | 'large';
  borderRadius?: BorderRadius;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = memo(({
  variant = 'primary',
  size = 'medium',
  borderRadius = 'full',
  children,
  style,
}) => {
  // designTokens.colors is the deprecated static palette and is always the
  // dark one, so the outline variant kept a dark fill on a light screen.
  const colors = useThemeColors();
  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.brand.primary,
        };
      case 'secondary':
        return {
          backgroundColor: colors.system.background.secondary,
          borderWidth: 1,
          borderColor: colors.system.separator.primary,
        };
      case 'success':
        return {
          backgroundColor: colors.semantic.green,
        };
      case 'warning':
        return {
          backgroundColor: colors.semantic.orange,
        };
      case 'error':
        return {
          backgroundColor: colors.semantic.red,
        };
      case 'info':
        return {
          backgroundColor: colors.semantic.blue,
        };
      default:
        return {
          backgroundColor: colors.brand.primary,
        };
    }
  };

  const getSizeStyles = (): ViewStyle => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: designTokens.spacing.sm,
          paddingVertical: designTokens.spacing.xs,
        };
      case 'medium':
        return {
          paddingHorizontal: designTokens.spacing.md,
          paddingVertical: designTokens.spacing.sm,
        };
      case 'large':
        return {
          paddingHorizontal: designTokens.spacing.lg,
          paddingVertical: designTokens.spacing.md,
        };
      default:
        return {
          paddingHorizontal: designTokens.spacing.md,
          paddingVertical: designTokens.spacing.sm,
        };
    }
  };

  const hasColoredBackground = variant !== 'secondary';
  const onBackground =
    variant === 'success' || variant === 'warning' || variant === 'error' || variant === 'info'
      ? colors.fixed.white
      : colors.brand.onPrimary;

  const getTextVariant = () => {
    switch (size) {
      case 'small':
        return 'caption1';
      case 'medium':
        return 'caption1';
      case 'large':
        return 'body';
      default:
        return 'caption1';
    }
  };

  const combinedStyle: ViewStyle = {
    alignSelf: 'flex-start',
    borderRadius: designTokens.borderRadius[borderRadius],
    ...getVariantStyles(),
    ...getSizeStyles(),
    ...style,
  };

  return (
    <View style={combinedStyle}>
      <Text
        variant={getTextVariant()}
        color="label"
        weight="semibold"
        align="center"
        style={hasColoredBackground ? { color: onBackground } : undefined}
      >
        {children}
      </Text>
    </View>
  );
});

Badge.displayName = 'Badge';
