import { create } from 'twrnc';
import { designTokens } from './designTokens';
import tailwindConfig from '../../tailwind.config.js';

// Create a configured instance with our custom theme
const customTw = create(tailwindConfig);

// Export utility functions for easy access to design tokens
export const getColor = (path: string) => {
  const keys = path.split('.');
  let value: any = designTokens.colors;
  for (const key of keys) {
    value = value[key];
  }
  return value;
};

export const getSpacing = (size: keyof typeof designTokens.spacing) => {
  return designTokens.spacing[size];
};

export const getBorderRadius = (size: keyof typeof designTokens.borderRadius) => {
  return designTokens.borderRadius[size];
};

export const getFontSize = (size: keyof typeof designTokens.typography.fontSize) => {
  return designTokens.typography.fontSize[size];
};

export const getFontWeight = (weight: keyof typeof designTokens.typography.fontWeight) => {
  return designTokens.typography.fontWeight[weight];
};

export const getShadow = (size: keyof typeof designTokens.shadows) => {
  return designTokens.shadows[size];
};

export const getHitTarget = (size: keyof typeof designTokens.hitTargets) => {
  return designTokens.hitTargets[size];
};

// Create style objects for common design token combinations
export const createTextStyle = (variant: 'largeTitle' | 'title1' | 'title2' | 'title3' | 'headline' | 'body' | 'callout' | 'subheadline' | 'footnote' | 'caption1' | 'caption2') => {
  switch (variant) {
    case 'largeTitle':
      return {
        fontSize: designTokens.typography.fontSize.largeTitle,
        fontWeight: designTokens.typography.fontWeight.regular,
        color: designTokens.colors.system.label.primary,
      };
    case 'title1':
      return {
        fontSize: designTokens.typography.fontSize.title1,
        fontWeight: designTokens.typography.fontWeight.regular,
        color: designTokens.colors.system.label.primary,
      };
    case 'title2':
      return {
        fontSize: designTokens.typography.fontSize.title2,
        fontWeight: designTokens.typography.fontWeight.regular,
        color: designTokens.colors.system.label.primary,
      };
    case 'title3':
      return {
        fontSize: designTokens.typography.fontSize.title3,
        fontWeight: designTokens.typography.fontWeight.regular,
        color: designTokens.colors.system.label.primary,
      };
    case 'headline':
      return {
        fontSize: designTokens.typography.fontSize.headline,
        fontWeight: designTokens.typography.fontWeight.semibold,
        color: designTokens.colors.system.label.primary,
      };
    case 'body':
      return {
        fontSize: designTokens.typography.fontSize.body,
        fontWeight: designTokens.typography.fontWeight.regular,
        color: designTokens.colors.system.label.primary,
      };
    case 'callout':
      return {
        fontSize: designTokens.typography.fontSize.callout,
        fontWeight: designTokens.typography.fontWeight.regular,
        color: designTokens.colors.system.label.primary,
      };
    case 'subheadline':
      return {
        fontSize: designTokens.typography.fontSize.subheadline,
        fontWeight: designTokens.typography.fontWeight.regular,
        color: designTokens.colors.system.label.primary,
      };
    case 'footnote':
      return {
        fontSize: designTokens.typography.fontSize.footnote,
        fontWeight: designTokens.typography.fontWeight.regular,
        color: designTokens.colors.system.label.primary,
      };
    case 'caption1':
      return {
        fontSize: designTokens.typography.fontSize.caption1,
        fontWeight: designTokens.typography.fontWeight.regular,
        color: designTokens.colors.system.label.secondary,
      };
    case 'caption2':
      return {
        fontSize: designTokens.typography.fontSize.caption2,
        fontWeight: designTokens.typography.fontWeight.regular,
        color: designTokens.colors.system.label.secondary,
      };
    default:
      return {
        fontSize: designTokens.typography.fontSize.body,
        fontWeight: designTokens.typography.fontWeight.regular,
        color: designTokens.colors.system.label.primary,
      };
  }
};

export default customTw;
export { designTokens };
