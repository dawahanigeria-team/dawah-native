/**
 * Design Tokens for Dawah Nigeria Mobile App
 * Following atomic design principles with semantic naming
 */

// Spacing scale (4px base unit)
export const spacing = {
  xs: 4, // 4px
  sm: 8, // 8px
  md: 12, // 12px
  lg: 16, // 16px
  xl: 20, // 20px
  "2xl": 24, // 24px
  "3xl": 32, // 32px
  "4xl": 40, // 40px
  "5xl": 48, // 48px
  "6xl": 64, // 64px
} as const;

// Typography scale - Apple iOS Text Styles
export const typography = {
  fontSize: {
    // iOS Dynamic Type sizes (base values)
    largeTitle: 34, // Large Title
    title1: 28, // Title 1
    title2: 22, // Title 2
    title3: 20, // Title 3
    headline: 17, // Headline
    body: 17, // Body
    callout: 16, // Callout
    subheadline: 15, // Subheadline
    footnote: 13, // Footnote
    caption1: 12, // Caption 1
    caption2: 11, // Caption 2
  },
  fontWeight: {
    ultraLight: "100",
    thin: "200",
    light: "300",
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    heavy: "800",
    black: "900",
  },
  lineHeight: {
    tight: 1.1, // For large titles
    normal: 1.3, // iOS standard
    relaxed: 1.4, // For better readability
  },
  fontFamily: {
    system: "System", // iOS will use SF Pro automatically
    mono: "Menlo", // iOS monospace font
  },
} as const;

// Border radius scale
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 20,
  "3xl": 24,
  full: 9999,
} as const;

// Shadow system for elevation
export const shadows = {
  none: "none",
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// iOS Semantic Color System - supports both light and dark modes
export const colors = {
  // iOS System Colors (adapt to appearance)
  system: {
    background: {
      primary: "#000000", // systemBackground (dark)
      secondary: "#1C1C1E", // secondarySystemBackground (dark)
      tertiary: "#2C2C2E", // tertiarySystemBackground (dark)
      grouped: "#000000", // systemGroupedBackground (dark)
    },

    label: {
      primary: "#FFFFFF", // label (dark mode)
      secondary: "rgba(235, 235, 245, 0.6)", // secondaryLabel
      tertiary: "rgba(235, 235, 245, 0.3)", // tertiaryLabel
      quaternary: "rgba(235, 235, 245, 0.18)", // quaternaryLabel
    },

    fill: {
      primary: "rgba(120, 120, 128, 0.2)", // systemFill
      secondary: "rgba(120, 120, 128, 0.16)", // secondarySystemFill
      tertiary: "rgba(118, 118, 128, 0.12)", // tertiarySystemFill
      quaternary: "rgba(118, 118, 128, 0.08)", // quaternarySystemFill
    },

    separator: {
      primary: "rgba(84, 84, 88, 0.65)", // separator
      opaque: "#38383A", // opaqueSeparator
    },
  },

  // Brand colors - maintaining identity while following iOS patterns
  brand: {
    primary: "#30D158", // iOS Green (adjusted for accessibility)
    secondary: "#007AFF", // iOS Blue
    accent: "#5AC8FA", // iOS Light Blue
  },

  // iOS Semantic Colors
  semantic: {
    red: "#FF3B30", // systemRed
    orange: "#FF9500", // systemOrange
    yellow: "#FFCC00", // systemYellow
    green: "#30D158", // systemGreen
    mint: "#00C7BE", // systemMint
    teal: "#30B0C7", // systemTeal
    cyan: "#32D2DC", // systemCyan
    blue: "#007AFF", // systemBlue
    indigo: "#5856D6", // systemIndigo
    purple: "#AF52DE", // systemPurple
    pink: "#FF2D92", // systemPink
    brown: "#A2845E", // systemBrown
  },

  // Control states
  control: {
    normal: "rgba(120, 120, 128, 0.2)",
    highlighted: "rgba(120, 120, 128, 0.4)",
    disabled: "rgba(120, 120, 128, 0.12)",
    selected: "#007AFF",
  },
} as const;

// iOS Hit target sizes (44x44 minimum for accessibility)
export const hitTargets = {
  minimum: 44, // Apple HIG minimum
  comfortable: 48, // Recommended size
  large: 52, // Large controls
  extraLarge: 60, // Extra large (floating buttons)
} as const;

// iOS Animation durations and curves
export const animations = {
  // Duration (ms)
  immediate: 0,
  fast: 200, // Quick transitions
  normal: 350, // Standard iOS duration
  slow: 500, // Deliberate transitions

  // Easing curves (React Native compatible)
  easing: {
    easeInOut: "ease-in-out",
    easeOut: "ease-out",
    easeIn: "ease-in",
    spring: "spring", // Use with react-native-reanimated
  },
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
export type SystemBackgroundColor = keyof typeof colors.system.background;
export type SystemLabelColor = keyof typeof colors.system.label;
export type SystemFillColor = keyof typeof colors.system.fill;
export type SemanticColor = keyof typeof colors.semantic;
export type ControlColor = keyof typeof colors.control;
