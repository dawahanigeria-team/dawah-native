import React, { memo } from 'react';
import { ViewStyle } from 'react-native';
import { designTokens, BorderRadius } from '../../theme/designTokens';
import { Touchable } from './Touchable';
import { Text } from './Text';

export type ChipVariant = 'primary' | 'secondary' | 'outline' | 'muted' | 'selected' | 'default';

interface ChipProps {
  label: string;
  variant?: ChipVariant;
  size?: 'small' | 'medium' | 'large';
  borderRadius?: BorderRadius;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export const Chip: React.FC<ChipProps> = memo(({
  label,
  variant = 'primary',
  size = 'medium',
  borderRadius = 'full',
  selected = false,
  disabled = false,
  onPress,
  style,
}) => {
  const getVariantStyles = (): ViewStyle => {
    const isSelected = selected && !disabled;
    
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: isSelected
            ? designTokens.colors.brand.primary
            : designTokens.colors.background.secondary,
          borderWidth: isSelected ? 0 : 1,
          borderColor: isSelected ? 'transparent' : designTokens.colors.border.secondary,
        };
      case 'secondary':
        return {
          backgroundColor: isSelected
            ? designTokens.colors.brand.primary
            : designTokens.colors.background.secondary,
          borderWidth: isSelected ? 0 : 1,
          borderColor: isSelected ? 'transparent' : designTokens.colors.border.secondary,
        };
      case 'outline':
        return {
          backgroundColor: isSelected
            ? designTokens.colors.brand.primary
            : designTokens.colors.background.secondary,
          borderWidth: isSelected ? 0 : 1,
          borderColor: isSelected ? 'transparent' : designTokens.colors.border.secondary,
        };
      case 'muted':
        return {
          backgroundColor: isSelected
            ? designTokens.colors.brand.primary
            : designTokens.colors.background.secondary,
          borderWidth: isSelected ? 0 : 1,
          borderColor: isSelected ? 'transparent' : designTokens.colors.border.secondary,
        };
      case 'selected':
        return {
          backgroundColor: designTokens.colors.brand.primary,
          borderWidth: 0,
        };
      case 'default':
        return {
          backgroundColor: designTokens.colors.background.secondary,
          borderWidth: 1,
          borderColor: designTokens.colors.border.secondary,
        };
      default:
        return {
          backgroundColor: designTokens.colors.background.secondary,
          borderWidth: 1,
          borderColor: designTokens.colors.border.secondary,
        };
    }
  };

  const getSizeStyles = (): ViewStyle => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: designTokens.spacing.sm,
          paddingVertical: designTokens.spacing.xs,
          minHeight: 28,
        };
      case 'medium':
        return {
          paddingHorizontal: designTokens.spacing.md,
          paddingVertical: 6,
          minHeight: 32,
        };
      case 'large':
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
    if (disabled) return 'muted';
    
    const isSelected = selected && !disabled;
    
    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'outline':
      case 'muted':
        return isSelected ? 'inverse' : 'primary';
      default:
        return 'primary';
    }
  };

  const getTextVariant = () => {
    switch (size) {
      case 'small':
        return 'caption';
      case 'medium':
        return 'bodySmall';
      case 'large':
        return 'body';
      default:
        return 'bodySmall';
    }
  };

  const combinedStyle: ViewStyle = {
    alignSelf: 'flex-start',
    borderRadius: designTokens.borderRadius[borderRadius],
    opacity: disabled ? 0.6 : 1,
    marginRight: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.sm,
    ...getVariantStyles(),
    ...getSizeStyles(),
    ...style,
  };

  return (
    <Touchable
      style={combinedStyle}
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityState={{ 
        disabled: disabled || !onPress,
        selected: selected
      }}
      accessibilityLabel={`${label} chip${selected ? ', selected' : ''}`}
      accessibilityHint={onPress ? 'Tap to select this option' : undefined}
    >
      <Text 
        variant={getTextVariant()} 
        color={getTextColor()}
        weight="medium"
        align="center"
      >
        {label}
      </Text>
    </Touchable>
  );
});

Chip.displayName = 'Chip';