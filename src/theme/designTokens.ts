/**
 * Design Tokens for Dawah Nigeria Mobile App
 * Following atomic design principles with semantic naming
 */

// Spacing scale (4px base unit)
export const spacing = {
  xs: 4,    // 4px
  sm: 8,    // 8px
  md: 12,   // 12px
  lg: 16,   // 16px
  xl: 20,   // 20px
  '2xl': 24, // 24px
  '3xl': 32, // 32px
  '4xl': 40, // 40px
  '5xl': 48, // 48px
  '6xl': 64, // 64px
} as const;

// Typography scale
export const typography = {
  fontSize: {
    xs: 12,   // 12px
    sm: 14,   // 14px
    base: 16, // 16px
    lg: 18,   // 18px
    xl: 20,   // 20px
    '2xl': 24, // 24px
    '3xl': 30, // 30px
    '4xl': 36, // 36px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
} as const;

// Border radius scale
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

// Shadow system for elevation
export const shadows = {
  none: 'none',
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// Color system with semantic naming
export const colors = {
  // Brand colors
  brand: {
    primary: '#C6FF00',     // Dawah Nigeria green
    secondary: '#7AA2FF',   // Blue accent
    tertiary: '#62D26F',    // Green accent
  },
  
  // Background colors
  background: {
    primary: '#0A0A0A',     // Main dark background
    secondary: '#1A1A1A',   // Elevated surfaces
    tertiary: '#2A2A2A',    // Cards and containers
  },
  
  // Text colors
  text: {
    primary: '#FFFFFF',     // Primary text
    secondary: '#E5E5E5',   // Secondary text
    muted: '#8B8CA1',       // Muted text
    inverse: '#000000',     // Text on light backgrounds
  },
  
  // Semantic colors
  semantic: {
    success: '#62D26F',
    warning: '#F6C445',
    error: '#FF6B6B',
    info: '#7AA2FF',
  },
  
  // Interactive states
  interactive: {
    hover: 'rgba(198, 255, 0, 0.1)',
    pressed: 'rgba(198, 255, 0, 0.2)',
    disabled: 'rgba(139, 140, 161, 0.3)',
    focus: 'rgba(198, 255, 0, 0.3)',
  },
  
  // Overlay colors
  overlay: {
    light: 'rgba(255, 255, 255, 0.1)',
    medium: 'rgba(255, 255, 255, 0.2)',
    dark: 'rgba(0, 0, 0, 0.3)',
    darker: 'rgba(0, 0, 0, 0.7)',
  },
  
  // Border colors
  border: {
    primary: 'rgba(139, 140, 161, 0.2)',
    secondary: 'rgba(139, 140, 161, 0.1)',
    focus: '#C6FF00',
  },
} as const;

// Hit target sizes (44x44 minimum for accessibility)
export const hitTargets = {
  minimum: 44,
  comfortable: 48,
  large: 56,
} as const;

// Animation durations
export const animations = {
  fast: 150,
  normal: 250,
  slow: 350,
} as const;

// Z-index scale
export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
} as const;

// Breakpoints for responsive design
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

// Export all tokens as a single object for easy access
export const designTokens = {
  spacing,
  typography,
  borderRadius,
  shadows,
  colors,
  hitTargets,
  animations,
  zIndex,
  breakpoints,
} as const;

// Type definitions for TypeScript
export type Spacing = keyof typeof spacing;
export type FontSize = keyof typeof typography.fontSize;
export type FontWeight = keyof typeof typography.fontWeight;
export type BorderRadius = keyof typeof borderRadius;
export type Shadow = keyof typeof shadows;
export type BrandColor = keyof typeof colors.brand;
export type BackgroundColor = keyof typeof colors.background;
export type TextColor = keyof typeof colors.text;
export type SemanticColor = keyof typeof colors.semantic;