import React, { memo } from 'react';
import { TouchableOpacity, TouchableOpacityProps, ViewStyle, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { designTokens, BorderRadius } from '../../theme/designTokens';
import { Text } from './Text';

interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  borderRadius?: BorderRadius;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = memo(({
  variant = 'primary',
  size = 'medium',
  borderRadius = 'lg',
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  children,
  style,
  onPress,
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
      case 'primary':
        return {
          backgroundColor: isDisabled 
            ? designTokens.colors.interactive.disabled 
            : designTokens.colors.brand.primary,
          borderWidth: 0,
        };
      case 'secondary':
        return {
          backgroundColor: isDisabled 
            ? designTokens.colors.interactive.disabled 
            : designTokens.colors.background.secondary,
          borderWidth: 1,
          borderColor: isDisabled 
            ? designTokens.colors.interactive.disabled 
            : designTokens.colors.border.primary,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: isDisabled 
            ? designTokens.colors.interactive.disabled 
            : designTokens.colors.brand.primary,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      case 'danger':
        return {
          backgroundColor: isDisabled 
            ? designTokens.colors.interactive.disabled 
            : designTokens.colors.semantic.error,
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
      case 'small':
        return {
          paddingHorizontal: designTokens.spacing.md,
          paddingVertical: designTokens.spacing.sm,
          minHeight: designTokens.hitTargets.minimum,
        };
      case 'medium':
        return {
          paddingHorizontal: designTokens.spacing.lg,
          paddingVertical: designTokens.spacing.md,
          minHeight: designTokens.hitTargets.comfortable,
        };
      case 'large':
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
      return 'muted';
    }
    
    switch (variant) {
      case 'primary':
      case 'danger':
        return 'inverse';
      case 'secondary':
      case 'outline':
      case 'ghost':
      default:
        return 'primary';
    }
  };

  const getTextVariant = () => {
    switch (size) {
      case 'small':
        return 'bodySmall';
      case 'medium':
        return 'body';
      case 'large':
        return 'body';
      default:
        return 'body';
    }
  };

  const combinedStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: designTokens.borderRadius[borderRadius],
    width: fullWidth ? '100%' : undefined,
    opacity: (disabled || loading) ? 0.6 : 1,
    ...getVariantStyles(),
    ...getSizeStyles(),
    ...style,
  };

  return (
    <TouchableOpacity
      style={combinedStyle}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      {...props}
    >
      {leftIcon && !loading && leftIcon}
      
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={getTextColor() === 'inverse' ? designTokens.colors.text.inverse : designTokens.colors.text.primary}
        />
      ) : (
        <Text 
          variant={getTextVariant()} 
          color={getTextColor()}
          weight="semibold"
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
});

Button.displayName = 'Button';