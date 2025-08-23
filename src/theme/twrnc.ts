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
export const createTextStyle = (variant: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'bodySmall' | 'caption') => {
  switch (variant) {
    case 'h1':
      return {
        fontSize: designTokens.typography.fontSize['4xl'],
        fontWeight: designTokens.typography.fontWeight.bold,
        color: designTokens.colors.text.primary,
      };
    case 'h2':
      return {
        fontSize: designTokens.typography.fontSize['3xl'],
        fontWeight: designTokens.typography.fontWeight.bold,
        color: designTokens.colors.text.primary,
      };
    case 'h3':
      return {
        fontSize: designTokens.typography.fontSize['2xl'],
        fontWeight: designTokens.typography.fontWeight.semibold,
        color: designTokens.colors.text.primary,
      };
    case 'h4':
      return {
        fontSize: designTokens.typography.fontSize.xl,
        fontWeight: designTokens.typography.fontWeight.semibold,
        color: designTokens.colors.text.primary,
      };
    case 'body':
      return {
        fontSize: designTokens.typography.fontSize.base,
        fontWeight: designTokens.typography.fontWeight.normal,
        color: designTokens.colors.text.primary,
      };
    case 'bodySmall':
      return {
        fontSize: designTokens.typography.fontSize.sm,
        fontWeight: designTokens.typography.fontWeight.normal,
        color: designTokens.colors.text.primary,
      };
    case 'caption':
      return {
        fontSize: designTokens.typography.fontSize.xs,
        fontWeight: designTokens.typography.fontWeight.normal,
        color: designTokens.colors.text.muted,
      };
    default:
      return {
        fontSize: designTokens.typography.fontSize.base,
        fontWeight: designTokens.typography.fontWeight.normal,
        color: designTokens.colors.text.primary,
      };
  }
};

export default customTw;
export { designTokens };
