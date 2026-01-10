import React, { memo } from 'react';
import { View, ViewStyle } from 'react-native';
import { BorderRadius, designTokens } from '../../theme/designTokens';
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
  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: designTokens.colors.brand.primary,
        };
      case 'secondary':
        return {
          backgroundColor: designTokens.colors.system.background.secondary,
          borderWidth: 1,
          borderColor: designTokens.colors.system.separator.primary,
        };
      case 'success':
        return {
          backgroundColor: designTokens.colors.semantic.green,
        };
      case 'warning':
        return {
          backgroundColor: designTokens.colors.semantic.orange,
        };
      case 'error':
        return {
          backgroundColor: designTokens.colors.semantic.red,
        };
      case 'info':
        return {
          backgroundColor: designTokens.colors.semantic.blue,
        };
      default:
        return {
          backgroundColor: designTokens.colors.brand.primary,
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

  const getTextColor = (): 'label' | 'secondaryLabel' | 'tertiaryLabel' | 'quaternaryLabel' | 'systemBlue' | 'systemGreen' | 'systemRed' | 'brand' => {
    switch (variant) {
      case 'primary':
      case 'success':
      case 'warning':
      case 'error':
      case 'info':
        // For colored backgrounds, use label color (which adapts to light/dark mode)
        // In practice, this will be white/light on dark backgrounds
        return 'label';
      case 'secondary':
      default:
        return 'label';
    }
  };

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
        color={getTextColor()}
        weight="semibold"
        align="center"
      >
        {children}
      </Text>
    </View>
  );
});

Badge.displayName = 'Badge';