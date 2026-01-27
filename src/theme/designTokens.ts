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

// Theme-specific colors
export const colorsDark = {
  system: {
    background: {
      primary: "#000000",
      secondary: "#1C1C1E",
      tertiary: "#2C2C2E",
      grouped: "#000000",
    },
    label: {
      primary: "#FFFFFF",
      secondary: "rgba(235, 235, 245, 0.6)",
      tertiary: "rgba(235, 235, 245, 0.3)",
      quaternary: "rgba(235, 235, 245, 0.18)",
    },
    fill: {
      primary: "rgba(120, 120, 128, 0.32)",
      secondary: "rgba(120, 120, 128, 0.26)",
      tertiary: "rgba(118, 118, 128, 0.22)",
      quaternary: "rgba(118, 118, 128, 0.14)",
    },
    separator: {
      primary: "rgba(84, 84, 88, 0.65)",
      opaque: "#38383A",
    },
  },
  brand: {
    primary: "#30D158",
    secondary: "#007AFF",
    accent: "#5AC8FA",
  },
  semantic: {
    red: "#FF453A", // systemRed dark
    orange: "#FF9F0A", // systemOrange dark
    yellow: "#FFD60A", // systemYellow dark
    green: "#32D74B", // systemGreen dark
    mint: "#66D4CF", // systemMint dark
    teal: "#6AC4DC", // systemTeal dark
    cyan: "#5AC8F5", // systemCyan dark
    blue: "#0A84FF", // systemBlue dark
    indigo: "#5E5CE6", // systemIndigo dark
    purple: "#BF5AF2", // systemPurple dark
    pink: "#FF375F", // systemPink dark
    brown: "#AC8E68", // systemBrown dark
  },
  control: {
    normal: "rgba(120, 120, 128, 0.32)",
    highlighted: "rgba(120, 120, 128, 0.52)",
    disabled: "rgba(120, 120, 128, 0.22)",
    selected: "#0A84FF",
  },
  fixed: {
    white: "#FFFFFF",
    black: "#000000",
  },
  overlay: {
    darkHeavy: "rgba(0, 0, 0, 0.8)",
    darkStrong: "rgba(0, 0, 0, 0.7)",
    darkMedium: "rgba(0, 0, 0, 0.5)",
    darkSubtle: "rgba(0, 0, 0, 0.05)",
    lightStrong: "rgba(255, 255, 255, 0.95)",
    lightSubtle: "rgba(255, 255, 255, 0.1)",
    lightThin: "rgba(255, 255, 255, 0.06)",
  },
  palette: {
    slate950: "#0A0A0F",
    slate900: "#111827",
    slate800: "#1F2937",
    neutral900: "#1A1A1F",
    gray500: "#6B7280",
    gray400: "#9CA3AF",
    lime400: "#C6FF00",
    blue500: "#3B82F6",
    green500: "#22C55E",
    amber500: "#F59E0B",
    red500: "#EF4444",
    emerald500: "#10B981",
    orange500: "#F97316",
    notificationLight: "#FF231F7C",
    placeholderDefault: "#4ECDC4",
    placeholder: [
      "#FF6B6B", // Coral
      "#4ECDC4", // Teal
      "#45B7D1", // Blue
      "#96CEB4", // Mint
      "#FFEAA7", // Yellow
      "#DDA0DD", // Plum
      "#98D8C8", // Sea Green
      "#F7DC6F", // Gold
      "#BB8FCE", // Lavender
      "#85C1E9", // Sky Blue
    ],
  },
} as const;

export const colorsLight = {
  system: {
    background: {
      primary: "#FFFFFF",
      secondary: "#F2F2F7",
      tertiary: "#FFFFFF",
      grouped: "#F2F2F7",
    },
    label: {
      primary: "#000000",
      secondary: "rgba(60, 60, 67, 0.6)",
      tertiary: "rgba(60, 60, 67, 0.3)",
      quaternary: "rgba(60, 60, 67, 0.18)",
    },
    fill: {
      primary: "rgba(120, 120, 128, 0.2)",
      secondary: "rgba(120, 120, 128, 0.16)",
      tertiary: "rgba(118, 118, 128, 0.12)",
      quaternary: "rgba(118, 118, 128, 0.08)",
    },
    separator: {
      primary: "rgba(60, 60, 67, 0.29)",
      opaque: "#C6C6C8",
    },
  },
  brand: {
    primary: "#34C759", // Slightly darker for light mode contrast
    secondary: "#007AFF",
    accent: "#5AC8FA",
  },
  semantic: {
    red: "#FF3B30",
    orange: "#FF9500",
    yellow: "#FFCC00",
    green: "#34C759",
    mint: "#00C7BE",
    teal: "#30B0C7",
    cyan: "#32D2DC",
    blue: "#007AFF",
    indigo: "#5856D6",
    purple: "#AF52DE",
    pink: "#FF2D92",
    brown: "#A2845E",
  },
  control: {
    normal: "rgba(120, 120, 128, 0.2)",
    highlighted: "rgba(120, 120, 128, 0.4)",
    disabled: "rgba(120, 120, 128, 0.12)",
    selected: "#007AFF",
  },
  fixed: {
    white: "#FFFFFF",
    black: "#000000",
  },
  overlay: {
    darkHeavy: "rgba(0, 0, 0, 0.8)",
    darkStrong: "rgba(0, 0, 0, 0.7)",
    darkMedium: "rgba(0, 0, 0, 0.5)",
    darkSubtle: "rgba(0, 0, 0, 0.05)",
    lightStrong: "rgba(255, 255, 255, 0.95)",
    lightSubtle: "rgba(255, 255, 255, 0.1)",
    lightThin: "rgba(255, 255, 255, 0.06)",
  },
  palette: {
    slate950: "#0A0A0F",
    slate900: "#111827",
    slate800: "#1F2937",
    neutral900: "#1A1A1F",
    gray500: "#6B7280",
    gray400: "#9CA3AF",
    lime400: "#C6FF00",
    blue500: "#3B82F6",
    green500: "#22C55E",
    amber500: "#F59E0B",
    red500: "#EF4444",
    emerald500: "#10B981",
    orange500: "#F97316",
    notificationLight: "#FF231F7C",
    placeholderDefault: "#4ECDC4",
    placeholder: [
      "#FF6B6B", // Coral
      "#4ECDC4", // Teal
      "#45B7D1", // Blue
      "#96CEB4", // Mint
      "#FFEAA7", // Yellow
      "#DDA0DD", // Plum
      "#98D8C8", // Sea Green
      "#F7DC6F", // Gold
      "#BB8FCE", // Lavender
      "#85C1E9", // Sky Blue
    ],
  },
} as const;

// Default to dark mode for backwards compatibility
export const colors = colorsDark;

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
  colors, // Deprecated: Use useTheme hook instead
  colorsLight,
  colorsDark,
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
