import React, { memo } from 'react';
import { ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { designTokens, TextColor } from '../../theme/designTokens';

interface IconProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  color?: TextColor | string;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export const Icon: React.FC<IconProps> = memo(({
  name,
  size = 'md',
  color = 'primary',
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
    // Check if it's a design token color
    if (color in designTokens.colors.text) {
      return designTokens.colors.text[color as TextColor];
    }
    // Otherwise, use the color as-is (for custom colors like brand colors)
    return color;
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