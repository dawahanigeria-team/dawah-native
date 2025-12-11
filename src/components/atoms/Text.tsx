import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { designTokens, FontWeight } from '../../theme/designTokens';

type IOSTextStyle = 
  | 'largeTitle' 
  | 'title1' 
  | 'title2' 
  | 'title3' 
  | 'headline' 
  | 'body' 
  | 'callout' 
  | 'subheadline' 
  | 'footnote' 
  | 'caption1' 
  | 'caption2';

type ColorVariant = 
  | 'label' 
  | 'secondaryLabel' 
  | 'tertiaryLabel' 
  | 'quaternaryLabel' 
  | 'systemBlue' 
  | 'systemGreen'
  | 'systemRed'
  | 'brand';

interface TextProps extends Omit<RNTextProps, 'style'> {
  variant?: IOSTextStyle;
  color?: ColorVariant;
  weight?: FontWeight;
  align?: 'left' | 'center' | 'right' | 'auto';
  maxFontSizeMultiplier?: number; // For accessibility - limits Dynamic Type scaling
  style?: RNTextProps['style'];
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = 'label',
  weight,
  // Default to "auto" so the platform can pick correct direction for RTL/LTR
  align = 'auto',
  // Slightly higher default so users on large-accessibility-text settings aren't cut off
  maxFontSizeMultiplier = 2.0,
  style,
  children,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'largeTitle':
        return {
          fontSize: designTokens.typography.fontSize.largeTitle,
          fontWeight: designTokens.typography.fontWeight.regular,
          lineHeight: designTokens.typography.fontSize.largeTitle * designTokens.typography.lineHeight.tight,
          fontFamily: designTokens.typography.fontFamily.system,
        };
      case 'title1':
        return {
          fontSize: designTokens.typography.fontSize.title1,
          fontWeight: designTokens.typography.fontWeight.regular,
          lineHeight: designTokens.typography.fontSize.title1 * designTokens.typography.lineHeight.tight,
          fontFamily: designTokens.typography.fontFamily.system,
        };
      case 'title2':
        return {
          fontSize: designTokens.typography.fontSize.title2,
          fontWeight: designTokens.typography.fontWeight.regular,
          lineHeight: designTokens.typography.fontSize.title2 * designTokens.typography.lineHeight.normal,
          fontFamily: designTokens.typography.fontFamily.system,
        };
      case 'title3':
        return {
          fontSize: designTokens.typography.fontSize.title3,
          fontWeight: designTokens.typography.fontWeight.regular,
          lineHeight: designTokens.typography.fontSize.title3 * designTokens.typography.lineHeight.normal,
          fontFamily: designTokens.typography.fontFamily.system,
        };
      case 'headline':
        return {
          fontSize: designTokens.typography.fontSize.headline,
          fontWeight: designTokens.typography.fontWeight.semibold,
          lineHeight: designTokens.typography.fontSize.headline * designTokens.typography.lineHeight.normal,
          fontFamily: designTokens.typography.fontFamily.system,
        };
      case 'body':
        return {
          fontSize: designTokens.typography.fontSize.body,
          fontWeight: designTokens.typography.fontWeight.regular,
          lineHeight: designTokens.typography.fontSize.body * designTokens.typography.lineHeight.normal,
          fontFamily: designTokens.typography.fontFamily.system,
        };
      case 'callout':
        return {
          fontSize: designTokens.typography.fontSize.callout,
          fontWeight: designTokens.typography.fontWeight.regular,
          lineHeight: designTokens.typography.fontSize.callout * designTokens.typography.lineHeight.normal,
          fontFamily: designTokens.typography.fontFamily.system,
        };
      case 'subheadline':
        return {
          fontSize: designTokens.typography.fontSize.subheadline,
          fontWeight: designTokens.typography.fontWeight.regular,
          lineHeight: designTokens.typography.fontSize.subheadline * designTokens.typography.lineHeight.normal,
          fontFamily: designTokens.typography.fontFamily.system,
        };
      case 'footnote':
        return {
          fontSize: designTokens.typography.fontSize.footnote,
          fontWeight: designTokens.typography.fontWeight.regular,
          lineHeight: designTokens.typography.fontSize.footnote * designTokens.typography.lineHeight.normal,
          fontFamily: designTokens.typography.fontFamily.system,
        };
      case 'caption1':
        return {
          fontSize: designTokens.typography.fontSize.caption1,
          fontWeight: designTokens.typography.fontWeight.regular,
          lineHeight: designTokens.typography.fontSize.caption1 * designTokens.typography.lineHeight.normal,
          fontFamily: designTokens.typography.fontFamily.system,
        };
      case 'caption2':
        return {
          fontSize: designTokens.typography.fontSize.caption2,
          fontWeight: designTokens.typography.fontWeight.regular,
          lineHeight: designTokens.typography.fontSize.caption2 * designTokens.typography.lineHeight.normal,
          fontFamily: designTokens.typography.fontFamily.system,
        };
      default:
        return {
          fontSize: designTokens.typography.fontSize.body,
          fontWeight: designTokens.typography.fontWeight.regular,
          lineHeight: designTokens.typography.fontSize.body * designTokens.typography.lineHeight.normal,
          fontFamily: designTokens.typography.fontFamily.system,
        };
    }
  };

  const getColorStyle = () => {
    switch (color) {
      case 'label':
        return { color: designTokens.colors.system.label.primary };
      case 'secondaryLabel':
        return { color: designTokens.colors.system.label.secondary };
      case 'tertiaryLabel':
        return { color: designTokens.colors.system.label.tertiary };
      case 'quaternaryLabel':
        return { color: designTokens.colors.system.label.quaternary };
      case 'systemBlue':
        return { color: designTokens.colors.semantic.blue };
      case 'systemGreen':
        return { color: designTokens.colors.semantic.green };
      case 'systemRed':
        return { color: designTokens.colors.semantic.red };
      case 'brand':
        return { color: designTokens.colors.brand.primary };
      default:
        return { color: designTokens.colors.system.label.primary };
    }
  };

  const getFontWeight = () => {
    if (weight) {
      return { fontWeight: designTokens.typography.fontWeight[weight] };
    }
    return {};
  };

  const getTextAlign = () => {
    // Let the system decide for "auto" (better RTL behavior), otherwise use explicit value
    return align === 'auto' ? {} : { textAlign: align };
  };

  const combinedStyle = [
    getVariantStyles(),
    getColorStyle(),
    getFontWeight(),
    getTextAlign(),
    style,
  ];

  return (
    <RNText 
      style={combinedStyle} 
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      allowFontScaling={true}
      {...props}
    >
      {children}
    </RNText>
  );
};