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
    display: "Newsreader_500Medium", // Bundled title face, loaded in app/_layout.tsx
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
    // elevation folded in: boxShadow renders on both platforms.
    boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.05)",
  },
  md: {
    // elevation folded in: boxShadow renders on both platforms.
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
  },
  lg: {
    // elevation folded in: boxShadow renders on both platforms.
    boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.15)",
  },
  xl: {
    // elevation folded in: boxShadow renders on both platforms.
    boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.2)",
  },
} as const;

// Theme-specific colors
export const colorsDark = {
  system: {
    background: {
      primary: "#0D1510",
      secondary: "#17221B",
      tertiary: "#223027",
      grouped: "#0D1510",
    },
    label: {
      primary: "#F4F1E6",
      secondary: "#BAC4B6",
      tertiary: "#909C8E",
      quaternary: "rgba(244, 241, 230, 0.18)",
    },
    fill: {
      primary: "rgba(120, 120, 128, 0.32)",
      secondary: "rgba(120, 120, 128, 0.26)",
      tertiary: "rgba(118, 118, 128, 0.22)",
      quaternary: "rgba(118, 118, 128, 0.14)",
    },
    separator: {
      primary: "#2A382F",
      opaque: "#2A382F",
    },
  },
  brand: {
    primary: "#C8EE5A",
    onPrimary: "#10200F",
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
    placeholderDefault: "#0F4A3C",
    placeholder: [
      "#0F4A3C",
      "#7A4A12",
      "#8A3324",
      "#2B3A78",
      "#6B2A55",
      "#3D4E1E",
      "#1F3B57",
      "#7A2F4A",
    ],
  },
} as const;

export const colorsLight = {
  system: {
    background: {
      primary: "#F6F3E9",
      secondary: "#FFFDF6",
      tertiary: "#E9E5D6",
      grouped: "#F6F3E9",
    },
    label: {
      primary: "#14231A",
      secondary: "#47564B",
      tertiary: "#5C6A5F",
      quaternary: "rgba(60, 60, 67, 0.18)",
    },
    fill: {
      primary: "rgba(120, 120, 128, 0.2)",
      secondary: "rgba(120, 120, 128, 0.16)",
      tertiary: "rgba(118, 118, 128, 0.12)",
      quaternary: "rgba(118, 118, 128, 0.08)",
    },
    separator: {
      primary: "#D9D4C3",
      opaque: "#D9D4C3",
    },
  },
  brand: {
    primary: "#1F6B3E",
    onPrimary: "#FFFFFF",
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
    placeholderDefault: "#0F4A3C",
    placeholder: [
      "#0F4A3C",
      "#7A4A12",
      "#8A3324",
      "#2B3A78",
      "#6B2A55",
      "#3D4E1E",
      "#1F3B57",
      "#7A2F4A",
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
