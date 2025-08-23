import React, { memo } from 'react';
import { ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { designTokens } from '../../theme/designTokens';

type IconColorVariant = 
  | 'label' 
  | 'secondaryLabel' 
  | 'tertiaryLabel' 
  | 'quaternaryLabel' 
  | 'systemBlue' 
  | 'systemGreen'
  | 'systemRed'
  | 'brand'
  | 'muted';

interface IconProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  color?: IconColorVariant | string;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export const Icon: React.FC<IconProps> = memo(({
  name,
  size = 'md',
  color = 'label',
  style,
  accessibilityLabel,
}) => {
  const getSizeValue = () => {
    switch (size) {
      case 'xs':
        return 12;
      case 'sm':
        return 16;
      case 'md':
        return 20;
      case 'lg':
        return 24;
      case 'xl':
        return 28;
      case '2xl':
        return 32;
      default:
        return 20;
    }
  };

  const getColorValue = () => {
    // Handle design token colors
    switch (color) {
      case 'label':
        return designTokens.colors.system.label.primary;
      case 'secondaryLabel':
        return designTokens.colors.system.label.secondary;
      case 'tertiaryLabel':
        return designTokens.colors.system.label.tertiary;
      case 'quaternaryLabel':
        return designTokens.colors.system.label.quaternary;
      case 'systemBlue':
        return designTokens.colors.semantic.blue;
      case 'systemGreen':
        return designTokens.colors.semantic.green;
      case 'systemRed':
        return designTokens.colors.semantic.red;
      case 'brand':
        return designTokens.colors.brand.primary;
      case 'muted':
        return designTokens.colors.system.label.tertiary;
      default:
        // Use the color as-is (for hex colors, etc.)
        return color || designTokens.colors.system.label.primary;
    }
  };

  return (
    <Ionicons
      name={name}
      size={getSizeValue()}
      color={getColorValue()}
      style={style}
      accessibilityLabel={accessibilityLabel}
    />
  );
});

Icon.displayName = 'Icon';