import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { designTokens, FontSize, FontWeight, TextColor } from '../../theme/designTokens';

interface TextProps extends Omit<RNTextProps, 'style'> {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'bodySmall' | 'caption' | 'overline';
  color?: TextColor;
  weight?: FontWeight;
  align?: 'left' | 'center' | 'right';
  style?: RNTextProps['style'];
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = 'primary',
  weight,
  align = 'left',
  style,
  children,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'h1':
        return {
          fontSize: designTokens.typography.fontSize['4xl'],
          fontWeight: designTokens.typography.fontWeight.bold,
          lineHeight: designTokens.typography.fontSize['4xl'] * designTokens.typography.lineHeight.tight,
        };
      case 'h2':
        return {
          fontSize: designTokens.typography.fontSize['3xl'],
          fontWeight: designTokens.typography.fontWeight.bold,
          lineHeight: designTokens.typography.fontSize['3xl'] * designTokens.typography.lineHeight.tight,
        };
      case 'h3':
        return {
          fontSize: designTokens.typography.fontSize['2xl'],
          fontWeight: designTokens.typography.fontWeight.semibold,
          lineHeight: designTokens.typography.fontSize['2xl'] * designTokens.typography.lineHeight.normal,
        };
      case 'h4':
        return {
          fontSize: designTokens.typography.fontSize.xl,
          fontWeight: designTokens.typography.fontWeight.semibold,
          lineHeight: designTokens.typography.fontSize.xl * designTokens.typography.lineHeight.normal,
        };
      case 'body':
        return {
          fontSize: designTokens.typography.fontSize.base,
          fontWeight: designTokens.typography.fontWeight.normal,
          lineHeight: designTokens.typography.fontSize.base * designTokens.typography.lineHeight.normal,
        };
      case 'bodySmall':
        return {
          fontSize: designTokens.typography.fontSize.sm,
          fontWeight: designTokens.typography.fontWeight.normal,
          lineHeight: designTokens.typography.fontSize.sm * designTokens.typography.lineHeight.normal,
        };
      case 'caption':
        return {
          fontSize: designTokens.typography.fontSize.xs,
          fontWeight: designTokens.typography.fontWeight.normal,
          lineHeight: designTokens.typography.fontSize.xs * designTokens.typography.lineHeight.normal,
        };
      case 'overline':
        return {
          fontSize: designTokens.typography.fontSize.xs,
          fontWeight: designTokens.typography.fontWeight.semibold,
          lineHeight: designTokens.typography.fontSize.xs * designTokens.typography.lineHeight.normal,
          textTransform: 'uppercase' as const,
          letterSpacing: 0.5,
        };
      default:
        return {
          fontSize: designTokens.typography.fontSize.base,
          fontWeight: designTokens.typography.fontWeight.normal,
          lineHeight: designTokens.typography.fontSize.base * designTokens.typography.lineHeight.normal,
        };
    }
  };

  const getColorStyle = () => {
    return {
      color: designTokens.colors.text[color],
    };
  };

  const getFontWeight = () => {
    if (weight) {
      return { fontWeight: designTokens.typography.fontWeight[weight] };
    }
    return {};
  };

  const getTextAlign = () => {
    return { textAlign: align };
  };

  const combinedStyle = [
    getVariantStyles(),
    getColorStyle(),
    getFontWeight(),
    getTextAlign(),
    style,
  ];

  return (
    <RNText style={combinedStyle} {...props}>
      {children}
    </RNText>
  );
};